// -----------------------------
// App state
// -----------------------------
const state = {
  templateFile: null,
  templateObjectUrl: "",
  csvFile: null,
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
const sidebarRailToggle = document.getElementById("sidebarRailToggle");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpModalBackdrop = document.getElementById("helpModalBackdrop");
const helpCloseBtn = document.getElementById("helpCloseBtn");
const railButtons = Array.from(document.querySelectorAll(".rail-btn"));
const panelSections = Array.from(document.querySelectorAll(".panel-section"));
const uploadTemplateBtn = document.getElementById("uploadTemplateBtn");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const usePastedCsvBtn = document.getElementById("usePastedCsvBtn");
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
const emailPreviewBtn = document.getElementById("emailPreviewBtn");

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

if (sidebarRailToggle && controlsPanel) {
  sidebarRailToggle.addEventListener("click", () => {
    controlsPanel.classList.toggle("collapsed");
    const collapsed = controlsPanel.classList.contains("collapsed");
    localStorage.setItem("certflow_sidebar_collapsed", collapsed ? "1" : "0");
  });
}

if (controlsPanel) {
  const observer = new MutationObserver(() => {
    const collapsed = controlsPanel.classList.contains("collapsed");
    localStorage.setItem("certflow_sidebar_collapsed", collapsed ? "1" : "0");
  });
  observer.observe(controlsPanel, { attributes: true, attributeFilter: ['class'] });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  });
}

function setHelpModal(open) {
  if (!helpModal) return;
  helpModal.classList.toggle("hidden", !open);
  helpModal.setAttribute("aria-hidden", open ? "false" : "true");
}

if (helpBtn) {
  helpBtn.addEventListener("click", () => setHelpModal(true));
}

if (helpCloseBtn) {
  helpCloseBtn.addEventListener("click", () => setHelpModal(false));
}

if (helpModalBackdrop) {
  helpModalBackdrop.addEventListener("click", () => setHelpModal(false));
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && helpModal && !helpModal.classList.contains("hidden")) {
    setHelpModal(false);
  }
});

railButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!btn.dataset.panel) return;
    if (controlsPanel?.classList.contains("collapsed")) {
      controlsPanel.classList.remove("collapsed");
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

async function postFormForBlob(url, formData) {
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    throw new Error(data.error || raw || "Request failed");
  }
  return {
    blob: await res.blob(),
    headers: res.headers,
  };
}

function clearObjectUrl(currentUrl) {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
  }
}

function clearDownloadLink(link) {
  if (!link) return;
  const current = link.dataset.objectUrl;
  if (current) {
    URL.revokeObjectURL(current);
  }
  link.dataset.objectUrl = "";
  link.href = "#";
  link.classList.add("hidden");
}

function getFilenameFromHeaders(headers, fallback) {
  const disposition = headers.get("Content-Disposition") || "";
  const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch) return decodeURIComponent(starMatch[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch) return plainMatch[1];
  return fallback;
}

function attachBlobToLink(link, blob, filename) {
  clearDownloadLink(link);
  const objectUrl = URL.createObjectURL(blob);
  link.dataset.objectUrl = objectUrl;
  link.href = objectUrl;
  link.download = filename;
  link.classList.remove("hidden");
}

function buildGeneratorFormData() {
  const formData = new FormData();
  formData.append("template", state.templateFile);
  formData.append("csv", state.csvFile);
  return formData;
}

function createCsvFileFromText(csvText) {
  return new File([csvText], "pasted-data.csv", { type: "text/csv" });
}

async function processCsvInput(file, sourceLabel = "CSV") {
  if (!file) {
    throw new Error("No CSV data provided.");
  }

  const formData = new FormData();
  formData.append("csv", file, file.name || "data.csv");
  const data = await postForm("/upload-csv", formData);

  state.csvFile = file;
  state.csvRows = Number(data.rows || 0);
  clearDownloadLink(downloadZipLink);
  clearDownloadLink(downloadSingleLink);

  csvMeta.innerHTML = `
    Rows: <strong>${data.rows}</strong><br>
    Columns: <strong>${data.fieldnames.join(", ")}</strong>
  `;

  const dynamicFields = document.getElementById("csvDynamicFields");
  dynamicFields.innerHTML = "";
  if (data.sample) {
    data.fieldnames.forEach((key) => {
      const value = data.sample[key] ?? "";
      const row = document.createElement("div");
      row.className = "dynamic-field-row";
      row.innerHTML = `
        <div class="dynamic-field-label">${key}:</div>
        <input class="dynamic-field-input" value="${value}" readonly />
      `;
      dynamicFields.appendChild(row);
    });
  }

  uploadStatus.textContent = `${sourceLabel} ready.`;
  await refreshFileNamePreview();
}


