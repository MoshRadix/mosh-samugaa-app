/**
 * @file todo.js
 * @description Full-featured To-Do manager for MTO Samugaa.
 * Reads/writes todos from worklogs.db via IPC.
 * Calendar integration: updating due date refreshes calendar dot indicators.
 * Notion sync: push all visible todos to Notion DB; pull tasks from Notion.
 *
 * UX improvements (v2):
 * - Priority dots (colour-coded) always visible on items
 * - Overdue group: danger-coloured header + warm background tint
 * - Progress bars animate via CSS transition (already in CSS)
 * - Inline double-click text editing (no modal for text-only edits)
 * - Action buttons always visible at low opacity, full on hover
 * - Collapsible sidebar sections (Status expanded, Tags/Notion collapsed by default)
 * - Active filter pill in toolbar — shows when tag/priority filter is active
 * - "All done" empty state distinct from "nothing exists" empty state
 * - Space key toggles done on keyboard-focused item
 * - Tab/Shift-Tab navigation between items
 * - Optimistic UI for done toggle (DOM updates immediately, rolls back on error)
 * - Today group sticky at top when in view
 */

// ============================================================================
// STATE
// ============================================================================

let _tdInitialized = false;
let _tdAllItems = []; // All loaded items [{id, date, text, done, tags, priority}]
let _tdFilter = "current-week";
let _tdStatusFilter = "all"; // "all" | "pending" | "done"
let _tdSearchQuery = "";
let _tdSortMode = "date-asc"; // "date-asc" | "date-desc" | "alpha"
let _tdYearSel = new Date().getFullYear();
let _tdEditingId = null; // null = new todo, string = editing existing
let _tdTagFilter = null; // null = show all, string = filter by this tag
let _tdModalTags = []; // tags being edited in modal
let _tdPriorityFilter = "all"; // "all" | "low" | "medium" | "high"
let _tdModalPriority = "medium"; // priority being set in modal

// Notion
let _tdNotionToken = "";
let _tdNotionDbId = "";
let _tdNotionSyncing = false;

// ============================================================================
// INIT
// ============================================================================

async function initTodo() {
  if (_tdInitialized) {
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
  _tdBindTagFilter();
  _tdBindPriorityFilter();
  _tdBindNotionButtons();
  _tdBindYearNav();
  _tdBindExport();
  _tdBindCollapsibleSections();
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
    // 3 previous months + current month, through end of current month
    const start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: _tdFmtDate(start), to: _tdFmtDate(end) };
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

  if (_tdStatusFilter === "pending") items = items.filter((i) => !i.done);
  else if (_tdStatusFilter === "done") items = items.filter((i) => i.done);

  if (_tdPriorityFilter !== "all") {
    items = items.filter((i) => (i.priority || "medium") === _tdPriorityFilter);
  }

  if (_tdTagFilter) {
    items = items.filter((i) => Array.isArray(i.tags) && i.tags.includes(_tdTagFilter));
  }

  if (_tdSearchQuery) {
    const q = _tdSearchQuery.toLowerCase();
    items = items.filter((i) => i.text.toLowerCase().includes(q));
  }

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
  _tdUpdateTagFilterSidebar();
  _tdUpdatePriorityFilterSidebar();
  _tdUpdateActiveFilterPill();

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

      if (_tdSearchQuery) {
        if (title) title.textContent = "No matching tasks";
        if (sub) sub.textContent = "Try a different search term";
      } else {
        // Distinguish "all done" vs "nothing exists"
        const total = _tdAllItems.length;
        const done = _tdAllItems.filter((i) => i.done).length;
        if (total > 0 && done === total && _tdStatusFilter !== "done") {
          if (title) title.textContent = "All done!";
          if (sub) sub.textContent = "Every task in this range is complete 🎉";
        } else {
          if (title) title.textContent = "Nothing scheduled here";
          if (sub) sub.textContent = "Press N or click New to add a task";
        }
      }
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
      dateBadge = '<span class="td-date-badge td-date-badge--today">Today</span>';
    else if (isTomorrow)
      dateBadge = '<span class="td-date-badge td-date-badge--tomorrow">Tomorrow</span>';
    else if (isYesterday)
      dateBadge = '<span class="td-date-badge">Yesterday</span>';
    else if (isOverdue)
      dateBadge = '<span class="td-date-badge td-date-badge--overdue">Overdue</span>';

    const doneCount = dateItems.filter((i) => i.done).length;
    const progress =
      dateItems.length > 0
        ? Math.round((doneCount / dateItems.length) * 100)
        : 0;

    // Overdue group: stronger signal — class drives CSS colour + bg tint
    const groupClasses = [
      "td-group",
      isOverdue && !isToday && !isYesterday ? "td-group--overdue" : "",
      isToday ? "td-group--today" : "",
    ].filter(Boolean).join(" ");

    // Overdue date label gets danger colour via CSS class
    const dateLabelClass = isOverdue && !isToday && !isYesterday
      ? "td-group-date td-group-date--overdue"
      : "td-group-date";

    html += `
      <div class="${groupClasses}" data-date="${date}">
        <div class="td-group-header">
          <div class="td-group-date-row">
            <span class="${dateLabelClass}">${dateLabel}</span>
            ${dateBadge}
          </div>
          <div class="td-group-meta">
            <div class="td-progress-bar" title="${progress}% complete">
              <div class="td-progress-fill" style="width:${progress}%;--pct:${progress}"></div>
            </div>
            <span class="td-group-count">${doneCount}/${dateItems.length}</span>
          </div>
        </div>
        <div class="td-items" role="list">
          ${dateItems.map((item) => _tdRenderItem(item)).join("")}
        </div>
        <div class="td-group-footer">
          <button class="td-inline-add" data-date="${date}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add task for this date
          </button>
        </div>
      </div>
    `;
  }

  groups.innerHTML = html;
  _tdBindItemEvents();
}

