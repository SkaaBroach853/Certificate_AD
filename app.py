import csv
import io
import json
import mimetypes
import os
import re
import smtplib
import uuid
import zipfile
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_file, send_from_directory, session
from PIL import Image, ImageColor, ImageDraw, ImageFont

try:
    import qrcode
except ImportError:
    qrcode = None


# -----------------------------
# App and folder setup
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
TEMPLATE_DIR = OUTPUT_DIR / "templates"
CSV_DIR = OUTPUT_DIR / "csv"
BATCH_DIR = OUTPUT_DIR / "batches"
PREVIEW_DIR = OUTPUT_DIR / "previews"
SINGLE_DIR = OUTPUT_DIR / "single"

for folder in [OUTPUT_DIR, TEMPLATE_DIR, CSV_DIR, BATCH_DIR, PREVIEW_DIR, SINGLE_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024


def load_env_file(env_path: Path):
    """Load key=value pairs from a local .env file into process environment."""
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(BASE_DIR / ".env")
app.secret_key = os.environ.get("SECRET_KEY", "dev-ad-secret-change-me")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "adadmin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ad@2026")


# -----------------------------
# Utility helpers
# -----------------------------
def safe_filename(name: str) -> str:
    """Keep filenames filesystem-safe while preserving readability."""
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", name)


def is_admin_authenticated() -> bool:
    """Check whether current session is authenticated for admin actions."""
    return bool(session.get("is_admin", False))


def generate_certificate_id(index: int) -> str:
    """Generate a human-readable unique certificate ID."""
    today = datetime.now().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:6].upper()
    return f"CERT-{today}-{index:03d}-{unique}"


def normalize_field_key(value: str) -> str:
    """Normalize field names for resilient placeholder/header matching."""
    return re.sub(r"[\s_\-]+", "", (value or "").strip().lower())


def canonical_field_name(header: str) -> str:
    """Map common CSV header variants to app's canonical placeholder keys."""
    normalized = normalize_field_key(header)
    alias_map = {
        "name": "Name",
        "names": "Name",
        "fullname": "Name",
        "studentname": "Name",
        "participantname": "Name",
        "email": "Email",
        "emails": "Email",
        "emailaddress": "Email",
        "mail": "Email",
        "course": "Course",
        "courses": "Course",
        "coursename": "Course",
        "program": "Course",
        "date": "Date",
        "dates": "Date",
        "awardedon": "Date",
        "issuedon": "Date",
    }
    return alias_map.get(normalized, "")


def parse_csv_file(csv_path: Path):
    """Read CSV into list of dict rows and normalize header spacing."""
    rows = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            return [], []

        raw_fieldnames = [header or "" for header in reader.fieldnames]
        normalized_fieldnames = [header.strip() for header in raw_fieldnames]
        header_map = {raw: normalized for raw, normalized in zip(raw_fieldnames, normalized_fieldnames)}

        for row in reader:
            cleaned = {}
            for raw_field, normalized in header_map.items():
                value = (row.get(raw_field, "") or "").strip()
                cleaned[normalized] = value
                canonical = canonical_field_name(normalized)
                if canonical and canonical not in cleaned:
                    cleaned[canonical] = value
            rows.append(cleaned)

    return rows, normalized_fieldnames


def resolve_font(font_name: str, font_size: int, bold: bool = False, italic: bool = False):
    """Load a matching TrueType font from common system paths with fallback."""
    windows_font_map = {
        "Arial": "arial.ttf",
        "Times New Roman": "times.ttf",
        "Calibri": "calibri.ttf",
        "Georgia": "georgia.ttf",
        "Verdana": "verdana.ttf",
        "Trebuchet MS": "trebuc.ttf",
    }

    font_file = windows_font_map.get(font_name, "arial.ttf")

    # Attempt style-specific variants if available.
    style_candidates = []
    if bold and italic:
        style_candidates.extend([
            font_file.replace(".ttf", "bi.ttf"),
            font_file.replace(".ttf", "z.ttf"),
        ])
    elif bold:
        style_candidates.extend([
            font_file.replace(".ttf", "bd.ttf"),
            font_file.replace(".ttf", "b.ttf"),
        ])
    elif italic:
        style_candidates.extend([
            font_file.replace(".ttf", "i.ttf"),
            font_file.replace(".ttf", "it.ttf"),
        ])

    candidates = style_candidates + [font_file]

    search_paths = [
        Path("C:/Windows/Fonts"),
        BASE_DIR / "static" / "fonts",
    ]

    for root in search_paths:
        for file_name in candidates:
            font_path = root / file_name
            if font_path.exists():
                try:
                    return ImageFont.truetype(str(font_path), font_size)
                except OSError:
                    continue

    # Final fallback to PIL's default font.
    return ImageFont.load_default()


