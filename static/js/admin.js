const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const adminLoginStatus = document.getElementById("adminLoginStatus");
const adminStatus = document.getElementById("adminStatus");

const cropModal = document.getElementById("cropModal");
const cropCanvas = document.getElementById("cropCanvas");
const cropZoom = document.getElementById("cropZoom");
const cropX = document.getElementById("cropX");
const cropY = document.getElementById("cropY");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const applyCropBtn = document.getElementById("applyCropBtn");

const uploadMap = {
  ad_hero_image: { input: "heroImageInput", preview: "heroPreview" },
  ad_about_image: { input: "aboutImageInput", preview: "aboutPreview" },
  ad_story_image: { input: "storyImageInput", preview: "storyPreview" },
};

const cropState = {
  targetKey: "",
  image: null,
  imageUrl: "",
  zoom: 1,
  focalX: 50,
  focalY: 50,
};

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

async function getJson(url) {
  const res = await fetch(url);
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

function setStatus(message, isError = false) {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.style.color = isError ? "#ff8c9d" : "#d4e4ff";
}

function setLoginStatus(message, isError = false) {
  if (!adminLoginStatus) return;
  adminLoginStatus.textContent = message;
  adminLoginStatus.style.color = isError ? "#ff8ea1" : "#bfe6ca";
}

function refreshPreviews() {
  Object.entries(uploadMap).forEach(([key, cfg]) => {
    const img = document.getElementById(cfg.preview);
    if (!img) return;
    const value = localStorage.getItem(key) || "";
    img.src = value;
    img.style.display = value ? "block" : "none";
  });
}

function toggleAuthPanels(isAuthed) {
  loginPanel?.classList.toggle("hidden", isAuthed);
  adminPanel?.classList.toggle("hidden", !isAuthed);
  if (isAuthed) refreshPreviews();
}

async function checkAuth() {
  try {
    const data = await getJson("/admin/check");
    toggleAuthPanels(Boolean(data.authenticated));
  } catch {
    toggleAuthPanels(false);
  }
}

function computeCropRect(image, zoom, focalX, focalY) {
  const ratio = 16 / 9;
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;

  let maxW;
  let maxH;
  if (iw / ih > ratio) {
    maxH = ih;
    maxW = ih * ratio;
  } else {
    maxW = iw;
    maxH = iw / ratio;
  }

  const cropW = maxW / zoom;
  const cropH = maxH / zoom;

  const cx = (focalX / 100) * iw;
  const cy = (focalY / 100) * ih;

  let sx = cx - cropW / 2;
  let sy = cy - cropH / 2;

  sx = Math.max(0, Math.min(sx, iw - cropW));
  sy = Math.max(0, Math.min(sy, ih - cropH));

  return { sx, sy, sw: cropW, sh: cropH };
}

function renderCropPreview() {
  if (!cropCanvas || !cropState.image) return;
  const ctx = cropCanvas.getContext("2d");
  if (!ctx) return;

  const rect = computeCropRect(cropState.image, cropState.zoom, cropState.focalX, cropState.focalY);
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(
    cropState.image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );
}

function closeCropModal() {
  cropModal?.classList.add("hidden");
  cropState.targetKey = "";
  cropState.image = null;
  cropState.imageUrl = "";
}

function openCropModal(targetKey, file) {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      cropState.targetKey = targetKey;
      cropState.image = image;
      cropState.imageUrl = String(reader.result || "");
      cropState.zoom = 1;
      cropState.focalX = 50;
      cropState.focalY = 50;
      cropZoom.value = "100";
      cropX.value = "50";
      cropY.value = "50";
      cropModal?.classList.remove("hidden");
      renderCropPreview();
    };
    image.src = String(reader.result || "");
  };
  reader.readAsDataURL(file);
}

function handleSelectedFile(file, targetKey) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Please select a valid image file.", true);
    return;
  }
  openCropModal(targetKey, file);
}

function saveCroppedImage() {
  if (!cropState.targetKey || !cropState.image) return;
  try {
    const croppedDataUrl = cropCanvas.toDataURL("image/jpeg", 0.92);
    localStorage.setItem(cropState.targetKey, croppedDataUrl);
    refreshPreviews();
    setStatus("Image saved successfully. Refresh main page tab to see updates.");
    closeCropModal();
  } catch {
    setStatus("Image is too large for browser storage. Try more compression.", true);
  }
}

function clearStoredImage(targetKey) {
  localStorage.removeItem(targetKey);
  refreshPreviews();
  setStatus("Image cleared.");
}

adminLoginBtn?.addEventListener("click", async () => {
  const username = (adminUser?.value || "").trim();
  const password = (adminPass?.value || "").trim();
  if (!username || !password) {
    setLoginStatus("Enter username and password.", true);
    return;
  }

  try {
    await postJson("/admin/login", { username, password });
    setLoginStatus("Login successful.");
    toggleAuthPanels(true);
  } catch (error) {
    setLoginStatus(error.message || "Invalid credentials.", true);
  }
});

adminLogoutBtn?.addEventListener("click", async () => {
  try {
    await postJson("/admin/logout", {});
  } catch {
    // ignore logout network issues on UI
  }
  toggleAuthPanels(false);
});

document.querySelectorAll(".drop-zone").forEach((zone) => {
  const targetKey = zone.getAttribute("data-target") || "";
  const inputId = zone.getAttribute("data-input") || "";
  const input = document.getElementById(inputId);

  zone.addEventListener("click", () => {
    input?.click();
  });

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragover");
    const file = event.dataTransfer?.files?.[0];
    if (!targetKey) return;
    handleSelectedFile(file, targetKey);
  });

  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!targetKey) return;
    handleSelectedFile(file, targetKey);
  });
});

document.querySelectorAll(".clear-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    if (target) clearStoredImage(target);
  });
});

cropZoom?.addEventListener("input", () => {
  cropState.zoom = Number(cropZoom.value || 100) / 100;
  renderCropPreview();
});

cropX?.addEventListener("input", () => {
  cropState.focalX = Number(cropX.value || 50);
  renderCropPreview();
});

cropY?.addEventListener("input", () => {
  cropState.focalY = Number(cropY.value || 50);
  renderCropPreview();
});

cancelCropBtn?.addEventListener("click", closeCropModal);
applyCropBtn?.addEventListener("click", saveCroppedImage);

checkAuth();
