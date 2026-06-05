/**
 * @file watermark.js
 * @description Image Watermark Tool – Renderer module.
 * Handles image selection, watermark configuration, canvas-based compositing,
 * and output via Electron IPC with localStorage persistence for recent watermarks.
 */

// ============================================================================
// CONSTANTS & STORAGE
// ============================================================================

const WM_STORAGE_KEY = "wm_recent_watermarks";
const WM_MAX_RECENT  = 6;

// ============================================================================
// MODULE STATE
// ============================================================================

let wmSelectedImages   = [];
let wmWatermarkDataUrl = null;
let wmWatermarkName    = "";
let wmMode             = "corner";
let wmProcessing       = false;
let wmInitialized      = false;
let wmOutputDirectory  = null;  // Chosen once per session via native dialog

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Bootstrap the watermark view.
 * Called by app.js switchView("watermark").
 */
function initWatermarkTool() {
  if (!wmInitialized) {
    bindWatermarkEvents();
    wmInitialized = true;
  }
  renderImageGrid();
  renderWatermarkPreview();
  renderRecentWatermarks();
  updateWmUI();
}

// ============================================================================
// EVENT BINDING
// ============================================================================

function bindWatermarkEvents() {
  // Image file input
  const imageInput = document.getElementById("wm-image-input");
  if (imageInput) imageInput.addEventListener("change", handleImageSelection);

  document.getElementById("wm-select-images-btn")
    ?.addEventListener("click", () => imageInput?.click());

  document.getElementById("wm-clear-images-btn")
    ?.addEventListener("click", clearSelectedImages);

  // Watermark file input
  const wmInput = document.getElementById("wm-watermark-input");
  if (wmInput) wmInput.addEventListener("change", handleWatermarkSelection);

  document.getElementById("wm-select-watermark-btn")
    ?.addEventListener("click", () => wmInput?.click());

  // Drag-and-drop onto drop zone
  const dropZone = document.getElementById("wm-drop-zone");
  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (files.length) appendImages(files);
    });
    dropZone.addEventListener("click", (e) => {
      // Only trigger if clicking directly on the empty-state, not a thumb card
      if (e.target.closest(".wm-thumb-card")) return;
      if (e.target.closest(".wm-thumb-remove")) return;
      if (!wmSelectedImages.length) imageInput?.click();
    });
  }

  // Mode toggle
  document.querySelectorAll('input[name="wm-mode"]').forEach((radio) => {
    radio.addEventListener("change", (e) => { wmMode = e.target.value; });
  });

  // Apply
  document.getElementById("wm-apply-btn")
    ?.addEventListener("click", applyWatermarks);
}

// ============================================================================
// IMAGE SELECTION
// ============================================================================

function handleImageSelection(e) {
  const files = Array.from(e.target.files || []);
  if (files.length) appendImages(files);
  e.target.value = "";
}

function appendImages(files) {
  const existingKeys = new Set(wmSelectedImages.map(f => `${f.name}|${f.size}`));
  files.forEach(file => {
    if (!existingKeys.has(`${file.name}|${file.size}`)) {
      wmSelectedImages.push(file);
      existingKeys.add(`${file.name}|${file.size}`);
    }
  });
  renderImageGrid();
  updateWmUI();
}

function removeSelectedImage(index) {
  wmSelectedImages.splice(index, 1);
  renderImageGrid();
  updateWmUI();
}

function clearSelectedImages() {
  wmSelectedImages  = [];
  wmOutputDirectory = null;  // Reset so next apply re-prompts for folder
  renderImageGrid();
  updateWmUI();
}

// ============================================================================
// WATERMARK SELECTION
// ============================================================================

