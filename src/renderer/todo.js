/**
 * @file todo.js
 * @description Full-featured To-Do manager for MTO Samugaa.
 * Reads/writes todos from worklogs.db via IPC.
 * Calendar integration: updating due date refreshes calendar dot indicators.
 * Notion sync: push all visible todos to Notion DB; pull tasks from Notion.
 */

// ============================================================================
// STATE
// ============================================================================

let _tdInitialized = false;
let _tdAllItems = []; // All loaded items [{id, date, text, done}]
let _tdFilter = "current-week";
let _tdStatusFilter = "all"; // "all" | "pending" | "done"
let _tdSearchQuery = "";
let _tdSortMode = "date-asc"; // "date-asc" | "date-desc" | "alpha"
let _tdYearSel = new Date().getFullYear();
let _tdEditingId = null; // null = new todo, string = editing existing

// Notion
let _tdNotionToken = "";
let _tdNotionDbId = "";
let _tdNotionSyncing = false;

// ============================================================================
// INIT
// ============================================================================

async function initTodo() {
  if (_tdInitialized) {
    // Already initialized — just reload data
    _tdLoadNotionCreds();
    await _tdLoadAll();
    return;
  }
  _tdInitialized = true;

  _tdBindFilterButtons();
  _tdBindStatusTabs();
  _tdBindSearchInput();
  _tdBindSortButton();
  _tdBindAddButton();
  _tdBindModal();
  _tdBindNotionButtons();
  _tdBindYearNav();
  _tdLoadNotionCreds();

  await _tdLoadAll();
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function _tdLoadAll() {
  try {
    const { from, to } = _tdGetDateRange();
    let items;
    if (from && to) {
      items = await window.electronAPI.calTodoGetAll({ from, to });
    } else {
      items = await window.electronAPI.calTodoGetAll({});
    }
    _tdAllItems = items || [];
  } catch (e) {
    console.error("Todo load error:", e);
    _tdAllItems = [];
  }
  _tdRender();
}

// ============================================================================
// DATE RANGE CALCULATION
// ============================================================================

function _tdGetDateRange() {
  const today = new Date();
  const todayStr = _tdFmtDate(today);

  if (_tdFilter === "all") return { from: null, to: null };

  if (_tdFilter === "current-week") {
    const start = new Date(today);
    // Maldives: week starts Sunday
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: _tdFmtDate(start), to: _tdFmtDate(end) };
  }

  if (_tdFilter === "last-week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: _tdFmtDate(start), to: _tdFmtDate(end) };
  }

  if (_tdFilter === "current-month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: _tdFmtDate(start), to: _tdFmtDate(end) };
  }

  if (_tdFilter === "last-month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: _tdFmtDate(start), to: _tdFmtDate(end) };
  }

  if (_tdFilter === "last-3-months") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { from: _tdFmtDate(start), to: todayStr };
  }

  if (_tdFilter === "year") {
    return {
      from: `${_tdYearSel}-01-01`,
      to: `${_tdYearSel}-12-31`,
    };
  }

  return { from: null, to: null };
}

function _tdGetRangeLabel() {
  const { from, to } = _tdGetDateRange();
  if (!from && !to) return "All time";
  if (from && to) {
    const f = _tdPrettyDate(from);
    const t = _tdPrettyDate(to);
    return `${f} – ${t}`;
  }
  return from ? `From ${_tdPrettyDate(from)}` : "";
}

// ============================================================================
// FILTERING & SORTING
// ============================================================================

function _tdGetFiltered() {
  let items = [..._tdAllItems];

  // Status filter
  if (_tdStatusFilter === "pending") items = items.filter((i) => !i.done);
  else if (_tdStatusFilter === "done") items = items.filter((i) => i.done);

  // Search
  if (_tdSearchQuery) {
    const q = _tdSearchQuery.toLowerCase();
    items = items.filter((i) => i.text.toLowerCase().includes(q));
  }

  // Sort
  const today = _tdFmtDate(new Date());
  items.sort((a, b) => {
    if (_tdSortMode === "date-asc")
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    if (_tdSortMode === "date-desc")
      return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
    if (_tdSortMode === "alpha") return a.text.localeCompare(b.text);
    return 0;
  });

  return items;
}

