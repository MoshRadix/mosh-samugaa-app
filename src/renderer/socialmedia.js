/**
 * @file socialmedia.js
 * @description Social Media Templates – canvas-based image editor with
 * draggable/resizable text fields, bilingual (English + Thaana/Dhivehi)
 * support, placeholder system, and PNG export.
 *
 * Storage: templates are persisted as JSON files + separate image files
 * under <templatesDir>/social-media/ via IPC (sm-* channels).
 */

// ============================================================================
// MODULE STATE
// ============================================================================

let smInitialized   = false;
let smTemplates     = [];          // metadata list (no imageDataUrl)
let smActiveTemplate = null;       // template open in editor (may have imageDataUrl)
let smFields        = [];          // fields on current canvas
let smSelectedField = null;
let smImage         = null;        // loaded Image object
let smImageDataUrl  = null;        // data URL of background

// drag / resize state
let smDragState = null;
let smUnsaved   = false;   // tracks unsaved changes in editor

// resize handle hit radius (px)
const SM_HANDLE = 10;

// canvas refs
let smCanvas = null;
let smCtx    = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initSocialMedia() {
  if (!smInitialized) {
    smBindStaticEvents();
    smInitialized = true;
  }
  smLoadAndRenderList();
  smShowPanel("sm-list-panel");
}

// ============================================================================
// UNSAVED CHANGES
// ============================================================================

function smMarkDirty() {
  smUnsaved = true;
  smUpdateUnsavedIndicator(true);
}

function smUpdateUnsavedIndicator(dirty) {
  const btn = document.getElementById("sm-save-template-btn");
  const dot = document.getElementById("sm-unsaved-dot");
  if (dot) dot.style.display = dirty ? "inline-block" : "none";
  if (btn) btn.classList.toggle("sm-save-btn--dirty", dirty);
}

// ============================================================================
// IPC HELPERS
// ============================================================================

async function smIPC(method, ...args) {
  if (!window.electronAPI || typeof window.electronAPI[method] !== "function") {
    throw new Error(`electronAPI.${method} is not available`);
  }
  return window.electronAPI[method](...args);
}

// ============================================================================
// FIELD INPUT HISTORY
// Stores last 3 values per field (keyed by templateId:fieldId) in localStorage
// ============================================================================

const SM_HISTORY_KEY = "sm_field_history_v1";
const SM_HISTORY_MAX = 3;

function smHistoryLoad() {
  try { return JSON.parse(localStorage.getItem(SM_HISTORY_KEY) || "{}"); }
  catch { return {}; }
}

function smHistorySave(obj) {
  try { localStorage.setItem(SM_HISTORY_KEY, JSON.stringify(obj)); } catch {}
}

function smHistoryGet(tplId, fieldId) {
  const h = smHistoryLoad();
  return h[`${tplId}:${fieldId}`] || [];
}

function smHistoryPush(tplId, fieldId, value) {
  if (!value || !value.trim()) return;
  const h   = smHistoryLoad();
  const key = `${tplId}:${fieldId}`;
  const arr = h[key] || [];
  const updated = [value, ...arr.filter(v => v !== value)].slice(0, SM_HISTORY_MAX);
  h[key] = updated;
  smHistorySave(h);
}

// ============================================================================
// TEMPLATE LIST
// ============================================================================

async function smLoadAndRenderList() {
  smShowLoading(true);
  try {
    smTemplates = await smIPC("smListTemplates");
  } catch (e) {
    console.warn("SM: smListTemplates IPC unavailable, using empty list.", e.message);
    smTemplates = [];
  } finally {
    smShowLoading(false);
  }
  smRenderTemplateList();
}

function smShowLoading(on) {
  const el = document.getElementById("sm-list-loading");
  if (el) el.style.display = on ? "flex" : "none";
  const grid = document.getElementById("sm-template-grid");
  if (grid) grid.style.opacity = on ? "0.4" : "1";
}

function smRenderTemplateList() {
  const grid = document.getElementById("sm-template-grid");
  if (!grid) return;

  const searchEl = document.getElementById("sm-search-input");
  const query = (searchEl ? searchEl.value.trim().toLowerCase() : "");
  const filtered = query
    ? smTemplates.filter(t => (t.name || "").toLowerCase().includes(query))
    : smTemplates;

  if (!filtered || filtered.length === 0) {
    grid.innerHTML = `
      <div class="sm-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>${query ? `No templates matching "<strong>${smEscape(query)}</strong>"` : "No templates yet. Click <strong>New Template</strong> to create one."}</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((t) => `
    <div class="sm-template-card" data-id="${smEscape(t.id)}">
      <div class="sm-card-thumb">
        ${t.imageThumbnail
          ? `<img src="${t.imageThumbnail}" alt="${smEscape(t.name)}">`
          : `<div class="sm-card-thumb-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
        }
        <div class="sm-card-thumb-actions">
          <button class="sm-icon-btn sm-open-btn" data-id="${smEscape(t.id)}" title="Edit template">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="sm-icon-btn sm-icon-btn--danger sm-delete-btn" data-id="${smEscape(t.id)}" title="Delete template">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
      <div class="sm-card-info">
        <div class="sm-card-name">${smEscape(t.name)}</div>
        <div class="sm-card-meta">${(t.fields || []).length} field${(t.fields || []).length !== 1 ? "s" : ""} · ${t.savedAt ? new Date(t.savedAt).toLocaleDateString() : "—"}</div>
      </div>
      <div class="sm-card-actions">
        <button class="btn btn-primary sm-generate-btn sm-generate-btn--full" data-id="${smEscape(t.id)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          Generate Image
        </button>
      </div>
    </div>`).join("");

  grid.querySelectorAll(".sm-open-btn").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); smOpenEditor(btn.dataset.id); });
  });
  grid.querySelectorAll(".sm-generate-btn").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); smOpenGenerate(btn.dataset.id); });
  });
  grid.querySelectorAll(".sm-delete-btn").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); smConfirmDelete(btn.dataset.id); });
  });
}

function smConfirmDelete(id) {
  const tpl = smTemplates.find(t => t.id === id);
  const name = tpl ? tpl.name : id;
  const doDelete = async () => {
    try {
      await smIPC("smDeleteTemplate", id);
      smNotify(`"${name}" deleted.`, "success");
      smLoadAndRenderList();
    } catch (e) {
      smNotify("Delete failed: " + e.message, "error");
    }
  };
  if (typeof showConfirm === "function") {
    showConfirm(`Delete "${name}"? This cannot be undone.`, doDelete);
  } else if (confirm(`Delete "${name}"?`)) {
    doDelete();
  }
}