// -----------------------------
// Upload handlers
// -----------------------------
function createProgressController(btnId, options = {}) {
  const btn = document.getElementById(btnId);
  if (!btn) return null;

  const {
    estimatedMs = 2500,
    maxAutoProgress = 88,
    label = "Working...",
  } = options;

  const existing = btn.parentNode.querySelector(".progress-container");
  if (existing) existing.remove();

  const container = btn.parentNode.insertBefore(document.createElement("div"), btn.nextSibling);
  container.className = "progress-container";
  container.innerHTML = `
    <div class="progress-bar"><div class="progress-fill"></div></div>
    <div class="progress-label"></div>
  `;
  btn.disabled = true;
  const fill = container.querySelector(".progress-fill");
  const labelNode = container.querySelector(".progress-label");
  labelNode.textContent = label;

  let progress = 0;
  const tickMs = 120;
  const totalTicks = Math.max(8, Math.floor(estimatedMs / tickMs));
  const autoStep = maxAutoProgress / totalTicks;
  const interval = setInterval(() => {
    progress = Math.min(maxAutoProgress, progress + autoStep);
    fill.style.width = `${progress}%`;
    if (progress >= maxAutoProgress) {
      clearInterval(interval);
    }
  }, tickMs);

  const cleanup = (finalProgress, finalLabel, removeDelay = 500) => {
    clearInterval(interval);
    progress = finalProgress;
    fill.style.width = `${finalProgress}%`;
    if (finalLabel) labelNode.textContent = finalLabel;
    window.setTimeout(() => {
      if (container.parentNode) container.remove();
      btn.disabled = false;
    }, removeDelay);
  };

  return {
    setProgress(nextProgress) {
      progress = Math.max(progress, Math.min(100, nextProgress));
      fill.style.width = `${progress}%`;
    },
    setLabel(nextLabel) {
      if (nextLabel) labelNode.textContent = nextLabel;
    },
    complete(nextLabel = "Done") {
      cleanup(100, nextLabel, 400);
    },
    fail(nextLabel = "Failed") {
      container.classList.add("progress-error");
      cleanup(Math.max(progress, 100), nextLabel, 1200);
    },
  };
}

uploadTemplateBtn.addEventListener("click", async () => {
  const progress = createProgressController("uploadTemplateBtn", {
    estimatedMs: 1800,
    label: "Validating template...",
  });
  const file = templateInput.files[0];
  if (!file) {
    progress?.fail("Select template first");
    uploadStatus.textContent = "Select a template image first.";
    return;
  }

  try {
    uploadStatus.textContent = "Checking template...";
    const formData = new FormData();
    formData.append("template", file);

    const data = await postForm("/upload-template", formData);
    state.templateFile = file;
    clearObjectUrl(state.templateObjectUrl);
    state.templateObjectUrl = URL.createObjectURL(file);
    clearDownloadLink(downloadZipLink);
    clearDownloadLink(downloadSingleLink);

    templateImage.onload = () => {
      overlay.style.width = `${templateImage.clientWidth}px`;
      overlay.style.height = `${templateImage.clientHeight}px`;
    };
    templateImage.src = state.templateObjectUrl;
    templateImage.style.display = "block";
    if (templateImage.complete) {
      templateImage.onload();
    }

    uploadStatus.textContent = `Template ready: ${data.width}x${data.height}. Nothing stored on server.`;
    progress?.complete("Template ready");
  } catch (error) {
    uploadStatus.textContent = error.message;
    progress?.fail(error.message);
  }
});

uploadCsvBtn.addEventListener("click", async () => {
  const progress = createProgressController("uploadCsvBtn", {
    estimatedMs: 2200,
    label: "Reading CSV...",
  });
  const file = csvInput.files[0];
  if (!file) {
    progress?.fail("Select CSV first");
    uploadStatus.textContent = "Select a CSV file first or use pasted data below.";
    return;
  }

  try {
    uploadStatus.textContent = "Processing CSV file...";
    await processCsvInput(file, "CSV uploaded");
    progress?.complete("CSV uploaded");
  } catch (error) {
    uploadStatus.textContent = error.message;
    progress?.fail(error.message);
  }
});