function _tdCountOverdue() {
  const today = _tdFmtDate(new Date());
  return _tdAllItems.filter((i) => !i.done && i.date < today).length;
}

// ============================================================================
// RENDER
// ============================================================================

function _tdRender() {
  _tdUpdateStats();
  _tdUpdateRangeLabel();

  const items = _tdGetFiltered();
  const groups = document.getElementById("td-groups");
  const empty = document.getElementById("td-empty");

  if (!groups) return;

  if (items.length === 0) {
    groups.innerHTML = "";
    if (empty) {
      empty.style.display = "flex";
      const title = document.getElementById("td-empty-title");
      const sub = document.getElementById("td-empty-sub");
      if (_tdSearchQuery && title) title.textContent = "No matching to-dos";
      else if (title) title.textContent = "No to-dos in this range";
      if (sub)
        sub.textContent = _tdSearchQuery
          ? "Try a different search"
          : "Click + to add a to-do";
    }
    return;
  }

  if (empty) empty.style.display = "none";

  // Group by date
  const byDate = {};
  for (const item of items) {
    if (!byDate[item.date]) byDate[item.date] = [];
    byDate[item.date].push(item);
  }

  const today = _tdFmtDate(new Date());
  const yesterday = _tdFmtDate(new Date(Date.now() - 86400000));
  const tomorrow = _tdFmtDate(new Date(Date.now() + 86400000));

  let html = "";
  for (const [date, dateItems] of Object.entries(byDate)) {
    const isOverdue = date < today;
    const isToday = date === today;
    const isTomorrow = date === tomorrow;
    const isYesterday = date === yesterday;

    let dateLabel = _tdPrettyDate(date);
    let dateBadge = "";
    if (isToday)
      dateBadge =
        '<span class="td-date-badge td-date-badge--today">Today</span>';
    else if (isTomorrow)
      dateBadge =
        '<span class="td-date-badge td-date-badge--tomorrow">Tomorrow</span>';
    else if (isYesterday)
      dateBadge = '<span class="td-date-badge">Yesterday</span>';
    else if (isOverdue)
      dateBadge =
        '<span class="td-date-badge td-date-badge--overdue">Overdue</span>';

    const doneCount = dateItems.filter((i) => i.done).length;
    const progress =
      dateItems.length > 0
        ? Math.round((doneCount / dateItems.length) * 100)
        : 0;

    html += `
      <div class="td-group${isOverdue && !isToday && !isYesterday ? " td-group--overdue" : ""}${isToday ? " td-group--today" : ""}" data-date="${date}">
        <div class="td-group-header">
          <div class="td-group-date-row">
            <span class="td-group-date">${dateLabel}</span>
            ${dateBadge}
          </div>
          <div class="td-group-meta">
            <div class="td-progress-bar">
              <div class="td-progress-fill" style="width:${progress}%"></div>
            </div>
            <span class="td-group-count">${doneCount}/${dateItems.length}</span>
          </div>
        </div>
        <div class="td-items">
          ${dateItems.map((item) => _tdRenderItem(item)).join("")}
        </div>
        <div class="td-group-footer">
          <button class="td-inline-add" data-date="${date}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add to-do for this date
          </button>
        </div>
      </div>
    `;
  }

  groups.innerHTML = html;
  _tdBindItemEvents();
}

