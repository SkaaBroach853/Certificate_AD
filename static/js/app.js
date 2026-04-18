// -----------------------------
// App state
// -----------------------------
const state = {
  templatePath: "",
  csvPath: "",
  batchId: "",
  csvRows: 0,
  textBoxes: [],
  selectedBoxId: null,
};

// -----------------------------
// DOM references
// -----------------------------
const templateInput = document.getElementById("templateInput");
const csvInput = document.getElementById("csvInput");
const controlsPanel = document.getElementById("controlsPanel");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const railButtons = Array.from(document.querySelectorAll(".rail-btn"));
const panelSections = Array.from(document.querySelectorAll(".panel-section"));
const uploadTemplateBtn = document.getElementById("uploadTemplateBtn");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const addTextBoxBtn = document.getElementById("addTextBoxBtn");
const removeTextBoxBtn = document.getElementById("removeTextBoxBtn");
const previewBtn = document.getElementById("previewBtn");
const generateBtn = document.getElementById("generateBtn");
const generateSingleBtn = document.getElementById("generateSingleBtn");
const testSmtpBtn = document.getElementById("testSmtpBtn");
const sendEmailBtn = document.getElementById("sendEmailBtn");
const uploadStatus = document.getElementById("uploadStatus");
const actionStatus = document.getElementById("actionStatus");
const smtpStatus = document.getElementById("smtpStatus");
const csvMeta = document.getElementById("csvMeta");

const templateImage = document.getElementById("templateImage");
const overlay = document.getElementById("overlay");
const canvasWrap = document.getElementById("canvasWrap");
const livePreviewBox = document.getElementById("livePreviewBox");
const previewImage = document.getElementById("previewImage");
const downloadZipLink = document.getElementById("downloadZipLink");
const downloadSingleLink = document.getElementById("downloadSingleLink");

// Text control inputs
const boxContent = document.getElementById("boxContent");
const boxFontFamily = document.getElementById("boxFontFamily");
const boxFontSize = document.getElementById("boxFontSize");
const boxAlign = document.getElementById("boxAlign");
const boxColor = document.getElementById("boxColor");
const boxBold = document.getElementById("boxBold");
const boxItalic = document.getElementById("boxItalic");
const basicColorPalette = document.getElementById("basicColorPalette");

// Output + QR controls
const outputFormat = document.getElementById("outputFormat");
const fileNameTemplate = document.getElementById("fileNameTemplate");
const fileNamePreview = document.getElementById("fileNamePreview");
const qrEnabled = document.getElementById("qrEnabled");
const qrData = document.getElementById("qrData");
const qrX = document.getElementById("qrX");
const qrY = document.getElementById("qrY");
const qrSize = document.getElementById("qrSize");
const singleRowNumber = document.getElementById("singleRowNumber");

// Email controls
const smtpHost = document.getElementById("smtpHost");
const smtpPort = document.getElementById("smtpPort");
const smtpSecurity = document.getElementById("smtpSecurity");
const senderName = document.getElementById("senderName");
const gmailUser = document.getElementById("gmailUser");
const gmailPassword = document.getElementById("gmailPassword");
const emailSubject = document.getElementById("emailSubject");
const emailBody = document.getElementById("emailBody");

function setActiveSidebarPanel(panelName) {
  railButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.panel === panelName);
  });
  panelSections.forEach((section) => {
    section.classList.toggle("active", section.id === `panel-${panelName}`);
  });
  localStorage.setItem("certflow_active_panel", panelName);
}

function setTheme(theme) {
  const resolved = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = resolved;
  if (themeToggleBtn) {
    themeToggleBtn.textContent = resolved === "dark" ? "Light Mode" : "Dark Mode";
  }
  localStorage.setItem("certflow_theme", resolved);
}

if (sidebarToggleBtn && controlsPanel) {
  sidebarToggleBtn.addEventListener("click", () => {
    controlsPanel.classList.toggle("collapsed");
    const collapsed = controlsPanel.classList.contains("collapsed");
    sidebarToggleBtn.textContent = collapsed ? "Expand Sidebar" : "Collapse Sidebar";
    localStorage.setItem("certflow_sidebar_collapsed", collapsed ? "1" : "0");
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  });
}

railButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!btn.dataset.panel) return;
    if (controlsPanel?.classList.contains("collapsed")) {
      controlsPanel.classList.remove("collapsed");
      if (sidebarToggleBtn) sidebarToggleBtn.textContent = "Collapse Sidebar";
      localStorage.setItem("certflow_sidebar_collapsed", "0");
    }
    setActiveSidebarPanel(btn.dataset.panel);
  });
});

const persistedTheme = localStorage.getItem("certflow_theme") || "light";
setTheme(persistedTheme);