function _tdSetLoggedBadge(itemEl, worklogId, show) {
  if (!itemEl) return;
  let badge = itemEl.querySelector(".td-logged-badge");
  if (show && worklogId) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "td-logged-badge";
      badge.title = "Logged to Work Log";
      badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Logged`;
      // Try to append into existing tags row; if none, create one
      let tagsRow = itemEl.querySelector(".td-item-tags");
      if (!tagsRow) {
        tagsRow = document.createElement("div");
        tagsRow.className = "td-item-tags";
        const body = itemEl.querySelector(".td-item-body");
        if (body) body.appendChild(tagsRow);
      }
      tagsRow.appendChild(badge);
    }
  } else if (badge) {
    badge.remove();
  }
}

function _tdRenderItem(item) {
  const today = _tdFmtDate(new Date());
  const isOverdue = !item.done && item.date < today;
  const priority = item.priority || "medium";
  const tags = Array.isArray(item.tags) ? item.tags : [];

  // "Logged" badge — sits in the metadata row alongside tag pills
  const loggedBadge = (item.done && item.linkedWorklogId)
    ? `<span class="td-logged-badge" title="Logged to Work Log"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Logged</span>`
    : "";

  // Metadata row: tag pills + logged badge grouped together below the text
  const hasMeta = tags.length > 0 || !!loggedBadge;
  const metaRow = hasMeta
    ? `<div class="td-item-tags">
        ${tags.map(t => `<span class="td-tag-pill td-tag-pill--item" data-tag="${_tdEscape(t)}">${_tdEscape(t)}</span>`).join("")}
        ${loggedBadge}
       </div>`
    : "";

  // Priority dot colours — red/amber/teal
  const dotColours = { high: "#c47a6e", medium: "#c9a87b", low: "#6c8b7a" };
  const dotColour = dotColours[priority] || dotColours.medium;

  return `
    <div class="td-item${item.done ? " td-item--done" : ""}${isOverdue ? " td-item--overdue" : ""} td-item--priority-${priority}"
         data-id="${item.id}" data-date="${item.date}" data-priority="${priority}"
         role="listitem" tabindex="0" aria-label="${_tdEscape(item.text)}${item.done ? ', done' : ', pending'}">
      <button class="td-check" data-id="${item.id}" data-done="${item.done}" title="${item.done ? "Mark pending" : "Mark done"}" aria-pressed="${item.done}">
        <svg class="td-check-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
      <span class="td-priority-dot" style="background:${dotColour}" title="${priority} priority" aria-hidden="true"></span>
      <div class="td-item-body">
        <div class="td-item-text-row">
          <span class="td-item-text" data-id="${item.id}">${_tdEscape(item.text)}</span>
        </div>
        ${metaRow}
      </div>
      <div class="td-item-actions">
        <button class="td-action-btn td-edit-btn" data-id="${item.id}" title="Edit (double-click task to edit inline)" aria-label="Edit task">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="td-action-btn td-date-btn" data-id="${item.id}" data-date="${item.date}" title="Change due date" aria-label="Change due date">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        <button class="td-action-btn td-delete-btn" data-id="${item.id}" title="Delete" aria-label="Delete task">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
      <input type="date" class="td-inline-date-input" id="td-date-input-${item.id}" value="${item.date}" style="display:none" aria-hidden="true"/>
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

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const globalFill = document.getElementById("td-global-progress-fill");
  const globalPct = document.getElementById("td-global-progress-pct");
  if (globalFill) {
    globalFill.style.width = pct + "%";
    globalFill.style.setProperty("--pct", pct);
  }
  if (globalPct) globalPct.textContent = total > 0 ? `${pct}%` : "";
}