function _tdRenderItem(item) {
  const today = _tdFmtDate(new Date());
  const isOverdue = !item.done && item.date < today;
  return `
    <div class="td-item${item.done ? " td-item--done" : ""}${isOverdue ? " td-item--overdue" : ""}" data-id="${item.id}" data-date="${item.date}">
      <button class="td-check" data-id="${item.id}" data-done="${item.done}" title="${item.done ? "Mark pending" : "Mark done"}">
        <svg class="td-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          ${
            item.done
              ? '<polyline points="20 6 9 17 4 12"/>'
              : '<rect x="3" y="3" width="18" height="18" rx="3"/>'
          }
        </svg>
      </button>
      <span class="td-item-text">${_tdEscape(item.text)}</span>
      <div class="td-item-actions">
        <button class="td-action-btn td-edit-btn" data-id="${item.id}" title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="td-action-btn td-date-btn" data-id="${item.id}" data-date="${item.date}" title="Change due date">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        <button class="td-action-btn td-delete-btn" data-id="${item.id}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
      <!-- Inline date picker (hidden, shown on date-btn click) -->
      <input type="date" class="td-inline-date-input" id="td-date-input-${item.id}" value="${item.date}" style="display:none" />
    </div>
  `;
}

// ============================================================================
// STATS & LABELS
// ============================================================================

function _tdUpdateStats() {
  const total = _tdAllItems.length;
  const done = _tdAllItems.filter((i) => i.done).length;
  const pending = total - done;
  const overdue = _tdCountOverdue();

  const elTotal = document.getElementById("td-stat-total");
  const elDone = document.getElementById("td-stat-done");
  const elPending = document.getElementById("td-stat-pending");
  const elOverdue = document.getElementById("td-stat-overdue");

  if (elTotal) elTotal.textContent = total;
  if (elDone) elDone.textContent = done;
  if (elPending) elPending.textContent = pending;
  if (elOverdue) elOverdue.textContent = overdue;
}

function _tdUpdateRangeLabel() {
  const el = document.getElementById("td-range-label");
  if (el) el.textContent = _tdGetRangeLabel();
}

// ============================================================================
// EVENT BINDING — FILTERS, SEARCH, SORT
// ============================================================================

function _tdBindFilterButtons() {
  const list = document.getElementById("td-filter-list");
  if (!list) return;
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".td-filter-btn");
    if (!btn) return;
    list
      .querySelectorAll(".td-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    _tdFilter = btn.dataset.filter;

    const yearPicker = document.getElementById("td-year-picker");
    if (yearPicker)
      yearPicker.style.display = _tdFilter === "year" ? "flex" : "none";

    _tdLoadAll();
  });
}

function _tdBindStatusTabs() {
  const tabs = document.getElementById("td-status-tabs");
  if (!tabs) return;
  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".td-status-tab");
    if (!btn) return;
    tabs
      .querySelectorAll(".td-status-tab")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    _tdStatusFilter = btn.dataset.status;
    _tdRender();
  });
}

function _tdBindSearchInput() {
  const input = document.getElementById("td-search-input");
  const clear = document.getElementById("td-search-clear");
  if (!input) return;

  const doSearch = debounce
    ? debounce((v) => {
        _tdSearchQuery = v;
        if (clear) clear.style.display = v ? "flex" : "none";
        _tdRender();
      }, 200)
    : (v) => {
        _tdSearchQuery = v;
        if (clear) clear.style.display = v ? "flex" : "none";
        _tdRender();
      };

  input.addEventListener("input", (e) => doSearch(e.target.value.trim()));

  if (clear) {
    clear.addEventListener("click", () => {
      input.value = "";
      _tdSearchQuery = "";
      clear.style.display = "none";
      _tdRender();
      input.focus();
    });
  }
}

function _tdBindSortButton() {
  const btn = document.getElementById("td-sort-btn");
  if (!btn) return;
  const modes = [
    { key: "date-asc", label: "Date ↑" },
    { key: "date-desc", label: "Date ↓" },
    { key: "alpha", label: "A–Z" },
  ];
  btn.addEventListener("click", () => {
    const idx = modes.findIndex((m) => m.key === _tdSortMode);
    _tdSortMode = modes[(idx + 1) % modes.length].key;
    const labelEl = document.getElementById("td-sort-label");
    if (labelEl)
      labelEl.textContent =
        modes[modes.findIndex((m) => m.key === _tdSortMode)].label;
    _tdRender();
  });
}

