/**
 * @file utilities.js
 * @description Utilities Module — Unit Converter & Date Calculator
 * Fully self-contained renderer module. No IPC required; all state is persisted
 * via localStorage under the key-space "mto_utilities_*".
 */

// ============================================================================
// UNIT CONVERSION DATA
// ============================================================================

const UNIT_CATEGORIES = {
  length: {
    label: "Length",
    icon: "📏",
    base: "m",
    units: {
      mm:  { label: "Millimeters (mm)",   factor: 0.001 },
      cm:  { label: "Centimeters (cm)",   factor: 0.01  },
      m:   { label: "Meters (m)",         factor: 1     },
      km:  { label: "Kilometers (km)",    factor: 1000  },
      in:  { label: "Inches (in)",        factor: 0.0254 },
      ft:  { label: "Feet (ft)",          factor: 0.3048 },
      yd:  { label: "Yards (yd)",         factor: 0.9144 },
      mi:  { label: "Miles (mi)",         factor: 1609.344 },
      nmi:  { label: "Nautical Miles",       factor: 1852  },
      ftin: { label: "Feet & Inches (5' 6\")", factor: null  },
    }
  },
  weight: {
    label: "Weight / Mass",
    icon: "⚖️",
    base: "kg",
    units: {
      mg:  { label: "Milligrams (mg)",    factor: 0.000001 },
      g:   { label: "Grams (g)",          factor: 0.001 },
      kg:  { label: "Kilograms (kg)",     factor: 1 },
      t:   { label: "Metric Tons (t)",    factor: 1000 },
      oz:  { label: "Ounces (oz)",        factor: 0.0283495 },
      lb:  { label: "Pounds (lb)",        factor: 0.453592 },
      st:  { label: "Stone (st)",         factor: 6.35029 },
    }
  },
  temperature: {
    label: "Temperature",
    icon: "🌡️",
    base: "c",
    units: {
      c:   { label: "Celsius (°C)"    },
      f:   { label: "Fahrenheit (°F)" },
      k:   { label: "Kelvin (K)"      },
    }
  },
  volume: {
    label: "Volume",
    icon: "🫙",
    base: "l",
    units: {
      ml:    { label: "Milliliters (ml)",   factor: 0.001 },
      l:     { label: "Liters (L)",         factor: 1 },
      m3:    { label: "Cubic Meters (m³)",  factor: 1000 },
      tsp:   { label: "Teaspoons (tsp)",    factor: 0.00492892 },
      tbsp:  { label: "Tablespoons (tbsp)", factor: 0.0147868 },
      floz:  { label: "Fl. Ounces (fl oz)",factor: 0.0295735 },
      cup:   { label: "Cups",              factor: 0.236588 },
      pt:    { label: "Pints (pt)",        factor: 0.473176 },
      qt:    { label: "Quarts (qt)",       factor: 0.946353 },
      gal:   { label: "Gallons (US gal)",  factor: 3.78541 },
      ukgal: { label: "Gallons (UK gal)",  factor: 4.54609 },
    }
  },
  area: {
    label: "Area",
    icon: "🗺️",
    base: "m2",
    units: {
      mm2:  { label: "Sq. Millimeters (mm²)", factor: 0.000001 },
      cm2:  { label: "Sq. Centimeters (cm²)", factor: 0.0001 },
      m2:   { label: "Sq. Meters (m²)",       factor: 1 },
      km2:  { label: "Sq. Kilometers (km²)",  factor: 1000000 },
      ft2:  { label: "Sq. Feet (ft²)",        factor: 0.092903 },
      yd2:  { label: "Sq. Yards (yd²)",       factor: 0.836127 },
      mi2:  { label: "Sq. Miles (mi²)",       factor: 2589988.11 },
      ac:   { label: "Acres",                 factor: 4046.86 },
      ha:   { label: "Hectares (ha)",         factor: 10000 },
    }
  },
  speed: {
    label: "Speed",
    icon: "💨",
    base: "ms",
    units: {
      ms:   { label: "Meters/sec (m/s)",  factor: 1 },
      kmh:  { label: "Kilometers/hr (km/h)", factor: 0.277778 },
      mph:  { label: "Miles/hr (mph)",     factor: 0.44704 },
      kn:   { label: "Knots (kn)",         factor: 0.514444 },
      fts:  { label: "Feet/sec (ft/s)",    factor: 0.3048 },
    }
  },
  time: {
    label: "Time",
    icon: "⏱️",
    base: "s",
    units: {
      ns:   { label: "Nanoseconds (ns)",   factor: 0.000000001 },
      ms:   { label: "Milliseconds (ms)",  factor: 0.001 },
      s:    { label: "Seconds (s)",        factor: 1 },
      min:  { label: "Minutes (min)",      factor: 60 },
      h:    { label: "Hours (h)",          factor: 3600 },
      d:    { label: "Days",               factor: 86400 },
      wk:   { label: "Weeks",              factor: 604800 },
      mo:   { label: "Months (avg)",       factor: 2629746 },
      yr:   { label: "Years (avg)",        factor: 31556952 },
    }
  },
  energy: {
    label: "Energy",
    icon: "⚡",
    base: "j",
    units: {
      j:    { label: "Joules (J)",          factor: 1 },
      kj:   { label: "Kilojoules (kJ)",     factor: 1000 },
      cal:  { label: "Calories (cal)",      factor: 4.184 },
      kcal: { label: "Kilocalories (kcal)", factor: 4184 },
      wh:   { label: "Watt-hours (Wh)",     factor: 3600 },
      kwh:  { label: "Kilowatt-hours (kWh)",factor: 3600000 },
      btu:  { label: "BTU",                 factor: 1055.06 },
      ev:   { label: "Electronvolts (eV)",  factor: 1.60218e-19 },
    }
  },
  data: {
    label: "Digital Storage",
    icon: "💾",
    base: "byte",
    units: {
      bit:  { label: "Bits",        factor: 0.125 },
      byte: { label: "Bytes",       factor: 1 },
      kb:   { label: "Kilobytes (KB)", factor: 1024 },
      mb:   { label: "Megabytes (MB)", factor: 1048576 },
      gb:   { label: "Gigabytes (GB)", factor: 1073741824 },
      tb:   { label: "Terabytes (TB)", factor: 1099511627776 },
    }
  }
};

// ============================================================================
// CONVERSION ENGINE
// ============================================================================

/**
 * Parse feet/inches input like "12' 9"" or "5'11"" → decimal inches
 * Returns null if not a feet/inches format.
 */
function parseFeetInches(str) {
  const s = String(str).trim();
  // Patterns: 12'9", 12' 9", 5'11", 5' 11 "
  const match = s.match(/^(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)?\s*"?$/);
  if (!match) return null;
  const feet = parseFloat(match[1]) || 0;
  const inches = parseFloat(match[2]) || 0;
  return feet * 12 + inches; // total inches
}

/**
 * Format a meter value as feet and inches: 5' 6"
 */
function formatFeetInches(meters) {
  const totalInches = meters / 0.0254;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  // 1 decimal place, strip trailing .0
  const inchesStr = (inches % 1 === 0) ? inches.toFixed(0) : inches.toFixed(1);
  return `${feet}' ${inchesStr}"`;
}

/**
 * Convert temperature values (special case – not factor-based).
 */
function convertTemperature(value, from, to) {
  if (from === to) return value;
  // First to Celsius
  let celsius;
  if (from === "c") celsius = value;
  else if (from === "f") celsius = (value - 32) * 5 / 9;
  else if (from === "k") celsius = value - 273.15;
  // Celsius to target
  if (to === "c") return celsius;
  if (to === "f") return celsius * 9 / 5 + 32;
  if (to === "k") return celsius + 273.15;
}

/**
 * Convert a value from one unit to another within a category.
 * Handles temperature specially; all others use base-unit factors.
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @param {string} category
 * @returns {number|null}
 */
function convertValue(value, fromUnit, toUnit, category) {
  if (isNaN(value)) return null;
  if (fromUnit === toUnit) return value;

  const cat = UNIT_CATEGORIES[category];
  if (!cat) return null;

  if (category === "temperature") {
    return convertTemperature(value, fromUnit, toUnit);
  }

  const from = cat.units[fromUnit];
  const to   = cat.units[toUnit];
  if (!from || !to) return null;

  // Convert to base unit then to target
  const inBase = value * from.factor;
  return inBase / to.factor;
}

// ============================================================================
// HISTORY PERSISTENCE
// ============================================================================

const HISTORY_KEY = "mto_utilities_conv_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift({ ...entry, id: Date.now(), timestamp: new Date().toISOString() });
  if (history.length > 500) history.splice(500);
  saveHistory(history);
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ============================================================================
// DATE CALCULATION ENGINE
// ============================================================================

function dateDiff(d1, d2) {
  const t1 = new Date(d1).setHours(0,0,0,0);
  const t2 = new Date(d2).setHours(0,0,0,0);
  const diffMs = t2 - t1;
  const days = Math.round(diffMs / 86400000);
  return {
    days,
    absDays: Math.abs(days),
    weeks: Math.floor(Math.abs(days) / 7),
    remainderDays: Math.abs(days) % 7,
    months: (Math.abs(days) / 30.4375).toFixed(2),
    direction: days >= 0 ? "after" : "before"
  };
}

function calcAge(birthdate) {
  const birth = new Date(birthdate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; const prev = new Date(now.getFullYear(), now.getMonth(), 0); days += prev.getDate(); }
  if (months < 0) { years--; months += 12; }
  const totalDays = Math.round((now - birth) / 86400000);
  return { years, months, days, totalDays };
}

function timeDiff(t1, t2) {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
  const negative = totalMins < 0;
  if (negative) totalMins = -totalMins;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { hours: h, minutes: m, totalMinutes: totalMins, negative };
}

function addDaysToDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + parseInt(days, 10));
  return d;
}