function _tdUpdateRangeLabel() {
  const el = document.getElementById("td-range-label");
  if (el) el.textContent = _tdGetRangeLabel();
}

// ── Active filter pill in toolbar ─────────────────────────────────────────

function _tdUpdateActiveFilterPill() {
  const wrap = document.getElementById("td-active-filter-pill-wrap");
  if (!wrap) return;

  const parts = [];
  if (_tdTagFilter) parts.push(`tag: ${_tdTagFilter}`);
  if (_tdPriorityFilter !== "all") parts.push(`${_tdPriorityFilter} priority`);

  if (parts.length === 0) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    return;
  }

  wrap.style.display = "flex";
  wrap.innerHTML = parts.map(p => `
    <span class="td-active-filter-pill">
      ${_tdEscape(p)}
      <button class="td-active-filter-clear" data-filter="${_tdEscape(p)}" title="Clear this filter" aria-label="Clear filter ${_tdEscape(p)}">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>
  `).join("");

  wrap.querySelectorAll(".td-active-filter-clear").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const f = btn.dataset.filter;
      if (f.startsWith("tag:")) _tdTagFilter = null;
      if (f.includes("priority")) _tdPriorityFilter = "all";
      _tdRender();
    });
  });
}

// ============================================================================
// COLLAPSIBLE SIDEBAR SECTIONS
// ============================================================================

function _tdBindCollapsibleSections() {
  const toggles = document.querySelectorAll(".td-section-toggle");
  toggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const section = toggle.closest(".td-sidebar-section");
      if (!section) return;
      const body = section.querySelector(".td-section-body");
      if (!body) return;
      const isCollapsed = body.classList.toggle("td-section-body--collapsed");
      toggle.setAttribute("aria-expanded", String(!isCollapsed));
      toggle.classList.toggle("td-section-toggle--collapsed", isCollapsed);
    });
  });
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

  if (prev) prev.addEventListener("click", () => { _tdYearSel--; update(); });
  if (next) next.addEventListener("click", () => { _tdYearSel++; update(); });
}

// ============================================================================
// PRIORITY — sidebar filter, modal selector
// ============================================================================

const TD_PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function _tdBindPriorityFilter() {
  const list = document.getElementById("td-priority-filter-list");
  if (!list) return;
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".td-priority-filter-btn");
    if (!btn) return;
    list.querySelectorAll(".td-priority-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    _tdPriorityFilter = btn.dataset.priority;
    _tdRender();
  });
}

function _tdUpdatePriorityFilterSidebar() {
  const list = document.getElementById("td-priority-filter-list");
  if (!list) return;
  list.querySelectorAll(".td-priority-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.priority === _tdPriorityFilter);
  });
}

function _tdUpdateModalPriority() {
  const selector = document.getElementById("td-priority-selector");
  if (!selector) return;
  selector.querySelectorAll(".td-priority-btn").forEach(btn => {
    btn.classList.toggle("td-priority-btn--active", btn.dataset.priority === _tdModalPriority);
  });
}