function handleWatermarkSelection(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    wmWatermarkDataUrl = evt.target.result;
    wmWatermarkName    = file.name;
    addToRecentWatermarks({ name: file.name, dataUrl: evt.target.result });
    renderWatermarkPreview();
    renderRecentWatermarks();
    updateWmUI();
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

function loadRecentWatermark(dataUrl, name) {
  wmWatermarkDataUrl = dataUrl;
  wmWatermarkName    = name;
  addToRecentWatermarks({ name, dataUrl });
  renderWatermarkPreview();
  renderRecentWatermarks();
  updateWmUI();
}

// ============================================================================
// RECENT WATERMARKS (localStorage)
// ============================================================================

function getRecentWatermarks() {
  try { return JSON.parse(localStorage.getItem(WM_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function addToRecentWatermarks(entry) {
  let recents = getRecentWatermarks().filter(r => r.name !== entry.name);
  recents.unshift(entry);
  recents = recents.slice(0, WM_MAX_RECENT);
  try { localStorage.setItem(WM_STORAGE_KEY, JSON.stringify(recents)); }
  catch (err) { console.warn("Could not persist recent watermarks:", err); }
}

function removeRecentWatermark(name) {
  const recents = getRecentWatermarks().filter(r => r.name !== name);
  localStorage.setItem(WM_STORAGE_KEY, JSON.stringify(recents));
  if (wmWatermarkName === name) {
    wmWatermarkDataUrl = null;
    wmWatermarkName    = "";
    renderWatermarkPreview();
    updateWmUI();
  }
  renderRecentWatermarks();
}

// ============================================================================
// CANVAS COMPOSITING HELPERS
// ============================================================================

/**
 * Loads any image source (File or data-URL string) into a fully-decoded
 * HTMLImageElement. Uses img.decode() to guarantee naturalWidth/naturalHeight
 * are populated before the promise resolves — critical for correct sizing.
 */
function loadImageEl(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const finish = () => {
      img.decode()
        .then(() => resolve(img))
        .catch(() => resolve(img)); // decode() unsupported in some envs — still usable
    };
    img.onload  = finish;
    img.onerror = () => reject(new Error(
      `Failed to load image: ${source instanceof File ? source.name : "watermark"}`
    ));
    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Corner mode: watermark height = 15% of base image height, width proportional.
 * Returns pixel dimensions guaranteed > 0 (falls back to 1 if wm has no size).
 */
function calcCornerSize(baseW, baseH, wmW, wmH, fraction = 0.15) {
  const h = Math.max(1, Math.round(baseH * fraction));
  const w = wmH > 0 ? Math.max(1, Math.round((wmW / wmH) * h)) : h;
  return { w, h };
}

/**
 * Full-width mode: watermark width = exact pixel width of the base image.
 * Height is scaled proportionally to preserve the watermark aspect ratio.
 * Returns pixel dimensions guaranteed > 0.
 */
function calcFullWidthSize(baseW, wmW, wmH) {
  const w = baseW;                                         // stretch to full image width
  const h = wmW > 0 ? Math.max(1, Math.round((wmH / wmW) * w)) : 1;
  return { w, h };
}

/**
 * Composites the watermark onto the source image and returns a PNG Blob.
 *
 * Corner mode:
 *   - Canvas = same size as source image.
 *   - Watermark height = 15% of image height, width scaled proportionally.
 *   - Placed bottom-right with a small padding margin.
 *
 * Full-width mode:
 *   - Canvas = same size as source image (no expansion).
 *   - Watermark is scaled so its WIDTH exactly equals the image width.
 *   - Height is derived proportionally from the watermark's own aspect ratio.
 *   - Overlaid at the bottom of the image (y = imageHeight - wmHeight).
 *   - If the scaled watermark is taller than the image, it is capped at the
 *     image height so it never overflows the canvas.
 */
async function compositeImage(imageFile, wmDataUrl, mode, padding = 16) {
  const [baseImg, wmImg] = await Promise.all([
    loadImageEl(imageFile),
    loadImageEl(wmDataUrl),
  ]);

  if (baseImg.naturalWidth === 0 || baseImg.naturalHeight === 0)
    throw new Error(`Source image has zero dimensions: ${imageFile.name}`);
  if (wmImg.naturalWidth === 0 || wmImg.naturalHeight === 0)
    throw new Error("Watermark image has zero dimensions — it may be corrupt or unsupported.");

  const bW = baseImg.naturalWidth;
  const bH = baseImg.naturalHeight;
  const wW = wmImg.naturalWidth;
  const wH = wmImg.naturalHeight;

  // Canvas always matches the source image exactly — no expansion in either mode
  const canvas = document.createElement("canvas");
  canvas.width  = bW;
  canvas.height = bH;
  const ctx = canvas.getContext("2d");

  // Draw the source image first
  ctx.drawImage(baseImg, 0, 0, bW, bH);

  let wmW, wmH, x, y;

  if (mode === "corner") {
    // Watermark height = 15% of image height, width proportional
    wmH = Math.max(1, Math.round(bH * 0.15));
    wmW = wH > 0 ? Math.max(1, Math.round((wW / wH) * wmH)) : wmH;
    x   = bW - wmW - padding;
    y   = bH - wmH - padding;

  } else {
    // Full-width: watermark width == image width, height proportional
    wmW = bW;
    wmH = wW > 0 ? Math.max(1, Math.round((wH / wW) * wmW)) : 1;

    // Cap height so it never exceeds the image (keeps it as an overlay, not a takeover)
    if (wmH > bH) wmH = bH;

    x = 0;
    y = bH - wmH;   // flush to the bottom edge of the image
  }

  ctx.drawImage(wmImg, x, y, wmW, wmH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/png"
    );
  });
}

// ============================================================================
// OUTPUT HELPERS
// ============================================================================

function buildOutputFilename(originalName) {
  const dotIdx = originalName.lastIndexOf(".");
  if (dotIdx === -1) return `${originalName}_wm`;
  return `${originalName.slice(0, dotIdx)}_wm${originalName.slice(dotIdx)}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// CORE APPLY PIPELINE
// ============================================================================

async function applyWatermarks() {
  if (wmProcessing) return;
  if (!wmSelectedImages.length) {
    showWmNotification("Please select at least one image.", "warning");
    return;
  }
  if (!wmWatermarkDataUrl) {
    showWmNotification("Please select a watermark image first.", "warning");
    return;
  }

  wmProcessing = true;
  updateWmUI();

  const applyBtn     = document.getElementById("wm-apply-btn");
  const progressBar  = document.getElementById("wm-progress-bar");
  const progressWrap = document.getElementById("wm-progress-wrap");
  const statusEl     = document.getElementById("wm-status-text");
  const pctEl        = document.getElementById("wm-progress-pct");

  if (applyBtn)     applyBtn.disabled = true;
  if (progressWrap) progressWrap.style.display = "block";

  // ── Ask user for output folder once via native dialog ──────────────────
  // File.path is stripped in sandboxed Electron renderers (contextIsolation:true),
  // so we use a native folder-picker to get a real filesystem path instead.
  if (window.electronAPI?.chooseOutputDirectory) {
    if (!wmOutputDirectory) {
      if (statusEl) statusEl.textContent = "Choose an output folder…";
      const chosen = await window.electronAPI.chooseOutputDirectory();
      if (!chosen) {
        wmProcessing = false;
        if (applyBtn)     applyBtn.disabled = false;
        if (progressWrap) progressWrap.style.display = "none";
        if (statusEl)     statusEl.textContent = "";
        updateWmUI();
        showWmNotification("Cancelled — no output folder selected.", "info");
        return;
      }
      wmOutputDirectory = chosen;
    }
  }

  let successCount = 0;
  let failCount    = 0;
  const total      = wmSelectedImages.length;

  try {
    for (let i = 0; i < total; i++) {
      const file = wmSelectedImages[i];
      const pct = Math.round((i / total) * 100);
      if (statusEl)     statusEl.textContent     = `Processing ${i + 1} of ${total}: ${file.name}`;
      if (progressBar)  progressBar.style.width  = `${pct}%`;
      if (pctEl)        pctEl.textContent         = `${pct}%`;

      try {
        // compositeImage re-decodes both images itself, guaranteeing correct dimensions
        const blob       = await compositeImage(file, wmWatermarkDataUrl, wmMode);
        const base64Data = await blobToBase64(blob);
        const outName    = buildOutputFilename(file.name);

        if (window.electronAPI?.saveWatermarkedImage) {
          await window.electronAPI.saveWatermarkedImage({
            outputDirectory: wmOutputDirectory,
            outputFileName:  outName,
            base64Data,
            mimeType: "image/png",
          });
        } else {
          // Dev / browser fallback: trigger download
          const a    = document.createElement("a");
          a.href     = URL.createObjectURL(blob);
          a.download = outName;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
        failCount++;
      }
    }
  } catch (err) {
    console.error("Watermark pipeline error:", err);
    showWmNotification(`Error: ${err.message}`, "error");
  }

  if (progressBar)  progressBar.style.width  = "100%";
  if (pctEl)        pctEl.textContent         = "100%";
  if (statusEl)     statusEl.textContent     = "";

  setTimeout(() => {
    if (progressWrap) progressWrap.style.display = "none";
    if (progressBar)  progressBar.style.width    = "0%";
  }, 1200);

  wmProcessing = false;
  if (applyBtn) applyBtn.disabled = false;
  updateWmUI();

  if (failCount === 0) {
    const outDir = wmOutputDirectory ? ` → ${wmOutputDirectory}\\watermarked\\` : ' to the "watermarked" folder';
    showWmNotification(
      `✅ Done! ${successCount} image${successCount !== 1 ? "s" : ""} saved${outDir}`,
      "success"
    );
    if (typeof showToast === "function") {
      showToast(`${successCount} image${successCount !== 1 ? "s" : ""} watermarked successfully!`, "success");
    }
  } else {
    showWmNotification(
      `⚠️ Completed with issues: ${successCount} succeeded, ${failCount} failed.`,
      "warning"
    );
  }
}

// ============================================================================
// RENDER HELPERS
// ============================================================================

function renderImageGrid() {
  const grid      = document.getElementById("wm-image-grid");
  const emptyEl   = document.getElementById("wm-image-empty");
  const countEl   = document.getElementById("wm-image-count");
  if (!grid) return;

  if (!wmSelectedImages.length) {
    grid.innerHTML = "";
    if (emptyEl)  emptyEl.style.display  = "flex";
    if (countEl)  countEl.textContent    = "No images selected";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  if (countEl) countEl.textContent   = `${wmSelectedImages.length} image${wmSelectedImages.length !== 1 ? "s" : ""} selected`;

  const frag = document.createDocumentFragment();
  wmSelectedImages.forEach((file, idx) => {
    const card       = document.createElement("div");
    card.className   = "wm-thumb-card";

    const imgWrap    = document.createElement("div");
    imgWrap.className = "wm-thumb-img-wrap";

    const img        = document.createElement("img");
    const objUrl     = URL.createObjectURL(file);
    img.src          = objUrl;
    img.alt          = file.name;
    img.loading      = "lazy";
    img.dataset.objUrl = objUrl;

    const removeBtn  = document.createElement("button");
    removeBtn.className = "wm-thumb-remove";
    removeBtn.title  = "Remove";
    removeBtn.innerHTML = "✕";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      URL.revokeObjectURL(objUrl);
      removeSelectedImage(idx);
    });

    const label      = document.createElement("div");
    label.className  = "wm-thumb-label";
    label.title      = file.name;
    label.textContent = file.name.length > 22
      ? `${file.name.slice(0, 10)}…${file.name.slice(-8)}`
      : file.name;

    imgWrap.append(img, removeBtn);
    card.append(imgWrap, label);
    frag.append(card);
  });

  grid.innerHTML = "";
  grid.append(frag);
}

function renderWatermarkPreview() {
  const preview   = document.getElementById("wm-watermark-preview");
  const nameEl    = document.getElementById("wm-watermark-name");
  const emptyEl   = document.getElementById("wm-watermark-empty");
  const activeBadge = document.getElementById("wm-active-badge");
  if (!preview) return;

  if (!wmWatermarkDataUrl) {
    preview.style.display = "none";
    if (emptyEl)      emptyEl.style.display      = "flex";
    if (nameEl)       nameEl.textContent          = "";
    if (activeBadge)  activeBadge.style.display   = "none";
    return;
  }

  if (emptyEl)      emptyEl.style.display      = "none";
  if (activeBadge)  activeBadge.style.display   = "block";
  preview.style.display = "block";
  preview.src           = wmWatermarkDataUrl;
  if (nameEl) nameEl.textContent = wmWatermarkName;
}

function renderRecentWatermarks() {
  const container = document.getElementById("wm-recents-grid");
  const section   = document.getElementById("wm-recents-section");
  if (!container) return;

  const recents = getRecentWatermarks();
  if (!recents.length) {
    if (section) section.style.display = "none";
    return;
  }
  if (section) section.style.display = "block";

  const frag = document.createDocumentFragment();
  recents.forEach(entry => {
    const card      = document.createElement("div");
    card.className  = "wm-recent-card";
    card.title      = entry.name;
    if (entry.name === wmWatermarkName) card.classList.add("active");

    const img       = document.createElement("img");
    img.src         = entry.dataUrl;
    img.alt         = entry.name;

    const label     = document.createElement("span");
    label.textContent = entry.name.length > 14
      ? `${entry.name.slice(0, 6)}…${entry.name.slice(-6)}`
      : entry.name;

    const removeBtn = document.createElement("button");
    removeBtn.className = "wm-recent-remove";
    removeBtn.title = "Remove from recents";
    removeBtn.innerHTML = "✕";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentWatermark(entry.name);
    });

    card.addEventListener("click", () => loadRecentWatermark(entry.dataUrl, entry.name));
    card.append(img, label, removeBtn);
    frag.append(card);
  });

  container.innerHTML = "";
  container.append(frag);
}

// ============================================================================
// UI STATE SYNC
// ============================================================================

function updateWmUI() {
  const applyBtn  = document.getElementById("wm-apply-btn");
  const clearBtn  = document.getElementById("wm-clear-images-btn");
  const canApply  = wmSelectedImages.length > 0 && !!wmWatermarkDataUrl && !wmProcessing;
  if (applyBtn) applyBtn.disabled = !canApply;
  if (clearBtn) clearBtn.disabled = wmSelectedImages.length === 0;
}

// ============================================================================
// IN-VIEW NOTIFICATION HELPER
// ============================================================================

function showWmNotification(message, type = "info", duration = 5000) {
  const el = document.getElementById("wm-notification");
  if (!el) return;
  el.textContent = message;
  el.className   = `wm-notification wm-notification-${type} visible`;
  clearTimeout(el._hideTimeout);
  el._hideTimeout = setTimeout(() => el.classList.remove("visible"), duration);
}

// Expose initWatermarkTool globally so app.js switchView can call it
window.initWatermarkTool = initWatermarkTool;