function getDayOfWeek(dateStr) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[new Date(dateStr).getDay()];
}

function nextPrevOccurrence(monthDay) {
  // monthDay: "MM-DD"
  const [month, day] = monthDay.split("-").map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next <= now) next = new Date(thisYear + 1, month - 1, day);
  let prev = new Date(thisYear, month - 1, day);
  if (prev >= now) prev = new Date(thisYear - 1, month - 1, day);
  return { next, prev };
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

function exportHistoryCSV() {
  const history = loadHistory();
  if (!history.length) { alert("No history to export."); return; }
  const header = "Date/Time,Category,Input Value,Input Unit,Output Value,Output Unit\n";
  const rows = history.map(h => {
    const dt = new Date(h.timestamp).toLocaleString();
    return `"${dt}","${h.category}","${h.inputDisplay}","${h.fromUnit}","${h.outputDisplay}","${h.toUnit}"`;
  }).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "conversion_history.csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ============================================================================
// UI RENDERING — UNIT CONVERTER
// ============================================================================

let _currentCategory = "length";
let _fromUnit = "m";
let _toUnit = "km";
let _lastInputRaw = "";

function renderUtilitiesUnitConverter() {
  renderCategoryTabs();
  renderUnitSelects();
  renderHistoryTable();
}

function renderCategoryTabs() {
  const container = document.getElementById("uc-category-tabs");
  if (!container) return;
  container.innerHTML = Object.entries(UNIT_CATEGORIES).map(([key, cat]) => `
    <button class="uc-tab-btn${key === _currentCategory ? " active" : ""}" data-cat="${key}" title="${cat.label}">
      <span class="uc-tab-icon">${cat.icon}</span>
      <span class="uc-tab-label">${cat.label}</span>
    </button>
  `).join("");

  container.querySelectorAll(".uc-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _currentCategory = btn.dataset.cat;
      const units = Object.keys(UNIT_CATEGORIES[_currentCategory].units);
      _fromUnit = units[0];
      _toUnit = units[1] || units[0];
      _lastInputRaw = "";
      document.getElementById("uc-input").value = "";
      document.getElementById("uc-output").value = "";
      renderCategoryTabs();
      renderUnitSelects();
    });
  });
}

function renderUnitSelects() {
  const fromSel = document.getElementById("uc-from-unit");
  const toSel   = document.getElementById("uc-to-unit");
  if (!fromSel || !toSel) return;
  const cat = UNIT_CATEGORIES[_currentCategory];
  const options = Object.entries(cat.units).map(([k, u]) => `<option value="${k}">${u.label}</option>`).join("");
  fromSel.innerHTML = options;
  toSel.innerHTML   = options;
  fromSel.value = _fromUnit;
  toSel.value   = _toUnit;

  // Update hint and placeholder based on selected units
  const hint    = document.getElementById("uc-input-hint");
  const inputEl2 = document.getElementById("uc-input");
  if (hint) {
    if (_fromUnit === "ftin") {
      hint.textContent = "Enter as: 5' 6\" or 12' 9\"";
    } else if (_toUnit === "ftin") {
      hint.textContent = "Result will be shown as feet and inches";
    } else if (_currentCategory === "length") {
      hint.textContent = "Tip: select \"Feet & Inches\" from a dropdown to use that format";
    } else {
      hint.textContent = "";
    }
  }
  if (inputEl2) {
    inputEl2.placeholder = _fromUnit === "ftin" ? "e.g. 5' 6\"" : "Enter value…";
  }
  // Re-trigger conversion if there's already a value
  if (inputEl2 && inputEl2.value.trim()) performConversion({ saveHistory: false });
}

let _convDebounceTimer = null;

function performConversion({ saveHistory: doSave = false } = {}) {
  const inputEl  = document.getElementById("uc-input");
  const outputEl = document.getElementById("uc-output");
  const fromSel  = document.getElementById("uc-from-unit");
  const toSel    = document.getElementById("uc-to-unit");
  if (!inputEl || !outputEl) return;

  const rawInput = inputEl.value.trim();
  if (!rawInput) { outputEl.value = ""; return; }

  _fromUnit = fromSel.value;
  _toUnit   = toSel.value;
  _lastInputRaw = rawInput;

  const isFtInFrom = _fromUnit === "ftin";
  const isFtInTo   = _toUnit   === "ftin";
  let inputDisplay  = rawInput;

  if (isFtInFrom) {
    // Input must be in feet/inches format like 5' 6"
    const totalInches = parseFeetInches(rawInput);
    if (totalInches === null) { outputEl.value = "Use format: 5' 6\""; return; }
    const numericMeters = totalInches * 0.0254;

    let formatted;
    if (isFtInTo) {
      formatted = rawInput; // same unit, echo back
    } else {
      const result = convertValue(numericMeters, "m", _toUnit, "length");
      if (result === null || isNaN(result)) { outputEl.value = "Error"; return; }
      formatted = formatNumber(result);
    }
    outputEl.value = formatted;
    if (doSave) {
      const fromLabel = UNIT_CATEGORIES[_currentCategory].units["ftin"].label;
      const toLabel   = isFtInTo ? fromLabel : (UNIT_CATEGORIES[_currentCategory].units[_toUnit]?.label || _toUnit);
      saveAndRefreshHistory({ inputDisplay, fromUnit: fromLabel, outputDisplay: formatted, toUnit: toLabel, category: _currentCategory });
    }
    return;
  }

  // Standard numeric input
  const numericValue = parseFloat(rawInput);
  if (isNaN(numericValue)) { outputEl.value = "Invalid input"; return; }

  let formatted;
  if (isFtInTo) {
    // Convert to meters first, then format as feet/inches
    const inMeters = convertValue(numericValue, _fromUnit, "m", "length");
    if (inMeters === null || isNaN(inMeters)) { outputEl.value = "Error"; return; }
    formatted = formatFeetInches(inMeters);
  } else {
    const result = convertValue(numericValue, _fromUnit, _toUnit, _currentCategory);
    if (result === null || isNaN(result)) { outputEl.value = "Error"; return; }
    formatted = formatNumber(result);
  }

  outputEl.value = formatted;

  if (doSave) {
    const fromLabel = UNIT_CATEGORIES[_currentCategory].units[_fromUnit]?.label || _fromUnit;
    const toLabel   = isFtInTo
      ? UNIT_CATEGORIES[_currentCategory].units["ftin"].label
      : (UNIT_CATEGORIES[_currentCategory].units[_toUnit]?.label || _toUnit);
    saveAndRefreshHistory({ inputDisplay: rawInput, fromUnit: fromLabel, outputDisplay: formatted, toUnit: toLabel, category: _currentCategory });
  }
}

function performConversionDebounced() {
  // Update output immediately for responsive feel
  performConversion({ saveHistory: false });
  // Save to history only after user stops typing
  clearTimeout(_convDebounceTimer);
  _convDebounceTimer = setTimeout(() => performConversion({ saveHistory: true }), 600);
}