def replace_placeholders(text: str, values: dict) -> str:
    """Replace tokens like {Name} with row values and keep unknown placeholders as-is."""
    normalized_values = {normalize_field_key(key): value for key, value in values.items()}

    def replacer(match):
        raw_key = match.group(1).strip()
        if raw_key in values:
            return str(values[raw_key])
        normalized_key = normalize_field_key(raw_key)
        if normalized_key in normalized_values:
            return str(normalized_values[normalized_key])
        return match.group(0)

    return re.sub(r"\{([^{}]+)\}", replacer, text)


def resolve_output_filename(template: str, row: dict, fallback: str) -> str:
    """Build safe output filename from template placeholders."""
    raw_template = (template or "").strip()
    if not raw_template:
        raw_template = fallback
    resolved = replace_placeholders(raw_template, row).strip()
    if not resolved:
        resolved = fallback
    return safe_filename(resolved)


def create_smtp_client(host: str, port: int, security: str):
    """Create configured SMTP client object based on selected security mode."""
    if security == "ssl":
        return smtplib.SMTP_SSL(host, port, timeout=15)
    return smtplib.SMTP(host, port, timeout=15)


def draw_text_boxes(base_image: Image.Image, text_boxes: list, row_data: dict):
    """Draw all configured text layers onto a Pillow image."""
    draw = ImageDraw.Draw(base_image)

    for box in text_boxes:
        content = replace_placeholders(box.get("content", ""), row_data)
        x = int(float(box.get("x", 0)))
        y = int(float(box.get("y", 0)))
        width = int(float(box.get("width", 200)))
        font_size = int(float(box.get("fontSize", 28)))
        color = box.get("color", "#000000")
        font_family = box.get("fontFamily", "Arial")
        bold = bool(box.get("bold", False))
        italic = bool(box.get("italic", False))
        align = str(box.get("align", "center")).lower()
        if align not in {"left", "center", "right"}:
            align = "center"

        font = resolve_font(font_family, font_size, bold=bold, italic=italic)

        # Draw multi-line text with basic wrapping by width.
        wrapped_lines = []
        for line in content.split("\n"):
            if not line:
                wrapped_lines.append("")
                continue

            words = line.split(" ")
            current = words[0]
            for word in words[1:]:
                trial = f"{current} {word}"
                bbox = draw.textbbox((0, 0), trial, font=font)
                if bbox[2] - bbox[0] <= width:
                    current = trial
                else:
                    wrapped_lines.append(current)
                    current = word
            wrapped_lines.append(current)

        final_text = "\n".join(wrapped_lines)
        if align == "left":
            draw_x = x
            anchor = "la"
        elif align == "right":
            draw_x = x + width
            anchor = "ra"
        else:
            draw_x = x + (width / 2)
            anchor = "ma"

        draw.multiline_text(
            (draw_x, y),
            final_text,
            font=font,
            fill=ImageColor.getrgb(color),
            spacing=4,
            align=align,
            anchor=anchor,
        )


def maybe_draw_qr(base_image: Image.Image, row_data: dict, qr_config: dict):
    """Optionally render QR code with user-configured position and data source."""
    if not qr_config or not qr_config.get("enabled"):
        return

    if qrcode is None:
        raise RuntimeError("qrcode library is not installed. Please install requirements.")

    data_template = qr_config.get("data", "{CertificateID}")
    qr_text = replace_placeholders(data_template, row_data)

    qr_size = int(qr_config.get("size", 120))
    x = int(qr_config.get("x", base_image.width - qr_size - 40))
    y = int(qr_config.get("y", base_image.height - qr_size - 40))

    qr_img = qrcode.make(qr_text).convert("RGB").resize((qr_size, qr_size))
    base_image.paste(qr_img, (x, y))