function _tdBindYearNav() {
  const prev = document.getElementById("td-year-prev");
  const next = document.getElementById("td-year-next");
  const display = document.getElementById("td-year-display");

  const update = () => {
    if (display) display.textContent = _tdYearSel;
    _tdLoadAll();
  };

  if (prev)
    prev.addEventListener("click", () => {
      _tdYearSel--;
      update();
    });
  if (next)
    next.addEventListener("click", () => {
      _tdYearSel++;
      update();
    });
}

// ============================================================================
// EVENT BINDING — ADD / MODAL
// ============================================================================

function _tdBindAddButton() {
  const btn = document.getElementById("td-add-btn");
  if (!btn) return;
  btn.addEventListener("click", () => _tdOpenModal(null, null));
}

function _tdBindModal() {
  const overlay = document.getElementById("td-modal-overlay");
  const closeBtn = document.getElementById("td-modal-close");
  const cancelBtn = document.getElementById("td-modal-cancel");
  const saveBtn = document.getElementById("td-modal-save");

  if (closeBtn) closeBtn.addEventListener("click", _tdCloseModal);
  if (cancelBtn) cancelBtn.addEventListener("click", _tdCloseModal);
  if (overlay)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) _tdCloseModal();
    });
  if (saveBtn) saveBtn.addEventListener("click", _tdSaveModal);

  // Enter in textarea = save (Shift+Enter = newline)
  const textarea = document.getElementById("td-modal-text");
  if (textarea) {
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        _tdSaveModal();
      }
    });
  }
}

function _tdOpenModal(editId, prefillDate) {
  _tdEditingId = editId || null;

  const overlay = document.getElementById("td-modal-overlay");
  const title = document.getElementById("td-modal-title");
  const textarea = document.getElementById("td-modal-text");
  const dateInput = document.getElementById("td-modal-date");

  if (editId) {
    const item = _tdAllItems.find((i) => i.id === editId);
    if (title) title.textContent = "Edit To-Do";
    if (textarea) textarea.value = item ? item.text : "";
    if (dateInput) dateInput.value = item ? item.date : _tdFmtDate(new Date());
  } else {
    if (title) title.textContent = "New To-Do";
    if (textarea) textarea.value = "";
    if (dateInput) dateInput.value = prefillDate || _tdFmtDate(new Date());
  }

  if (overlay) overlay.style.display = "flex";
  setTimeout(() => textarea && textarea.focus(), 50);
}

function _tdCloseModal() {
  const overlay = document.getElementById("td-modal-overlay");
  if (overlay) overlay.style.display = "none";
  _tdEditingId = null;
}

async function _tdSaveModal() {
  const textarea = document.getElementById("td-modal-text");
  const dateInput = document.getElementById("td-modal-date");
  const text = textarea ? textarea.value.trim() : "";
  const date = dateInput ? dateInput.value : "";

  if (!text) {
    if (textarea) textarea.focus();
    return;
  }
  if (!date) {
    if (dateInput) dateInput.focus();
    return;
  }

  try {
    if (_tdEditingId) {
      // Update existing
      const item = _tdAllItems.find((i) => i.id === _tdEditingId);
      if (item) {
        const oldDate = item.date;
        await window.electronAPI.calTodoUpdate(_tdEditingId, { text });
        if (date !== oldDate) {
          await window.electronAPI.calTodoMove(_tdEditingId, date);
          _tdNotifyCalendar(oldDate);
          _tdNotifyCalendar(date);
        }
        item.text = text;
        item.date = date;
      }
    } else {
      // New item
      const newItem = await window.electronAPI.calTodoAdd(date, text);
      _tdAllItems.push(newItem);
      _tdNotifyCalendar(date);
    }
  } catch (e) {
    console.error("Todo save error:", e);
    if (window.showToast) window.showToast("Failed to save to-do", "error");
  }

  _tdCloseModal();
  _tdRender();
}

// ============================================================================
// EVENT BINDING — ITEM INTERACTIONS
// ============================================================================