if (usePastedCsvBtn) {
  usePastedCsvBtn.addEventListener("click", async () => {
    const progress = createProgressController("usePastedCsvBtn", {
      estimatedMs: 2200,
      label: "Loading pasted data...",
    });
    const csvText = document.getElementById("csvOrTextarea").value.trim();
    if (!csvText) {
      progress?.fail("Paste CSV first");
      uploadStatus.textContent = "Paste CSV text first.";
      return;
    }

    try {
      uploadStatus.textContent = "Processing pasted data...";
      const csvFile = createCsvFileFromText(csvText);
      await processCsvInput(csvFile, "Pasted CSV loaded");
      progress?.complete("Pasted data ready");
    } catch (error) {
      uploadStatus.textContent = error.message;
      progress?.fail(error.message);
    }
  });
}


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
  if (!state.csvFile) {
    fileNamePreview.textContent = "Preview filename: Upload CSV to preview.";
    return;
  }

  try {
    const rowIndex = Number(singleRowNumber.value || 1);
    const formData = new FormData();
    formData.append("csv", state.csvFile);
    formData.append("filename_template", fileNameTemplate.value);
    formData.append("row_index", String(rowIndex));
    formData.append("output_format", outputFormat.value);
    const data = await postForm("/preview-filename", formData);
    fileNamePreview.textContent = `Preview filename: ${data.preview_file_name}`;
  } catch (error) {
    fileNamePreview.textContent = `Preview filename: ${error.message}`;
  }
}

function validateCoreInputs() {
  if (!state.templateFile) throw new Error("Upload a certificate template first.");
  if (!state.csvFile) throw new Error("Upload a CSV file first.");
  if (state.textBoxes.length === 0) throw new Error("Add at least one text box before generating.");
}


// -----------------------------
// Preview + generate actions
// -----------------------------
previewBtn.addEventListener("click", async () => {
  const progress = createProgressController("previewBtn", {
    estimatedMs: 2400,
    label: "Rendering preview...",
  });
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating preview...";

    const formData = buildGeneratorFormData();
    formData.append("text_boxes", JSON.stringify(state.textBoxes));
    formData.append("qr", JSON.stringify(getQrPayload()));

    const data = await postForm("/preview", formData);

    previewImage.src = data.preview_data_url;
    livePreviewBox.classList.remove("hidden");
    actionStatus.textContent = `Preview generated for ${data.sample_row.Name || "first row"}.`;
    progress?.complete("Preview ready");
  } catch (error) {
    livePreviewBox.classList.add("hidden");
    actionStatus.textContent = `Preview failed: ${error.message}`;
    progress?.fail("Preview failed");
  }
});

generateBtn.addEventListener("click", async () => {
  const progress = createProgressController("generateBtn", {
    estimatedMs: 5000,
    label: "Generating certificates...",
  });
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating all certificates...";

    const formData = buildGeneratorFormData();
    formData.append("text_boxes", JSON.stringify(state.textBoxes));
    formData.append(
      "options",
      JSON.stringify({
        output_format: outputFormat.value,
        filename_template: fileNameTemplate.value,
        qr: getQrPayload(),
      })
    );

    const { blob, headers } = await postFormForBlob("/generate", formData);
    const count = Number(headers.get("X-Certificate-Count") || 0);
    const fileName = getFilenameFromHeaders(headers, "certificates.zip");
    attachBlobToLink(downloadZipLink, blob, fileName);

    actionStatus.textContent = `${count || state.csvRows} certificates generated. ZIP is ready to download. Nothing was stored on the server.`;
    progress?.complete(`${count || state.csvRows} certificates ready`);
  } catch (error) {
    actionStatus.textContent = `Generate failed: ${error.message}`;
    progress?.fail("Generate failed");
  }
});

generateSingleBtn.addEventListener("click", async () => {
  const progress = createProgressController("generateSingleBtn", {
    estimatedMs: 2600,
    label: "Generating single certificate...",
  });
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating single certificate...";

    const rowIndex = Number(singleRowNumber.value || 1);
    const formData = buildGeneratorFormData();
    formData.append("text_boxes", JSON.stringify(state.textBoxes));
    formData.append("row_index", String(rowIndex));
    formData.append(
      "options",
      JSON.stringify({
        output_format: outputFormat.value,
        filename_template: fileNameTemplate.value,
        qr: getQrPayload(),
      })
    );

    const { blob, headers } = await postFormForBlob("/generate-single", formData);
    const fileName = getFilenameFromHeaders(headers, `certificate_row_${rowIndex}`);
    const recipientName = headers.get("X-Recipient-Name") || "recipient";
    attachBlobToLink(downloadSingleLink, blob, fileName);
    actionStatus.textContent = `Single certificate ready for row ${rowIndex} (${recipientName}).`;
    progress?.complete("Single certificate ready");
  } catch (error) {
    actionStatus.textContent = `Single generate failed: ${error.message}`;
    progress?.fail("Single generate failed");
  }
});

fileNameTemplate.addEventListener("input", refreshFileNamePreview);
singleRowNumber.addEventListener("input", refreshFileNamePreview);
outputFormat.addEventListener("change", refreshFileNamePreview);

testSmtpBtn.addEventListener("click", async () => {
  const progress = createProgressController("testSmtpBtn", {
    estimatedMs: 2400,
    label: "Testing SMTP...",
  });
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
    progress?.complete("SMTP verified");
  } catch (error) {
    smtpStatus.textContent = error.message;
    progress?.fail("SMTP failed");
  }
});