const persistedPanel = localStorage.getItem("certflow_active_panel") || "setup";
setActiveSidebarPanel(persistedPanel);

if (controlsPanel && localStorage.getItem("certflow_sidebar_collapsed") === "1") {
  controlsPanel.classList.add("collapsed");
  if (sidebarToggleBtn) sidebarToggleBtn.textContent = "Expand Sidebar";
}


// -----------------------------
// API helpers
// -----------------------------
async function postForm(url, formData) {
  const res = await fetch(url, { method: "POST", body: formData });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || raw || "Request failed");
  return data;
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || raw || "Request failed");
  return data;
}


// -----------------------------
// Upload handlers
// -----------------------------
uploadTemplateBtn.addEventListener("click", async () => {
  const file = templateInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Select a template image first.";
    return;
  }

  try {
    uploadStatus.textContent = "Uploading template...";
    const formData = new FormData();
    formData.append("template", file);

    const data = await postForm("/upload-template", formData);
    state.templatePath = data.template_path;

    templateImage.onload = () => {
      overlay.style.width = `${templateImage.clientWidth}px`;
      overlay.style.height = `${templateImage.clientHeight}px`;
    };
    templateImage.src = `${data.template_url}?t=${Date.now()}`;
    templateImage.style.display = "block";
    if (templateImage.complete) {
      templateImage.onload();
    }

    uploadStatus.textContent = `Template uploaded: ${data.width}x${data.height}`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
});

uploadCsvBtn.addEventListener("click", async () => {
  const file = csvInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Select a CSV file first.";
    return;
  }

  try {
    uploadStatus.textContent = "Uploading CSV...";
    const formData = new FormData();
    formData.append("csv", file);

    const data = await postForm("/upload-csv", formData);
    state.csvPath = data.csv_path;
    state.csvRows = Number(data.rows || 0);

    csvMeta.innerHTML = `
      Rows: <strong>${data.rows}</strong><br>
      Columns: <strong>${data.fieldnames.join(", ")}</strong>
    `;

    uploadStatus.textContent = "CSV uploaded successfully.";
    refreshFileNamePreview();
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
});


// -----------------------------
// Text box rendering and editing
// -----------------------------
function getSelectedBox() {
  return state.textBoxes.find((box) => box.id === state.selectedBoxId);
}

function syncControlPanelFromSelected() {
  const box = getSelectedBox();
  if (!box) return;

  boxContent.value = box.content;
  boxFontFamily.value = box.fontFamily;
  boxFontSize.value = box.fontSize;
  boxAlign.value = box.align || "center";
  boxColor.value = box.color;
  boxBold.checked = Boolean(box.bold);
  boxItalic.checked = Boolean(box.italic);
  updateActiveSwatch(box.color);
}

function applyStyleToElement(element, box) {
  applyBoxFrame(element, box);
  applyBoxVisuals(element, box);
}

function applyBoxFrame(element, box) {
  element.style.left = `${box.x}px`;
  element.style.top = `${box.y}px`;
  element.style.width = `${box.width}px`;
  element.style.height = `${box.height}px`;
}

function applyBoxVisuals(element, box) {
  const content = element.querySelector(".text-box-content");
  content.textContent = box.content;
  content.style.fontFamily = box.fontFamily;
  content.style.fontSize = `${box.fontSize}px`;
  content.style.color = box.color;
  content.style.fontWeight = box.bold ? "700" : "400";
  content.style.fontStyle = box.italic ? "italic" : "normal";
  const resolvedAlign = box.align || "center";
  content.style.textAlign = resolvedAlign;
  content.style.justifyContent = resolvedAlign === "left" ? "flex-start" : resolvedAlign === "right" ? "flex-end" : "center";
}