function _tdBindItemEvents() {
  const groups = document.getElementById("td-groups");
  if (!groups) return;

  // Toggle done
  groups.querySelectorAll(".td-check").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const wasDone = btn.dataset.done === "true";
      const newDone = !wasDone;
      try {
        await window.electronAPI.calTodoUpdate(id, { done: newDone });
        const item = _tdAllItems.find((i) => i.id === id);
        if (item) item.done = newDone;
        _tdRender();
      } catch (e) {
        console.error("Toggle done error:", e);
      }
    });
  });

  // Edit
  groups.querySelectorAll(".td-edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _tdOpenModal(btn.dataset.id, null);
    });
  });

  // Change due date (inline date picker)
  groups.querySelectorAll(".td-date-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const input = document.getElementById(`td-date-input-${id}`);
      if (!input) return;
      // Show native date picker
      input.style.display = "block";
      input.focus();
      input.showPicker && input.showPicker();

      const cleanup = () => {
        input.style.display = "none";
        input.removeEventListener("change", onChange);
        input.removeEventListener("blur", cleanup);
      };

      const onChange = async () => {
        const newDate = input.value;
        if (!newDate) {
          cleanup();
          return;
        }
        const item = _tdAllItems.find((i) => i.id === id);
        if (!item || item.date === newDate) {
          cleanup();
          return;
        }
        const oldDate = item.date;
        try {
          await window.electronAPI.calTodoMove(id, newDate);
          item.date = newDate;
          _tdNotifyCalendar(oldDate);
          _tdNotifyCalendar(newDate);
          _tdRender();
        } catch (e) {
          console.error("Move date error:", e);
          if (window.showToast)
            window.showToast("Failed to update due date", "error");
        }
        cleanup();
      };

      input.addEventListener("change", onChange);
      input.addEventListener("blur", cleanup);
    });
  });

  // Delete
  groups.querySelectorAll(".td-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const confirmed = await (window.showConfirm
        ? window.showConfirm("Delete this to-do?", "Delete")
        : Promise.resolve(confirm("Delete this to-do?")));
      if (!confirmed) return;
      try {
        await window.electronAPI.calTodoDelete(id);
        const item = _tdAllItems.find((i) => i.id === id);
        if (item) _tdNotifyCalendar(item.date);
        _tdAllItems = _tdAllItems.filter((i) => i.id !== id);
        _tdRender();
        if (window.showToast) window.showToast("To-do deleted", "success");
      } catch (e) {
        console.error("Delete error:", e);
      }
    });
  });

  // Inline add for specific date
  groups.querySelectorAll(".td-inline-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _tdOpenModal(null, btn.dataset.date);
    });
  });
}

// ============================================================================
// CALENDAR INTEGRATION — notify calendar to refresh dot indicators
// ============================================================================

function _tdNotifyCalendar(dateStr) {
  // If calendar module is loaded and currently rendered, refresh its dot cache
  if (typeof _calTodoDates !== "undefined") {
    // Refresh the dot for this date by checking IPC
    if (
      typeof calHasTodos === "function" &&
      typeof _calTodoDates !== "undefined"
    ) {
      calHasTodos(dateStr)
        .then((has) => {
          if (has) _calTodoDates.add(dateStr);
          else _calTodoDates.delete(dateStr);
          // If calendar view is visible, re-render the specific cell
          if (typeof _refreshDayCell === "function") _refreshDayCell(dateStr);
        })
        .catch(() => {});
    }
  }
}

// ============================================================================
// NOTION SYNC
// ============================================================================

function _tdLoadNotionCreds() {
  _tdNotionToken = localStorage.getItem("mto_notion_token") || "";
  _tdNotionDbId = localStorage.getItem("mto_notion_db_id") || "";
  _tdUpdateNotionBadge();
}