// -----------------------------
// Email sending action
// -----------------------------
function showEmailPreview() {
  if (!state.csvRows) {
    actionStatus.textContent = "Upload CSV first to preview email.";
    return;
  }
  const sender = gmailUser.value || "sender@example.com";
  const subjectText = emailSubject.value || "Your Certificate";
  const bodyText = emailBody.value.replace(/\n/g, '<br>');
  const previewHTML = `
    <div style="max-width: 600px; font-family: Arial, sans-serif; border: 1px solid #cfd8e3; border-radius: 8px; overflow: hidden; background: #ffffff; color: #1f2937;">
      <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #d9e2ec; color: #334155;">
        <strong>From:</strong> ${sender}<br>
        <strong>To:</strong> recipient@example.com<br>
        <strong>Subject:</strong> ${subjectText}
      </div>
      <div style="padding: 20px; line-height: 1.6; background: #ffffff; color: #1f2937;">
        ${bodyText.replace(/{[^}]+}/g, '<strong style="color: #007bff;">[Dynamic Value]</strong>')}
      </div>
      <div style="background: #f8fafc; padding: 12px 20px; border-top: 1px solid #d9e2ec; color: #475569; font-size: 0.9em;">
        Attached: certificate.png [Certificate ID: CERT-YYYYMMDD-001-ABC123]
      </div>
    </div>
  `;
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;';
  modal.innerHTML = `
    <div style="background: var(--surface, #ffffff); color: var(--text, #eaf2ff); border: 1px solid var(--line, rgba(159, 191, 240, 0.28)); border-radius: 12px; padding: 24px; max-width: 90vw; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; color: var(--text, #eaf2ff);">
        <h3 style="margin: 0; color: var(--text, #eaf2ff);">Email Preview</h3>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: var(--text, #eaf2ff); font-size: 1.5rem; cursor: pointer;">×</button>
      </div>
      <div id="emailPreviewContent">${previewHTML}</div>
    </div>
  `;
  document.body.appendChild(modal);
}

if (emailPreviewBtn) {
  emailPreviewBtn.addEventListener("click", showEmailPreview);
}

sendEmailBtn.addEventListener("click", async () => {
  const totalRecipients = Math.max(state.csvRows || 0, 1);
  const progress = createProgressController("sendEmailBtn", {
    estimatedMs: Math.max(5000, totalRecipients * 900),
    maxAutoProgress: 94,
    label: `Preparing 0 of ${totalRecipients} emails...`,
  });
  let simulatedSent = 0;
  const perStepMs = Math.max(700, Math.min(1600, Math.round(9000 / totalRecipients)));
  const liveTicker = window.setInterval(() => {
    if (simulatedSent >= Math.max(totalRecipients - 1, 0)) return;
    simulatedSent += 1;
    const ratio = totalRecipients > 0 ? simulatedSent / totalRecipients : 0;
    progress?.setProgress(8 + ratio * 84);
    progress?.setLabel(`Sending ${simulatedSent} of ${totalRecipients} emails...`);
    actionStatus.textContent = `Sending emails... ${simulatedSent} of ${totalRecipients} processed.`;
  }, perStepMs);
  try {
    validateCoreInputs();
    actionStatus.textContent = "Generating certificates and sending emails...";

    const formData = buildGeneratorFormData();
    formData.append("text_boxes", JSON.stringify(state.textBoxes));
    formData.append(
      "options",
      JSON.stringify({
        output_format: outputFormat.value,
        filename_template: fileNameTemplate.value,
        qr: getQrPayload(),
      })
    );
    formData.append("smtp_host", smtpHost.value || "smtp.gmail.com");
    formData.append("smtp_port", String(Number(smtpPort.value || 587)));
    formData.append("smtp_security", smtpSecurity.value || "tls");
    formData.append("sender_name", senderName.value || "");
    formData.append("gmail_user", gmailUser.value);
    formData.append("gmail_app_password", gmailPassword.value);
    formData.append("subject", emailSubject.value || "Your Certificate");
    formData.append("body", emailBody.value);

    const data = await postForm("/send-email", formData);
    window.clearInterval(liveTicker);
    progress?.setProgress(100);
    progress?.setLabel(`Sent ${data.sent} of ${data.total} emails`);

    if (data.failed.length > 0) {
      actionStatus.textContent = `Sent ${data.sent}/${data.total}. Failed: ${data.failed.length}. No files were stored on the server.`;
    } else {
      actionStatus.textContent = `All ${data.sent} emails sent successfully. No files were stored on the server.`;
    }
    progress?.complete(`Sent ${data.sent}/${data.total} emails`);
  } catch (error) {
    window.clearInterval(liveTicker);
    actionStatus.textContent = error.message;
    progress?.fail("Email sending failed");
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
