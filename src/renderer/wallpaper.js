/**
 * @file wallpaper.js
 * @description Dynamic Wallpaper feature.
 *
 * Responsibilities (all in the renderer, since the holiday/Hijri calendar
 * logic — getHolidayInfo / getObservanceInfo / gregorianToHijri / CAL_I18N —
 * already lives in calendar.js as plain global functions):
 *   1. Collect this week's calendar (with holidays/observances) + today's and
 *      tomorrow's to-do items into a single JSON payload.
 *   2. Send that payload to the main process to be rendered into an image and
 *      applied as the system wallpaper (see index.js + wallpaper-render.html).
 *   3. Drive the Settings page UI: enable/disable toggle, theme customization
 *      (colors, font size), and a manual "Refresh Wallpaper Now" button.
 *   4. Respond to the main process's periodic (every 5 minutes) "check for
 *      fresh data" ping — this listener is registered unconditionally at load
 *      time so background checks keep working even if the user never opens
 *      Settings. The wallpaper image itself is only actually re-rendered and
 *      re-applied when today's or tomorrow's to-do items (or the date) have
 *      changed since the last successful generation — see
 *      wcComputeTodoFingerprint() below.
 */

// ============================================================================
// THEME / CUSTOMIZATION SETTINGS (renderer-owned, localStorage)
// ============================================================================

const WC_SETTINGS_KEY = "mto_wallpaper_theme";
const WC_TODO_CHANGE_EVENT = "mto:todo-changed";
const WC_TODO_CHANGE_DEBOUNCE_MS = 5 * 1000;

const WC_DEFAULTS = {
  bg1: "#eef6f1",
  bg2: "#dce8e0",
  accent: "#6c8b7a",
  fontScale: 1,
  maxTodoItems: 6,
};

function wcGetTheme() {
  try {
    const raw = localStorage.getItem(WC_SETTINGS_KEY);
    if (!raw) return { ...WC_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...WC_DEFAULTS, ...parsed };
  } catch (_) {
    return { ...WC_DEFAULTS };
  }
}

function wcSaveTheme(theme) {
  localStorage.setItem(WC_SETTINGS_KEY, JSON.stringify(theme));
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

/** YYYY-MM-DD formatter (local time, not UTC — avoids off-by-one near midnight). */
function wcFmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Builds the full wallpaper data payload: this week's days (with holiday /
 * observance / Hijri info) plus today's and tomorrow's to-do items.
 * Reuses calendar.js's existing global helpers — falls back gracefully if
 * calendar.js hasn't loaded for some reason, so the wallpaper still renders
 * a plain (holiday-free) week grid rather than failing outright.
 */
async function wcCollectWallpaperData() {
  const theme = wcGetTheme();
  const lang =
    (typeof _calState !== "undefined" && _calState && _calState.lang) ||
    localStorage.getItem("mto_cal_lang") ||
    "en";

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekStart = new Date(todayMidnight);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday start (Maldives week)

  const dayNamesFallback = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const year = d.getFullYear();
    const month1 = d.getMonth() + 1;
    const day = d.getDate();
    const dow = d.getDay();

    let holiday = null;
    let observance = null;
    let hijri = null;
    try {
      holiday = typeof getHolidayInfo === "function" ? getHolidayInfo(year, month1, day) : null;
    } catch (_) {}
    try {
      observance = typeof getObservanceInfo === "function" ? getObservanceInfo(year, month1, day) : null;
    } catch (_) {}
    try {
      hijri = typeof gregorianToHijri === "function" ? gregorianToHijri(year, month1, day) : null;
    } catch (_) {}

    let dayName = dayNamesFallback[dow];
    let hijriMonthName = null;
    try {
      if (typeof CAL_I18N !== "undefined" && CAL_I18N[lang]) {
        dayName = CAL_I18N[lang].dayNamesShort[dow] || dayName;
        if (hijri && CAL_I18N[lang].hijriMonths) {
          hijriMonthName = CAL_I18N[lang].hijriMonths[hijri.month - 1] || null;
        }
      }
    } catch (_) {}

    days.push({
      date: wcFmtDate(d),
      dayNum: day,
      dayName,
      isToday: wcFmtDate(d) === wcFmtDate(todayMidnight),
      isWeekend: typeof isWeekend === "function" ? isWeekend(dow) : dow === 5 || dow === 6,
      holiday: holiday ? { label: holiday[lang] || holiday.en, type: holiday.type } : null,
      observance: !holiday && observance ? { label: observance[lang] || observance.en } : null,
      hijriDay: hijri ? hijri.day : null,
      hijriMonth: hijriMonthName,
    });
  }

  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
  const todayStr = wcFmtDate(todayMidnight);
  const tomorrowStr = wcFmtDate(tomorrowMidnight);

  let allTodos = [];
  try {
    if (window.electronAPI && typeof window.electronAPI.calTodoGetAll === "function") {
      allTodos = await window.electronAPI.calTodoGetAll({ from: todayStr, to: tomorrowStr });
    }
  } catch (err) {
    console.warn("[Wallpaper] Failed to load to-do items:", err);
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortTodos = (list) =>
    list
      .slice()
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const pa = priorityOrder[a.priority] ?? 1;
        const pb = priorityOrder[b.priority] ?? 1;
        return pa - pb;
      })
      .map((t) => ({ text: t.text, done: !!t.done, priority: t.priority || "medium" }));

  const todayTodos = sortTodos(allTodos.filter((t) => t.date === todayStr));
  const tomorrowTodos = sortTodos(allTodos.filter((t) => t.date === tomorrowStr));

  return {
    generatedAt: new Date().toISOString(),
    lang,
    todayStr,
    tomorrowStr,
    weekStart: wcFmtDate(weekStart),
    days,
    todayTodos,
    tomorrowTodos,
    theme,
  };
}