def generate_certificates(template_path: Path, csv_path: Path, text_boxes: list, options: dict):
    """Create personalized certificate files for every CSV row and package metadata."""
    rows, fieldnames = parse_csv_file(csv_path)
    if not rows:
        return {"count": 0, "files": [], "fieldnames": fieldnames, "batch_id": None}

    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
    batch_folder = BATCH_DIR / batch_id
    batch_folder.mkdir(parents=True, exist_ok=True)

    output_format = (options.get("output_format") or "png").lower()
    if output_format not in {"png", "pdf"}:
        output_format = "png"

    qr_config = options.get("qr", {})
    filename_template = options.get("filename_template", "{Name}_{CertificateID}")
    generated_records = []

    with Image.open(template_path).convert("RGB") as template_img:
        for idx, row in enumerate(rows, start=1):
            row = dict(row)
            row["CertificateID"] = generate_certificate_id(idx)

            canvas = template_img.copy()
            draw_text_boxes(canvas, text_boxes, row)
            maybe_draw_qr(canvas, row, qr_config)

            fallback_name = f"{row.get('Name', f'recipient_{idx}')}_{row['CertificateID']}"
            base_name = resolve_output_filename(filename_template, row, fallback_name)
            if output_format == "pdf":
                out_path = batch_folder / f"{base_name}.pdf"
                canvas.save(out_path, "PDF", resolution=100.0)
            else:
                out_path = batch_folder / f"{base_name}.png"
                canvas.save(out_path, "PNG")

            generated_records.append(
                {
                    "name": row.get("Name", ""),
                    "email": row.get("Email", ""),
                    "certificate_id": row["CertificateID"],
                    "file_name": out_path.name,
                    "file_path": str(out_path),
                    "row": row,
                }
            )

    metadata_path = batch_folder / "metadata.json"
    metadata_path.write_text(json.dumps(generated_records, indent=2), encoding="utf-8")

    zip_path = OUTPUT_DIR / f"{batch_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for record in generated_records:
            file_path = Path(record["file_path"])
            archive.write(file_path, arcname=file_path.name)

    return {
        "count": len(generated_records),
        "files": generated_records,
        "fieldnames": fieldnames,
        "batch_id": batch_id,
        "zip_path": str(zip_path),
    }


def generate_single_certificate(template_path: Path, csv_path: Path, text_boxes: list, options: dict, row_index: int):
    """Generate one certificate for a specific 1-based CSV row index."""
    rows, _ = parse_csv_file(csv_path)
    if not rows:
        raise ValueError("CSV has no rows to generate certificates.")
    if row_index < 1 or row_index > len(rows):
        raise ValueError(f"Row index out of range. Valid range is 1 to {len(rows)}.")

    row = dict(rows[row_index - 1])
    row["CertificateID"] = generate_certificate_id(row_index)

    output_format = (options.get("output_format") or "png").lower()
    if output_format not in {"png", "pdf"}:
        output_format = "png"
    qr_config = options.get("qr", {})
    filename_template = options.get("filename_template", "{Name}_{CertificateID}")

    with Image.open(template_path).convert("RGB") as template_img:
        canvas = template_img.copy()
        draw_text_boxes(canvas, text_boxes, row)
        maybe_draw_qr(canvas, row, qr_config)

        fallback_name = f"{row.get('Name', f'recipient_{row_index}')}_{row['CertificateID']}"
        base_name = resolve_output_filename(filename_template, row, fallback_name)
        unique_suffix = uuid.uuid4().hex[:8]
        ext = "pdf" if output_format == "pdf" else "png"
        file_name = f"{base_name}_{unique_suffix}.{ext}"
        out_path = SINGLE_DIR / file_name

        if output_format == "pdf":
            canvas.save(out_path, "PDF", resolution=100.0)
        else:
            canvas.save(out_path, "PNG")

    return {
        "file_name": file_name,
        "file_path": str(out_path),
        "row_index": row_index,
        "name": row.get("Name", ""),
        "certificate_id": row["CertificateID"],
    }


# -----------------------------
# Routes
# -----------------------------
@app.route("/")
def index():
    """Render premium scrolling brand showcase page."""
    return render_template("index.html")