// ============================================================================
// TAGS — sidebar filter, modal input, rendering
// ============================================================================

function _tdGetAllTags() {
  const set = new Set();
  for (const item of _tdAllItems) {
    if (Array.isArray(item.tags)) item.tags.forEach(t => set.add(t));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function _tdUpdateTagFilterSidebar() {
  const list = document.getElementById("td-tag-filter-list");
  const empty = document.getElementById("td-tag-filter-empty");
  if (!list) return;

  const tags = _tdGetAllTags();
  if (tags.length === 0) {
    if (empty) empty.style.display = "block";
    list.querySelectorAll(".td-tag-filter-btn").forEach(b => b.remove());
    if (_tdTagFilter) _tdTagFilter = null;
    return;
  }

  if (empty) empty.style.display = "none";

  list.querySelectorAll(".td-tag-filter-btn").forEach(b => b.remove());
  for (const tag of tags) {
    const btn = document.createElement("button");
    btn.className = "td-tag-filter-btn" + (_tdTagFilter === tag ? " active" : "");
    btn.dataset.tag = tag;
    btn.textContent = tag;
    btn.title = `Filter by "${tag}"`;
    btn.addEventListener("click", () => {
      _tdTagFilter = _tdTagFilter === tag ? null : tag;
      _tdRender();
    });
    list.appendChild(btn);
  }

  if (_tdTagFilter && !tags.includes(_tdTagFilter)) {
    _tdTagFilter = null;
  }
}

function _tdBindTagFilter() {
  // Handled dynamically in _tdUpdateTagFilterSidebar
}

function _tdRenderModalTags() {
  const pillsEl = document.getElementById("td-modal-tag-pills");
  if (!pillsEl) return;
  pillsEl.innerHTML = _tdModalTags.map(t =>
    `<span class="td-tag-pill td-tag-pill--removable" data-tag="${_tdEscape(t)}">
      ${_tdEscape(t)}
      <button class="td-tag-pill-remove" data-tag="${_tdEscape(t)}" type="button" title="Remove tag" tabindex="-1">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>`
  ).join("");

  pillsEl.querySelectorAll(".td-tag-pill-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = btn.dataset.tag;
      _tdModalTags = _tdModalTags.filter(t => t !== tag);
      _tdRenderModalTags();
    });
  });
}

function _tdAddModalTag(raw) {
  const tag = raw.trim().replace(/[,;]+$/, "").trim().toLowerCase();
  if (!tag || tag.length > 30) return;
  if (!_tdModalTags.includes(tag)) {
    _tdModalTags.push(tag);
    _tdRenderModalTags();
  }
}

// ============================================================================
// EVENT BINDING — ADD / MODAL
// ============================================================================