function formatNumber(n) {
  if (Math.abs(n) < 0.0001 || Math.abs(n) > 1e10) {
    return parseFloat(n.toPrecision(8)).toString();
  }
  // Up to 8 significant digits, trim trailing zeros
  const s = parseFloat(n.toPrecision(10)).toString();
  return s;
}

function saveAndRefreshHistory(entry) {
  addHistoryEntry(entry);
  renderHistoryTable();
}

function swapUnits() {
  const inputEl  = document.getElementById("uc-input");
  const outputEl = document.getElementById("uc-output");
  const fromSel  = document.getElementById("uc-from-unit");
  const toSel    = document.getElementById("uc-to-unit");
  if (!inputEl || !outputEl || !fromSel || !toSel) return;

  const tmpUnit = fromSel.value;
  fromSel.value = toSel.value;
  toSel.value   = tmpUnit;
  _fromUnit = fromSel.value;
  _toUnit   = toSel.value;

  // Use output as new input if available
  // When swapping with ftin, the output may be like "5' 6"" — use it if ftin is now the from-unit
  const newFromIsFtin = fromSel.value === "ftin";
  if (outputEl.value) {
    if (newFromIsFtin || !isNaN(parseFloat(outputEl.value))) {
      inputEl.value = outputEl.value;
    }
  }
  // Refresh hint/placeholder
  renderUnitSelects();
}

// ============================================================================
// HISTORY TABLE
// ============================================================================

let _histFilter = { category: "all", search: "" };
let _utilitiesInitialized = false;

function renderHistoryTable() {
  const tbody = document.getElementById("uc-history-body");
  const emptyState = document.getElementById("uc-history-empty");
  if (!tbody) return;

  let history = loadHistory();

  if (_histFilter.category !== "all") {
    history = history.filter(h => h.category === _histFilter.category);
  }
  if (_histFilter.search) {
    const q = _histFilter.search.toLowerCase();
    history = history.filter(h =>
      h.inputDisplay?.toLowerCase().includes(q) ||
      h.outputDisplay?.toLowerCase().includes(q) ||
      h.fromUnit?.toLowerCase().includes(q) ||
      h.toUnit?.toLowerCase().includes(q)
    );
  }

  if (!history.length) {
    tbody.innerHTML = "";
    emptyState && (emptyState.style.display = "flex");
    return;
  }
  emptyState && (emptyState.style.display = "none");

  tbody.innerHTML = history.slice(0, 100).map(h => {
    const dt = new Date(h.timestamp).toLocaleString();
    const catMeta = UNIT_CATEGORIES[h.category];
    const catLabel = catMeta ? `${catMeta.icon} ${catMeta.label}` : h.category;
    return `<tr>
      <td class="uc-hist-time">${dt}</td>
      <td><span class="uc-hist-cat-badge">${catLabel}</span></td>
      <td class="uc-hist-val">${escHtml(h.inputDisplay)} <span class="uc-hist-unit">${escHtml(h.fromUnit)}</span></td>
      <td class="uc-hist-arrow">→</td>
      <td class="uc-hist-val">${escHtml(h.outputDisplay)} <span class="uc-hist-unit">${escHtml(h.toUnit)}</span></td>
    </tr>`;
  }).join("");
}

function escHtml(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ============================================================================
// UI RENDERING — DATE CALCULATOR
// ============================================================================

function renderDateResults() {
  // Date Difference
  const d1 = document.getElementById("dc-date1")?.value;
  const d2 = document.getElementById("dc-date2")?.value;
  const diffResult = document.getElementById("dc-diff-result");
  if (d1 && d2 && diffResult) {
    const diff = dateDiff(d1, d2);
    const dir  = diff.days >= 0 ? `<em>${formatDateStr(d2)}</em> is ${diff.absDays === 0 ? "the same day as" : `${diff.absDays} day${diff.absDays!==1?"s":""} after`}` : `<em>${formatDateStr(d2)}</em> is ${diff.absDays} day${diff.absDays!==1?"s":""} before`;
    diffResult.innerHTML = diff.absDays === 0
      ? `<div class="dc-result-box"><span class="dc-result-main">Same Day</span></div>`
      : `<div class="dc-result-box">
          <div class="dc-result-row"><span class="dc-result-label">Days apart</span><span class="dc-result-val">${diff.absDays.toLocaleString()}</span></div>
          <div class="dc-result-row"><span class="dc-result-label">Weeks + days</span><span class="dc-result-val">${diff.weeks} wk${diff.weeks!==1?"s":""}, ${diff.remainderDays} day${diff.remainderDays!==1?"s":""}</span></div>
          <div class="dc-result-row"><span class="dc-result-label">Approx. months</span><span class="dc-result-val">${diff.months}</span></div>
          <div class="dc-result-note">${dir} <em>${formatDateStr(d1)}</em></div>
        </div>`;
  } else if (diffResult) {
    diffResult.innerHTML = `<div class="dc-placeholder">Select both dates above to see the difference.</div>`;
  }

  // Age
  const bd  = document.getElementById("dc-birthdate")?.value;
  const ageResult = document.getElementById("dc-age-result");
  if (bd && ageResult) {
    const age = calcAge(bd);
    ageResult.innerHTML = `<div class="dc-result-box">
      <div class="dc-result-row"><span class="dc-result-label">Age</span><span class="dc-result-val dc-age-main">${age.years} yr, ${age.months} mo, ${age.days} d</span></div>
      <div class="dc-result-row"><span class="dc-result-label">Total days lived</span><span class="dc-result-val">${age.totalDays.toLocaleString()}</span></div>
      <div class="dc-result-note">Born: ${formatDateStr(bd)}</div>
    </div>`;
  } else if (ageResult) {
    ageResult.innerHTML = `<div class="dc-placeholder">Enter a birthdate to calculate age.</div>`;
  }

  // Time Difference
  const t1 = document.getElementById("dc-time1")?.value;
  const t2 = document.getElementById("dc-time2")?.value;
  const timeResult = document.getElementById("dc-time-result");
  if (t1 && t2 && timeResult) {
    const td = timeDiff(t1, t2);
    timeResult.innerHTML = `<div class="dc-result-box">
      <div class="dc-result-row"><span class="dc-result-label">Difference</span><span class="dc-result-val">${td.negative?"−":""}${td.hours}h ${td.minutes}m</span></div>
      <div class="dc-result-row"><span class="dc-result-label">Total minutes</span><span class="dc-result-val">${td.totalMinutes.toLocaleString()}</span></div>
    </div>`;
  } else if (timeResult) {
    timeResult.innerHTML = `<div class="dc-placeholder">Enter two times to see the difference.</div>`;
  }

  // Add/Subtract Days
  const baseDate = document.getElementById("dc-adddate")?.value;
  const addDays  = document.getElementById("dc-adddays")?.value;
  const addResult = document.getElementById("dc-add-result");
  if (baseDate && addDays !== "" && addResult) {
    const result = addDaysToDate(baseDate, addDays);
    const days = parseInt(addDays, 10);
    addResult.innerHTML = `<div class="dc-result-box">
      <div class="dc-result-row"><span class="dc-result-label">${days >= 0 ? "Add" : "Subtract"} ${Math.abs(days)} day${Math.abs(days)!==1?"s":""}</span><span class="dc-result-val">${formatDateStr(result.toISOString().slice(0,10))}</span></div>
      <div class="dc-result-note">${getDayOfWeek(result.toISOString().slice(0,10))}</div>
    </div>`;
  } else if (addResult) {
    addResult.innerHTML = `<div class="dc-placeholder">Choose a date and number of days.</div>`;
  }

  // Weekday Finder
  const wdDate   = document.getElementById("dc-weekday-date")?.value;
  const wdResult = document.getElementById("dc-weekday-result");
  if (wdDate && wdResult) {
    const day = getDayOfWeek(wdDate);
    wdResult.innerHTML = `<div class="dc-result-box dc-weekday-box">
      <span class="dc-weekday-name">${day}</span>
      <span class="dc-result-note">${formatDateStr(wdDate)}</span>
    </div>`;
  } else if (wdResult) {
    wdResult.innerHTML = `<div class="dc-placeholder">Pick a date to find the weekday.</div>`;
  }

  // Next/Prev Occurrence
  const occInput  = document.getElementById("dc-occ-date")?.value;
  const occResult = document.getElementById("dc-occ-result");
  if (occInput && occResult) {
    // occInput is YYYY-MM-DD; extract MM-DD
    const mmdd = occInput.slice(5); // "MM-DD"
    const { next, prev } = nextPrevOccurrence(mmdd);
    occResult.innerHTML = `<div class="dc-result-box">
      <div class="dc-result-row"><span class="dc-result-label">Next occurrence</span><span class="dc-result-val">${formatDate(next)}</span></div>
      <div class="dc-result-row"><span class="dc-result-label">Previous occurrence</span><span class="dc-result-val">${formatDate(prev)}</span></div>
      <div class="dc-result-note">Days until next: ${dateDiff(new Date().toISOString().slice(0,10), next.toISOString().slice(0,10)).absDays}</div>
    </div>`;
  } else if (occResult) {
    occResult.innerHTML = `<div class="dc-placeholder">Select the recurring date (month & day only matter).</div>`;
  }
}

function formatDateStr(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
}

// ============================================================================
// TAB SWITCHING WITHIN UTILITIES
// ============================================================================

function switchUtilitiesTab(tab) {
  document.querySelectorAll(".util-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".util-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === tab));

  if (tab === "unit-converter") {
    renderUtilitiesUnitConverter();
  } else if (tab === "date-calc") {
    renderDateResults();
  } else if (tab === "calculator") {
    calcRenderHistory();
  } else if (tab === "moon-phase") {
    initMoonPhase();
  } else if (tab === "tide-chart") {
    if (typeof initTideChart === "function") initTideChart();
  }
}

