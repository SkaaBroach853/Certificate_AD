# CertFlow Studio - Bulk Certificate Generator

A complete Flask full-stack app for bulk digital certificate generation and email distribution.

## Features

- Premium modern UI (black/white/light-blue theme with animations)
- Upload certificate template (`PNG/JPG`)
- Add draggable + resizable text boxes over template
- Dynamic placeholders like `{Name}`, `{Course}`, `{Date}`, `{CertificateID}`
- Text styling: font family, size, color, bold, italic
- CSV upload and dynamic field mapping
- One-click preview for first CSV row
- Bulk certificate generation via Pillow (`PNG` or `PDF`)
- Unique certificate ID for every recipient
- Optional QR code rendering on certificates
- Bulk ZIP download of generated certificates
- Personalized Gmail SMTP email sending with attachments

## Project Structure

```text
Certificate Generator/
├── app.py
├── requirements.txt
├── example.csv
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── output/
    ├── templates/
    ├── csv/
    ├── previews/
    └── batches/
```

## Setup Instructions (Local)

1. Create and activate a virtual environment.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies.

```powershell
pip install -r requirements.txt
```

3. Run the Flask app.

```powershell
python app.py
```

4. Open your browser:

```text
http://127.0.0.1:5000
```

## How to Use

1. Upload your certificate template image.
2. Upload a CSV file (`Name, Email, Course, Date, ...`).
3. Add text boxes and place placeholders in content (for example: `This certifies that {Name}`).
4. Style each text box (font, size, color, bold, italic) and drag/resize as needed.
5. Optional: enable QR and set position/data template.
6. Click **Preview** to generate a sample certificate.
7. Click **Generate** to produce all certificates and get ZIP download.
8. Enter Gmail + App Password and click **Send Emails**.

## Gmail SMTP App Password

For Gmail SMTP, use an **App Password** (not your normal account password):

1. Enable 2-step verification in your Google account.
2. Open Google Account -> Security -> App passwords.
3. Create an app password and paste it into the app's Gmail password field.

## Flask Routes

- `GET /`
- `POST /upload-template`
- `POST /upload-csv`
- `POST /add-text-box`
- `POST /preview`
- `POST /generate`
- `POST /send-email`
- `GET /download/<batch_id>`

## Optional Deployment

### Render

1. Push this project to GitHub.
2. Create a new Render Web Service.
3. Build command: `pip install -r requirements.txt`
4. Start command: `python app.py`
5. Add `PORT` support if needed (for production, use gunicorn with Flask app object).

### Railway

1. Create a new Railway project from your repo.
2. Add Python service.
3. Use the same install and start commands.
4. Set environment values if you externalize config.

## Notes

- Generated files are stored under `output/`.
- QR generation requires `qrcode` (already in `requirements.txt`).
- For production, add authentication and stronger file/path validation.