function _tdBindAddButton() {
  const btn = document.getElementById("td-add-btn");
  if (btn) btn.addEventListener("click", () => _tdOpenModal(null, null));
  const btn2 = document.getElementById("td-new-btn-main");
  if (btn2) btn2.addEventListener("click", () => _tdOpenModal(null, null));

  // Keyboard shortcut: N to open new todo (when not in an input)
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
    if (e.key === "n" || e.key === "N") {
      const todoView = document.getElementById("todo-view");
      if (todoView && todoView.classList.contains("active")) {
        e.preventDefault();
        _tdOpenModal(null, null);
      }
    }
  });
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

  // Priority selector
  const prioritySelector = document.getElementById("td-priority-selector");
  if (prioritySelector) {
    prioritySelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".td-priority-btn");
      if (!btn) return;
      _tdModalPriority = btn.dataset.priority;
      _tdUpdateModalPriority();
    });
  }

  // Tag input handling
  const tagInput = document.getElementById("td-modal-tag-input");
  if (tagInput) {
    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        _tdAddModalTag(tagInput.value);
        tagInput.value = "";
      } else if (e.key === "Escape") {
        e.preventDefault();
        _tdCloseModal();
      } else if (e.key === "Backspace" && tagInput.value === "" && _tdModalTags.length) {
        _tdModalTags.pop();
        _tdRenderModalTags();
      }
    });
    tagInput.addEventListener("blur", () => {
      if (tagInput.value.trim()) {
        _tdAddModalTag(tagInput.value);
        tagInput.value = "";
      }
    });
  }

  // Enter in textarea = save (Shift+Enter = newline), Esc = close
  const textarea = document.getElementById("td-modal-text");
  if (textarea) {
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        _tdSaveModal();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        _tdCloseModal();
      }
    });
    textarea.addEventListener("input", () => {
      const remaining = 500 - textarea.value.length;
      const counter = document.getElementById("td-char-count");
      if (counter) {
        counter.textContent = `${remaining} remaining`;
        counter.classList.toggle("td-char-count--warn", remaining < 50);
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
    if (title) title.textContent = "Edit task";
    if (textarea) textarea.value = item ? item.text : "";
    if (dateInput) dateInput.value = item ? item.date : _tdFmtDate(new Date());
    _tdModalTags = item && Array.isArray(item.tags) ? [...item.tags] : [];
    _tdModalPriority = item ? (item.priority || "medium") : "medium";
  } else {
    if (title) title.textContent = "New task";
    if (textarea) textarea.value = "";
    if (dateInput) dateInput.value = prefillDate || _tdFmtDate(new Date());
    _tdModalTags = [];
    _tdModalPriority = "medium";
  }

  _tdRenderModalTags();
  _tdUpdateModalPriority();
  if (overlay) overlay.style.display = "flex";
  // Reset char counter
  const counter = document.getElementById("td-char-count");
  if (counter && textarea) {
    counter.textContent = `${500 - (textarea.value.length)} remaining`;
    counter.classList.remove("td-char-count--warn");
  }
  setTimeout(() => textarea && textarea.focus(), 50);
}

function _tdCloseModal() {
  const overlay = document.getElementById("td-modal-overlay");
  if (overlay) overlay.style.display = "none";
  _tdEditingId = null;
  _tdModalTags = [];
  const tagInput = document.getElementById("td-modal-tag-input");
  if (tagInput) tagInput.value = "";
}

async function _tdSaveModal() {
  const textarea = document.getElementById("td-modal-text");
  const dateInput = document.getElementById("td-modal-date");
  const text = textarea ? textarea.value.trim() : "";
  const date = dateInput ? dateInput.value : "";

  if (!text) {
    if (textarea) {
      textarea.focus();
      textarea.classList.add("td-form-textarea--error");
      setTimeout(() => textarea.classList.remove("td-form-textarea--error"), 800);
    }
    return;
  }
  if (!date) {
    if (dateInput) dateInput.focus();
    return;
  }

  const tags = [..._tdModalTags];
  const priority = _tdModalPriority;

  try {
    if (_tdEditingId) {
      const item = _tdAllItems.find((i) => i.id === _tdEditingId);
      if (item) {
        const oldDate = item.date;
        await window.electronAPI.calTodoUpdate(_tdEditingId, { text, tags, priority });
        if (date !== oldDate) {
          await window.electronAPI.calTodoMove(_tdEditingId, date);
          _tdNotifyCalendar(oldDate);
          _tdNotifyCalendar(date);
        }
        item.text = text;
        item.date = date;
        item.tags = tags;
        item.priority = priority;
      }
    } else {
      const newItem = await window.electronAPI.calTodoAdd(date, text, tags, priority);
      _tdAllItems.push(newItem);
      _tdNotifyCalendar(date);
    }
  } catch (e) {
    console.error("Todo save error:", e);
    if (window.showToast) window.showToast("Failed to save task", "error");
  }

  _tdCloseModal();
  _tdRender();
}

// ============================================================================
// INLINE TEXT EDITING (double-click to edit in place)
// ============================================================================

function _tdStartInlineEdit(textEl, itemId) {
  if (textEl.dataset.editing === "true") return;
  const item = _tdAllItems.find((i) => i.id === itemId);
  if (!item) return;

  textEl.dataset.editing = "true";
  const originalText = item.text;

  // Make editable
  textEl.setAttribute("contenteditable", "true");
  textEl.classList.add("td-item-text--editing");
  textEl.focus();

  // Move cursor to end
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(textEl);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  const finish = async (save) => {
    if (textEl.dataset.editing !== "true") return;
    textEl.dataset.editing = "false";
    textEl.removeAttribute("contenteditable");
    textEl.classList.remove("td-item-text--editing");

    const newText = textEl.textContent.trim();
    if (save && newText && newText !== originalText) {
      try {
        await window.electronAPI.calTodoUpdate(itemId, { text: newText });
        item.text = newText;
        // Re-render the text span only to re-escape it properly
        textEl.textContent = newText;
      } catch (e) {
        console.error("Inline edit save error:", e);
        textEl.textContent = originalText;
        if (window.showToast) window.showToast("Failed to save edit", "error");
      }
    } else {
      // Restore original if cancelled or unchanged
      textEl.textContent = originalText;
    }
  };

  textEl.addEventListener("keydown", function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textEl.removeEventListener("keydown", onKey);
      textEl.removeEventListener("blur", onBlur);
      finish(true);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      textEl.removeEventListener("keydown", onKey);
      textEl.removeEventListener("blur", onBlur);
      finish(false);
    }
  });

  const onBlur = () => {
    textEl.removeEventListener("blur", onBlur);
    finish(true);
  };
  textEl.addEventListener("blur", onBlur);
}