// ============================================================================
// EDITOR
// ============================================================================

async function smOpenEditor(id) {
  smActiveTemplate = null;
  smFields = [];
  smImage = null;
  smImageDataUrl = null;
  smSelectedField = null;
  smUnsaved = false;

  if (id) {
    try {
      smActiveTemplate = await smIPC("smLoadTemplate", id);
      smFields = (smActiveTemplate.fields || []).map(f => ({ ...f }));
      smImageDataUrl = smActiveTemplate.imageDataUrl || null;
    } catch (e) {
      smNotify("Could not load template: " + e.message, "error");
      return;
    }
  } else {
    smActiveTemplate = { name: "Untitled Template", fields: [] };
  }

  smShowPanel("sm-editor-panel");
  document.getElementById("sm-template-name-input").value = smActiveTemplate.name || "";
  smUpdateUnsavedIndicator(false);

  const imgStatus = document.getElementById("sm-image-status");
  if (imgStatus) {
    imgStatus.textContent = smActiveTemplate.imageName
      ? `Image: ${smActiveTemplate.imageName}`
      : "No image selected";
  }

  smUpdateFieldList();
  smInitCanvas();
}

function smInitCanvas() {
  smCanvas = document.getElementById("sm-canvas");
  smCtx = smCanvas ? smCanvas.getContext("2d") : null;

  if (smImageDataUrl) {
    const img = new Image();
    img.onload = () => { smImage = img; smFitCanvas(); smDrawCanvas(); };
    img.src = smImageDataUrl;
  } else {
    if (smCanvas) { smCanvas.width = 600; smCanvas.height = 400; }
    smDrawCanvas();
  }
}

function smFitCanvas() {
  if (!smCanvas || !smImage) return;
  const wrapper = document.getElementById("sm-canvas-wrapper");
  // Measure the available space inside the canvas area, with padding
  const pad  = 48;
  const maxW = wrapper ? Math.max(200, wrapper.clientWidth  - pad) : 800;
  const maxH = wrapper ? Math.max(200, wrapper.clientHeight - pad) : 600;
  const scale = Math.min(1, maxW / smImage.naturalWidth, maxH / smImage.naturalHeight);
  smCanvas.width  = Math.round(smImage.naturalWidth  * scale);
  smCanvas.height = Math.round(smImage.naturalHeight * scale);
  smCanvas.dataset.scale = scale;
}

function smDrawCanvas() {
  if (!smCtx || !smCanvas) return;
  document.fonts.ready.then(() => {
    smCtx.clearRect(0, 0, smCanvas.width, smCanvas.height);

    if (!smImage) {
      smCtx.fillStyle = "#e4e8e6";
      smCtx.fillRect(0, 0, smCanvas.width, smCanvas.height);
      const cs = 20;
      smCtx.fillStyle = "#d6dbd9";
      for (let y = 0; y < smCanvas.height; y += cs)
        for (let x = 0; x < smCanvas.width; x += cs)
          if ((Math.floor(x/cs) + Math.floor(y/cs)) % 2 === 0)
            smCtx.fillRect(x, y, cs, cs);
      smCtx.fillStyle = "#6b7c73";
      smCtx.font = "14px Inter, sans-serif";
      smCtx.textAlign = "center";
      smCtx.fillText("Upload an image to begin", smCanvas.width / 2, smCanvas.height / 2);
      smCtx.textAlign = "left";
    } else {
      smCtx.drawImage(smImage, 0, 0, smCanvas.width, smCanvas.height);
    }

    smFields.forEach(f => smDrawField(f));
  });
}

function smDrawField(f) {
  if (!smCtx) return;
  const isDh       = f.language === "dhivehi";
  const fontFamily = f.font || (isDh ? "'MV Faruma', serif" : "Inter, sans-serif");
  const fontSize   = f.size || 20;

  smCtx.save();
  smCtx.font        = `${f.bold ? "bold " : ""}${fontSize}px ${fontFamily}`;
  smCtx.fillStyle   = f.color || "#ffffff";
  smCtx.textBaseline = "top";
  smCtx.direction   = isDh ? "rtl" : "ltr";
  smCtx.shadowColor = "rgba(0,0,0,0.55)";
  smCtx.shadowBlur  = 4;
  smCtx.shadowOffsetX = 1;
  smCtx.shadowOffsetY = 1;

  const lines = smWrapText(smCtx, f.text || f.placeholder, f.w);
  let lineY = f.y;
  lines.forEach(line => {
    let drawX = f.x;
    if (f.align === "center")         { smCtx.textAlign = "center"; drawX = f.x + f.w / 2; }
    else if (f.align === "right" || isDh) { smCtx.textAlign = "right";  drawX = f.x + f.w; }
    else                              { smCtx.textAlign = "left"; }
    smCtx.fillText(line, drawX, lineY);
    lineY += fontSize * 1.3;
  });
  smCtx.restore();

  // Selection outline
  if (smSelectedField && smSelectedField.id === f.id) {
    smCtx.save();
    smCtx.strokeStyle = "#6c8b7a";
    smCtx.lineWidth = 1.5;
    smCtx.setLineDash([5, 3]);
    smCtx.strokeRect(f.x, f.y, f.w, f.h);
    smCtx.setLineDash([]);
    [[f.x, f.y], [f.x+f.w, f.y], [f.x, f.y+f.h], [f.x+f.w, f.y+f.h]].forEach(([hx, hy]) => {
      smCtx.fillStyle = "#ffffff";
      smCtx.fillRect(hx - SM_HANDLE/2, hy - SM_HANDLE/2, SM_HANDLE, SM_HANDLE);
      smCtx.strokeStyle = "#6c8b7a";
      smCtx.lineWidth = 1.5;
      smCtx.strokeRect(hx - SM_HANDLE/2, hy - SM_HANDLE/2, SM_HANDLE, SM_HANDLE);
    });
    smCtx.restore();
  } else {
    smCtx.save();
    smCtx.strokeStyle = "rgba(108,139,122,0.4)";
    smCtx.lineWidth = 1;
    smCtx.setLineDash([4, 3]);
    smCtx.strokeRect(f.x, f.y, f.w, f.h);
    smCtx.setLineDash([]);
    smCtx.restore();
  }
}