@app.route("/showcase")
def showcase():
    """Render premium scrolling brand showcase page."""
    return render_template("index.html")


@app.route("/generator")
def generator():
    """Render the main certificate generator studio."""
    return render_template("studio.html")


@app.route("/admin")
def admin():
    """Render frontend admin page for local content configuration."""
    return render_template("admin.html")


@app.route("/admin/check", methods=["GET"])
def admin_check():
    """Return current admin authentication state."""
    return jsonify({"authenticated": is_admin_authenticated()})


@app.route("/admin/login", methods=["POST"])
def admin_login():
    """Authenticate admin using credentials configured from environment."""
    payload = request.get_json(force=True)
    username = (payload.get("username", "") or "").strip()
    password = (payload.get("password", "") or "").strip()
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session["is_admin"] = True
        return jsonify({"authenticated": True, "message": "Login successful."})
    session["is_admin"] = False
    return jsonify({"error": "Invalid credentials."}), 401


@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    """Clear admin authentication session."""
    session.pop("is_admin", None)
    return jsonify({"authenticated": False, "message": "Logged out."})


@app.route("/upload-template", methods=["POST"])
def upload_template():
    """Upload certificate background template image."""
    file = request.files.get("template")
    if not file:
        return jsonify({"error": "No template file provided."}), 400

    ext = Path(file.filename or "template.png").suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg"}:
        return jsonify({"error": "Only PNG/JPG templates are supported."}), 400

    template_id = uuid.uuid4().hex
    filename = f"{template_id}{ext}"
    save_path = TEMPLATE_DIR / filename
    file.save(save_path)

    with Image.open(save_path) as img:
        width, height = img.size

    return jsonify(
        {
            "template_id": template_id,
            "template_url": f"/assets/templates/{filename}",
            "template_path": str(save_path),
            "width": width,
            "height": height,
        }
    )


@app.route("/upload-csv", methods=["POST"])
def upload_csv():
    """Upload and parse recipient CSV."""
    file = request.files.get("csv")
    if not file:
        return jsonify({"error": "No CSV file provided."}), 400

    ext = Path(file.filename or "data.csv").suffix.lower()
    if ext != ".csv":
        return jsonify({"error": "Please upload a .csv file."}), 400

    csv_id = uuid.uuid4().hex
    filename = f"{csv_id}.csv"
    save_path = CSV_DIR / filename
    file.save(save_path)

    rows, fieldnames = parse_csv_file(save_path)

    return jsonify(
        {
            "csv_id": csv_id,
            "csv_path": str(save_path),
            "fieldnames": fieldnames,
            "rows": len(rows),
            "sample": rows[0] if rows else {},
        }
    )


@app.route("/add-text-box", methods=["POST"])
def add_text_box():
    """Provide a starter text-box model for the UI."""
    box_id = uuid.uuid4().hex[:8]
    return jsonify(
        {
            "id": box_id,
            "content": "{Name}",
            "x": 120,
            "y": 120,
            "width": 280,
            "height": 70,
            "fontFamily": "Arial",
            "fontSize": 36,
            "align": "center",
            "color": "#000000",
            "bold": False,
            "italic": False,
        }
    )


@app.route("/preview", methods=["POST"])
def preview():
    """Generate one preview certificate using the first CSV row."""
    payload = request.get_json(force=True)
    template_path = Path(payload.get("template_path", ""))
    csv_path = Path(payload.get("csv_path", ""))
    text_boxes = payload.get("text_boxes", [])
    qr_config = payload.get("qr", {})

    if not template_path.exists() or not csv_path.exists():
        return jsonify({"error": "Template or CSV path is invalid."}), 400

    rows, _ = parse_csv_file(csv_path)
    if not rows:
        return jsonify({"error": "CSV has no data rows."}), 400

    row = dict(rows[0])
    row["CertificateID"] = generate_certificate_id(1)

    with Image.open(template_path).convert("RGB") as img:
        canvas = img.copy()
        draw_text_boxes(canvas, text_boxes, row)
        maybe_draw_qr(canvas, row, qr_config)

        preview_name = f"preview_{uuid.uuid4().hex[:8]}.png"
        preview_path = PREVIEW_DIR / preview_name
        canvas.save(preview_path, "PNG")

    return jsonify({"preview_url": f"/assets/previews/{preview_name}", "sample_row": row})


