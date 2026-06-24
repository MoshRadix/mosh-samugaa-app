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

  // ── Table rendering ─────────────────────────────────────────────────────
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

      const hasPhoto = !!log.photoPath;

      // Photo cell: thumbnail button if photo exists, add-photo icon button if not
      const photoHtml = hasPhoto
        ? `<button class="wl-photo-thumb-btn" data-logid="${log.id}" data-task="${escapeHtml(log.task||"")}" title="View photo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           </button>`
        : `<button class="wl-photo-add-btn" data-id="${log.id}" data-task="${escapeHtml(log.task||"")}" title="Attach a photo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
           </button>`;

      // Linked To-Do source badge
      const isLinked = !!log.linkedTodoId;
      const sourceBadge = isLinked
        ? `<span class="wl-source-badge wl-source-badge--todo" title="Auto-logged from To-Do">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            From To-Do
           </span>`
        : "";

      // Reopen banner
      const history = Array.isArray(log.todoStatusHistory) ? log.todoStatusHistory : [];
      const lastEvent = history.length ? history[history.length - 1] : null;
      const reopenBanner = (isLinked && lastEvent && lastEvent.event === "reopened")
        ? `<div class="wl-reopen-banner" title="The linked To-Do was unmarked — this log entry is preserved">
             <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             To-Do reopened
           </div>`
        : "";

      // Enrich note preview
      const notePreview = log.enrichNote
        ? `<div class="wl-enrich-note-preview" title="${escapeHtml(log.enrichNote)}">${escapeHtml(log.enrichNote.length > 60 ? log.enrichNote.slice(0, 60) + "…" : log.enrichNote)}</div>`
        : "";

      // Actions: edit (pencil) for ALL items + delete — always on the same row
      return `<tr class="${isLinked ? "wl-row--linked" : ""}">
        <td class="wl-col-num">${idx + 1}</td>
        <td class="wl-col-date"><span class="wl-date-badge">${date}</span></td>
        <td class="wl-col-time">${time}</td>
        <td class="wl-col-task">
          ${sourceBadge}${reopenBanner}
          <span class="wl-task-text">${task}</span>
          ${notePreview}
        </td>
        <td class="wl-col-tags">${tagsHtml}</td>
        <td class="wl-col-photo">${photoHtml}</td>
        <td class="wl-col-actions">
          <div class="wl-actions-row">
            <button class="wl-btn-enrich" data-id="${log.id}" data-task="${escapeHtml(log.task||"")}" data-hasphoto="${hasPhoto}" title="Edit note or photo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            ${isLinked
              ? `<button class="wl-btn-delete wl-btn-delete--locked" data-id="${log.id}" title="Delete from the To-Do page" disabled>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </button>`
              : `<button class="wl-btn-delete" data-id="${log.id}" title="Delete log">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>`
            }
          </div>
        </td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll(".wl-btn-delete").forEach(btn =>
      btn.addEventListener("click", () => deleteLog(btn.dataset.id))
    );
    tbody.querySelectorAll(".wl-photo-thumb-btn").forEach(btn =>
      btn.addEventListener("click", () => openPhotoLightbox(btn.dataset.logid, btn.dataset.task))
    );
    // Edit button — opens enrich modal for ALL items
    tbody.querySelectorAll(".wl-btn-enrich").forEach(btn =>
      btn.addEventListener("click", () => openEnrichModal(btn.dataset.id, btn.dataset.task, btn.dataset.hasphoto === "true"))
    );
    // Add-photo shortcut button in photo cell
    tbody.querySelectorAll(".wl-photo-add-btn").forEach(btn =>
      btn.addEventListener("click", () => openEnrichModal(btn.dataset.id, btn.dataset.task, false))
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

  // ── Cloud sync ──────────────────────────────────────────────────────────────
  function getLocalNotesForCloudSync() {
    try {
      const notes = JSON.parse(localStorage.getItem("mto_notes") || "[]");
      return Array.isArray(notes) ? notes : [];
    } catch {
      return [];
    }
  }

  async function syncWithCloudService() {
    if (!window.electronAPI?.syncNow) {
      showNotification("Cloud sync is not available.", "error");
      return;
    }

    const btn = el("wl-cloud-sync-btn");
    const original = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Syncing...";
    }

    try {
      const result = await window.electronAPI.syncNow({ notes: getLocalNotesForCloudSync() });
      if (!result?.success) {
        showNotification(result?.error || "Cloud sync failed.", "error");
        return;
      }

      await loadLogs();
      const notesSent = result.notes?.sent ?? 0;
      const todosSent = result.todos?.sent ?? 0;
      const workLogsSent = result.workLogs?.sent ?? 0;
      showNotification(`Cloud synced. Sent ${notesSent} note(s), ${todosSent} todo(s), ${workLogsSent} work log(s).`, "success");
    } catch (err) {
      console.error("Cloud sync error:", err);
      showNotification("Cloud sync failed: " + (err.message || "Unknown error"), "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
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
    // Linked entries are owned by their To-Do — prevent direct deletion here
    const log = allLogs.find(l => l.id === id);
    if (log && log.linkedTodoId) {
      showNotification("This entry was created from a To-Do. Delete it from the To-Do page.", "error");
      return;
    }
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

  // ── Enrichment modal (for linked To-Do work log entries) ────────────────────
  let _enrichWorklogId = null;
  let _enrichPendingPhoto = null;

  function openEnrichModal(worklogId, taskLabel, hasExistingPhoto) {
    _enrichWorklogId = worklogId;
    _enrichPendingPhoto = null;
    const modal = el("wl-enrich-modal");
    const titleEl = el("wl-enrich-task-label");
    const noteInput = el("wl-enrich-note-input");
    const photoPreviewWrap = el("wl-enrich-photo-preview-wrap");
    const photoBtn = el("wl-enrich-photo-btn");

    if (titleEl) titleEl.textContent = taskLabel || "";
    if (noteInput) {
      // Pre-fill existing note if any
      const log = allLogs.find(l => l.id === worklogId);
      noteInput.value = (log && log.enrichNote) ? log.enrichNote : "";
    }
    if (photoPreviewWrap) photoPreviewWrap.style.display = "none";
    if (photoBtn) photoBtn.style.display = "";
    if (modal) modal.style.display = "flex";
    setTimeout(() => noteInput && noteInput.focus(), 50);
  }

  function closeEnrichModal() {
    _enrichWorklogId = null;
    _enrichPendingPhoto = null;
    const modal = el("wl-enrich-modal");
    if (modal) modal.style.display = "none";
    const noteInput = el("wl-enrich-note-input");
    if (noteInput) noteInput.value = "";
    const photoPreviewWrap = el("wl-enrich-photo-preview-wrap");
    if (photoPreviewWrap) photoPreviewWrap.style.display = "none";
    const photoInput = el("wl-enrich-photo-input");
    if (photoInput) photoInput.value = "";
  }

  function handleEnrichPhotoSelected(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      _enrichPendingPhoto = { dataUrl: e.target.result, fileName: file.name, mimeType: file.type };
      const img = el("wl-enrich-photo-preview");
      const wrap = el("wl-enrich-photo-preview-wrap");
      const btn = el("wl-enrich-photo-btn");
      const nameEl = el("wl-enrich-photo-name");
      if (img) img.src = e.target.result;
      if (nameEl) nameEl.textContent = file.name;
      if (wrap) wrap.style.display = "flex";
      if (btn) btn.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  async function saveEnrichment() {
    if (!_enrichWorklogId) return;
    const noteInput = el("wl-enrich-note-input");
    const note = (noteInput?.value || "").trim();
    const saveBtn = el("wl-enrich-save-btn");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

    try {
      // Save note
      await window.electronAPI.worklogAddNote({ worklogId: _enrichWorklogId, note: note || null });

      // Save photo if selected
      if (_enrichPendingPhoto) {
        await window.electronAPI.worklogEnrichPhoto({
          worklogId: _enrichWorklogId,
          dataUrl: _enrichPendingPhoto.dataUrl,
          fileName: _enrichPendingPhoto.fileName,
          mimeType: _enrichPendingPhoto.mimeType,
        });
      }

      showNotification("Work log updated.", "success");
      closeEnrichModal();
      await loadLogs();
    } catch (err) {
      console.error("Enrich save error:", err);
      showNotification("Failed to save enrichment.", "error");
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; }
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

    // Cloud sync
    el("wl-cloud-sync-btn")?.addEventListener("click", syncWithCloudService);

    // Monthly report
    el("wl-monthly-export-btn")?.addEventListener("click", openMonthlyModal);
    el("wl-monthly-cancel-btn")?.addEventListener("click", closeMonthlyModal);
    el("wl-monthly-modal-close")?.addEventListener("click", closeMonthlyModal);
    el("wl-monthly-generate-btn")?.addEventListener("click", generateMonthlyReport);
    // Close modal on backdrop click
    el("wl-monthly-modal")?.addEventListener("click", (e) => {
      if (e.target === el("wl-monthly-modal")) closeMonthlyModal();
    });

    // Enrichment modal
    el("wl-enrich-modal")?.addEventListener("click", (e) => {
      if (e.target === el("wl-enrich-modal")) closeEnrichModal();
    });
    el("wl-enrich-close-btn")?.addEventListener("click", closeEnrichModal);
    el("wl-enrich-cancel-btn")?.addEventListener("click", closeEnrichModal);
    el("wl-enrich-save-btn")?.addEventListener("click", saveEnrichment);
    el("wl-enrich-photo-btn")?.addEventListener("click", () => el("wl-enrich-photo-input")?.click());
    el("wl-enrich-photo-input")?.addEventListener("change", (e) => handleEnrichPhotoSelected(e.target.files?.[0]));
    el("wl-enrich-photo-remove")?.addEventListener("click", () => {
      _enrichPendingPhoto = null;
      const wrap = el("wl-enrich-photo-preview-wrap");
      const btn = el("wl-enrich-photo-btn");
      const input = el("wl-enrich-photo-input");
      if (wrap) wrap.style.display = "none";
      if (btn) btn.style.display = "";
      if (input) input.value = "";
    });

    window.electronAPI?.onSyncWorkLogsUpdate?.(() => {
      loadLogs();
    });

    loadLogs();
  }

  return { init, stopClock };
})();

function initWorkLogs() {
  WL.init();
}