function smWrapText(ctx, text, maxW) {
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach(word => {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width <= maxW) { current = test; }
    else { if (current) lines.push(current); current = word; }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Draw field text overlays onto any canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} fields  — field definitions
 * @param {Object} values — { [fieldId]: string }
 * @param {number} sx     — horizontal scale (ctx coords / editor coords)
 * @param {number} sy     — vertical scale
 */
function smDrawFieldsOntoCtx(ctx, fields, values, sx, sy) {
  const s = Math.min(sx, sy);
  fields.forEach(f => {
    const userText = ((values && values[f.id]) || "").trim() || f.placeholder;
    const isDh     = f.language === "dhivehi";
    const fontFam  = f.font || (isDh ? "'MV Faruma', serif" : "Inter, sans-serif");
    const fontSize = (f.size || 20) * s;

    ctx.save();
    ctx.font         = `${f.bold ? "bold " : ""}${fontSize}px ${fontFam}`;
    ctx.fillStyle    = f.color || "#ffffff";
    ctx.textBaseline = "top";
    ctx.direction    = isDh ? "rtl" : "ltr";
    ctx.shadowColor  = "rgba(0,0,0,0.55)";
    ctx.shadowBlur   = 4 * s;
    ctx.shadowOffsetX = sx;
    ctx.shadowOffsetY = sy;

    const fieldW = f.w * sx;
    const lines  = smWrapText(ctx, userText, fieldW);
    let lineY = f.y * sy;
    lines.forEach(line => {
      let drawX = f.x * sx;
      if (f.align === "center")             { ctx.textAlign = "center"; drawX += fieldW / 2; }
      else if (f.align === "right" || isDh) { ctx.textAlign = "right";  drawX += fieldW; }
      else                                  { ctx.textAlign = "left"; }
      ctx.fillText(line, drawX, lineY);
      lineY += fontSize * 1.3;
    });
    ctx.restore();
  });
}

// ============================================================================
// THAANA TRANSLITERATION
// Standard Maldivian phonetic keyboard layout (matches Windows Dhivehi keyboard)
// ============================================================================

const SM_THAANA_MAP = {
  // Lowercase → Thaana letters (unshifted)
  'q': 'ް',  // Sukun
  'w': 'އ',  // Alef
  'e': 'ެ',  // Ebefili
  'r': 'ރ',  // Raa
  't': 'ތ',  // Thaa
  'y': 'ޔ',  // Yaa
  'u': 'ު',  // Ufili
  'i': 'ި',  // Ikifili
  'o': 'ޮ',  // Oadufili
  'p': 'ޕ',  // Paa
  'a': 'ަ',  // Abafili
  's': 'ސ',  // Sin
  'd': 'ދ',  // Daal
  'f': 'ފ',  // Faa
  'g': 'ގ',  // Gaaf
  'h': 'ހ',  // Haa
  'j': 'ޖ',  // Jeem
  'k': 'ކ',  // Kaf
  'l': 'ލ',  // Lam
  'z': 'ޒ',  // Zain
  'x': 'ޚ',  // Khaa
  'c': 'ޗ',  // Chaa
  'v': 'ވ',  // Vav
  'b': 'ބ',  // Baa
  'n': 'ނ',  // Nun
  'm': 'މ',  // Meem
  // Uppercase → Thaana letters (shifted)
  'Q': 'ޤ',  // Qaf
  'W': 'ޢ',  // Ain
  'E': 'ޭ',  // Eebeefili
  'R': 'ޜ',  // Rav (alternate)
  'T': 'ޓ',  // Ttaa
  'Y': '،',  // Arabic comma
  'U': 'ޫ',  // Uubigoafili
  'I': 'ީ',  // Iibifili
  'O': 'ޯ',  // Ooaafili
  'P': '÷',  // Divides (punctuation)
  'A': 'ާ',  // Aabaafili
  'S': 'ށ',  // Shaviyani
  'D': 'ޑ',  // Ddaal
  'F': 'ﷲ', // Allah (ligature)
  'G': 'ޣ',  // Ghain
  'H': 'ޙ',  // Hha
  'J': 'ޛ',  // Ddha
  'K': 'ޥ',  // Waav
  'L': 'ޅ',  // Lhaviyani
  'Z': 'ޡ',  // Zaain
  'X': 'ޝ',  // Shaaf (Shin)
  'C': 'ޘ',  // Thaa (with dots)
  'V': 'ޥ',  // Waav
  'B': 'ޞ',  // Saadhu
  'N': 'ޏ',  // Gnaafu
  'M': 'ޟ',  // Dhoadhu
  // Digits stay as-is; punctuation mapped
  ',': '،',  // Arabic comma
  '.': '.',
  ';': '؛',  // Arabic semicolon
  '?': '؟',  // Arabic question mark
};

/**
 * Attach Thaana transliteration to an input or textarea element.
 * Intercepts keydown, converts to Thaana, inserts at cursor position.
 */
function smAttachThaanaInput(el) {
  if (!el || el._thaanaAttached) return;
  el._thaanaAttached = true;

  el.addEventListener("keydown", e => {
    // Pass through: control keys, arrows, backspace, delete, tab, enter
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["Backspace","Delete","ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
         "Home","End","Tab","Enter","Escape"].includes(e.key)) return;

    const thaana = SM_THAANA_MAP[e.key];
    if (!thaana) return; // unmapped key (digits, etc.) — pass through

    e.preventDefault();

    // Insert at cursor, replacing any selection
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const val   = el.value;
    el.value = val.slice(0, start) + thaana + val.slice(end);
    // Place cursor after inserted character
    el.selectionStart = el.selectionEnd = start + thaana.length;

    // Trigger change event so live preview updates
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/**
 * Attach custom autocomplete behaviour to a text input.
 * Suggestions are stored in data-options (separated by ،).
 */
function smAttachAutocomplete(inp, isDhivehi) {
  if (!inp || inp._acAttached) return;
  inp._acAttached = true;

  const list = inp.closest(".sm-ac-wrap")?.querySelector(".sm-ac-list");
  if (!list) return;

  const allOptions = () =>
    (inp.dataset.options || "").split(/[,،]/).map(s => s.trim()).filter(Boolean);

  function showList(items) {
    if (!items.length) { list.style.display = "none"; return; }
    list.innerHTML = items.map((opt, i) =>
      `<li class="sm-ac-item ${isDhivehi ? "sm-ac-item--dh" : ""}" data-index="${i}"
        dir="${isDhivehi ? "rtl" : "ltr"}">${smEscape(opt)}</li>`
    ).join("");
    list.style.display = "block";

    list.querySelectorAll(".sm-ac-item").forEach(li => {
      li.addEventListener("mousedown", e => {
        e.preventDefault(); // prevent blur before click
        inp.value = items[parseInt(li.dataset.index)];
        inp.dispatchEvent(new Event("input",  { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
        list.style.display = "none";
        inp.focus();
      });
    });
  }

  inp.addEventListener("input", () => {
    const q    = inp.value.trim().toLowerCase();
    const opts = allOptions();
    const filtered = q
      ? opts.filter(o => o.toLowerCase().includes(q))
      : opts;
    showList(filtered);
  });

  // Show all on focus if empty
  inp.addEventListener("focus", () => {
    if (!inp.value.trim()) showList(allOptions());
  });

  inp.addEventListener("blur", () => {
    // Small delay so mousedown on list item fires first
    setTimeout(() => { list.style.display = "none"; }, 150);
  });

  // Keyboard navigation
  inp.addEventListener("keydown", e => {
    if (list.style.display === "none") return;
    const items = list.querySelectorAll(".sm-ac-item");
    const active = list.querySelector(".sm-ac-active");
    let idx = active ? parseInt(active.dataset.index) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      idx = Math.min(idx + 1, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
    } else if (e.key === "Enter" && active) {
      e.preventDefault();
      active.dispatchEvent(new MouseEvent("mousedown"));
      return;
    } else if (e.key === "Escape") {
      list.style.display = "none";
      return;
    } else { return; }

    items.forEach(li => li.classList.remove("sm-ac-active"));
    if (items[idx]) items[idx].classList.add("sm-ac-active");
  });
}

const SM_FONTS_ENGLISH = [
  { label: "Inter (Default)",   value: "Inter, sans-serif" },
  { label: "Arial",             value: "Arial, sans-serif" },
  { label: "Georgia",           value: "Georgia, serif" },
  { label: "Times New Roman",   value: "'Times New Roman', serif" },
  { label: "Courier New",       value: "'Courier New', monospace" },
  { label: "Impact",            value: "Impact, sans-serif" },
  { label: "Oswald",            value: "Oswald, sans-serif" },
];

const SM_FONTS_DHIVEHI = [
  { label: "Faruma",               value: "'MV Faruma', serif" },
  { label: "MV Alram",             value: "'MV Alram', serif" },
  { label: "MV Izyanreethi Bold",  value: "'MV Izyanreethi Bold', serif" },
  { label: "MV Izyan Regular",     value: "'MV Izyan', serif" },
];

/**
 * Repopulate #sm-fe-font options based on current language selection.
 * Preserves the current value if it exists in the new list.
 */
function smUpdateFontOptions(language) {
  const sel  = document.getElementById("sm-fe-font");
  if (!sel) return;
  const list = language === "dhivehi" ? SM_FONTS_DHIVEHI : SM_FONTS_ENGLISH;
  const prev = sel.value;
  sel.innerHTML = list.map(f =>
    `<option value="${f.value}"${f.value === prev ? " selected" : ""}>${f.label}</option>`
  ).join("");
  // If previous value isn't in the new list, default to first option
  if (!list.find(f => f.value === prev)) sel.value = list[0].value;
}

// ============================================================================
// FIELD MANAGEMENT
// ============================================================================

function smAddField() {
  const id = "f_" + Date.now();
  const field = {
    id,
    type:        "text",
    label:       "",
    placeholder: `{Field_${smFields.length + 1}}`,
    text:        `{Field_${smFields.length + 1}}`,
    options:     [],          // used when type === "dropdown"
    font: "Inter, sans-serif",
    size: 24, color: "#ffffff", align: "left", language: "english", bold: false,
    x: 30, y: 30 + smFields.length * 50, w: 280, h: 60,
  };
  smFields.push(field);
  smSelectField(field);
  smMarkDirty();
  smUpdateFieldList();
  smDrawCanvas();
}

function smSelectField(field) {
  smSelectedField = field;
  smDrawCanvas();
}

function smUpdateFieldList() {
  const list = document.getElementById("sm-field-list");
  if (!list) return;
  if (smFields.length === 0) {
    list.innerHTML = `<div class="sm-field-list-empty">No fields yet. Click "Add Field" to begin.</div>`;
    return;
  }
  list.innerHTML = smFields.map(f => {
    const isOpen   = smSelectedField && smSelectedField.id === f.id;
    const isDh     = f.language === "dhivehi";
    const type     = f.type || "text";
    const typeIcon = type === "dropdown"
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`
      : type === "textarea"
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>`
      : type === "autocomplete"
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
      : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"/></svg>`;
    const showOptions = type === "dropdown" || type === "autocomplete";
    const showPreview = type !== "dropdown";
    const fontOpts = (isDh ? SM_FONTS_DHIVEHI : SM_FONTS_ENGLISH)
      .map(fo => `<option value="${fo.value}" ${f.font===fo.value?"selected":""}>${fo.label}</option>`).join("");

    return `
    <div class="sm-field-accordion ${isOpen ? "sm-field-accordion--open" : ""}" data-id="${f.id}">
      <div class="sm-field-accordion-header">
        <span class="sm-field-lang-badge ${isDh ? "sm-badge-dhivehi" : ""}">${isDh ? "\u062Fި" : "EN"}</span>
        <span class="sm-field-type-icon">${typeIcon}</span>
        <span class="sm-field-label">${smEscape(f.label || f.placeholder)}</span>
        <svg class="sm-accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        <button class="sm-field-delete-btn" data-id="${f.id}" title="Remove field">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sm-field-accordion-body">

        <label class="sm-fe-label-small">Type</label>
        <select class="sm-fe-ctrl sm-select sm-select-sm" data-prop="type">
          <option value="text"         ${type==="text"         ?"selected":""}>Text</option>
          <option value="textarea"     ${type==="textarea"     ?"selected":""}>Text Area</option>
          <option value="dropdown"     ${type==="dropdown"     ?"selected":""}>Dropdown</option>
          <option value="autocomplete" ${type==="autocomplete" ?"selected":""}>Auto Suggest</option>
        </select>

        <label class="sm-fe-label-small">Label</label>
        <input class="sm-fe-ctrl sm-input sm-input-sm" data-prop="label" value="${smEscape(f.label||"")}" placeholder="Shown to user">

        <label class="sm-fe-label-small">Placeholder Key</label>
        <input class="sm-fe-ctrl sm-input sm-input-sm" data-prop="placeholder" value="${smEscape(f.placeholder)}">

        ${showPreview ? `<label class="sm-fe-label-small">Preview Text</label>
        <input class="sm-fe-ctrl sm-input sm-input-sm" data-prop="text" value="${smEscape(f.text===f.placeholder?"":(f.text||""))}" placeholder="Leave blank to use key">` : ""}

        ${showOptions ? `<label class="sm-fe-label-small">${type==="autocomplete"?"Suggestions":"Options"}</label>
        <input class="sm-fe-ctrl sm-input sm-input-sm" data-prop="options" value="${smEscape((f.options||[]).join("\u060C "))}" placeholder="A\u060C B\u060C C">` : ""}

        <div class="sm-fe-row">
          <div class="sm-fe-col">
            <label class="sm-fe-label-small">Language</label>
            <select class="sm-fe-ctrl sm-select sm-select-sm" data-prop="language">
              <option value="english" ${!isDh?"selected":""}>English</option>
              <option value="dhivehi" ${isDh?"selected":""}>\u062Fިވެހި</option>
            </select>
          </div>
          <div class="sm-fe-col">
            <label class="sm-fe-label-small">Align</label>
            <select class="sm-fe-ctrl sm-select sm-select-sm" data-prop="align">
              <option value="left"   ${f.align==="left"  ?"selected":""}>Left</option>
              <option value="center" ${f.align==="center"?"selected":""}>Center</option>
              <option value="right"  ${f.align==="right" ?"selected":""}>Right</option>
            </select>
          </div>
        </div>

        <label class="sm-fe-label-small">Font</label>
        <select class="sm-fe-ctrl sm-select sm-select-sm" data-prop="font">${fontOpts}</select>

        <div class="sm-fe-row">
          <div class="sm-fe-col">
            <label class="sm-fe-label-small">Size</label>
            <input type="number" class="sm-fe-ctrl sm-input sm-input-sm" data-prop="size" value="${f.size||20}" min="8" max="200">
          </div>
          <div class="sm-fe-col">
            <label class="sm-fe-label-small">Color</label>
            <input type="color" class="sm-fe-ctrl sm-color-input" data-prop="color" value="${f.color||"#ffffff"}">
          </div>
          <div class="sm-fe-col sm-col-checkbox">
            <label class="sm-fe-label-small">Bold</label>
            <input type="checkbox" class="sm-fe-ctrl sm-checkbox" data-prop="bold" ${f.bold?"checked":""}>
          </div>
        </div>

        <label class="sm-fe-label-small">Position &amp; Size (px)</label>
        <div class="sm-fe-row">
          <div class="sm-fe-col"><label class="sm-fe-label-small">X</label><input type="number" class="sm-fe-ctrl sm-input sm-input-sm" data-prop="x" value="${Math.round(f.x)}"></div>
          <div class="sm-fe-col"><label class="sm-fe-label-small">Y</label><input type="number" class="sm-fe-ctrl sm-input sm-input-sm" data-prop="y" value="${Math.round(f.y)}"></div>
          <div class="sm-fe-col"><label class="sm-fe-label-small">W</label><input type="number" class="sm-fe-ctrl sm-input sm-input-sm" data-prop="w" value="${Math.round(f.w)}"></div>
          <div class="sm-fe-col"><label class="sm-fe-label-small">H</label><input type="number" class="sm-fe-ctrl sm-input sm-input-sm" data-prop="h" value="${Math.round(f.h)}"></div>
        </div>

      </div>
    </div>`;
  }).join("");

  // Accordion toggle
  list.querySelectorAll(".sm-field-accordion-header").forEach(header => {
    header.addEventListener("click", e => {
      if (e.target.closest(".sm-field-delete-btn")) return;
      const acc  = header.closest(".sm-field-accordion");
      const id   = acc.dataset.id;
      const f    = smFields.find(f => f.id === id);
      if (!f) return;
      const isOpen = acc.classList.contains("sm-field-accordion--open");
      list.querySelectorAll(".sm-field-accordion--open").forEach(a => a.classList.remove("sm-field-accordion--open"));
      if (!isOpen) {
        acc.classList.add("sm-field-accordion--open");
        smSelectField(f);
        setTimeout(() => acc.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      } else {
        smSelectedField = null;
        smDrawCanvas();
      }
    });
  });

  // Live-edit controls inside each accordion
  list.querySelectorAll(".sm-fe-ctrl").forEach(ctrl => {
    const evt = (ctrl.type === "checkbox" || ctrl.tagName === "SELECT") ? "change" : "input";
    ctrl.addEventListener(evt, e => {
      e.stopPropagation();
      const acc = ctrl.closest(".sm-field-accordion");
      const f   = smFields.find(f => f.id === acc?.dataset.id);
      if (!f) return;
      const prop = ctrl.dataset.prop;
      if (ctrl.type === "checkbox")              f[prop] = ctrl.checked;
      else if (prop === "size")                  f[prop] = parseInt(ctrl.value) || 20;
      else if (["x","y","w","h"].includes(prop)) f[prop] = parseFloat(ctrl.value) || f[prop];
      else if (prop === "options")               f[prop] = ctrl.value.split(/[,\u060C]/).map(s => s.trim()).filter(Boolean);
      else if (prop === "text")                  f[prop] = ctrl.value.trim() || f.placeholder;
      else if (prop === "language") {
        f[prop] = ctrl.value;
        // Swap font dropdown
        const fontSel = acc.querySelector("[data-prop='font']");
        if (fontSel) {
          const fonts = ctrl.value === "dhivehi" ? SM_FONTS_DHIVEHI : SM_FONTS_ENGLISH;
          fontSel.innerHTML = fonts.map(fo =>
            `<option value="${fo.value}">${fo.label}</option>`).join("");
          f.font = fonts[0].value;
          fontSel.value = fonts[0].value;
        }
      }
      else f[prop] = ctrl.value;

      // Update header label if label/placeholder changed
      if (prop === "label" || prop === "placeholder") {
        const lbl = acc.querySelector(".sm-field-label");
        if (lbl) lbl.textContent = f.label || f.placeholder;
      }
      if (smSelectedField && smSelectedField.id === f.id) smSelectedField = f;
      smMarkDirty();
      smDrawCanvas();
    });
  });

  // Delete buttons
  list.querySelectorAll(".sm-field-delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      smFields = smFields.filter(f => f.id !== btn.dataset.id);
      if (smSelectedField && smSelectedField.id === btn.dataset.id) smSelectedField = null;
      smMarkDirty();
      smUpdateFieldList();
      smDrawCanvas();
    });
  });
}

// ============================================================================
// CANVAS MOUSE INTERACTIONS
// ============================================================================

function smCanvasMousedown(e) {
  if (!smCanvas) return;
  const { cx, cy } = smCanvasCoords(e);

  if (smSelectedField) {
    const corner = smHitHandle(smSelectedField, cx, cy);
    if (corner) {
      smDragState = { type: "resize", fieldId: smSelectedField.id, startX: cx, startY: cy,
        origX: smSelectedField.x, origY: smSelectedField.y,
        origW: smSelectedField.w, origH: smSelectedField.h, corner };
      return;
    }
  }

  for (let i = smFields.length - 1; i >= 0; i--) {
    const f = smFields[i];
    if (cx >= f.x && cx <= f.x+f.w && cy >= f.y && cy <= f.y+f.h) {
      smSelectField(f);
      smDragState = { type: "move", fieldId: f.id, startX: cx, startY: cy, origX: f.x, origY: f.y };
      return;
    }
  }
  smSelectedField = null; smDragState = null;  smUpdateFieldList(); smDrawCanvas();
}

function smCanvasMousemove(e) {
  if (!smDragState || !smCanvas) return;
  const { cx, cy } = smCanvasCoords(e);
  const dx = cx - smDragState.startX, dy = cy - smDragState.startY;
  const f  = smFields.find(f => f.id === smDragState.fieldId);
  if (!f) return;

  if (smDragState.type === "move") {
    f.x = Math.max(0, smDragState.origX + dx);
    f.y = Math.max(0, smDragState.origY + dy);
  } else {
    const { origX, origY, origW, origH, corner } = smDragState;
    if (corner === "br") { f.w = Math.max(60, origW+dx); f.h = Math.max(30, origH+dy); }
    else if (corner === "bl") { const nw = Math.max(60, origW-dx); f.x = origX+(origW-nw); f.w = nw; f.h = Math.max(30, origH+dy); }
    else if (corner === "tr") { f.w = Math.max(60, origW+dx); const nh = Math.max(30, origH-dy); f.y = origY+(origH-nh); f.h = nh; }
    else if (corner === "tl") { const nw = Math.max(60, origW-dx); const nh = Math.max(30, origH-dy); f.x = origX+(origW-nw); f.y = origY+(origH-nh); f.w = nw; f.h = nh; }
  }

  if (smSelectedField && smSelectedField.id === f.id) smSelectedField = f;
  smDrawCanvas();
  
}

function smCanvasMouseup() { smDragState = null; }

function smHitHandle(f, cx, cy) {
  const corners = { tl:[f.x,f.y], tr:[f.x+f.w,f.y], bl:[f.x,f.y+f.h], br:[f.x+f.w,f.y+f.h] };
  for (const [key, [hx, hy]] of Object.entries(corners))
    if (Math.abs(cx-hx) <= SM_HANDLE && Math.abs(cy-hy) <= SM_HANDLE) return key;
  return null;
}

function smCanvasCoords(e) {
  const rect = smCanvas.getBoundingClientRect();
  return {
    cx: (e.clientX - rect.left) * (smCanvas.width  / rect.width),
    cy: (e.clientY - rect.top)  * (smCanvas.height / rect.height),
  };
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

function smHandleImageUpload(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = e => {
    smImageDataUrl = e.target.result;
    if (smActiveTemplate) smActiveTemplate.imageName = file.name;
    const el = document.getElementById("sm-image-status");
    if (el) el.textContent = `Image: ${file.name}`;
    smMarkDirty();
    smInitCanvas();
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// SAVE TEMPLATE (IPC)
// ============================================================================

async function smSaveCurrentTemplate() {
  const nameInput = document.getElementById("sm-template-name-input");
  const name = (nameInput ? nameInput.value.trim() : "") || "Untitled";

  const saveBtn = document.getElementById("sm-save-template-btn");
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

  // Build a small thumbnail (240px wide JPEG) so the card grid has a preview
  let thumb = null;
  if (smCanvas && smImage) {
    const tc = document.createElement("canvas");
    const ts = Math.min(1, 240 / smCanvas.width);
    tc.width  = Math.round(smCanvas.width  * ts);
    tc.height = Math.round(smCanvas.height * ts);
    tc.getContext("2d").drawImage(smCanvas, 0, 0, tc.width, tc.height);
    thumb = tc.toDataURL("image/jpeg", 0.72);
  }

  const payload = {
    id:             smActiveTemplate ? (smActiveTemplate.id || undefined) : undefined,
    name,
    fields:         smFields.map(f => ({ ...f })),
    imageName:      smActiveTemplate ? smActiveTemplate.imageName : null,
    imageDataUrl:   smImageDataUrl,
    imageThumbnail: thumb,
    canvasW:        smCanvas ? smCanvas.width  : null,
    canvasH:        smCanvas ? smCanvas.height : null,
    savedAt:        new Date().toISOString(),
  };

  try {
    const saved = await smIPC("smSaveTemplate", payload);
    if (smActiveTemplate) smActiveTemplate.id = saved.id;
    smNotify(`Template "${name}" saved.`, "success");
    smUnsaved = false;
    smUpdateUnsavedIndicator(false);
    smTemplates = await smIPC("smListTemplates").catch(() => smTemplates);
  } catch (e) {
    smNotify("Save failed: " + e.message, "error");
    console.error("SM save error:", e);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Template`; }
  }
}

// ============================================================================
// GENERATE PANEL — live preview
// ============================================================================

/**
 * Render history chips into a container. Clicking a chip fills the sibling input.
 */
function smRenderHistoryChips(container, history, isDhivehi) {
  if (!container) return;
  if (!history.length) { container.innerHTML = ""; return; }

  container.innerHTML = `<span class="sm-history-label">Recent:</span>` +
    history.map((val, i) =>
      `<button class="sm-history-chip ${isDhivehi ? "sm-history-chip--dh" : ""}"
        data-index="${i}" title="${smEscape(val)}">${smEscape(val)}</button>`
    ).join("");

  container.querySelectorAll(".sm-history-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const row = chip.closest(".sm-gen-row");
      const inp = row ? row.querySelector(".sm-gen-input") : null;
      if (!inp) return;
      inp.value = history[parseInt(chip.dataset.index)];
      inp.dispatchEvent(new Event("input",  { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
      inp.focus();
    });
  });
}

// Cached image object so we don't reload from dataUrl on every keystroke
let smGenImage = null;
let smGenTpl   = null;
let smGenPreviewDebounce = null;

async function smOpenGenerate(id) {
  let tpl;
  try {
    tpl = await smIPC("smLoadTemplate", id);
  } catch (e) {
    smNotify("Could not load template: " + e.message, "error");
    return;
  }

  smGenTpl   = tpl;
  smGenImage = null;

  // Build input form
  const form = document.getElementById("sm-generate-form");
  if (!form) return;
  form.innerHTML = "";

  (tpl.fields || []).forEach(f => {
    const isDh = f.language === "dhivehi";
    const type = f.type || "text";
    const row  = document.createElement("div");
    row.className = "sm-gen-row";

    let inputHtml;
    if (type === "dropdown") {
      const opts = (f.options || []).map(o =>
        `<option value="${smEscape(o)}">${smEscape(o)}</option>`).join("");
      inputHtml = `<select class="sm-gen-input sm-gen-select ${isDh ? "sm-input-dhivehi" : ""}"
        data-field-id="${f.id}" dir="${isDh ? "rtl" : "ltr"}">
        <option value="">— Select —</option>
        ${opts}
      </select>`;
    } else if (type === "textarea") {
      inputHtml = `<textarea class="sm-gen-input sm-gen-textarea ${isDh ? "sm-input-dhivehi" : ""}"
        data-field-id="${f.id}"
        placeholder="${smEscape(f.label || f.placeholder)}"
        dir="${isDh ? "rtl" : "ltr"}"
        rows="11"></textarea>`;
    } else if (type === "autocomplete") {
      inputHtml = `
        <div class="sm-ac-wrap" dir="${isDh ? "rtl" : "ltr"}">
          <input type="text" class="sm-gen-input sm-ac-input ${isDh ? "sm-input-dhivehi" : ""}"
            data-field-id="${f.id}"
            data-options="${smEscape((f.options || []).join("،"))}"
            placeholder="${smEscape(f.label || f.placeholder)}"
            dir="${isDh ? "rtl" : "ltr"}"
            autocomplete="off">
          <ul class="sm-ac-list" style="display:none"></ul>
        </div>`;
    } else {
      inputHtml = `<input type="text" class="sm-gen-input ${isDh ? "sm-input-dhivehi" : ""}"
        data-field-id="${f.id}"
        placeholder="${smEscape(f.label || f.placeholder)}"
        dir="${isDh ? "rtl" : "ltr"}"
        value="">`;
    }

    const displayLabel = f.label || f.placeholder;
    const typeLabel = type === "dropdown" ? "Select" : type === "textarea" ? "Text area" : type === "autocomplete" ? "Suggest" : "Text";
    row.innerHTML = `
      <label class="sm-gen-label">
        <span class="sm-field-lang-badge ${isDh ? "sm-badge-dhivehi" : ""}">${isDh ? "ދި" : "EN"}</span>
        <span class="sm-gen-type-badge">${typeLabel}</span>
        ${smEscape(displayLabel)}
      </label>
      ${inputHtml}
      <div class="sm-history-chips" data-field-id="${f.id}"></div>`;
    form.appendChild(row);

    // Populate history chips (after row is in DOM so querySelector works)
    if (type !== "dropdown") {
      const inp2    = row.querySelector(".sm-gen-input");
      const chipsEl = row.querySelector(".sm-history-chips");
      if (inp2 && chipsEl) {
        const fieldId = inp2.dataset.fieldId;
        chipsEl.dataset.fieldId = fieldId;
        const history = smHistoryGet(tpl.id, fieldId);
        smRenderHistoryChips(chipsEl, history, isDh);
      }
    }

    // Attach Thaana transliteration to Dhivehi inputs
    if (isDh) {
      const inp = row.querySelector(".sm-gen-input");
      if (inp) smAttachThaanaInput(inp);
    }

    // Attach autocomplete behaviour
    if (type === "autocomplete") {
      const inp = row.querySelector(".sm-ac-input");
      if (inp) smAttachAutocomplete(inp, isDh);
    }
  });

  const fieldCount = (tpl.fields || []).length;
  document.getElementById("sm-generate-title").textContent = tpl.name;

  // Show field count badge next to title
  const titleEl = document.getElementById("sm-generate-title");
  titleEl.innerHTML = `${smEscape(tpl.name)} <span class="sm-gen-field-count">${fieldCount} field${fieldCount !== 1 ? "s" : ""}</span>`;

  // Attach live-preview listener to each input (debounced)
  form.querySelectorAll(".sm-gen-input").forEach(el => {
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      clearTimeout(smGenPreviewDebounce);
      smGenPreviewDebounce = setTimeout(smRenderLivePreview, 120);
    });
  });

  // Reset preview area
  const hintEl = document.getElementById("sm-gen-hint");
  if (hintEl) hintEl.textContent = fieldCount > 3
    ? "Fill in the fields below (scroll for more) — preview updates live."
    : "Fill in the fields below — preview updates live.";

  const wrap = document.getElementById("sm-preview-canvas-wrap");
  wrap.innerHTML = "";
  delete wrap.dataset.dataUrl;
  document.getElementById("sm-export-btn").disabled = true;

  smShowPanel("sm-generate-panel");

  // Pre-load image and render immediately with placeholder text
  if (tpl.imageDataUrl) {
    const img = new Image();
    img.onload = () => {
      smGenImage = img;
      smRenderLivePreview();
    };
    img.src = tpl.imageDataUrl;
  }
}

function smRenderLivePreview() {
  const tpl = smGenTpl;
  const img = smGenImage;
  if (!tpl || !img) return;

  // Collect current input values (works for input, textarea, select)
  const values = {};
  document.querySelectorAll("#sm-generate-form .sm-gen-input").forEach(inp => {
    values[inp.dataset.fieldId] = inp.value;
  });

  document.fonts.ready.then(() => {
    // Render at native resolution (for export data URL)
    const c   = document.createElement("canvas");
    c.width   = img.naturalWidth;
    c.height  = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Scale factor: fields were positioned on a fitted editor canvas
    const fitW = tpl.canvasW || img.naturalWidth;
    const fitH = tpl.canvasH || img.naturalHeight;
    const sx   = img.naturalWidth  / fitW;
    const sy   = img.naturalHeight / fitH;

    smDrawFieldsOntoCtx(ctx, tpl.fields || [], values, sx, sy);

    // Capture export data URL at full resolution
    const exportDataUrl = c.toDataURL("image/png");

    // Swap a DISPLAY-SIZED canvas into the preview area (fits the pane)
    const wrap = document.getElementById("sm-preview-canvas-wrap");
    const padPx = 40;
    const dispW = Math.max(100, wrap.clientWidth  - padPx);
    const dispH = Math.max(100, wrap.clientHeight - padPx);
    const dispScale = Math.min(1, dispW / img.naturalWidth, dispH / img.naturalHeight);

    let previewCanvas = wrap.querySelector("canvas.sm-preview-canvas");
    if (!previewCanvas) {
      wrap.innerHTML = "";
      previewCanvas = document.createElement("canvas");
      previewCanvas.className = "sm-preview-canvas";
      wrap.appendChild(previewCanvas);
    }
    previewCanvas.width  = Math.round(img.naturalWidth  * dispScale);
    previewCanvas.height = Math.round(img.naturalHeight * dispScale);
    const pCtx = previewCanvas.getContext("2d");
    pCtx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
    smDrawFieldsOntoCtx(pCtx, tpl.fields || [], values,
      previewCanvas.width  / fitW,
      previewCanvas.height / fitH);

    wrap.dataset.dataUrl = exportDataUrl;
    document.getElementById("sm-export-btn").disabled = false;
  });
}

/**
 * Save each non-empty input value to history, then refresh chips.
 * Called when leaving the generate panel or exporting.
 */
function smSaveCurrentValuesToHistory() {
  if (!smGenTpl || !smGenTpl.id) return;
  let anyNew = false;
  document.querySelectorAll("#sm-generate-form .sm-gen-input").forEach(inp => {
    const fieldId = inp.dataset.fieldId;
    const val     = inp.value.trim();
    if (fieldId && val) {
      smHistoryPush(smGenTpl.id, fieldId, val);
      anyNew = true;
    }
  });
  if (anyNew) smRefreshAllChips();
}

/**
 * Re-render history chips for all fields in the current generate form.
 */
function smRefreshAllChips() {
  if (!smGenTpl) return;
  document.querySelectorAll("#sm-generate-form .sm-gen-row").forEach(row => {
    const inp     = row.querySelector(".sm-gen-input");
    const chipsEl = row.querySelector(".sm-history-chips");
    if (!inp || !chipsEl) return;
    const fieldId = inp.dataset.fieldId;
    const isDh    = inp.classList.contains("sm-input-dhivehi");
    const history = smHistoryGet(smGenTpl.id, fieldId);
    chipsEl.dataset.fieldId = fieldId;
    smRenderHistoryChips(chipsEl, history, isDh);
  });
}

function smClearAllFields() {
  document.querySelectorAll("#sm-generate-form .sm-gen-input").forEach(inp => {
    if (inp.tagName === "SELECT") inp.selectedIndex = 0;
    else inp.value = "";
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  });
  clearTimeout(smGenPreviewDebounce);
  smGenPreviewDebounce = setTimeout(smRenderLivePreview, 120);
}

async function smExportGenerated() {
  const wrap    = document.getElementById("sm-preview-canvas-wrap");
  const dataUrl = wrap ? wrap.dataset.dataUrl : null;
  if (!dataUrl) return;

  const tplName = smGenTpl ? smGenTpl.name : "export";
  const fileName = `${tplName.replace(/[^a-z0-9_-]/gi, "_")}_${new Date().toISOString().slice(0,10)}.png`;

  const base64 = dataUrl.split(",")[1];
  smSaveCurrentValuesToHistory();
  try {
    const result = await smIPC("smExportImage", { base64Data: base64, fileName });
    if (result) smNotify(`Saved to: ${result.path}`, "success");
  } catch (e) {
    smNotify("Export failed: " + e.message, "error");
  }
}

// ============================================================================
// STATIC EVENT BINDING
// ============================================================================

function smBindStaticEvents() {
  const imageInput = document.getElementById("sm-image-input");
  if (imageInput) {
    imageInput.addEventListener("change", e => {
      if (e.target.files[0]) smHandleImageUpload(e.target.files[0]);
      imageInput.value = "";
    });
  }
  document.getElementById("sm-upload-image-btn")
    ?.addEventListener("click", () => document.getElementById("sm-image-input")?.click());

  // Drag-drop image onto canvas area
  const canvasArea = document.getElementById("sm-canvas-wrapper");
  if (canvasArea) {
    canvasArea.addEventListener("dragover", e => {
      e.preventDefault();
      canvasArea.classList.add("sm-canvas-area--dragover");
    });
    canvasArea.addEventListener("dragleave", () => canvasArea.classList.remove("sm-canvas-area--dragover"));
    canvasArea.addEventListener("drop", e => {
      e.preventDefault();
      canvasArea.classList.remove("sm-canvas-area--dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) smHandleImageUpload(file);
    });
  }

  // Template name marks dirty
  document.getElementById("sm-template-name-input")
    ?.addEventListener("input", smMarkDirty);

  // Ctrl+S saves in editor
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      const editorPanel = document.getElementById("sm-editor-panel");
      if (editorPanel && editorPanel.classList.contains("sm-panel-active")) {
        e.preventDefault();
        smSaveCurrentTemplate();
      }
    }
  });

  document.getElementById("sm-add-field-btn")
    ?.addEventListener("click", smAddField);

  document.getElementById("sm-save-template-btn")
    ?.addEventListener("click", smSaveCurrentTemplate);

  document.getElementById("sm-back-to-list-btn")
    ?.addEventListener("click", () => { smLoadAndRenderList(); smShowPanel("sm-list-panel"); });
  document.getElementById("sm-gen-back-btn")
    ?.addEventListener("click", () => {
      smSaveCurrentValuesToHistory();
      smLoadAndRenderList();
      smShowPanel("sm-list-panel");
    });

  document.getElementById("sm-new-template-btn")
    ?.addEventListener("click", () => smOpenEditor(null));

  document.getElementById("sm-search-input")
    ?.addEventListener("input", smRenderTemplateList);


  const canvas = document.getElementById("sm-canvas");
  if (canvas) {
    canvas.addEventListener("mousedown",  smCanvasMousedown);
    canvas.addEventListener("mousemove",  smCanvasMousemove);
    canvas.addEventListener("mouseup",    smCanvasMouseup);
    canvas.addEventListener("mouseleave", smCanvasMouseup);
  }

  document.getElementById("sm-export-btn")
    ?.addEventListener("click", smExportGenerated);

  document.getElementById("sm-clear-fields-btn")
    ?.addEventListener("click", smClearAllFields);
}

// ============================================================================
// PANELS
// ============================================================================

function smShowPanel(id) {
  document.querySelectorAll(".sm-panel").forEach(p => p.classList.remove("sm-panel-active"));
  document.getElementById(id)?.classList.add("sm-panel-active");
}

// ============================================================================
// NOTIFICATION
// ============================================================================

function smNotify(msg, type = "info") {
  const el = document.getElementById("sm-notification");
  if (!el) return;
  el.textContent = msg;
  el.className = `sm-notification sm-notification-${type} sm-notification-show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("sm-notification-show"), 3500);
}

// ============================================================================
// UTIL
// ============================================================================

function smEscape(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}