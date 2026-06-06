/**
 * @file worklogs.js
 * @description Work Logs module for Addu City Council staff.
 * Handles log creation, search/filter, summary stats, and Excel export.
 * All timestamps are captured in Maldives Time (UTC+5).
 */

// ============================================================================
// STATE
// ============================================================================

const WL = (() => {
  /** @type {Array<Object>} Full in-memory cache of all logs */
  let allLogs = [];

  /** @type {Array<Object>} Currently filtered/displayed logs */
  let filteredLogs = [];

  /** @type {ReturnType<typeof setInterval>|null} Clock tick interval */
  let clockInterval = null;

  // ── Maldives Time helpers ──────────────────────────────────────────────────

  /** Returns the current moment as a Date object expressed in MVT (UTC+5). */
  function nowMVT() {
    const utc = Date.now();
    const mvtOffset = 5 * 60 * 60 * 1000; // +5 h in ms
    return new Date(utc + mvtOffset);
  }

  /** Format a Date (already shifted to MVT) as "DD/MM/YYYY" */
  function formatDate(d) {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** Format a Date (already shifted to MVT) as "HH:MM AM/PM" */
  function formatTime(d) {
    let h = d.getUTCHours();
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${min} ${ampm}`;
  }

  /** ISO string stored in DB: "YYYY-MM-DDTHH:MM" in MVT */
  function isoMVT(d) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  /** Parse stored ISO string back to display date/time strings */
  function parseISO(iso) {
    if (!iso) return { date: "—", time: "—" };
    // iso is MVT-local "YYYY-MM-DDTHH:MM"
    const [datePart, timePart] = iso.split("T");
    const [yyyy, mm, dd] = datePart.split("-");
    const displayDate = `${dd}/${mm}/${yyyy}`;
    const [hh, min] = timePart.split(":");
    let h = parseInt(hh, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const displayTime = `${h}:${min} ${ampm}`;
    return { date: displayDate, time: displayTime };
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function el(id) {
    return document.getElementById(id);
  }

  function showNotification(msg, type = "success") {
    const n = el("wl-notification");
    if (!n) return;
    n.textContent = msg;
    n.className = `wl-notification wl-notification-${type} wl-notification-show`;
    clearTimeout(n._timeout);
    n._timeout = setTimeout(() => {
      n.classList.remove("wl-notification-show");
    }, 3500);
  }

  // ── Live clock in the form ─────────────────────────────────────────────────

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
    if (clockInterval !== null) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  }

  // ── Summary stats ──────────────────────────────────────────────────────────

  function updateSummary() {
    const now = nowMVT();
    const thisYear = now.getUTCFullYear();
    const thisMonth = now.getUTCMonth() + 1;

    let yearCount = 0;
    let monthCount = 0;

    allLogs.forEach((log) => {
      if (!log.createdAt) return;
      const [datePart] = log.createdAt.split("T");
      const [y, m] = datePart.split("-").map(Number);
      if (y === thisYear) {
        yearCount++;
        if (m === thisMonth) monthCount++;
      }
    });

    const yearEl = el("wl-stat-year");
    const monthEl = el("wl-stat-month");
    const totalEl = el("wl-stat-total");
    if (yearEl) yearEl.textContent = yearCount;
    if (monthEl) monthEl.textContent = monthCount;
    if (totalEl) totalEl.textContent = allLogs.length;
  }

  // ── Table rendering ────────────────────────────────────────────────────────

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
    if (countEl)
      countEl.textContent = `${logs.length} log${logs.length !== 1 ? "s" : ""}`;

    tbody.innerHTML = logs
      .map((log, idx) => {
        const { date, time } = parseISO(log.createdAt);
        const task = escapeHtml(log.task || "");
        const notes = escapeHtml(log.notes || "");
        return `<tr>
          <td class="wl-col-num">${idx + 1}</td>
          <td class="wl-col-date"><span class="wl-date-badge">${date}</span></td>
          <td class="wl-col-time">${time}</td>
          <td class="wl-col-task">${task}</td>
          <td class="wl-col-notes wl-notes-cell">${notes || '<span class="wl-empty-notes">—</span>'}</td>
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
      })
      .join("");

    // Bind delete buttons
    tbody.querySelectorAll(".wl-btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteLog(btn.dataset.id));
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Search / filter ────────────────────────────────────────────────────────

  function applyFilters() {
    const keyword = (el("wl-search-input")?.value || "").toLowerCase().trim();
    const fromVal = el("wl-filter-from")?.value || "";
    const toVal = el("wl-filter-to")?.value || "";

    let results = [...allLogs];

    if (keyword) {
      results = results.filter(
        (log) =>
          (log.task || "").toLowerCase().includes(keyword) ||
          (log.notes || "").toLowerCase().includes(keyword)
      );
    }

    if (fromVal) {
      results = results.filter(
        (log) => log.createdAt && log.createdAt.slice(0, 10) >= fromVal
      );
    }
    if (toVal) {
      results = results.filter(
        (log) => log.createdAt && log.createdAt.slice(0, 10) <= toVal
      );
    }

    renderTable(results);
  }

  // ── Load logs from main process ────────────────────────────────────────────

  async function loadLogs() {
    try {
      const logs = await window.electronAPI.getWorkLogs();
      // Sort newest first
      allLogs = (logs || []).sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "")
      );
      applyFilters();
      updateSummary();
    } catch (err) {
      console.error("Failed to load work logs:", err);
      showNotification("Failed to load work logs.", "error");
    }
  }

  // ── Add log ────────────────────────────────────────────────────────────────

  async function addLog() {
    const taskInput = el("wl-task-input");
    const notesInput = el("wl-notes-input");
    const btn = el("wl-submit-btn");

    const task = (taskInput?.value || "").trim();
    if (!task) {
      taskInput?.classList.add("wl-input-error");
      taskInput?.focus();
      showNotification("Task description is required.", "error");
      return;
    }
    taskInput?.classList.remove("wl-input-error");

    const notes = (notesInput?.value || "").trim();
    const now = nowMVT();
    const createdAt = isoMVT(now);

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving…";
    }

    try {
      await window.electronAPI.addWorkLog({ task, notes, createdAt });
      taskInput.value = "";
      if (notesInput) notesInput.value = "";
      showNotification("Work log saved successfully.", "success");
      await loadLogs();
      // Scroll to table
      el("wl-table-section")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Failed to save work log:", err);
      showNotification("Failed to save work log.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save Log";
      }
    }
  }

  // ── Delete log ─────────────────────────────────────────────────────────────

  async function deleteLog(id) {
    const confirmed = await showConfirm("Delete this work log? This cannot be undone.", "Delete");
    if (!confirmed) return;
    try {
      await window.electronAPI.deleteWorkLog(id);
      showNotification("Work log deleted.", "success");
      await loadLogs();
    } catch (err) {
      console.error("Failed to delete work log:", err);
      showNotification("Failed to delete work log.", "error");
    }
  }

  // ── Excel export ───────────────────────────────────────────────────────────

  async function exportExcel() {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : allLogs;
    if (logsToExport.length === 0) {
      showNotification("No logs to export.", "error");
      return;
    }

    const rows = logsToExport.map((log, idx) => {
      const { date, time } = parseISO(log.createdAt);
      return {
        no: idx + 1,
        date,
        time,
        task: log.task || "",
        notes: log.notes || "",
      };
    });

    try {
      const exportBtn = el("wl-export-btn");
      if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.textContent = "Exporting…";
      }
      await window.electronAPI.exportWorkLogsExcel({ rows });
      showNotification("Excel file exported successfully.", "success");
    } catch (err) {
      console.error("Excel export failed:", err);
      showNotification("Export failed: " + (err.message || err), "error");
    } finally {
      const exportBtn = el("wl-export-btn");
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Export to Excel`;
      }
    }
  }

  // ── Public init ────────────────────────────────────────────────────────────

  function init() {
    startClock();

    // Form submit
    el("wl-submit-btn")?.addEventListener("click", addLog);

    // Task input – clear error on type
    el("wl-task-input")?.addEventListener("input", () =>
      el("wl-task-input")?.classList.remove("wl-input-error")
    );

    // Enter key in task input submits
    el("wl-task-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addLog();
      }
    });

    // Search and filters
    const debouncedFilter = debounce(applyFilters, 250);
    el("wl-search-input")?.addEventListener("input", debouncedFilter);
    el("wl-filter-from")?.addEventListener("change", applyFilters);
    el("wl-filter-to")?.addEventListener("change", applyFilters);
    el("wl-filter-clear")?.addEventListener("click", () => {
      const searchEl = el("wl-search-input");
      const fromEl = el("wl-filter-from");
      const toEl = el("wl-filter-to");
      if (searchEl) searchEl.value = "";
      if (fromEl) fromEl.value = "";
      if (toEl) toEl.value = "";
      applyFilters();
    });

    // Export
    el("wl-export-btn")?.addEventListener("click", exportExcel);

    // Load initial data
    loadLogs();
  }

  // Simple debounce (mirrors app.js)
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  return { init, stopClock };
})();

/**
 * Called by app.js switchView when navigating to "worklogs".
 */
function initWorkLogs() {
  WL.init();
}