// ============================================================================
// GENERATION
// ============================================================================

let wcGenerating = false;
let wcTodoChangeRefreshTimer = null;
const WC_LAST_FINGERPRINT_KEY = "mto_wallpaper_last_fingerprint";

/**
 * Builds a cheap fingerprint of "what the wallpaper would show that can
 * actually change minute-to-minute": today's/tomorrow's dates (so a day
 * rollover always forces a refresh, even with an empty list both days) plus
 * the text/priority/done-state of each to-do item. Calendar/holiday content
 * for the week is intentionally excluded — per spec, the wallpaper should
 * only be regenerated when today's or tomorrow's to-dos actually change.
 */
function wcComputeTodoFingerprint(data) {
  const simplify = (list) =>
    (list || []).map((t) => `${t.priority}|${t.done ? 1 : 0}|${t.text}`).join("\u0001");
  return [data.todayStr, data.tomorrowStr, simplify(data.todayTodos), simplify(data.tomorrowTodos)].join("\u0002");
}

async function wcGetWallpaperEnabledState() {
  try {
    if (window.electronAPI && typeof window.electronAPI.wallpaperGetState === "function") {
      const state = await window.electronAPI.wallpaperGetState();
      return !!(state && state.enabled);
    }
  } catch (err) {
    console.warn("[Wallpaper] Failed to read enabled state:", err);
  }
  return false;
}
/**
 * Collects fresh data and asks the main process to render + apply it as the
 * system wallpaper. Shared by the manual "Refresh Now" button and the
 * scheduled-refresh listener below.
 * @param {Object} [opts]
 * @param {boolean} [opts.silent] - Suppresses toasts for background refreshes.
 * @param {boolean} [opts.force] - Skips the "did anything change?" check (used
 *   by the manual button and when the feature is first enabled).
 */
async function wcGenerateWallpaper(opts = {}) {
  const silent = !!opts.silent;
  const force = !!opts.force;
  const requireEnabled = opts.requireEnabled !== false && !force;
  if (wcGenerating) return { success: false, error: "Already generating." };
  if (!window.electronAPI || typeof window.electronAPI.wallpaperGenerate !== "function") {
    return { success: false, error: "Wallpaper API unavailable." };
  }

  if (requireEnabled) {
    const enabled = await wcGetWallpaperEnabledState();
    if (!enabled) {
      wcSetStatus("Dynamic Wallpaper disabled.", "info");
      return { success: true, skipped: true, reason: "disabled" };
    }
  }

  wcGenerating = true;

  try {
    const payload = await wcCollectWallpaperData();

    if (!force) {
      const fingerprint = wcComputeTodoFingerprint(payload);
      const lastFingerprint = localStorage.getItem(WC_LAST_FINGERPRINT_KEY);
      if (lastFingerprint === fingerprint) {
        // Today's/tomorrow's to-do items (and the date) are unchanged since
        // the last successful generation — skip re-rendering/re-applying the
        // wallpaper to avoid unnecessary churn/flicker on the desktop.
        wcSetStatus("Up to date — no to-do changes since last refresh.", "info");
        return { success: true, skipped: true };
      }
    }

    wcSetStatus(silent ? "Refreshing wallpaper…" : "Generating wallpaper…", "info");
    wcSetRefreshButtonBusy(true);

    const result = await window.electronAPI.wallpaperGenerate(payload);
    if (result && result.success) {
      localStorage.setItem(WC_LAST_FINGERPRINT_KEY, wcComputeTodoFingerprint(payload));
      wcSetStatus("Updated " + new Date().toLocaleTimeString(), "success");
      if (!silent && window.showToast) window.showToast("Wallpaper refreshed.", "success");
    } else {
      const msg = (result && result.error) || "Unknown error";
      wcSetStatus("Failed: " + msg, "error");
      if (!silent && window.showToast) window.showToast("Wallpaper refresh failed: " + msg, "error");
    }
    return result;
  } catch (err) {
    console.error("[Wallpaper] Generation failed:", err);
    wcSetStatus("Failed: " + err.message, "error");
    if (!silent && window.showToast) window.showToast("Wallpaper refresh failed: " + err.message, "error");
    return { success: false, error: err.message };
  } finally {
    wcGenerating = false;
    wcSetRefreshButtonBusy(false);
  }
}