// ============================================================================
// MODULE INIT
// ============================================================================

function initUtilities() {
  if (_utilitiesInitialized) {
    // Page revisited: re-render UI only, don't re-attach event listeners
    renderUtilitiesUnitConverter();
    switchUtilitiesTab("unit-converter");
    return;
  }
  _utilitiesInitialized = true;

  // Set defaults
  _currentCategory = "length";
  _fromUnit = "m";
  _toUnit = "km";

  // Tab switching
  document.querySelectorAll(".util-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchUtilitiesTab(btn.dataset.tab));
  });

  // Unit converter controls
  const inputEl  = document.getElementById("uc-input");
  const fromSel  = document.getElementById("uc-from-unit");
  const toSel    = document.getElementById("uc-to-unit");
  const swapBtn  = document.getElementById("uc-swap-btn");
  const clearHistBtn = document.getElementById("uc-clear-history");
  const exportHistBtn = document.getElementById("uc-export-history");
  const histCatFilter = document.getElementById("uc-hist-cat-filter");
  const histSearch    = document.getElementById("uc-hist-search");

  inputEl?.addEventListener("input", performConversionDebounced);
  fromSel?.addEventListener("change", () => { _fromUnit = fromSel.value; renderUnitSelects(); });
  toSel?.addEventListener("change",   () => { _toUnit   = toSel.value;   renderUnitSelects(); });
  swapBtn?.addEventListener("click", swapUnits);

  clearHistBtn?.addEventListener("click", async () => {
    if (await showConfirm("Clear all conversion history?", "Clear")) {
      clearHistory();
      renderHistoryTable();
    }
  });

  exportHistBtn?.addEventListener("click", exportHistoryCSV);

  histCatFilter?.addEventListener("change", () => {
    _histFilter.category = histCatFilter.value;
    renderHistoryTable();
  });
  histSearch?.addEventListener("input", () => {
    _histFilter.search = histSearch.value;
    renderHistoryTable();
  });

  // Date calculator inputs — auto-update on any change
  const dateCalcInputs = [
    "dc-date1","dc-date2","dc-birthdate",
    "dc-time1","dc-time2",
    "dc-adddate","dc-adddays",
    "dc-weekday-date","dc-occ-date"
  ];
  dateCalcInputs.forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderDateResults);
    document.getElementById(id)?.addEventListener("input",  renderDateResults);
  });

  // Render initial state
  renderUtilitiesUnitConverter();
  switchUtilitiesTab("unit-converter");

  // Populate history filter categories
  if (histCatFilter) {
    const catOptions = Object.entries(UNIT_CATEGORIES)
      .map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`)
      .join("");
    histCatFilter.innerHTML = `<option value="all">All Categories</option>${catOptions}`;
  }

  // Calculator
  initCalculator();
}

// ============================================================================
// CALCULATOR ENGINE
// ============================================================================

const CALC_HISTORY_KEY = "mto_utilities_calc_history";
const CALC_HISTORY_MAX = 200;

let _calc = {
  display: "0",
  expression: "",
  fullExpression: "",
  operand: null,
  operator: null,
  waitingForOperand: false,
  justEqualed: false,
  memory: 0,
  sciMode: false,
  histSearch: "",
};

function calcLoadHistory() {
  try { return JSON.parse(localStorage.getItem(CALC_HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function calcSaveHistory(hist) {
  localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(hist.slice(0, CALC_HISTORY_MAX)));
}
function calcAddHistory(expression, result) {
  const hist = calcLoadHistory();
  hist.unshift({ expression, result, ts: Date.now() });
  calcSaveHistory(hist);
  calcRenderHistory();
}
function calcDeleteHistory(ts) {
  const hist = calcLoadHistory().filter(h => h.ts !== ts);
  calcSaveHistory(hist);
  calcRenderHistory();
}

function calcRenderHistory() {
  const list  = document.getElementById("calc-history-list");
  const empty = document.getElementById("calc-history-empty");
  if (!list) return;

  let hist = calcLoadHistory();

  // Search filter
  const q = (_calc.histSearch || "").toLowerCase().trim();
  if (q) {
    hist = hist.filter(h =>
      String(h.expression).toLowerCase().includes(q) ||
      String(h.result).toLowerCase().includes(q)
    );
  }

  // Clear existing items
  list.querySelectorAll(".calc-history-item").forEach(el => el.remove());

  if (hist.length === 0) {
    empty && (empty.style.display = "flex");
    if (q) empty.querySelector("p").textContent = "No matching calculations.";
    else   empty.querySelector("p").textContent = "No calculations yet.";
    return;
  }
  empty && (empty.style.display = "none");

  hist.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "calc-history-item";
    const date = new Date(entry.ts);
    const now  = new Date();
    const isToday    = date.toDateString() === now.toDateString();
    const isYesterday = (() => {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return date.toDateString() === y.toDateString();
    })();
    let dateStr;
    if (isToday)     dateStr = date.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    else if (isYesterday) dateStr = "Yesterday " + date.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    else             dateStr = date.toLocaleDateString("en-US", { month:"short", day:"numeric" }) + " " + date.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });

    div.innerHTML = `
      <div class="calc-hist-expr">${escapeHtml(entry.expression)}</div>
      <div class="calc-hist-main-row">
        <div class="calc-hist-result">= ${escapeHtml(String(entry.result))}</div>
        <span class="calc-hist-meta">${dateStr}</span>
        <div class="calc-hist-actions">
          <button class="calc-hist-btn calc-hist-copy" title="Copy result">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="calc-hist-btn calc-hist-reuse" title="Use as input">↵</button>
          <button class="calc-hist-btn calc-hist-delete" title="Delete">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;

    div.querySelector(".calc-hist-reuse").addEventListener("click", () => {
      _calc.display = String(entry.result);
      _calc.expression = "";
      _calc.operand = null;
      _calc.operator = null;
      _calc.waitingForOperand = false;
      _calc.justEqualed = false;
      calcUpdateDisplay();
      calcHighlightActiveOp();
    });

    div.querySelector(".calc-hist-copy").addEventListener("click", (e) => {
      navigator.clipboard?.writeText(String(entry.result)).catch(() => {});
      const btn = e.currentTarget;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 1200);
    });

    div.querySelector(".calc-hist-delete").addEventListener("click", () => {
      calcDeleteHistory(entry.ts);
    });

    list.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function calcFormatDisplay(numStr) {
  // Add thousands separators to the integer part for display only
  if (!numStr || numStr === "Infinity" || numStr === "-Infinity" || numStr === "NaN") return numStr;
  const neg = numStr.startsWith("-");
  const s = neg ? numStr.slice(1) : numStr;
  const [intPart, decPart] = s.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = (neg ? "-" : "") + formatted + (decPart !== undefined ? "." + decPart : "");
  return result;
}