function renderTextBoxes() {
  overlay.innerHTML = "";

  state.textBoxes.forEach((box) => {
    const element = document.createElement("div");
    element.className = `text-box ${state.selectedBoxId === box.id ? "active" : ""}`;
    element.dataset.id = box.id;

    const content = document.createElement("div");
    content.className = "text-box-content";

    const handle = document.createElement("div");
    handle.className = "resize-handle";

    element.appendChild(content);
    element.appendChild(handle);
    overlay.appendChild(element);

    applyStyleToElement(element, box);

    // Select box on click (not mousedown) to avoid interrupting drag.
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.selectedBoxId !== box.id) {
        state.selectedBoxId = box.id;
        renderTextBoxes();
        syncControlPanelFromSelected();
      }
    });

    // Drag behavior
    element.addEventListener("mousedown", (event) => {
      if (event.target.classList.contains("resize-handle")) return;
      event.preventDefault();
      if (state.selectedBoxId !== box.id) {
        state.selectedBoxId = box.id;
        syncControlPanelFromSelected();
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = box.x;
      const startTop = box.y;
      let rafId = null;
      let pendingPosition = null;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        pendingPosition = {
          // Free move: no boundary clamp, can move naturally.
          x: startLeft + dx,
          y: startTop + dy,
        };

        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          if (pendingPosition) {
            box.x = pendingPosition.x;
            box.y = pendingPosition.y;
            applyBoxFrame(element, box);
          }
          rafId = null;
        });
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    // Resize behavior
    handle.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = box.width;
      const startHeight = box.height;
      let rafId = null;
      let pendingSize = null;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        pendingSize = {
          width: Math.max(80, startWidth + dx),
          height: Math.max(40, startHeight + dy),
        };

        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          if (pendingSize) {
            box.width = pendingSize.width;
            box.height = pendingSize.height;
            applyBoxFrame(element, box);
          }
          rafId = null;
        });
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });
}

async function addTextBox() {
  try {
    const data = await postJson("/add-text-box", {});
    state.textBoxes.push(data);
    state.selectedBoxId = data.id;
    renderTextBoxes();
    syncControlPanelFromSelected();
  } catch (error) {
    actionStatus.textContent = error.message;
  }
}

function removeSelectedBox() {
  if (!state.selectedBoxId) return;
  state.textBoxes = state.textBoxes.filter((box) => box.id !== state.selectedBoxId);
  state.selectedBoxId = state.textBoxes[0]?.id || null;
  renderTextBoxes();
  syncControlPanelFromSelected();
}

addTextBoxBtn.addEventListener("click", addTextBox);
removeTextBoxBtn.addEventListener("click", removeSelectedBox);


// -----------------------------
// Style controls for selected layer
// -----------------------------
function bindInputToSelected(input, key, transform = (v) => v) {
  input.addEventListener("input", () => {
    const box = getSelectedBox();
    if (!box) return;

    box[key] = transform(input.type === "checkbox" ? input.checked : input.value);
    renderTextBoxes();
  });
}

bindInputToSelected(boxContent, "content");
bindInputToSelected(boxFontFamily, "fontFamily");
bindInputToSelected(boxFontSize, "fontSize", (value) => Number(value || 36));
bindInputToSelected(boxAlign, "align");
bindInputToSelected(boxColor, "color");
bindInputToSelected(boxBold, "bold", (value) => Boolean(value));
bindInputToSelected(boxItalic, "italic", (value) => Boolean(value));

boxColor.addEventListener("input", () => {
  updateActiveSwatch(boxColor.value);
});

const BASIC_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00AA00",
  "#0000FF",
  "#FFA500",
  "#FFFF00",
  "#800080",
  "#00CED1",
  "#808080",
];

function normalizeHex(value) {
  return String(value || "").trim().toLowerCase();
}

function updateActiveSwatch(colorValue) {
  if (!basicColorPalette) return;
  const selected = normalizeHex(colorValue);
  basicColorPalette.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", normalizeHex(swatch.dataset.color) === selected);
  });
}

function initBasicColorPalette() {
  if (!basicColorPalette) return;
  basicColorPalette.innerHTML = "";

  BASIC_COLORS.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch";
    swatch.dataset.color = color;
    swatch.style.backgroundColor = color;
    swatch.title = color;

    swatch.addEventListener("click", () => {
      boxColor.value = color;
      const box = getSelectedBox();
      if (box) {
        box.color = color;
        renderTextBoxes();
      }
      updateActiveSwatch(color);
    });

    basicColorPalette.appendChild(swatch);
  });

  updateActiveSwatch(boxColor.value);
}


// -----------------------------
// Generate payload builders
// -----------------------------
function getQrPayload() {
  return {
    enabled: qrEnabled.checked,
    data: qrData.value,
    x: Number(qrX.value || 0),
    y: Number(qrY.value || 0),
    size: Number(qrSize.value || 120),
  };
}

async function refreshFileNamePreview() {
  if (!fileNamePreview) return;
  if (!state.csvPath) {
    fileNamePreview.textContent = "Preview filename: Upload CSV to preview.";
    return;
  }

  try {
    const rowIndex = Number(singleRowNumber.value || 1);
    const data = await postJson("/preview-filename", {
      csv_path: state.csvPath,
      filename_template: fileNameTemplate.value,
      row_index: rowIndex,
      output_format: outputFormat.value,
    });
    fileNamePreview.textContent = `Preview filename: ${data.preview_file_name}`;
  } catch (error) {
    fileNamePreview.textContent = `Preview filename: ${error.message}`;
  }
}