function _tdUpdateNotionBadge() {
  const badge = document.getElementById("td-notion-badge");
  const hint = document.getElementById("td-notion-hint");
  if (!badge) return;
  const connected = !!_tdNotionToken && !!_tdNotionDbId;
  badge.textContent = connected ? "Connected" : "Not configured";
  badge.className = `td-notion-badge ${connected ? "td-notion-badge--ok" : "td-notion-badge--off"}`;
  if (hint) hint.style.display = connected ? "none" : "block";
}

function _tdBindNotionButtons() {
  const pushBtn = document.getElementById("td-notion-push");
  const pullBtn = document.getElementById("td-notion-pull");
  if (pushBtn) pushBtn.addEventListener("click", _tdNotionPush);
  if (pullBtn) pullBtn.addEventListener("click", _tdNotionPull);
}

function _tdSetNotionBusy(busy) {
  _tdNotionSyncing = busy;
  const pushBtn = document.getElementById("td-notion-push");
  const pullBtn = document.getElementById("td-notion-pull");
  if (pushBtn) pushBtn.disabled = busy;
  if (pullBtn) pullBtn.disabled = busy;
}

/**
 * Push all current items (in filtered range) to Notion.
 * Creates new pages for todos that don't have a notion_id,
 * updates existing ones that do.
 * We store notion_id per todo in localStorage as a simple mapping.
 */
async function _tdNotionPush() {
  _tdLoadNotionCreds();
  if (!_tdNotionToken || !_tdNotionDbId) {
    if (window.showToast)
      window.showToast("Configure Notion in Settings first", "error");
    return;
  }
  if (_tdNotionSyncing) return;
  _tdSetNotionBusy(true);
  if (window.showToast) window.showToast("Pushing to Notion…", "success");

  const items = _tdGetFiltered();
  const notionMap = _tdLoadNotionMap();
  let created = 0,
    updated = 0,
    failed = 0;

  for (const item of items) {
    const existingPageId = notionMap[item.id];
    try {
      if (existingPageId) {
        // Update existing Notion page
        await _tdNotionUpdatePage(existingPageId, item);
        updated++;
      } else {
        // Create new Notion page
        const pageId = await _tdNotionCreatePage(item);
        if (pageId) {
          notionMap[item.id] = pageId;
          created++;
        } else {
          failed++;
        }
      }
    } catch (e) {
      console.error("Notion push item error:", e);
      failed++;
    }
  }

  _tdSaveNotionMap(notionMap);
  _tdSetNotionBusy(false);

  const msg = `Notion sync: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ""}`;
  if (window.showToast) window.showToast(msg, failed ? "error" : "success");
}

async function _tdNotionCreatePage(item) {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: _tdNotionHeaders(),
    body: JSON.stringify({
      parent: { database_id: _tdNotionDbId },
      properties: _tdItemToNotionProps(item),
    }),
  });
  if (!response.ok) {
    console.error("Notion create page error:", await response.text());
    return null;
  }
  const data = await response.json();
  return data.id;
}

async function _tdNotionUpdatePage(pageId, item) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: _tdNotionHeaders(),
    body: JSON.stringify({
      properties: _tdItemToNotionProps(item),
    }),
  });
  if (!response.ok) {
    console.error("Notion update page error:", await response.text());
    throw new Error("Update failed");
  }
}

/**
 * Pull todos from Notion database and merge into local.
 * Only imports todos that don't already exist locally (by Notion page ID).
 */