@app.route("/generate", methods=["POST"])
def generate():
    """Bulk-generate certificates from template and CSV."""
    payload = request.get_json(force=True)
    template_path = Path(payload.get("template_path", ""))
    csv_path = Path(payload.get("csv_path", ""))
    text_boxes = payload.get("text_boxes", [])
    options = payload.get("options", {})

    if not template_path.exists() or not csv_path.exists():
        return jsonify({"error": "Template or CSV path not found."}), 400

    result = generate_certificates(template_path, csv_path, text_boxes, options)
    if result["count"] == 0:
        return jsonify({"error": "CSV has no rows to generate certificates."}), 400

    return jsonify(
        {
            "message": "Certificates generated successfully.",
            "count": result["count"],
            "batch_id": result["batch_id"],
            "zip_download": f"/download/{result['batch_id']}",
        }
    )


@app.route("/generate-single", methods=["POST"])
def generate_single():
    """Generate one certificate from a specific CSV row index."""
    payload = request.get_json(force=True)
    template_path = Path(payload.get("template_path", ""))
    csv_path = Path(payload.get("csv_path", ""))
    text_boxes = payload.get("text_boxes", [])
    options = payload.get("options", {})
    try:
        row_index = int(payload.get("row_index", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Row index must be a valid number."}), 400

    if not template_path.exists() or not csv_path.exists():
        return jsonify({"error": "Template or CSV path not found."}), 400

    try:
        result = generate_single_certificate(template_path, csv_path, text_boxes, options, row_index)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        {
            "message": "Single certificate generated successfully.",
            "file_name": result["file_name"],
            "row_index": result["row_index"],
            "name": result["name"],
            "certificate_id": result["certificate_id"],
            "download_url": f"/download-single/{result['file_name']}",
        }
    )


@app.route("/preview-filename", methods=["POST"])
def preview_filename():
    """Preview resolved output filename for a selected CSV row and template."""
    payload = request.get_json(force=True)
    csv_path = Path(payload.get("csv_path", ""))
    filename_template = payload.get("filename_template", "{Name}_{CertificateID}")
    output_format = (payload.get("output_format", "png") or "png").lower()
    try:
        row_index = int(payload.get("row_index", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Row index must be a valid number."}), 400

    if not csv_path.exists():
        return jsonify({"error": "CSV path not found."}), 400

    rows, _ = parse_csv_file(csv_path)
    if not rows:
        return jsonify({"error": "CSV has no rows."}), 400
    if row_index < 1 or row_index > len(rows):
        return jsonify({"error": f"Row index out of range. Valid range is 1 to {len(rows)}."}), 400

    row = dict(rows[row_index - 1])
    row["CertificateID"] = generate_certificate_id(row_index)
    fallback_name = f"{row.get('Name', f'recipient_{row_index}')}_{row['CertificateID']}"
    base_name = resolve_output_filename(filename_template, row, fallback_name)
    ext = "pdf" if output_format == "pdf" else "png"

    return jsonify(
        {
            "preview_file_name": f"{base_name}.{ext}",
            "row_index": row_index,
        }
    )


@app.route("/test-smtp", methods=["POST"])
def test_smtp():
    """Test SMTP connectivity and login before sending bulk emails."""
    payload = request.get_json(force=True)
    smtp_host = payload.get("smtp_host", "smtp.gmail.com").strip() or "smtp.gmail.com"
    try:
        smtp_port = int(payload.get("smtp_port", 587))
    except (TypeError, ValueError):
        return jsonify({"error": "SMTP port must be a valid number."}), 400

    smtp_security = (payload.get("smtp_security", "tls") or "tls").strip().lower()
    if smtp_security not in {"tls", "ssl", "none"}:
        smtp_security = "tls"

    gmail_user = payload.get("gmail_user", "").strip()
    gmail_app_password = payload.get("gmail_app_password", "").strip()
    if not gmail_user or not gmail_app_password:
        return jsonify({"error": "Sender email and SMTP/app password are required for test."}), 400

    try:
        with create_smtp_client(smtp_host, smtp_port, smtp_security) as smtp:
            if smtp_security == "tls":
                smtp.starttls()
            smtp.login(gmail_user, gmail_app_password)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"SMTP test failed: {exc}"}), 400

    return jsonify({"message": "SMTP connection successful. Credentials and server settings are valid."})


@app.route("/send-email", methods=["POST"])
def send_email():
    """Send generated certificates as email attachments via SMTP."""
    payload = request.get_json(force=True)
    batch_id = payload.get("batch_id")
    smtp_host = payload.get("smtp_host", "smtp.gmail.com").strip() or "smtp.gmail.com"
    try:
        smtp_port = int(payload.get("smtp_port", 587))
    except (TypeError, ValueError):
        return jsonify({"error": "SMTP port must be a valid number."}), 400
    smtp_security = (payload.get("smtp_security", "tls") or "tls").strip().lower()
    if smtp_security not in {"tls", "ssl", "none"}:
        smtp_security = "tls"
    sender_name = (payload.get("sender_name", "") or "").strip()
    gmail_user = payload.get("gmail_user", "").strip()
    gmail_app_password = payload.get("gmail_app_password", "").strip()
    subject = payload.get("subject", "Your Certificate")
    body_template = payload.get("body", "Hello {Name},\n\nPlease find your certificate attached.\n\nRegards")

    if not batch_id:
        return jsonify({"error": "Missing batch_id."}), 400

    if not gmail_user or not gmail_app_password:
        return jsonify({"error": "Sender email and SMTP/app password are required."}), 400

    metadata_path = BATCH_DIR / batch_id / "metadata.json"
    if not metadata_path.exists():
        return jsonify({"error": "Batch not found. Generate certificates first."}), 404

    records = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not records:
        return jsonify({"error": "No generated files found in this batch."}), 400

    sent = 0
    failed = []

    try:
        with create_smtp_client(smtp_host, smtp_port, smtp_security) as smtp:
            if smtp_security == "tls":
                smtp.starttls()
            smtp.login(gmail_user, gmail_app_password)

            for record in records:
                recipient = record.get("email", "").strip()
                if not recipient:
                    failed.append({"name": record.get("name", ""), "reason": "Missing Email in CSV"})
                    continue

                try:
                    msg = EmailMessage()
                    msg["From"] = f"{sender_name} <{gmail_user}>" if sender_name else gmail_user
                    msg["To"] = recipient
                    msg["Subject"] = subject

                    body = replace_placeholders(body_template, record.get("row", {}))
                    msg.set_content(body)

                    attachment_path = Path(record["file_path"])
                    attachment_bytes = attachment_path.read_bytes()
                    guessed_type, _ = mimetypes.guess_type(attachment_path.name)
                    maintype, subtype = ("application", "octet-stream")
                    if guessed_type and "/" in guessed_type:
                        maintype, subtype = guessed_type.split("/", 1)
                    msg.add_attachment(
                        attachment_bytes,
                        maintype=maintype,
                        subtype=subtype,
                        filename=attachment_path.name,
                    )

                    smtp.send_message(msg)
                    sent += 1
                except Exception as exc:  # noqa: BLE001
                    failed.append({"name": record.get("name", ""), "email": recipient, "reason": str(exc)})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"SMTP connection/login failed: {exc}"}), 400

    return jsonify({"sent": sent, "failed": failed, "total": len(records)})


@app.route("/download/<batch_id>")
def download_batch(batch_id):
    """Download ZIP file containing all generated certificates."""
    zip_path = OUTPUT_DIR / f"{batch_id}.zip"
    if not zip_path.exists():
        return jsonify({"error": "ZIP file not found."}), 404
    return send_file(zip_path, as_attachment=True)


@app.route("/assets/templates/<path:filename>")
def template_asset(filename):
    """Serve uploaded template image."""
    return send_from_directory(TEMPLATE_DIR, filename)


@app.route("/assets/previews/<path:filename>")
def preview_asset(filename):
    """Serve generated preview image."""
    return send_from_directory(PREVIEW_DIR, filename)


@app.route("/download-single/<path:filename>")
def download_single(filename):
    """Download a previously generated single certificate file."""
    return send_from_directory(SINGLE_DIR, filename, as_attachment=True)


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5000"))
    app.run(debug=True, host=host, port=port)