// ============================================================================
// EVENT BINDING — ITEM INTERACTIONS
// ============================================================================

function _tdBindItemEvents() {
  const groups = document.getElementById("td-groups");
  if (!groups) return;

  // Toggle done — optimistic UI
  groups.querySelectorAll(".td-check").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const wasDone = btn.dataset.done === "true";
      const newDone = !wasDone;

      // Optimistic update
      const item = _tdAllItems.find((i) => i.id === id);
      if (item) item.done = newDone;
      btn.dataset.done = String(newDone);
      const itemEl = btn.closest(".td-item");
      if (itemEl) {
        itemEl.classList.toggle("td-item--done", newDone);
        btn.setAttribute("aria-pressed", String(newDone));
      }
      _tdUpdateStats();

      try {
        await window.electronAPI.calTodoUpdate(id, { done: newDone });

        // ── Auto Work Log Integration ────────────────────────────────────
        if (newDone) {
          // Marking done → create/update linked work log entry
          if (item) {
            try {
              const result = await window.electronAPI.todoCompleteToWorklog({
                todoId: item.id,
                todoText: item.text,
                todoDate: item.date,
                todoTags: item.tags || [],
                todoPriority: item.priority || "medium",
              });
              if (result) {
                item.linkedWorklogId = result.worklogId;
                // Show subtle confirmation toast
                const msg = result.isNew
                  ? "Logged to Work Log ✓"
                  : "Work Log updated ✓";
                if (window.showToast) window.showToast(msg, "success");
                // Update the item element with a "logged" badge
                _tdSetLoggedBadge(itemEl, item.linkedWorklogId, true);
              }
            } catch (logErr) {
              console.warn("Auto work log failed:", logErr);
            }
          }
        } else {
          // Marking undone → signal the work log that todo was reopened
          if (item && item.linkedWorklogId) {
            try {
              await window.electronAPI.todoReopenWorklog(item.id);
              if (window.showToast) window.showToast("Task reopened — Work Log preserved", "success");
            } catch (logErr) {
              console.warn("Reopen signal failed:", logErr);
            }
          }
        }
        // ── End Work Log Integration ─────────────────────────────────────

        // Full re-render for progress bar + strikethrough sync
        _tdRender();
      } catch (e) {
        console.error("Toggle done error:", e);
        // Roll back
        if (item) item.done = wasDone;
        _tdRender();
        if (window.showToast) window.showToast("Failed to update task", "error");
      }
    });
  });

  // Edit button → open modal
  groups.querySelectorAll(".td-edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _tdOpenModal(btn.dataset.id, null);
    });
  });

  // Double-click task text → inline edit
  groups.querySelectorAll(".td-item-text[data-id]").forEach((textEl) => {
    textEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const id = textEl.dataset.id;
      const parentItem = textEl.closest(".td-item");
      if (parentItem && parentItem.classList.contains("td-item--done")) return; // no inline edit for done items
      _tdStartInlineEdit(textEl, id);
    });
  });

  // Change due date (inline date picker)
  groups.querySelectorAll(".td-date-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const input = document.getElementById(`td-date-input-${id}`);
      if (!input) return;
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
        if (!newDate) { cleanup(); return; }
        const item = _tdAllItems.find((i) => i.id === id);
        if (!item || item.date === newDate) { cleanup(); return; }
        const oldDate = item.date;
        try {
          await window.electronAPI.calTodoMove(id, newDate);
          item.date = newDate;
          _tdNotifyCalendar(oldDate);
          _tdNotifyCalendar(newDate);
          _tdRender();
        } catch (e) {
          console.error("Move date error:", e);
          if (window.showToast) window.showToast("Failed to update due date", "error");
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
        ? window.showConfirm("Delete this task?", "Delete")
        : Promise.resolve(confirm("Delete this task?")));
      if (!confirmed) return;
      try {
        await window.electronAPI.calTodoDelete(id);
        const item = _tdAllItems.find((i) => i.id === id);
        if (item) _tdNotifyCalendar(item.date);
        _tdAllItems = _tdAllItems.filter((i) => i.id !== id);
        _tdRender();
        if (window.showToast) window.showToast("Task deleted", "success");
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

  // Click tag pill on item → filter by that tag
  groups.querySelectorAll(".td-tag-pill--item").forEach((pill) => {
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = pill.dataset.tag;
      _tdTagFilter = _tdTagFilter === tag ? null : tag;
      _tdRender();
    });
  });

  // Keyboard navigation: Tab between items, Space to toggle done, Enter to open modal
  groups.querySelectorAll(".td-item[tabindex='0']").forEach((itemEl) => {
    itemEl.addEventListener("keydown", (e) => {
      if (e.target !== itemEl) return; // only when item itself is focused, not children
      if (e.key === " ") {
        e.preventDefault();
        const checkBtn = itemEl.querySelector(".td-check");
        if (checkBtn) checkBtn.click();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const id = itemEl.dataset.id;
        if (id) _tdOpenModal(id, null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const deleteBtn = itemEl.querySelector(".td-delete-btn");
        if (deleteBtn) deleteBtn.click();
      }
    });
  });

  // Focus-visible: show actions when item is keyboard-focused
  groups.querySelectorAll(".td-item[tabindex='0']").forEach((itemEl) => {
    itemEl.addEventListener("focus", () => {
      const actions = itemEl.querySelector(".td-item-actions");
      if (actions) actions.classList.add("td-item-actions--visible");
    });
    itemEl.addEventListener("blur", () => {
      const actions = itemEl.querySelector(".td-item-actions");
      if (actions) actions.classList.remove("td-item-actions--visible");
    });
  });
}

