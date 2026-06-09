/**
 * @file worklogs.js
 * @description Work Logs module for Addu City Council staff.
 * Handles log creation, tagging, photo attachment, search/filter,
 * summary stats, Excel export, and monthly Word/Excel reports.
 * All timestamps are captured in Maldives Time (UTC+5).
 */

const WL = (() => {
  // ── State ─────────────────────────────────────────────────────────────────
  let allLogs = [];
  let filteredLogs = [];
  let clockInterval = null;
  let selectedTags = [];       // tags on the current "new log" form
  let activeTagFilter = null;  // tag currently filtering the table
  let pendingPhotoData = null; // { dataUrl, fileName, mimeType } for current form

  // Preset tag options
  const PRESET_TAGS = ["Admin", "Field Work", "Printing", "Meeting", "Inspection", "Report", "Training"];
  // Tag colour palette (cycles through)
  const TAG_COLORS = [
    { bg: "#e2ece7", fg: "#4a7c63" },
    { bg: "#e4edf2", fg: "#4a6b88" },
    { bg: "#f0e9e2", fg: "#8b6a4a" },
    { bg: "#ede2f0", fg: "#7a4a8b" },
    { bg: "#f0f2e2", fg: "#6b7a4a" },
    { bg: "#f2e2e4", fg: "#8b4a56" },
    { bg: "#e2f0ef", fg: "#4a7a79" },
  ];

  function tagColor(tag) {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
  }

  // ── MVT helpers ────────────────────────────────────────────────────────────
  function nowMVT() {
    return new Date(Date.now() + 5 * 60 * 60 * 1000);
  }
  function formatDate(d) {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }
  function formatTime(d) {
    let h = d.getUTCHours();
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${min} ${ampm}`;
  }
  function isoMVT(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}T${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  }
  function parseISO(iso) {
    if (!iso) return { date: "—", time: "—" };
    const [datePart, timePart] = iso.split("T");
    const [yyyy, mm, dd] = datePart.split("-");
    const [hh, min] = timePart.split(":");
    let h = parseInt(hh, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { date: `${dd}/${mm}/${yyyy}`, time: `${h}:${min} ${ampm}` };
  }
  function monthLabel(isoMonth) {
    // isoMonth: "YYYY-MM"
    const [y, m] = isoMonth.split("-");
    const names = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"];
    return `${names[parseInt(m,10)-1]} ${y}`;
  }

  // ── DOM helpers ─────────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function showNotification(msg, type = "success") {
    const n = el("wl-notification");
    if (!n) return;
    n.textContent = msg;
    n.className = `wl-notification wl-notification-${type} wl-notification-show`;
    clearTimeout(n._timeout);
    n._timeout = setTimeout(() => n.classList.remove("wl-notification-show"), 3500);
  }
  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  // ── Live clock ──────────────────────────────────────────────────────────────
  function startClock() {
    stopClock();
    function tick() {
      const d = nowMVT();
      const dateEl = el("wl-auto-date");
      const timeEl = el("wl-auto-time");
      if (dateEl) dateEl.value = formatDate(d);
      if (timeEl) timeEl.value = formatTime(d);
    }
    tick();
    clockInterval = setInterval(tick, 1000);
  }
  function stopClock() {
    if (clockInterval !== null) { clearInterval(clockInterval); clockInterval = null; }
  }

  // ── Summary stats ───────────────────────────────────────────────────────────
  function updateSummary() {
    const now = nowMVT();
    const thisYear = now.getUTCFullYear();
    const thisMonth = now.getUTCMonth() + 1;
    let yearCount = 0, monthCount = 0;
    allLogs.forEach((log) => {
      if (!log.createdAt) return;
      const [y, m] = log.createdAt.split("T")[0].split("-").map(Number);
      if (y === thisYear) { yearCount++; if (m === thisMonth) monthCount++; }
    });
    const ye = el("wl-stat-year"), me = el("wl-stat-month"), te = el("wl-stat-total");
    if (ye) ye.textContent = yearCount;
    if (me) me.textContent = monthCount;
    if (te) te.textContent = allLogs.length;
  }

  // ── Tag UI helpers ──────────────────────────────────────────────────────────
  function renderFormTags() {
    const container = el("wl-tag-pills");
    if (!container) return;
    container.innerHTML = selectedTags.map(tag => {
      const c = tagColor(tag);
      return `<span class="wl-tag-pill" style="background:${c.bg};color:${c.fg};">
        ${escapeHtml(tag)}
        <button class="wl-tag-pill-remove" data-tag="${escapeHtml(tag)}" title="Remove">×</button>
      </span>`;
    }).join("");
    container.querySelectorAll(".wl-tag-pill-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedTags = selectedTags.filter(t => t !== btn.dataset.tag);
        renderFormTags();
        renderPresets();
      });
    });
  }

  function renderPresets() {
    const container = el("wl-tag-presets");
    if (!container) return;
    container.innerHTML = PRESET_TAGS
      .filter(t => !selectedTags.includes(t))
      .map(t => {
        const c = tagColor(t);
        return `<button class="wl-preset-tag" data-tag="${escapeHtml(t)}" style="background:${c.bg};color:${c.fg};">${escapeHtml(t)}</button>`;
      }).join("");
    container.querySelectorAll(".wl-preset-tag").forEach(btn => {
      btn.addEventListener("click", () => addTag(btn.dataset.tag));
    });
  }

  function addTag(tag) {
    tag = tag.trim();
    if (!tag || selectedTags.includes(tag)) return;
    selectedTags.push(tag);
    renderFormTags();
    renderPresets();
  }

  // ── Tag filter bar ──────────────────────────────────────────────────────────
  function renderTagFilterBar() {
    const container = el("wl-tag-filter-pills");
    if (!container) return;
    // Collect all unique tags from all logs
    const allTags = [...new Set(allLogs.flatMap(l => {
      try { return JSON.parse(l.tags || "[]"); } catch { return []; }
    }))].sort();

    if (allTags.length === 0) {
      el("wl-tag-filter-row").style.display = "none";
      return;
    }
    el("wl-tag-filter-row").style.display = "flex";

    container.innerHTML = allTags.map(t => {
      const c = tagColor(t);
      const active = activeTagFilter === t;
      return `<button class="wl-tag-filter-pill ${active ? "wl-tag-filter-pill-active" : ""}"
        data-tag="${escapeHtml(t)}"
        style="background:${active ? c.fg : c.bg};color:${active ? "#fff" : c.fg};border-color:${c.fg};">
        ${escapeHtml(t)}
      </button>`;
    }).join("");

    container.querySelectorAll(".wl-tag-filter-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        activeTagFilter = activeTagFilter === btn.dataset.tag ? null : btn.dataset.tag;
        renderTagFilterBar();
        applyFilters();
      });
    });
  }

  // ── Table rendering ─────────────────────────────────────────────────────────
  function renderTable(logs) {
    filteredLogs = logs;
    const tbody = el("wl-table-body");
    const empty = el("wl-empty-state");
    const countEl = el("wl-results-count");
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = "";
      if (empty) empty.style.display = "flex";
      if (countEl) countEl.textContent = "No logs found";
      return;
    }
    if (empty) empty.style.display = "none";
    if (countEl) countEl.textContent = `${logs.length} log${logs.length !== 1 ? "s" : ""}`;

    tbody.innerHTML = logs.map((log, idx) => {
      const { date, time } = parseISO(log.createdAt);
      const task = escapeHtml(log.task || "");
      let tags = [];
      try { tags = JSON.parse(log.tags || "[]"); } catch {}
      const tagsHtml = tags.length
        ? tags.map(t => { const c = tagColor(t); return `<span class="wl-tag-chip" style="background:${c.bg};color:${c.fg};">${escapeHtml(t)}</span>`; }).join("")
        : `<span class="wl-empty-notes">—</span>`;

      const hasPhoto = log.photoPath ? true : false;
      const photoHtml = hasPhoto
        ? `<button class="wl-photo-thumb-btn" data-logid="${log.id}" data-task="${escapeHtml(log.task||"")}" title="View photo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           </button>`
        : `<span class="wl-empty-notes">—</span>`;

      return `<tr>
        <td class="wl-col-num">${idx + 1}</td>
        <td class="wl-col-date"><span class="wl-date-badge">${date}</span></td>
        <td class="wl-col-time">${time}</td>
        <td class="wl-col-task">${task}</td>
        <td class="wl-col-tags">${tagsHtml}</td>
        <td class="wl-col-photo">${photoHtml}</td>
        <td class="wl-col-actions">
          <button class="wl-btn-delete" data-id="${log.id}" title="Delete log">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll(".wl-btn-delete").forEach(btn =>
      btn.addEventListener("click", () => deleteLog(btn.dataset.id))
    );
    tbody.querySelectorAll(".wl-photo-thumb-btn").forEach(btn =>
      btn.addEventListener("click", () => openPhotoLightbox(btn.dataset.logid, btn.dataset.task))
    );
  }

  // ── Photo lightbox ──────────────────────────────────────────────────────────
  async function openPhotoLightbox(logId, taskLabel) {
    const log = allLogs.find(l => l.id === logId);
    if (!log || !log.photoPath) return;
    try {
      const dataUrl = await window.electronAPI.getWorkLogPhoto(log.photoPath);
      if (!dataUrl) { showNotification("Could not load photo.", "error"); return; }
      const lightbox = el("wl-photo-lightbox");
      const img = el("wl-lightbox-img");
      const caption = el("wl-lightbox-caption");
      if (img) img.src = dataUrl;
      if (caption) caption.textContent = taskLabel || "";
      if (lightbox) lightbox.style.display = "flex";
    } catch (err) {
      showNotification("Failed to load photo.", "error");
    }
  }

  function closeLightbox() {
    const lb = el("wl-photo-lightbox");
    if (lb) lb.style.display = "none";
    const img = el("wl-lightbox-img");
    if (img) img.src = "";
  }

  // ── Search / filter ─────────────────────────────────────────────────────────
  function applyFilters() {
    const keyword = (el("wl-search-input")?.value || "").toLowerCase().trim();
    const fromVal = el("wl-filter-from")?.value || "";
    const toVal   = el("wl-filter-to")?.value || "";

    let results = [...allLogs];

    if (keyword) {
      results = results.filter(log => {
        let tags = [];
        try { tags = JSON.parse(log.tags || "[]"); } catch {}
        return (log.task || "").toLowerCase().includes(keyword)
          || tags.some(t => t.toLowerCase().includes(keyword));
      });
    }
    if (fromVal) results = results.filter(l => l.createdAt && l.createdAt.slice(0,10) >= fromVal);
    if (toVal)   results = results.filter(l => l.createdAt && l.createdAt.slice(0,10) <= toVal);
    if (activeTagFilter) {
      results = results.filter(l => {
        let tags = [];
        try { tags = JSON.parse(l.tags || "[]"); } catch {}
        return tags.includes(activeTagFilter);
      });
    }
    renderTable(results);
  }

  // ── Load logs ───────────────────────────────────────────────────────────────
  async function loadLogs() {
    try {
      const logs = await window.electronAPI.getWorkLogs();
      allLogs = (logs || []).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      applyFilters();
      updateSummary();
      renderTagFilterBar();
    } catch (err) {
      console.error("Failed to load work logs:", err);
      showNotification("Failed to load work logs.", "error");
    }
  }

  // ── Add log ─────────────────────────────────────────────────────────────────
  async function addLog() {
    const taskInput = el("wl-task-input");
    const btn = el("wl-submit-btn");

    const task = (taskInput?.value || "").trim();
    if (!task) {
      taskInput?.classList.add("wl-input-error");
      taskInput?.focus();
      showNotification("Task description is required.", "error");
      return;
    }
    taskInput?.classList.remove("wl-input-error");

    const notes = "";
    const now = nowMVT();
    const createdAt = isoMVT(now);
    const tags = JSON.stringify(selectedTags);

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

    try {
      // Save photo first if present
      let photoPath = null;
      if (pendingPhotoData) {
        const result = await window.electronAPI.saveWorkLogPhoto({
          dataUrl: pendingPhotoData.dataUrl,
          fileName: pendingPhotoData.fileName,
          mimeType: pendingPhotoData.mimeType,
        });
        photoPath = result?.path || null;
      }

      await window.electronAPI.addWorkLog({ task, notes, createdAt, tags, photoPath });

      // Reset form
      taskInput.value = "";
      selectedTags = [];
      pendingPhotoData = null;
      renderFormTags();
      renderPresets();
      clearPhotoPreview();

      showNotification("Work log saved successfully.", "success");
      await loadLogs();
      el("wl-table-section")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Failed to save work log:", err);
      showNotification("Failed to save work log.", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Save Log"; }
    }
  }

  // ── Delete log ──────────────────────────────────────────────────────────────
  async function deleteLog(id) {
    const confirmed = await showConfirm("Delete this work log? This cannot be undone.", "Delete");
    if (!confirmed) return;
    try {
      await window.electronAPI.deleteWorkLog(id);
      showNotification("Work log deleted.", "success");
      await loadLogs();
    } catch (err) {
      showNotification("Failed to delete work log.", "error");
    }
  }

  // ── Excel export (filtered) ─────────────────────────────────────────────────
  async function exportExcel() {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : allLogs;
    if (logsToExport.length === 0) { showNotification("No logs to export.", "error"); return; }

    const rows = logsToExport.map((log, idx) => {
      const { date, time } = parseISO(log.createdAt);
      let tags = [];
      try { tags = JSON.parse(log.tags || "[]"); } catch {}
      return { no: idx + 1, date, time, task: log.task || "", tags: tags.join(", ") };
    });

    try {
      const exportBtn = el("wl-export-btn");
      if (exportBtn) { exportBtn.disabled = true; exportBtn.textContent = "Exporting…"; }
      await window.electronAPI.exportWorkLogsExcel({ rows });
      showNotification("Excel file exported successfully.", "success");
    } catch (err) {
      showNotification("Export failed: " + (err.message || err), "error");
    } finally {
      const exportBtn = el("wl-export-btn");
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Export Excel`;
      }
    }
  }

  // ── Monthly report modal ────────────────────────────────────────────────────
  function openMonthlyModal() {
    const modal = el("wl-monthly-modal");
    if (!modal) return;
    // Default to current MVT month
    const now = nowMVT();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const picker = el("wl-monthly-picker");
    if (picker) picker.value = `${y}-${m}`;
    modal.style.display = "flex";
  }

  function closeMonthlyModal() {
    const modal = el("wl-monthly-modal");
    if (modal) modal.style.display = "none";
  }

  async function generateMonthlyReport() {
    const picker = el("wl-monthly-picker");
    const officerInput = el("wl-monthly-officer");
    const formatRadio = document.querySelector('input[name="wl-monthly-format"]:checked');
    const genBtn = el("wl-monthly-generate-btn");

    const isoMonth = picker?.value || "";
    if (!isoMonth) { showNotification("Please select a month.", "error"); return; }
    const format = formatRadio?.value || "word";
    const officer = (officerInput?.value || "").trim();

    // Filter logs for selected month
    const monthLogs = allLogs.filter(l => l.createdAt && l.createdAt.startsWith(isoMonth));
    if (monthLogs.length === 0) {
      showNotification(`No logs found for ${monthLabel(isoMonth)}.`, "error");
      return;
    }

    const rows = monthLogs.map((log, idx) => {
      const { date, time } = parseISO(log.createdAt);
      let tags = [];
      try { tags = JSON.parse(log.tags || "[]"); } catch {}
      return { no: idx + 1, date, time, task: log.task || "", tags: tags.join(", ") };
    });

    if (genBtn) { genBtn.disabled = true; genBtn.textContent = "Generating…"; }

    try {
      if (format === "word") {
        await window.electronAPI.exportWorkLogsWord({ rows, month: monthLabel(isoMonth), officer });
      } else {
        await window.electronAPI.exportWorkLogsMonthlyExcel({ rows, month: monthLabel(isoMonth), officer });
      }
      showNotification(`${monthLabel(isoMonth)} report exported successfully.`, "success");
      closeMonthlyModal();
    } catch (err) {
      showNotification("Export failed: " + (err.message || err), "error");
    } finally {
      if (genBtn) { genBtn.disabled = false; genBtn.textContent = "Generate Report"; }
    }
  }

  // ── Photo attachment handling ────────────────────────────────────────────────
  function clearPhotoPreview() {
    const wrap = el("wl-photo-preview-wrap");
    const btn = el("wl-photo-btn");
    const input = el("wl-photo-input");
    if (wrap) wrap.style.display = "none";
    if (btn) btn.style.display = "";
    if (input) input.value = "";
    pendingPhotoData = null;
  }

  function handlePhotoSelected(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingPhotoData = { dataUrl: e.target.result, fileName: file.name, mimeType: file.type };
      const img = el("wl-photo-preview");
      const wrap = el("wl-photo-preview-wrap");
      const btn = el("wl-photo-btn");
      const nameEl = el("wl-photo-name");
      if (img) img.src = e.target.result;
      if (nameEl) nameEl.textContent = file.name;
      if (wrap) wrap.style.display = "flex";
      if (btn) btn.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  let _initialized = false;

  function init() {
    if (_initialized) { startClock(); loadLogs(); return; }
    _initialized = true;

    startClock();

    // Form submit
    el("wl-submit-btn")?.addEventListener("click", addLog);

    // Task input
    el("wl-task-input")?.addEventListener("input", () =>
      el("wl-task-input")?.classList.remove("wl-input-error")
    );
    el("wl-task-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addLog(); }
    });

    // Tags
    renderPresets();
    renderFormTags();
    el("wl-tag-add-btn")?.addEventListener("click", () => {
      const input = el("wl-custom-tag-input");
      if (input) { addTag(input.value); input.value = ""; }
    });
    el("wl-custom-tag-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); const input = el("wl-custom-tag-input"); if (input) { addTag(input.value); input.value = ""; } }
    });

    // Photo attachment
    el("wl-photo-btn")?.addEventListener("click", () => el("wl-photo-input")?.click());
    el("wl-photo-input")?.addEventListener("change", (e) => handlePhotoSelected(e.target.files?.[0]));
    el("wl-photo-remove")?.addEventListener("click", clearPhotoPreview);

    // Photo lightbox close
    el("wl-lightbox-close")?.addEventListener("click", closeLightbox);
    el("wl-lightbox-backdrop")?.addEventListener("click", closeLightbox);

    // Search and date filters
    const debouncedFilter = debounce(applyFilters, 250);
    el("wl-search-input")?.addEventListener("input", debouncedFilter);
    el("wl-filter-from")?.addEventListener("change", applyFilters);
    el("wl-filter-to")?.addEventListener("change", applyFilters);
    el("wl-filter-clear")?.addEventListener("click", () => {
      const s = el("wl-search-input"), f = el("wl-filter-from"), t = el("wl-filter-to");
      if (s) s.value = "";
      if (f) f.value = "";
      if (t) t.value = "";
      activeTagFilter = null;
      renderTagFilterBar();
      applyFilters();
    });

    // Export
    el("wl-export-btn")?.addEventListener("click", exportExcel);

    // Monthly report
    el("wl-monthly-export-btn")?.addEventListener("click", openMonthlyModal);
    el("wl-monthly-cancel-btn")?.addEventListener("click", closeMonthlyModal);
    el("wl-monthly-modal-close")?.addEventListener("click", closeMonthlyModal);
    el("wl-monthly-generate-btn")?.addEventListener("click", generateMonthlyReport);
    // Close modal on backdrop click
    el("wl-monthly-modal")?.addEventListener("click", (e) => {
      if (e.target === el("wl-monthly-modal")) closeMonthlyModal();
    });

    loadLogs();
  }

  return { init, stopClock };
})();

function initWorkLogs() {
  WL.init();
}