function validateCoreInputs() {
  if (!state.templatePath) throw new Error("Upload a certificate template first.");
  if (!state.csvPath) throw new Error("Upload a CSV file first.");
  if (state.textBoxes.length === 0) throw new Error("Add at least one text box before generating.");
}


// -----------------------------
// Preview + generate actions
// -----------------------------
previewBtn.addEventListener("click", async () => {
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating preview...";

    const data = await postJson("/preview", {
      template_path: state.templatePath,
      csv_path: state.csvPath,
      text_boxes: state.textBoxes,
      qr: getQrPayload(),
    });

    previewImage.src = `${data.preview_url}?t=${Date.now()}`;
    livePreviewBox.classList.remove("hidden");
    actionStatus.textContent = `Preview generated for ${data.sample_row.Name || "first row"}`;
  } catch (error) {
    actionStatus.textContent = error.message;
  }
});

generateBtn.addEventListener("click", async () => {
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating all certificates...";

    const data = await postJson("/generate", {
      template_path: state.templatePath,
      csv_path: state.csvPath,
      text_boxes: state.textBoxes,
      options: {
        output_format: outputFormat.value,
        filename_template: fileNameTemplate.value,
        qr: getQrPayload(),
      },
    });

    state.batchId = data.batch_id;
    downloadZipLink.href = data.zip_download;
    downloadZipLink.classList.remove("hidden");

    actionStatus.textContent = `${data.count} certificates generated. Ready to download or email.`;
  } catch (error) {
    actionStatus.textContent = error.message;
  }
});

generateSingleBtn.addEventListener("click", async () => {
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating single certificate...";

    const data = await postJson("/generate-single", {
      template_path: state.templatePath,
      csv_path: state.csvPath,
      text_boxes: state.textBoxes,
      row_index: Number(singleRowNumber.value || 1),
      options: {
        output_format: outputFormat.value,
        filename_template: fileNameTemplate.value,
        qr: getQrPayload(),
      },
    });

    downloadSingleLink.href = data.download_url;
    downloadSingleLink.classList.remove("hidden");
    actionStatus.textContent = `Single certificate ready for row ${data.row_index} (${data.name || "recipient"}).`;
  } catch (error) {
    actionStatus.textContent = error.message;
  }
});

fileNameTemplate.addEventListener("input", refreshFileNamePreview);
singleRowNumber.addEventListener("input", refreshFileNamePreview);
outputFormat.addEventListener("change", refreshFileNamePreview);

testSmtpBtn.addEventListener("click", async () => {
  try {
    smtpStatus.textContent = "Testing SMTP connection...";
    const data = await postJson("/test-smtp", {
      smtp_host: smtpHost.value || "smtp.gmail.com",
      smtp_port: Number(smtpPort.value || 587),
      smtp_security: smtpSecurity.value || "tls",
      gmail_user: gmailUser.value,
      gmail_app_password: gmailPassword.value,
    });
    smtpStatus.textContent = data.message || "SMTP connection successful.";
  } catch (error) {
    smtpStatus.textContent = error.message;
  }
});


// -----------------------------
// Email sending action
// -----------------------------
sendEmailBtn.addEventListener("click", async () => {
  try {
    if (!state.batchId) throw new Error("Generate certificates before sending emails.");

    actionStatus.textContent = "Sending emails...";

    const data = await postJson("/send-email", {
      batch_id: state.batchId,
      smtp_host: smtpHost.value || "smtp.gmail.com",
      smtp_port: Number(smtpPort.value || 587),
      smtp_security: smtpSecurity.value || "tls",
      sender_name: senderName.value || "",
      gmail_user: gmailUser.value,
      gmail_app_password: gmailPassword.value,
      subject: emailSubject.value || "Your Certificate",
      body: emailBody.value,
    });

    if (data.failed.length > 0) {
      actionStatus.textContent = `Sent ${data.sent}/${data.total}. Failed: ${data.failed.length}.`;
    } else {
      actionStatus.textContent = `All ${data.sent} emails sent successfully.`;
    }
  } catch (error) {
    actionStatus.textContent = error.message;
  }
});


// -----------------------------
// Initialize UI
// -----------------------------
window.addEventListener("resize", () => {
  if (!templateImage.src) return;
  overlay.style.width = `${templateImage.clientWidth}px`;
  overlay.style.height = `${templateImage.clientHeight}px`;
});

canvasWrap.addEventListener("click", (event) => {
  if (event.target === overlay || event.target === canvasWrap || event.target === templateImage) {
    state.selectedBoxId = null;
    renderTextBoxes();
  }
});

// Add first box to reduce setup friction.
addTextBox();
initBasicColorPalette();
refreshFileNamePreview();