function calcUpdateDisplay() {
  const screen = document.getElementById("calc-screen");
  const expr   = document.getElementById("calc-expression");
  const memInd = document.getElementById("calc-memory-indicator");

  if (screen) screen.textContent = calcFormatDisplay(_calc.display);
  if (expr)   expr.textContent   = _calc.expression;
  if (memInd) memInd.style.display = _calc.memory !== 0 ? "block" : "none";

  // Shrink font for long numbers
  if (screen) {
    const len = _calc.display.length;
    screen.style.fontSize = len > 14 ? "20px" : len > 10 ? "26px" : len > 7 ? "32px" : "";
  }
}

function calcHighlightActiveOp() {
  const panel = document.querySelector('.util-tab-panel[data-panel="calculator"]');
  if (!panel) return;
  panel.querySelectorAll(".calc-btn-op").forEach(btn => {
    btn.classList.toggle("active-op", btn.dataset.op === _calc.operator && _calc.waitingForOperand);
  });
}

function calcFormatNumber(n) {
  if (!isFinite(n)) return String(n);
  if (Math.abs(n) < 1e15 && (Math.abs(n) > 1e-9 || n === 0)) {
    return parseFloat(n.toPrecision(12)).toString();
  }
  return n.toExponential(6);
}

function calcApplyOp(a, op, b) {
  switch(op) {
    case "+":  return a + b;
    case "−":  return a - b;
    case "×":  return a * b;
    case "÷":  return b === 0 ? (a === 0 ? NaN : Infinity) : a / b;
    case "^":  return Math.pow(a, b);
    default:   return b;
  }
}

function calcHandleDigit(digit) {
  if (_calc.waitingForOperand) {
    _calc.display = digit;
    _calc.waitingForOperand = false;
    _calc.justEqualed = false;
  } else {
    if (_calc.justEqualed) {
      _calc.display = digit;
      _calc.expression = "";
      _calc.fullExpression = "";
      _calc.operand = null;
      _calc.operator = null;
      _calc.justEqualed = false;
    } else {
      _calc.display = _calc.display === "0" ? digit : _calc.display + digit;
    }
  }
  calcUpdateDisplay();
  calcHighlightActiveOp();
}

function calcHandleDecimal() {
  if (_calc.waitingForOperand) {
    _calc.display = "0.";
    _calc.waitingForOperand = false;
    _calc.justEqualed = false;
  } else if (!_calc.display.includes(".")) {
    _calc.display += ".";
    _calc.justEqualed = false;
  }
  calcUpdateDisplay();
}

function calcHandleOperator(op) {
  const current = parseFloat(_calc.display);

  if (_calc.fullExpression === "" || _calc.justEqualed) {
    _calc.fullExpression = _calc.display;
    _calc.justEqualed = false;
  }

  if (_calc.operator && !_calc.waitingForOperand) {
    const result = calcApplyOp(_calc.operand, _calc.operator, current);
    _calc.display = calcFormatNumber(result);
    _calc.operand = result;
    _calc.fullExpression += _calc.display;
  } else {
    _calc.operand = current;
    if (!_calc.waitingForOperand) {
      _calc.fullExpression = _calc.display;
    }
  }

  _calc.fullExpression += op;
  _calc.operator = op;
  _calc.expression = _calc.fullExpression;
  _calc.waitingForOperand = true;
  calcUpdateDisplay();
  calcHighlightActiveOp();
}

function calcHandleEquals() {
  if (_calc.operator === null) return;
  const current = parseFloat(_calc.display);
  const result  = calcApplyOp(_calc.operand, _calc.operator, current);
  const resultStr = calcFormatNumber(result);

  const completeExpr = _calc.fullExpression + _calc.display;
  calcAddHistory(completeExpr, resultStr);

  _calc.expression = completeExpr + " =";
  _calc.display = resultStr;
  _calc.fullExpression = "";
  _calc.operand = null;
  _calc.operator = null;
  _calc.waitingForOperand = false;
  _calc.justEqualed = true;
  calcUpdateDisplay();
  calcHighlightActiveOp();
}

function calcHandlePercent() {
  const val = parseFloat(_calc.display);
  const pct = _calc.operand !== null ? _calc.operand * val / 100 : val / 100;
  _calc.display = calcFormatNumber(pct);
  _calc.justEqualed = false;
  calcUpdateDisplay();
}

function calcHandleToggleSign() {
  if (_calc.display !== "0") {
    _calc.display = _calc.display.startsWith("-")
      ? _calc.display.slice(1)
      : "-" + _calc.display;
    calcUpdateDisplay();
  }
}

function calcHandleClearAll() {
  _calc.display = "0";
  _calc.expression = "";
  _calc.fullExpression = "";
  _calc.operand = null;
  _calc.operator = null;
  _calc.waitingForOperand = false;
  _calc.justEqualed = false;
  calcUpdateDisplay();
  calcHighlightActiveOp();
}

function calcHandleBackspace() {
  if (_calc.waitingForOperand || _calc.justEqualed) return;
  _calc.display = _calc.display.length > 1 ? _calc.display.slice(0,-1) : "0";
  calcUpdateDisplay();
}

// ── Scientific functions ─────────────────────────────────────────────────────

function calcHandleSci(fn) {
  const val = parseFloat(_calc.display);
  let result, label;
  switch (fn) {
    case "sin":  result = Math.sin(val * Math.PI / 180); label = `sin(${val}°)`; break;
    case "cos":  result = Math.cos(val * Math.PI / 180); label = `cos(${val}°)`; break;
    case "tan":  result = Math.tan(val * Math.PI / 180); label = `tan(${val}°)`; break;
    case "log":  result = val > 0 ? Math.log10(val) : NaN; label = `log(${val})`; break;
    case "ln":   result = val > 0 ? Math.log(val)   : NaN; label = `ln(${val})`; break;
    case "sqrt": result = val >= 0 ? Math.sqrt(val) : NaN; label = `√${val}`; break;
    case "sq":   result = val * val;  label = `${val}²`; break;
    case "inv":  result = val !== 0 ? 1 / val : Infinity; label = `1/${val}`; break;
    case "pi":   result = Math.PI;    label = "π"; break;
    case "e":    result = Math.E;     label = "e"; break;
    case "abs":  result = Math.abs(val); label = `|${val}|`; break;
    default: return;
  }
  const resultStr = calcFormatNumber(result);
  // For constants (pi, e), just insert — don't add to history
  if (fn === "pi" || fn === "e") {
    _calc.display = resultStr;
    _calc.justEqualed = false;
    _calc.waitingForOperand = false;
  } else {
    calcAddHistory(label, resultStr);
    _calc.display = resultStr;
    _calc.expression = label + " =";
    _calc.fullExpression = "";
    _calc.operand = null;
    _calc.operator = null;
    _calc.waitingForOperand = false;
    _calc.justEqualed = true;
  }
  calcUpdateDisplay();
  calcHighlightActiveOp();
}

// ── Memory ───────────────────────────────────────────────────────────────────

function calcHandleMemory(action) {
  const val = parseFloat(_calc.display);
  switch (action) {
    case "mc":
      _calc.memory = 0;
      break;
    case "mr":
      _calc.display = calcFormatNumber(_calc.memory);
      _calc.waitingForOperand = false;
      _calc.justEqualed = false;
      break;
    case "mplus":
      _calc.memory += isNaN(val) ? 0 : val;
      break;
    case "mminus":
      _calc.memory -= isNaN(val) ? 0 : val;
      break;
  }
  calcUpdateDisplay();
  // Flash MR button if memory was just recalled
  if (action === "mr") {
    const btn = document.querySelector('.calc-btn-mem[data-action="mr"]');
    if (btn) { btn.classList.add("mem-flash"); setTimeout(() => btn.classList.remove("mem-flash"), 350); }
  }
}

// ── Scientific toggle ─────────────────────────────────────────────────────────

function calcToggleSciMode() {
  _calc.sciMode = !_calc.sciMode;
  const panel = document.getElementById("calc-sci-panel");
  const btn   = document.getElementById("calc-sci-toggle");
  if (panel) panel.style.display = _calc.sciMode ? "block" : "none";
  if (btn)   btn.classList.toggle("active", _calc.sciMode);
}