/**
 * Debounces To-Do mutation bursts into one background wallpaper check. The
 * fingerprint check in wcGenerateWallpaper() still decides whether rendering is
 * necessary, so this timer is cheap when edits do not affect today/tomorrow.
 */
function wcScheduleTodoChangeWallpaperRefresh() {
  if (wcTodoChangeRefreshTimer) {
    clearTimeout(wcTodoChangeRefreshTimer);
    wcTodoChangeRefreshTimer = null;
  }

  wcSetStatus("To-do changed. Wallpaper will refresh shortly.", "info");
  wcTodoChangeRefreshTimer = setTimeout(() => {
    wcTodoChangeRefreshTimer = null;
    if (wcGenerating) {
      wcScheduleTodoChangeWallpaperRefresh();
      return;
    }
    wcGenerateWallpaper({ silent: true });
  }, WC_TODO_CHANGE_DEBOUNCE_MS);
}

// Always listen for the main process's periodic refresh ping, regardless of
// whether the Settings view is currently open — this is what keeps the
// wallpaper checking for to-do changes in the background. The fingerprint
// check inside wcGenerateWallpaper() ensures the desktop image is only
// actually re-rendered/re-applied when today's or tomorrow's to-dos changed.
if (window.electronAPI && typeof window.electronAPI.onWallpaperRequestData === "function") {
  window.electronAPI.onWallpaperRequestData(() => {
    wcGenerateWallpaper({ silent: true });
  });
}

// To-Do owns persistence; wallpaper owns refresh timing. A successful To-Do
// write dispatches this event, and the wallpaper module coalesces rapid changes
// into one refresh 5 seconds after the final change.
window.addEventListener(WC_TODO_CHANGE_EVENT, wcScheduleTodoChangeWallpaperRefresh);

// ============================================================================
// SETTINGS PAGE UI
// ============================================================================

let wallpaperSettingsListenersAttached = false;

function wcSetStatus(text, type) {
  const el = document.getElementById("wallpaper-status-text");
  if (!el) return;
  el.textContent = text;
  el.className = "wallpaper-status-text wallpaper-status-text--" + (type || "info");
}

// Tracks the master enable/disable toggle so dependent controls (color
// pickers, refresh button) can be kept in sync and visibly/functionally
// inert while the feature is off — not just the background scheduler.
let wcFeatureEnabled = false;

function wcSetRefreshButtonBusy(busy) {
  const btn = document.getElementById("wallpaper-refresh-now");
  if (!btn) return;
  btn.disabled = busy || !wcFeatureEnabled;
  btn.textContent = busy ? "Refreshing…" : "Refresh Wallpaper Now";
}

/**
 * Greys out and disables the customization controls + refresh button
 * whenever Dynamic Wallpaper is turned off, so "off" actually means off
 * rather than just pausing the background scheduler. The enable row itself
 * (with the toggle) is left untouched so the user can always turn it back on.
 */
function wcSyncControlsEnabledState(enabled) {
  wcFeatureEnabled = !!enabled;

  const card = document.querySelector(".wallpaper-settings-group");
  if (card) card.classList.toggle("wallpaper-settings-group--disabled", !wcFeatureEnabled);

  ["wallpaper-color-bg1", "wallpaper-color-bg2", "wallpaper-color-accent", "wallpaper-font-scale", "wallpaper-reset-theme"].forEach(
    (id) => {
      const elx = document.getElementById(id);
      if (elx) elx.disabled = !wcFeatureEnabled;
    },
  );

  wcSetRefreshButtonBusy(false); // re-evaluates the refresh button's disabled state too
}

