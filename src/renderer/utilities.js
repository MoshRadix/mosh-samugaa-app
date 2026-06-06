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
      nmi: { label: "Nautical Miles",     factor: 1852  },
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

  // Update hint for length
  const hint = document.getElementById("uc-input-hint");
  if (hint) {
    hint.textContent = _currentCategory === "length"
      ? "Tip: Enter feet/inches as 5' 11\" or 12' 9\""
      : "";
  }
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

  let numericValue;
  let inputDisplay = rawInput;

  // Check for feet/inches format in length category
  if (_currentCategory === "length") {
    const feetIn = parseFeetInches(rawInput);
    if (feetIn !== null) {
      numericValue = feetIn * 0.0254; // to meters (base)
      inputDisplay = rawInput;
      // Bypass normal conversion: value is already in meters, convert to target
      const result = convertValue(numericValue / UNIT_CATEGORIES.length.units["m"].factor, "m", _toUnit, "length");
      if (result === null || isNaN(result)) { outputEl.value = "Invalid"; return; }
      const formatted = formatNumber(result);
      outputEl.value = formatted;
      if (doSave) {
        const toLabel = UNIT_CATEGORIES[_currentCategory].units[_toUnit]?.label || _toUnit;
        const fromLabel = "feet/inches";
        saveAndRefreshHistory({ inputDisplay, fromUnit: fromLabel, outputDisplay: formatted, toUnit: toLabel, category: _currentCategory });
      }
      return;
    }
  }

  numericValue = parseFloat(rawInput);
  if (isNaN(numericValue)) { outputEl.value = "Invalid input"; return; }

  const result = convertValue(numericValue, _fromUnit, _toUnit, _currentCategory);
  if (result === null || isNaN(result)) { outputEl.value = "Error"; return; }

  const formatted = formatNumber(result);
  outputEl.value = formatted;

  if (doSave) {
    const fromLabel = UNIT_CATEGORIES[_currentCategory].units[_fromUnit]?.label || _fromUnit;
    const toLabel   = UNIT_CATEGORIES[_currentCategory].units[_toUnit]?.label   || _toUnit;
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
  if (outputEl.value && !isNaN(parseFloat(outputEl.value))) {
    inputEl.value = outputEl.value;
  }
  performConversion({ saveHistory: true });
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
  fromSel?.addEventListener("change", () => { _fromUnit = fromSel.value; performConversion({ saveHistory: true }); });
  toSel?.addEventListener("change",   () => { _toUnit   = toSel.value;   performConversion({ saveHistory: true }); });
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
const CALC_HISTORY_MAX = 100;

let _calc = {
  display: "0",           // what shows on screen
  expression: "",         // expression line above display (updates live)
  fullExpression: "",     // full accumulated expression string for history
  operand: null,          // left-hand operand stored for pending op
  operator: null,         // pending operator
  waitingForOperand: false,
  justEqualed: false,
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

function calcRenderHistory() {
  const list  = document.getElementById("calc-history-list");
  const empty = document.getElementById("calc-history-empty");
  if (!list) return;
  const hist = calcLoadHistory();
  if (hist.length === 0) {
    empty && (empty.style.display = "flex");
    // remove any existing items
    list.querySelectorAll(".calc-history-item").forEach(el => el.remove());
    return;
  }
  empty && (empty.style.display = "none");
  list.querySelectorAll(".calc-history-item").forEach(el => el.remove());
  hist.forEach((entry, idx) => {
    const div = document.createElement("div");
    div.className = "calc-history-item";
    const date = new Date(entry.ts);
    const timeStr = date.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    div.innerHTML = `
      <div class="calc-hist-expr">${escapeHtml(entry.expression)}</div>
      <div class="calc-hist-result">= ${escapeHtml(String(entry.result))}</div>
      <div class="calc-hist-meta">${timeStr}</div>
      <button class="calc-hist-reuse" data-value="${escapeHtml(String(entry.result))}" title="Use this result">↵</button>
    `;
    div.querySelector(".calc-hist-reuse").addEventListener("click", (e) => {
      const val = e.currentTarget.dataset.value;
      _calc.display = val;
      _calc.expression = "";
      _calc.operand = null;
      _calc.operator = null;
      _calc.waitingForOperand = false;
      _calc.justEqualed = false;
      calcUpdateDisplay();
    });
    list.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function calcUpdateDisplay() {
  const screen = document.getElementById("calc-screen");
  const expr   = document.getElementById("calc-expression");
  if (screen) screen.textContent = _calc.display;
  if (expr)   expr.textContent   = _calc.expression;
  // shrink font for long numbers
  if (screen) {
    const len = _calc.display.length;
    screen.style.fontSize = len > 14 ? "20px" : len > 10 ? "26px" : len > 7 ? "32px" : "";
  }
}

function calcFormatNumber(n) {
  if (!isFinite(n)) return String(n);
  // avoid scientific notation for reasonably sized numbers
  if (Math.abs(n) < 1e15 && Math.abs(n) > 1e-7 || n === 0) {
    // strip trailing zeros after decimal
    let s = parseFloat(n.toPrecision(12)).toString();
    return s;
  }
  return n.toExponential(6);
}

function calcApplyOp(a, op, b) {
  switch(op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? (a === 0 ? NaN : Infinity) : a / b;
    default:  return b;
  }
}

function calcHandleDigit(digit) {
  if (_calc.waitingForOperand) {
    _calc.display = digit;
    _calc.waitingForOperand = false;
    _calc.justEqualed = false;
  } else {
    if (_calc.justEqualed) {
      // start fresh after equals
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
    // First operand: seed fullExpression with the current number
    _calc.fullExpression = _calc.display;
    _calc.justEqualed = false;
  }

  if (_calc.operator && !_calc.waitingForOperand) {
    // Chain: apply the pending op to get the running total
    const result = calcApplyOp(_calc.operand, _calc.operator, current);
    _calc.display = calcFormatNumber(result);
    _calc.operand = result;
    // Append the number the user just finished typing to fullExpression
    _calc.fullExpression += _calc.display;
  } else {
    _calc.operand = current;
    // If we were waiting (operator pressed twice), don't append the number again
    if (!_calc.waitingForOperand) {
      _calc.fullExpression = _calc.display;
    }
  }

  // Append the operator symbol to fullExpression
  _calc.fullExpression += op;
  _calc.operator = op;
  _calc.expression = _calc.fullExpression;
  _calc.waitingForOperand = true;
  calcUpdateDisplay();
}

function calcHandleEquals() {
  if (_calc.operator === null) return;
  const current = parseFloat(_calc.display);
  const result  = calcApplyOp(_calc.operand, _calc.operator, current);
  const resultStr = calcFormatNumber(result);

  // Complete the full expression string with the last number
  const completeExpr = _calc.fullExpression + _calc.display;

  calcAddHistory(completeExpr, resultStr);
  _calc.expression = completeExpr + "=";
  _calc.display = resultStr;
  _calc.fullExpression = "";
  _calc.operand = null;
  _calc.operator = null;
  _calc.waitingForOperand = false;
  _calc.justEqualed = true;
  calcUpdateDisplay();
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
  _calc = { display:"0", expression:"", fullExpression:"", operand:null, operator:null, waitingForOperand:false, justEqualed:false };
  calcUpdateDisplay();
}

function calcHandleBackspace() {
  if (_calc.waitingForOperand || _calc.justEqualed) return;
  _calc.display = _calc.display.length > 1 ? _calc.display.slice(0,-1) : "0";
  calcUpdateDisplay();
}

function initCalculator() {
  // Button clicks
  const panel = document.querySelector('.util-tab-panel[data-panel="calculator"]');
  if (!panel) return;

  panel.querySelectorAll(".calc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const digit  = btn.dataset.digit;
      const op     = btn.dataset.op;
      const action = btn.dataset.action;
      if (digit !== undefined) { calcHandleDigit(digit); return; }
      if (op    !== undefined) { calcHandleOperator(op); return; }
      switch (action) {
        case "clear-all":    calcHandleClearAll();   break;
        case "toggle-sign":  calcHandleToggleSign(); break;
        case "percent":      calcHandlePercent();    break;
        case "decimal":      calcHandleDecimal();    break;
        case "equals":       calcHandleEquals();     break;
      }
    });
  });

  // Clear history button
  document.getElementById("calc-clear-history")?.addEventListener("click", async () => {
    if (await showConfirm("Clear calculator history?", "Clear")) {
      calcSaveHistory([]);
      calcRenderHistory();
    }
  });

  // Keyboard support (only when calculator tab is active)
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
      case "Enter": case "=": calcHandleEquals(); break;
      case "Backspace": calcHandleBackspace(); break;
      case "Escape": calcHandleClearAll(); break;
      case "%": calcHandlePercent(); break;
    }
  });

  calcUpdateDisplay();
  calcRenderHistory();
}