function initCalculator() {
  const panel = document.querySelector('.util-tab-panel[data-panel="calculator"]');
  if (!panel) return;

  panel.querySelectorAll(".calc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const digit  = btn.dataset.digit;
      const op     = btn.dataset.op;
      const action = btn.dataset.action;
      const sci    = btn.dataset.sci;
      if (digit !== undefined) { calcHandleDigit(digit); return; }
      if (sci   !== undefined) { calcHandleSci(sci);     return; }
      if (op    !== undefined) { calcHandleOperator(op); return; }
      switch (action) {
        case "clear-all":    calcHandleClearAll();   break;
        case "toggle-sign":  calcHandleToggleSign(); break;
        case "percent":      calcHandlePercent();    break;
        case "decimal":      calcHandleDecimal();    break;
        case "equals":       calcHandleEquals();     break;
        case "backspace":    calcHandleBackspace();  break;
        case "mc": case "mr": case "mplus": case "mminus":
          calcHandleMemory(action); break;
      }
    });
  });

  document.getElementById("calc-sci-toggle")?.addEventListener("click", calcToggleSciMode);

  document.getElementById("calc-clear-history")?.addEventListener("click", async () => {
    if (await showConfirm("Clear calculator history?", "Clear")) {
      calcSaveHistory([]);
      calcRenderHistory();
    }
  });

  document.getElementById("calc-hist-search")?.addEventListener("input", (e) => {
    _calc.histSearch = e.target.value;
    calcRenderHistory();
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    const panel = document.querySelector('.util-tab-panel[data-panel="calculator"]');
    if (!panel?.classList.contains("active")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    switch(e.key) {
      case "0": case "1": case "2": case "3": case "4":
      case "5": case "6": case "7": case "8": case "9":
        calcHandleDigit(e.key); break;
      case ".": case ",": calcHandleDecimal(); break;
      case "+": calcHandleOperator("+"); break;
      case "-": calcHandleOperator("−"); break;
      case "*": calcHandleOperator("×"); break;
      case "/": e.preventDefault(); calcHandleOperator("÷"); break;
      case "^": calcHandleOperator("^"); break;
      case "Enter": case "=": calcHandleEquals(); break;
      case "Backspace": calcHandleBackspace(); break;
      case "Escape": calcHandleClearAll(); break;
      case "%": calcHandlePercent(); break;
    }
  });

  calcUpdateDisplay();
  calcRenderHistory();
}

// ============================================================================
// MOON PHASE MODULE — Addu City, Maldives (0.629°N, 73.099°E)
// ============================================================================

const MOON_LAT  =  0.629;
const MOON_LON  = 73.099;
const MOON_TZ   =  5;      // UTC+5

let _moonInitialized = false;
let _moonAnimFrame   = null;

/* ─── Astronomical helpers ─── */
function moonToRad(d) { return d * Math.PI / 180; }
function moonToDeg(r) { return r * 180 / Math.PI; }

/**
 * Compute moon phase data for a given JS Date.
 * Returns: { phase [0–1], illumination [0–1], age [days], phaseName, emoji,
 *            distance [km], nextPhases [{name, emoji, date}] }
 */
function computeMoonData(date) {
  // Julian Day Number
  function jdn(d) {
    const y = d.getUTCFullYear(), m = d.getUTCMonth()+1, day = d.getUTCDate();
    const h = d.getUTCHours() + d.getUTCMinutes()/60 + d.getUTCSeconds()/3600;
    const A = Math.floor((14 - m) / 12);
    const Y = y + 4800 - A;
    const M = m + 12*A - 3;
    return day + Math.floor((153*M+2)/5) + 365*Y + Math.floor(Y/4)
         - Math.floor(Y/100) + Math.floor(Y/400) - 32045 + h/24 - 0.5;
  }

  const JD = jdn(date);
  // Days since known new moon: 2000-01-06 18:14 UT (JD 2451549.755)
  const KNOWN_NEW = 2451549.755;
  const SYNODIC   = 29.53058867;

  const daysSinceNew = ((JD - KNOWN_NEW) % SYNODIC + SYNODIC) % SYNODIC;
  const phase = daysSinceNew / SYNODIC; // 0=new, 0.5=full

  // Illumination fraction (0→1)
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  // Phase name & emoji
  // New Moon wraps around the 0/1 boundary (≈ ±1 day = ±0.0339 of cycle).
  // Check it first before the linear range scan.
  const NEW_MOON_HALF = 0.0334; // ~1 day on each side of exact new moon
  const phases = [
    { min: 0.0334, max: 0.2166, name: "Waxing Crescent", emoji: "🌒" },
    { min: 0.2166, max: 0.2834, name: "First Quarter",   emoji: "🌓" },
    { min: 0.2834, max: 0.4666, name: "Waxing Gibbous",  emoji: "🌔" },
    { min: 0.4666, max: 0.5334, name: "Full Moon",        emoji: "🌕" },
    { min: 0.5334, max: 0.7166, name: "Waning Gibbous",  emoji: "🌖" },
    { min: 0.7166, max: 0.7834, name: "Last Quarter",    emoji: "🌗" },
    { min: 0.7834, max: 1 - NEW_MOON_HALF, name: "Waning Crescent", emoji: "🌘" },
  ];
  // New Moon: phase near 0 OR near 1 (wraps around)
  const isNewMoon = phase < NEW_MOON_HALF || phase >= (1 - NEW_MOON_HALF);
  const p = isNewMoon
    ? { name: "New Moon", emoji: "🌑" }
    : (phases.find(p => phase >= p.min && phase < p.max) || { name: "Waning Crescent", emoji: "🌘" });

  // Approximate distance (km) using simple model
  const anomaly = moonToRad((daysSinceNew / SYNODIC) * 360 - 2.5);
  const dist = 385001 - 20905 * Math.cos(anomaly);

  // Next 4 principal phases
  const nextPhases = [];
  const principals = [
    { frac: 0,   name: "New Moon",     emoji: "🌑" },
    { frac: 0.25,name: "First Quarter",emoji: "🌓" },
    { frac: 0.5, name: "Full Moon",    emoji: "🌕" },
    { frac: 0.75,name: "Last Quarter", emoji: "🌗" },
  ];
  principals.forEach(pp => {
    let daysAhead = ((pp.frac - phase + 1) % 1) * SYNODIC;
    if (daysAhead < 0.5) daysAhead += SYNODIC;
    const dt = new Date(date.getTime() + daysAhead * 86400000);
    nextPhases.push({ name: pp.name, emoji: pp.emoji, date: dt });
  });
  nextPhases.sort((a, b) => a.date - b.date);

  return {
    phase, illumination: illum,
    age: daysSinceNew, cycleDay: Math.round(daysSinceNew) + 1,
    phaseName: p.name, emoji: p.emoji,
    distance: Math.round(dist),
    nextPhases
  };
}

/**
 * Approximate moonrise / moonset times for Addu City.
 * Uses a simplified algorithm (±15 min accuracy).
 */