// ============================================================================
// CALENDAR INTEGRATION
// ============================================================================

function _tdNotifyCalendar(dateStr) {
  if (typeof _calTodoDates !== "undefined") {
    if (typeof calHasTodos === "function" && typeof _calTodoDates !== "undefined") {
      calHasTodos(dateStr)
        .then((has) => {
          if (has) _calTodoDates.add(dateStr);
          else _calTodoDates.delete(dateStr);
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

async function _tdNotionPush() {
  _tdLoadNotionCreds();
  if (!_tdNotionToken || !_tdNotionDbId) {
    if (window.showToast) window.showToast("Configure Notion in Settings → Notion first", "error");
    return;
  }
  if (_tdNotionSyncing) return;
  _tdSetNotionBusy(true);
  if (window.showToast) window.showToast("Pushing to Notion…", "success");

  const items = _tdGetFiltered();
  const notionMap = _tdLoadNotionMap();
  let created = 0, updated = 0, failed = 0;

  for (const item of items) {
    const existingPageId = notionMap[item.id];
    try {
      if (existingPageId) {
        await _tdNotionUpdatePage(existingPageId, item);
        updated++;
      } else {
        const pageId = await _tdNotionCreatePage(item);
        if (pageId) { notionMap[item.id] = pageId; created++; }
        else failed++;
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
    body: JSON.stringify({ properties: _tdItemToNotionProps(item) }),
  });
  if (!response.ok) {
    console.error("Notion update page error:", await response.text());
    throw new Error("Update failed");
  }
}

async function _tdNotionPull() {
  _tdLoadNotionCreds();
  if (!_tdNotionToken || !_tdNotionDbId) {
    if (window.showToast) window.showToast("Configure Notion in Settings → Notion first", "error");
    return;
  }
  if (_tdNotionSyncing) return;
  _tdSetNotionBusy(true);
  if (window.showToast) window.showToast("Pulling from Notion…", "success");

  try {
    const pages = await _tdNotionQueryDatabase();
    const notionMap = _tdLoadNotionMap();
    const reverseMap = {};
    for (const [localId, pageId] of Object.entries(notionMap)) {
      reverseMap[pageId] = localId;
    }

    let imported = 0, updated = 0;

    for (const page of pages) {
      const pageId = page.id;
      const props = page.properties;
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
          await window.electronAPI.calTodoUpdate(existingLocalId, { text, done });
          updated++;
        }
      } else {
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
    if (window.showToast) window.showToast(`Notion pull: ${imported} imported, ${updated} updated`, "success");
  } catch (e) {
    console.error("Notion pull error:", e);
    _tdSetNotionBusy(false);
    if (window.showToast)
      window.showToast("Notion pull failed. Check Settings → Notion for credentials.", "error");
  }
}

async function _tdNotionQueryDatabase() {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${_tdNotionDbId}/query`,
    {
      method: "POST",
      headers: _tdNotionHeaders(),
      body: JSON.stringify({ page_size: 100 }),
    }
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
    Name: { title: [{ text: { content: item.text } }] },
    Done: { checkbox: item.done },
    "Due Date": { date: item.date ? { start: item.date } : null },
  };
}

function _tdNotionExtractTitle(props) {
  for (const key of ["Name", "Title", "Task", "To-do", "Todo"]) {
    if (props[key] && props[key].title && props[key].title.length > 0) {
      return props[key].title.map((t) => t.plain_text).join("");
    }
  }
  for (const prop of Object.values(props)) {
    if (prop.type === "title" && prop.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "";
}

function _tdNotionExtractCheckbox(props, key) {
  return props[key] && props[key].type === "checkbox" ? props[key].checkbox : null;
}

function _tdNotionExtractDate(props, key) {
  if (props[key] && props[key].type === "date" && props[key].date) {
    return props[key].date.start || null;
  }
  return null;
}

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
// EXPORT (Excel + Word)
// ============================================================================

function _tdBindExport() {
  const exportBtn  = document.getElementById("td-export-btn");
  const exportMenu = document.getElementById("td-export-menu");
  const excelItem  = document.getElementById("td-export-excel");
  const wordItem   = document.getElementById("td-export-word");

  if (!exportBtn || !exportMenu) return;

  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = exportMenu.style.display !== "none";
    exportMenu.style.display = open ? "none" : "block";
  });

  document.addEventListener("click", () => {
    if (exportMenu) exportMenu.style.display = "none";
  });

  if (excelItem) excelItem.addEventListener("click", () => {
    exportMenu.style.display = "none";
    _tdExportExcel();
  });

  if (wordItem) wordItem.addEventListener("click", () => {
    exportMenu.style.display = "none";
    _tdExportWord();
  });
}

async function _tdExportExcel() {
  if (!_tdAllItems.length) {
    if (window.showToast) window.showToast("No tasks to export", "error");
    return;
  }
  try {
    const result = await window.electronAPI.exportTodoExcel({
      todos: _tdAllItems,
      rangeLabel: _tdGetRangeLabel(),
    });
    if (result && result.success) {
      if (window.showToast) window.showToast("Excel exported successfully", "success");
    }
  } catch (e) {
    console.error("Todo Excel export error:", e);
    if (window.showToast) window.showToast("Export failed: " + (e.message || "unknown error"), "error");
  }
}

async function _tdExportWord() {
  if (!_tdAllItems.length) {
    if (window.showToast) window.showToast("No tasks to export", "error");
    return;
  }
  try {
    const result = await window.electronAPI.exportTodoWord({
      todos: _tdAllItems,
      rangeLabel: _tdGetRangeLabel(),
    });
    if (result && result.success) {
      if (window.showToast) window.showToast("Word report exported successfully", "success");
    }
  } catch (e) {
    console.error("Todo Word export error:", e);
    if (window.showToast) window.showToast("Export failed: " + (e.message || "unknown error"), "error");
  }
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