function wcFormatLastGenerated(iso) {
  if (!iso) return "Never generated yet.";
  try {
    return "Last updated " + new Date(iso).toLocaleString();
  } catch (_) {
    return "Last updated " + iso;
  }
}

async function loadWallpaperSettings() {
  const toggle = document.getElementById("wallpaper-enabled-toggle");
  const bg1 = document.getElementById("wallpaper-color-bg1");
  const bg2 = document.getElementById("wallpaper-color-bg2");
  const accent = document.getElementById("wallpaper-color-accent");
  const fontScale = document.getElementById("wallpaper-font-scale");
  if (!toggle) return; // Settings markup not present in this build

  const theme = wcGetTheme();
  if (bg1) bg1.value = theme.bg1;
  if (bg2) bg2.value = theme.bg2;
  if (accent) accent.value = theme.accent;
  if (fontScale) fontScale.value = String(theme.fontScale);

  let state = { enabled: false, lastGeneratedAt: null, lastError: null };
  try {
    if (window.electronAPI && typeof window.electronAPI.wallpaperGetState === "function") {
      state = await window.electronAPI.wallpaperGetState();
    }
  } catch (err) {
    console.warn("[Wallpaper] Failed to load state:", err);
  }

  toggle.checked = !!state.enabled;
  wcSyncControlsEnabledState(state.enabled);
  if (state.lastError) {
    wcSetStatus("Last attempt failed: " + state.lastError, "error");
  } else {
    wcSetStatus(wcFormatLastGenerated(state.lastGeneratedAt), state.lastGeneratedAt ? "success" : "info");
  }
}

function setupWallpaperSettings() {
  if (wallpaperSettingsListenersAttached) return;
  wallpaperSettingsListenersAttached = true;

  const toggle = document.getElementById("wallpaper-enabled-toggle");
  const bg1 = document.getElementById("wallpaper-color-bg1");
  const bg2 = document.getElementById("wallpaper-color-bg2");
  const accent = document.getElementById("wallpaper-color-accent");
  const fontScale = document.getElementById("wallpaper-font-scale");
  const refreshBtn = document.getElementById("wallpaper-refresh-now");
  const resetBtn = document.getElementById("wallpaper-reset-theme");

  if (toggle) {
    toggle.addEventListener("change", async () => {
      const enabled = toggle.checked;
      toggle.disabled = true;
      try {
        if (window.electronAPI && typeof window.electronAPI.wallpaperSetEnabled === "function") {
          await window.electronAPI.wallpaperSetEnabled(enabled);
        }
        wcSyncControlsEnabledState(enabled);
        if (enabled) {
          if (window.showToast) window.showToast("Dynamic Wallpaper enabled — generating now…", "success");
          await wcGenerateWallpaper({ force: true });
        } else {
          wcSetStatus("Dynamic Wallpaper disabled.", "info");
          if (window.showToast) window.showToast("Dynamic Wallpaper disabled.", "success");
        }
      } catch (err) {
        toggle.checked = !enabled;
        wcSyncControlsEnabledState(!enabled);
        if (window.showToast) window.showToast("Could not update setting: " + err.message, "error");
      } finally {
        toggle.disabled = false;
      }
    });
  }

  const persistTheme = () => {
    const theme = wcGetTheme();
    if (bg1) theme.bg1 = bg1.value;
    if (bg2) theme.bg2 = bg2.value;
    if (accent) theme.accent = accent.value;
    if (fontScale) theme.fontScale = parseFloat(fontScale.value) || 1;
    wcSaveTheme(theme);
  };

  [bg1, bg2, accent].forEach((input) => {
    if (input) input.addEventListener("input", persistTheme);
  });
  if (fontScale) fontScale.addEventListener("change", persistTheme);

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => wcGenerateWallpaper({ force: true }));
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      wcSaveTheme({ ...WC_DEFAULTS });
      if (bg1) bg1.value = WC_DEFAULTS.bg1;
      if (bg2) bg2.value = WC_DEFAULTS.bg2;
      if (accent) accent.value = WC_DEFAULTS.accent;
      if (fontScale) fontScale.value = String(WC_DEFAULTS.fontScale);
      if (window.showToast) window.showToast("Wallpaper theme reset to defaults.", "success");
    });
  }
}

// Called from settings.js's window.initSettings() when the Settings view opens.
window.loadWallpaperSettings = loadWallpaperSettings;
window.setupWallpaperSettings = setupWallpaperSettings;