function computeMoonRiseSet(date, moon) {
  // Simple approximation: moonrise/set offset from solar transit
  // Moon transits ~50 min later each day; rise/set ≈ transit ± ~6h
  const phaseAngle = moon.phase * 360; // degrees
  // Moon rises roughly at: noon + phaseAngle/15 hours (offset from noon)
  const riseHourUTC = 6 + (phaseAngle / 15) % 24;
  const setHourUTC  = riseHourUTC + 12.4;

  function fmtHour(h) {
    h = ((h % 24) + 24) % 24;
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    const ampm = hh < 12 ? "AM" : "PM";
    const h12  = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2,"0")} ${ampm}`;
  }

  return {
    rise: fmtHour(riseHourUTC + MOON_TZ),
    set:  fmtHour(setHourUTC  + MOON_TZ),
  };
}

/* ─── Canvas moon illustration ─── */
/**
 * Draws the moon phase using a clean, correct astronomical rendering algorithm.
 *
 * Convention (Northern Hemisphere / equatorial view, matching standard emoji):
 *   phase 0      = New Moon      (fully dark)
 *   phase 0→0.5  = Waxing        (RIGHT side lit)
 *   phase 0.5    = Full Moon     (fully lit)
 *   phase 0.5→1  = Waning        (LEFT side lit)
 *
 * Algorithm:
 *   1. Paint the full disc with the lit (golden) gradient.
 *   2. On an offscreen canvas, draw the dark region as a solid path, then
 *      composite it over the lit disc with destination-in to mask it.
 *      The dark region path is constructed by tracing:
 *        – the limb arc  (outer edge on the dark side)
 *        – the terminator ellipse arc (inner boundary)
 *      The terminator is an ellipse with:
 *        x semi-axis = |cos(phase × 2π)| × R  (0 at quarters, R at new/full)
 *        y semi-axis = R
 *      Its bow direction (which side it curves toward) encodes crescent vs gibbous:
 *        phase 0→0.25   waxing crescent : terminator bows RIGHT (toward lit/right side)
 *        phase 0.25→0.5 waxing gibbous  : terminator bows LEFT  (toward dark/left side)
 *        phase 0.5→0.75 waning gibbous  : terminator bows LEFT  (toward dark/right side)
 *        phase 0.75→1   waning crescent : terminator bows LEFT  (toward lit/left side)
 *
 *      The CCW arc (anticlockwise=true in canvas) naturally traces the LEFT side.
 *      A negative x-scale flips it to trace the RIGHT side.
 *      So: termSign = -1 → bows RIGHT, termSign = +1 → bows LEFT.
 */
function drawMoonCanvas(canvas, phase, illumination) {
  // Clamp near-new-moon phases to 0 so the canvas renders a clean dark disc
  // rather than a barely-visible sliver (avoids the waning-crescent visual artifact).
  const NEW_MOON_HALF = 0.0334;
  if (phase >= (1 - NEW_MOON_HALF) || phase < NEW_MOON_HALF) {
    phase = 0;
    illumination = 0;
  }
  const dpr = window.devicePixelRatio || 1;
  const cssW = parseInt(canvas.style.width  || canvas.getAttribute("width"))  || canvas.width;
  const cssH = parseInt(canvas.style.height || canvas.getAttribute("height")) || canvas.height;
  if (canvas.width  !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);

  const W = cssW, H = cssH;
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) / 2 - 14;

  ctx.clearRect(0, 0, W, H);

  // ── Outer atmospheric glow ──────────────────────────────────────────────
  const glowR = R * 1.45;
  const glow  = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, glowR);
  glow.addColorStop(0, `rgba(255,240,180,${0.06 + illumination * 0.14})`);
  glow.addColorStop(1, "rgba(255,240,180,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

  // ── Offscreen canvas: composite lit disc + dark mask ──────────────────
  const off = document.createElement("canvas");
  off.width  = cssW;
  off.height = cssH;
  const oc = off.getContext("2d");

  // 1. Draw full lit disc
  const litGrad = oc.createRadialGradient(cx + R*0.15, cy - R*0.15, R*0.05, cx, cy, R);
  litGrad.addColorStop(0,   "#fffaea");
  litGrad.addColorStop(0.45,"#f5d97a");
  litGrad.addColorStop(0.82,"#d4a93a");
  litGrad.addColorStop(1,   "#b8882a");
  oc.beginPath(); oc.arc(cx, cy, R, 0, Math.PI * 2);
  oc.fillStyle = litGrad; oc.fill();

  // 2. Cut dark region using destination-out on a helper canvas, then blit
  //
  //  The terminator ellipse x-semi-axis: tx = cos(phase·2π)·R
  //    tx > 0  →  new→1stQ  and lastQ→new  (crescent): ellipse bows toward RIGHT
  //    tx < 0  →  1stQ→full and full→lastQ (gibbous):  ellipse bows toward LEFT
  //    tx = 0  →  quarter (flat terminator)
  //
  //  Dark-side:
  //    Waxing (phase < 0.5) : dark is LEFT  (limb = left arc, angles π/2 → -π/2 CCW)
  //    Waning (phase ≥ 0.5) : dark is RIGHT (limb = right arc, angles -π/2 → π/2 CCW)
  //
  //  Dark region path = limb-arc + terminator-ellipse-arc (closed)
  //  The terminator arc is always arc(0,0,R, PI/2, -PI/2, true) — CCW in canvas = traces LEFT side.
  //  A negative x-scale flips it to trace the RIGHT side.
  //    Crescent waxing : bows RIGHT  → scale(-sx, 1)  [negative flips to right]
  //    Gibbous  waxing : bows LEFT   → scale(+sx, 1)
  //    Gibbous  waning : bows LEFT   → scale(-sx2, 1) [in flipped waning coords]
  //    Crescent waning : bows RIGHT  → scale(+sx2, 1)

  const darkCanvas = document.createElement("canvas");
  darkCanvas.width  = cssW;
  darkCanvas.height = cssH;
  const dc = darkCanvas.getContext("2d");

  // Terminator parameters
  const tx   = Math.cos(phase * 2 * Math.PI) * R;  // signed x semi-axis
  const sx   = Math.abs(tx) / R;                    // 0..1 scale factor

  dc.save();
  dc.translate(cx, cy);
  dc.beginPath();

  if (phase < 0.5) {
    // ── WAXING: dark side is LEFT ──────────────────────────────────────
    // Limb arc: left semicircle from top (−π/2) going CCW (leftward) to bottom (π/2)
    // In canvas coords (y-down), "going CCW visually" means arc(..., true) — anticlockwise flag
    dc.arc(0, 0, R, -Math.PI/2, Math.PI/2, true);   // left limb: top → left → bottom

    // Terminator arc: from bottom (0,R) back to top (0,-R) via the terminator ellipse
    // tx > 0 (crescent): ellipse bows RIGHT  → positive scale on x
    // tx < 0 (gibbous):  ellipse bows LEFT   → negative scale on x
    // We scale x, draw a right-half arc CCW (visually left arc in scaled space),
    // then restore scale. The path continues from where the limb arc ended (0,R).
    dc.save();
    const termSign = (tx >= 0) ? 1 : -1;   // crescent: +scale keeps bow RIGHT (large dark); gibbous: -scale flips bow LEFT (small dark)
    dc.scale(termSign * sx, 1);
    // Right semicircle CCW: from bottom (π/2) to top (−π/2)
    dc.arc(0, 0, R, Math.PI/2, -Math.PI/2, true);
    dc.restore();

  } else {
    // ── WANING: dark side is RIGHT ─────────────────────────────────────
    // Limb arc: right semicircle from top (−π/2) going CW (rightward) to bottom (π/2)
    dc.arc(0, 0, R, -Math.PI/2, Math.PI/2, false);  // right limb: top → right → bottom

    // Terminator arc: from bottom back to top
    // phase 0.5→0.75 (gibbous waning): tx2 = cos((phase−0.5)·2π)·R > 0, but bows LEFT (into dark=right side)
    // phase 0.75→1   (crescent waning): tx2 < 0, bows RIGHT (toward lit=left side)
    const phase2 = phase - 0.5;
    const tx2    = Math.cos(phase2 * 2 * Math.PI) * R;
    const sx2    = Math.abs(tx2) / R;
    dc.save();
    // Gibbous waning (tx2>0): bow is on the RIGHT (dark side) → negative scale to bow left in CCW arc
    // Crescent waning (tx2<0): bow is on the LEFT (lit side) → positive scale
    const termSign2 = (tx2 >= 0) ? 1 : -1;
    dc.scale(termSign2 * sx2, 1);
    dc.arc(0, 0, R, Math.PI/2, -Math.PI/2, true);
    dc.restore();
  }

  dc.closePath();
  dc.fillStyle = "#000";
  dc.fill();
  dc.restore();

  // Cut dark canvas out of lit disc
  oc.save();
  oc.globalCompositeOperation = "destination-out";
  oc.drawImage(darkCanvas, 0, 0);
  oc.restore();

  // 3. Add mare (dark patches) as subtle texture on the lit disc
  oc.save();
  oc.globalCompositeOperation = "multiply";
  oc.globalAlpha = 0.18;
  // Mare Imbrium (upper left)
  oc.beginPath(); oc.ellipse(cx - R*0.22, cy - R*0.18, R*0.28, R*0.22, -0.3, 0, Math.PI*2);
  oc.fillStyle = "#a07820"; oc.fill();
  // Mare Serenitatis (upper right)
  oc.beginPath(); oc.ellipse(cx + R*0.10, cy - R*0.20, R*0.18, R*0.16,  0.2, 0, Math.PI*2);
  oc.fillStyle = "#9a7218"; oc.fill();
  // Mare Tranquillitatis (right of centre)
  oc.beginPath(); oc.ellipse(cx + R*0.18, cy - R*0.02, R*0.22, R*0.18, -0.1, 0, Math.PI*2);
  oc.fillStyle = "#8a6a14"; oc.fill();
  // Mare Nubium / Oceanus Procellarum (left large)
  oc.beginPath(); oc.ellipse(cx - R*0.30, cy + R*0.05, R*0.30, R*0.38,  0.15, 0, Math.PI*2);
  oc.fillStyle = "#906c10"; oc.fill();
  // Mare Crisium (far right edge)
  oc.beginPath(); oc.ellipse(cx + R*0.52, cy - R*0.22, R*0.11, R*0.09,  0.3, 0, Math.PI*2);
  oc.fillStyle = "#7a5e10"; oc.fill();
  oc.restore();

  // 4. Subtle craters (on lit face)
  oc.save();
  oc.globalAlpha = 0.10;
  const craters = [
    {x:0.38, y:-0.32, r:0.055}, {x:-0.08, y: 0.45, r:0.065},
    {x: 0.25,y: 0.28, r:0.05 }, {x:-0.40, y:-0.08, r:0.08 },
    {x:-0.12,y:-0.38, r:0.045}, {x: 0.48, y: 0.12, r:0.05 },
    {x:-0.52,y: 0.28, r:0.055}, {x: 0.05, y:-0.55, r:0.04 },
  ];
  craters.forEach(c => {
    oc.beginPath();
    oc.arc(cx + c.x*R, cy + c.y*R, c.r*R, 0, Math.PI*2);
    oc.fillStyle = "#6a5000"; oc.fill();
  });
  oc.restore();

  // 5. Rim shadow (inner edge of dark side)
  oc.save();
  oc.globalCompositeOperation = "source-over";
  const rimGrad = oc.createRadialGradient(cx, cy, R*0.82, cx, cy, R);
  rimGrad.addColorStop(0, "rgba(0,0,0,0)");
  rimGrad.addColorStop(1, "rgba(0,0,0,0.28)");
  oc.beginPath(); oc.arc(cx, cy, R, 0, Math.PI*2);
  oc.fillStyle = rimGrad; oc.fill();
  oc.restore();

  // ── Blit offscreen canvas to main canvas ──────────────────────────────
  ctx.drawImage(off, 0, 0);

  // ── Rim highlight ────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,240,160,0.30)";
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // undo DPR scale
}

/* ─── Stars background ─── */
function renderStars(container) {
  if (container.children.length > 0) return; // already rendered
  for (let i = 0; i < 55; i++) {
    const s = document.createElement("div");
    s.className = "moon-star";
    const sz = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${sz}px;height:${sz}px;
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      opacity:${Math.random()*0.6+0.2};
      animation-delay:${Math.random()*4}s;
      animation-duration:${Math.random()*3+2}s;
    `;
    container.appendChild(s);
  }
}