async function _tdNotionPull() {
  _tdLoadNotionCreds();
  if (!_tdNotionToken || !_tdNotionDbId) {
    if (window.showToast)
      window.showToast("Configure Notion in Settings first", "error");
    return;
  }
  if (_tdNotionSyncing) return;
  _tdSetNotionBusy(true);
  if (window.showToast) window.showToast("Pulling from Notion…", "success");

  try {
    const pages = await _tdNotionQueryDatabase();
    const notionMap = _tdLoadNotionMap();
    // Reverse map: notionPageId -> localId
    const reverseMap = {};
    for (const [localId, pageId] of Object.entries(notionMap)) {
      reverseMap[pageId] = localId;
    }

    let imported = 0,
      updated = 0;

    for (const page of pages) {
      const pageId = page.id;
      const props = page.properties;

      // Extract values from Notion properties
      const text = _tdNotionExtractTitle(props);
      const done =
        _tdNotionExtractCheckbox(props, "Done") ||
        _tdNotionExtractCheckbox(props, "Status") ||
        false;
      const date =
        _tdNotionExtractDate(props, "Due Date") ||
        _tdNotionExtractDate(props, "Date") ||
        _tdFmtDate(new Date());

      if (!text) continue;

      const existingLocalId = reverseMap[pageId];

      if (existingLocalId) {
        // Update existing local item
        const localItem = _tdAllItems.find((i) => i.id === existingLocalId);
        if (localItem) {
          localItem.text = text;
          localItem.done = done;
          const oldDate = localItem.date;
          if (localItem.date !== date) {
            await window.electronAPI.calTodoMove(existingLocalId, date);
            localItem.date = date;
            _tdNotifyCalendar(oldDate);
            _tdNotifyCalendar(date);
          }
          await window.electronAPI.calTodoUpdate(existingLocalId, {
            text,
            done,
          });
          updated++;
        }
      } else {
        // Create new local item
        const newItem = await window.electronAPI.calTodoAdd(date, text);
        await window.electronAPI.calTodoUpdate(newItem.id, { done });
        newItem.done = done;
        _tdAllItems.push(newItem);
        notionMap[newItem.id] = pageId;
        _tdNotifyCalendar(date);
        imported++;
      }
    }

    _tdSaveNotionMap(notionMap);
    _tdSetNotionBusy(false);
    _tdRender();
    const msg = `Notion pull: ${imported} imported, ${updated} updated`;
    if (window.showToast) window.showToast(msg, "success");
  } catch (e) {
    console.error("Notion pull error:", e);
    _tdSetNotionBusy(false);
    if (window.showToast)
      window.showToast(
        "Notion pull failed: " + (e.message || "unknown error"),
        "error",
      );
  }
}

async function _tdNotionQueryDatabase() {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${_tdNotionDbId}/query`,
    {
      method: "POST",
      headers: _tdNotionHeaders(),
      body: JSON.stringify({ page_size: 100 }),
    },
  );
  if (!response.ok) throw new Error("Query failed: " + (await response.text()));
  const data = await response.json();
  return data.results || [];
}

function _tdNotionHeaders() {
  return {
    Authorization: `Bearer ${_tdNotionToken}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
}

function _tdItemToNotionProps(item) {
  return {
    Name: {
      title: [{ text: { content: item.text } }],
    },
    Done: { checkbox: item.done },
    "Due Date": { date: item.date ? { start: item.date } : null },
  };
}

function _tdNotionExtractTitle(props) {
  // Try common title property names
  for (const key of ["Name", "Title", "Task", "To-do", "Todo"]) {
    if (props[key] && props[key].title && props[key].title.length > 0) {
      return props[key].title.map((t) => t.plain_text).join("");
    }
  }
  // Fallback: first title-type prop
  for (const prop of Object.values(props)) {
    if (prop.type === "title" && prop.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "";
}

function _tdNotionExtractCheckbox(props, key) {
  return props[key] && props[key].type === "checkbox"
    ? props[key].checkbox
    : null;
}

function _tdNotionExtractDate(props, key) {
  if (props[key] && props[key].type === "date" && props[key].date) {
    return props[key].date.start || null;
  }
  return null;
}

// Persist Notion page ID <-> local todo ID mapping in localStorage
function _tdLoadNotionMap() {
  try {
    return JSON.parse(localStorage.getItem("mto_todo_notion_map") || "{}");
  } catch (_) {
    return {};
  }
}

function _tdSaveNotionMap(map) {
  localStorage.setItem("mto_todo_notion_map", JSON.stringify(map));
}

// ============================================================================
// UTILITIES
// ============================================================================

function _tdFmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function _tdPrettyDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function _tdEscape(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Expose to app.js
window.initTodo = initTodo;