/* ─── Cycle strip ─── */
function renderMoonCycleStrip(today) {
  const strip = document.getElementById("moon-cycle-strip");
  if (!strip) return;
  const SYNODIC = 29.53058867;
  const KNOWN_NEW = 2451549.755;
  function jdn(d) {
    const y=d.getUTCFullYear(),m=d.getUTCMonth()+1,day=d.getUTCDate();
    const h=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
    const A=Math.floor((14-m)/12),Y=y+4800-A,M=m+12*A-3;
    return day+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-Math.floor(Y/100)+Math.floor(Y/400)-32045+h/24-0.5;
  }
  const JD0 = jdn(today);
  const daysSinceNew0 = ((JD0 - KNOWN_NEW) % SYNODIC + SYNODIC) % SYNODIC;
  const cycleStart = new Date(today.getTime() - daysSinceNew0 * 86400000);

  strip.innerHTML = "";
  const emojis = ["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘","🌑"];
  for (let i = 0; i < 30; i++) {
    const d = new Date(cycleStart.getTime() + i * 86400000);
    const phase = i / SYNODIC;
    const idx = Math.round(phase * 8) % 8;
    const isToday = d.toDateString() === today.toDateString();
    const div = document.createElement("div");
    div.className = "moon-cycle-day" + (isToday ? " moon-cycle-today" : "");
    div.title = `Day ${i+1} — ${d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`;
    div.innerHTML = `<span class="moon-cycle-emoji">${emojis[idx]}</span><span class="moon-cycle-num">${i+1}</span>`;
    strip.appendChild(div);
  }
}

/* ─── Upcoming phases list ─── */
function renderUpcomingPhases(nextPhases) {
  const el = document.getElementById("moon-upcoming");
  if (!el) return;
  el.innerHTML = nextPhases.slice(0,4).map(p => `
    <div class="moon-upcoming-item">
      <span class="moon-upcoming-emoji">${p.emoji}</span>
      <div class="moon-upcoming-info">
        <span class="moon-upcoming-name">${p.name}</span>
        <span class="moon-upcoming-date">${p.date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
      </div>
      <span class="moon-upcoming-in">${daysUntil(p.date)}</span>
    </div>
  `).join("");
}

function daysUntil(date) {
  const diff = Math.round((date - new Date()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} days`;
}

/* ─── Moon fact ─── */
const MOON_FACTS = [
  "The Moon is slowly drifting away from Earth at about 3.8 cm per year.",
  "A full lunar cycle (synodic month) takes 29 days, 12 hours, 44 minutes.",
  "The same side of the Moon always faces Earth — this is called tidal locking.",
  "The Moon has no atmosphere, so temperatures swing from −173°C to +127°C.",
  "Moonquakes do occur — caused by tidal forces from Earth's gravity.",
  "The Moon's gravity is about 1/6th of Earth's — you'd weigh much less there!",
  "The Moon was likely formed from debris after a Mars-sized body hit early Earth.",
  "Lunar eclipses occur when Earth's shadow falls across a full Moon.",
  "The Moon's surface is covered in regolith — fine powdery rock from meteorite impacts.",
  "From Addu City, the Moon rises above the Indian Ocean with a clear tropical horizon.",
  "Near the equator like Addu City, the Moon travels nearly straight up at moonrise.",
  "The Southern Hemisphere sees the Moon 'upside-down' compared to the North.",
];

function renderMoonFact(phase) {
  const el = document.getElementById("moon-fact");
  if (!el) return;
  const idx = Math.floor(phase * MOON_FACTS.length) % MOON_FACTS.length;
  el.innerHTML = `<p class="moon-fact-text">"${MOON_FACTS[idx]}"</p>`;
}

/* ─── Main init / refresh ─── */
function initMoonPhase() {
  const canvas = document.getElementById("moon-canvas");
  const stars  = document.getElementById("moon-stars");
  if (stars) renderStars(stars);

  function fullRefresh() {
    const now  = new Date();
    const moon = computeMoonData(now);
    const riseSet = computeMoonRiseSet(now, moon);

    if (canvas) drawMoonCanvas(canvas, moon.phase, moon.illumination);

    const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
    setEl("moon-phase-name",  moon.phaseName);
    setEl("moon-phase-emoji", moon.emoji);
    setEl("moon-phase-date",
      now.toLocaleDateString("en-US", {weekday:"long", year:"numeric", month:"long", day:"numeric"})
    );
    setEl("moon-illumination", Math.round(moon.illumination * 100) + "%");
    setEl("moon-age",          moon.age.toFixed(2) + " days");
    setEl("moon-cycle-day",    moon.cycleDay + " / 30");
    setEl("moon-distance",     moon.distance.toLocaleString() + " km");
    setEl("moon-rise",         riseSet.rise);
    setEl("moon-set",          riseSet.set);

    renderMoonCycleStrip(now);
    renderUpcomingPhases(moon.nextPhases);
    renderMoonFact(moon.phase);

    // Live clock / phase age ticking display
    const liveEl = document.getElementById("moon-live-age");
    if (liveEl) {
      const totalSecs = Math.round(moon.age * 86400);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      liveEl.textContent =
        `${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
    }
  }

  // Full refresh once on load
  fullRefresh();

  // Live tick every second — updates clock and redraws canvas
  if (_moonAnimFrame) clearInterval(_moonAnimFrame);
  _moonAnimFrame = setInterval(() => {
    const now  = new Date();
    const moon = computeMoonData(now);

    // Redraw canvas every second for smoothness
    if (canvas) drawMoonCanvas(canvas, moon.phase, moon.illumination);

    // Update live age clock every second
    const liveEl = document.getElementById("moon-live-age");
    if (liveEl) {
      const totalSecs = Math.round(moon.age * 86400);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      liveEl.textContent =
        `${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
    }

    // Full stat refresh once per minute
    if (now.getSeconds() === 0) fullRefresh();
  }, 1000);
}