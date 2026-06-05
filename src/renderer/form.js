// Global state for automatic switching
let autoLanguageSwitch = true; // Enable automatic language switching by default
let currentActiveField = null;
let currentFieldLanguage = null;

// Language configurations
const languageConfig = {
  divehi: {
    name: "Divehi",
    flag: "🇲🇻",
    direction: "rtl",
    font: "Noto Sans Thaana, MV Faseyha, Faruma",
    transliterate: true,
    imeMode: "active",
  },
  english: {
    name: "English",
    flag: "🇬🇧",
    direction: "ltr",
    font: "Segoe UI, Arial",
    transliterate: false,
    imeMode: "inactive",
  },
};
// Add days to a local date string (YYYY-MM-DD) without timezone issues
function addDaysToLocalDate(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
/**
 * Populate all date_range_* placeholders in formData from a start date string.
 *
 * Handles three placeholder families (all indexed from 1):
 *   date_range_N            → Divehi formatted  (legacy, keeps existing behaviour)
 *   date_range_divehi_N     → Divehi formatted
 *   date_range_english_N    → English formatted
 *
 * The index N is the day offset: N=1 → startDate, N=2 → startDate+1, …
 *
 * @param {Object} formData      - The live formData object (mutated in place).
 * @param {string} startDateStr  - A YYYY-MM-DD date string chosen by the user.
 * @param {number} count         - How many days the range covers (e.g. 21).
 */
function populateDateRangePlaceholders(formData, startDateStr, count) {
  const templateKeys = new Set(
    (window.selectedTemplate?.fields || []).map((f) => f.key)
  );

  // Find the highest index across all families — both short-before and short-after lang
  let maxIndex = count || 0;
  for (const key of templateKeys) {
    const m = key.match(/^date_range_(?:short_)?(?:divehi_|english_)?(?:short_)?(\d+)$/);
    if (m) maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
  }

  for (let i = 1; i <= maxIndex; i++) {
    const dateStr = addDaysToLocalDate(startDateStr, i - 1);
    if (templateKeys.has(`date_range_${i}`))
      formData[`date_range_${i}`] = formatDivehiDate(dateStr);
    if (templateKeys.has(`date_range_divehi_${i}`))
      formData[`date_range_divehi_${i}`] = formatDivehiDate(dateStr);
    if (templateKeys.has(`date_range_english_${i}`))
      formData[`date_range_english_${i}`] = formatEnglishDate(dateStr);
    // Short after lang: date_range_divehi_short_N, date_range_english_short_N
    if (templateKeys.has(`date_range_divehi_short_${i}`))
      formData[`date_range_divehi_short_${i}`] = formatDivehiDate(dateStr, true);
    if (templateKeys.has(`date_range_english_short_${i}`))
      formData[`date_range_english_short_${i}`] = formatEnglishDate(dateStr, true);
    // Short before lang: date_range_short_divehi_N, date_range_short_english_N
    if (templateKeys.has(`date_range_short_divehi_${i}`))
      formData[`date_range_short_divehi_${i}`] = formatDivehiDate(dateStr, true);
    if (templateKeys.has(`date_range_short_english_${i}`))
      formData[`date_range_short_english_${i}`] = formatEnglishDate(dateStr, true);
  }
}

/**
 * Returns true if the template has a visible (non-hidden) field whose key is
 * one of: start_date, start_date_divehi, start_date_english.
 * When true, date_range_divehi/english/short_N fields are auto-computed from
 * that field and must not be shown as form inputs.
 */
function hasVisibleStartDateField(fields) {
  return (fields || []).some((f) =>
    !f.key.endsWith("_hidden") &&
    /^start_date(_divehi|_english)?$/.test(f.key)
  );
}

/**
 * Returns true for fields that are auto-computed at generation time and must
 * never appear as user-facing inputs in the form.
 *
 * Covers:
 *   - _hidden suffix fields
 *   - weekday_divehi/english_(short_)?hidden_* patterns
 *   - date_range_N (N >= 2), date_range_divehi_N, date_range_english_N
 *   - date_range_divehi_short_N, date_range_english_short_N
 *   - date_range_divehi_N / english_N / short variants when a visible start_date
 *     field exists (fields context required)
 */
function isAutoComputedField(key, fields) {
  if (key.endsWith("_hidden")) return true;
  // Any weekday field that contains "hidden" is always auto-computed
  if (/^weekday_(divehi|english)_/.test(key) && key.includes("hidden")) return true;
  // date_range with short after lang:  date_range_divehi_short_N, date_range_english_short_N
  if (/^date_range_(divehi|english)_(?:short_)?\d+$/.test(key)) return true;
  // date_range with short before lang: date_range_short_divehi_N, date_range_short_english_N
  if (/^date_range_short_(divehi|english)_\d+$/.test(key)) return true;
  const legacyMatch = key.match(/^date_range_(\d+)$/);
  if (legacyMatch && parseInt(legacyMatch[1], 10) >= 2) return true;
  return false;
}

// Helper to separate hidden fields (keys ending with _hidden)
function separateHiddenFields(fields) {
  const visibleFields = [];
  const hiddenFields = [];
  for (const field of fields) {
    if (field.key.endsWith("_hidden")) {
      hiddenFields.push(field);
    } else {
      visibleFields.push(field);
    }
  }
  return { visibleFields, hiddenFields };
}
/**
 * Populate hidden date fields (keys ending with _hidden).
 * Format is determined by the field's isRTL flag: Divehi if true, English if false.
 *
 * Source resolution for e.g. "start_date_hidden":
 *   1. Strip "_hidden" → look for formData["start_date"] as raw YYYY-MM-DD → format it
 *   2. Fallback: formData["date_range_start"] → format it
 */
function populateDerivedHiddenDateFields(formData, fields) {
  for (const field of fields) {
    const key = field.key;
    if (!key.endsWith("_hidden")) continue;
    if (formData[key]) continue; // already has a value

    const short = field.key.toLowerCase().includes("_short");
    const format = (raw) => field.isRTL ? formatDivehiDate(raw, short) : formatEnglishDate(raw, short);

    // 1. Strip "_hidden" to find the source field, try exact raw date match
    const sourceKey = key.slice(0, -"_hidden".length);
    const exactRaw = formData[sourceKey];
    if (exactRaw && exactRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
      formData[key] = format(exactRaw);
      continue;
    }

    // 2. Fallback: date_range_start
    const rawStart = formData["date_range_start"];
    if (rawStart && rawStart.match(/^\d{4}-\d{2}-\d{2}$/)) {
      formData[key] = format(rawStart);
    }
  }
  return formData;
}

// Detect if field should use Divehi based on field properties
// function shouldUseDivehi(field) {
//   if (field.isRTL === true) return true;
//   if (field.key && field.key.toLowerCase().startsWith("divehi.")) return true;
//   if (field.label && /ދިވެހި|Divehi|ދިވެހިބަސް/i.test(field.label)) return true;
//   return false;
// }
// Detect if field should use Divehi based ONLY on the "RTL (Divehi) Support" setting
function shouldUseDivehi(field) {
  return field.isRTL === true;
}
// ========== Date Placeholder & Divehi Formatting ==========
// Month names in Thaana (Divehi script)
const DIVEHI_MONTHS = [
  "ޖެނުއަރީ",
  "ފެބްރުއަރީ",
  "މާރޗް",
  "އެޕްރީލް",
  "މެއި",
  "ޖޫން",
  "ޖުލައި",
  "އޯގަސްޓް",
  "ސެޕްޓެމްބަރ",
  "އޮކްޓޯބަރ",
  "ނޮވެމްބަރ",
  "ޑިސެމްބަރ",
];
/**
 * Resolve the start date string (YYYY-MM-DD) for date range / weekday population.
 *
 * Resolution order:
 *   1. formData["date_range_start"]              — dedicated range start field
 *   2. Any date-type field whose key contains "start"
 *   3. Any field (any type) whose key contains "start" and whose value is YYYY-MM-DD
 *      — covers cases where field type was not explicitly set to "date"
 */
function resolveStartDateStr(formData, fields) {
  // 1. Dedicated field
  if (formData["date_range_start"] &&
      formData["date_range_start"].match(/^\d{4}-\d{2}-\d{2}$/)) {
    return formData["date_range_start"];
  }
  // 2 & 3. Any field whose key contains "start", prioritising date-typed fields
  let fallback = null;
  for (const field of (fields || [])) {
    if (!field.key.toLowerCase().includes("start")) continue;
    const val = formData[field.key];
    if (!val || !val.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
    if (field.type === "date") return val;   // best match — return immediately
    if (!fallback) fallback = val;            // keep as fallback if no date-typed found
  }
  return fallback;
}

// Divehi weekday names (Sunday = index 0, matching JS Date.getDay())
const DIVEHI_WEEKDAYS = [
  "އާދިއްތަ",   // Sunday
  "ހޯމަ",       // Monday
  "އަންގާރަ",   // Tuesday
  "ބުދަ",       // Wednesday
  "ބުރާސްފަތި", // Thursday
  "ހުކުރު",     // Friday
  "ހޮނިހިރު",   // Saturday
];

// Divehi short weekday names (Sunday = index 0)
const DIVEHI_WEEKDAYS_SHORT = [
  "އާދި",   // Sunday
  "ހޯމަ",   // Monday
  "އަން",   // Tuesday
  "ބުދަ",   // Wednesday
  "ބުރާ",   // Thursday
  "ހުކު",   // Friday
  "ހޮނި",   // Saturday
];

// English weekday names (Sunday = index 0)
const ENGLISH_WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

// English short weekday names (Sunday = index 0)
const ENGLISH_WEEKDAYS_SHORT = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
];

// Map of start-day tokens to their JS Date.getDay() index
const WEEKDAY_START_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Populate weekday hidden fields from the template's field list.
 *
 * Two naming conventions:
 *
 * A) With explicit start-day token — weekday_(divehi|english)_(short_)?hidden_<start>_<N>
 *    e.g. {weekday_divehi_hidden_sun_1} .. {weekday_divehi_hidden_sun_N}
 *    The sequence cycles through weekdays starting from the named day, ignoring the date.
 *    N=1 → <start>, N=2 → <start>+1, … (mod 7)
 *    e.g. _sun_: 1=Sun 2=Mon 3=Tue 4=Wed 5=Thu 6=Fri 7=Sat 8=Sun …
 *    e.g. _mon_: 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 7=Sun 8=Mon …
 *
 * B) Without start-day token — weekday_(divehi|english)_(short_)?hidden_<N>
 *    e.g. {weekday_divehi_hidden_1}
 *    N=1 → weekday of startDate, N=2 → weekday of startDate+1, …
 */
function populateWeekdayHiddenFields(formData, fields) {
  const startDateStr = resolveStartDateStr(formData, fields);
  if (!startDateStr) return;

  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const startJsDate = new Date(sy, sm - 1, sd);

  const templateKeys = new Set(fields.map((f) => f.key));

  for (const key of templateKeys) {
    let lang, isShort, n, jsDay;

    // Pattern A: explicit start-day token
    // Supports short before or after hidden:
    //   weekday_divehi_short_hidden_sun_4
    //   weekday_divehi_hidden_short_sun_4  (short after hidden)
    //   weekday_divehi_hidden_sun_4        (no short)
    const mA = key.match(/^weekday_(divehi|english)_(?:short_)?hidden_(?:short_)?([a-z]{3})_(\d+)$/);
    // Pattern B: no start-day token
    // Supports short before or after hidden:
    //   weekday_divehi_short_hidden_4
    //   weekday_divehi_hidden_short_4      (short after hidden)
    //   weekday_divehi_hidden_4            (no short)
    const mB = key.match(/^weekday_(divehi|english)_(?:short_)?hidden_(?:short_)?(\d+)$/);

    if (mA) {
      lang      = mA[1];
      isShort   = key.includes("_short_");
      const startCode = mA[2];
      n         = parseInt(mA[3], 10);

      const startDayIndex = WEEKDAY_START_MAP[startCode];
      if (startDayIndex === undefined) continue;

      jsDay = (startDayIndex + (n - 1)) % 7;

    } else if (mB) {
      lang    = mB[1];
      isShort = key.includes("_short_");
      n       = parseInt(mB[2], 10);

      const slotDate = new Date(startJsDate);
      slotDate.setDate(slotDate.getDate() + (n - 1));
      jsDay = slotDate.getDay();

    } else {
      continue;
    }

    if (lang === "divehi") {
      formData[key] = isShort ? DIVEHI_WEEKDAYS_SHORT[jsDay] : DIVEHI_WEEKDAYS[jsDay];
    } else {
      formData[key] = isShort ? ENGLISH_WEEKDAYS_SHORT[jsDay] : ENGLISH_WEEKDAYS[jsDay];
    }
  }
}
/**
 * Convert YYYY-MM-DD date string to English format: "DD Month YYYY"
 * Example: "2026-05-12" -> "12 May 2026"
 */
function formatEnglishDate(dateString, short = false) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-index
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;

  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];
  return short ? `${day} ${monthNames[month]}` : `${day} ${monthNames[month]} ${year}`;
}

/**
 * Parse placeholder key to extract preset rule (current/next) and day
 * Examples: "date_current_10", "date_next_5", "date_divehi_current_10"
 * Returns { rule: 'current'|'next', day: number }
 */
function parseDatePlaceholderKey(key) {
  // Look for pattern: _current_<number> or _next_<number>
  const currentMatch = key.match(/_current_(\d+)/i);
  const nextMatch = key.match(/_next_(\d+)/i);

  if (currentMatch) {
    return { rule: "current", day: parseInt(currentMatch[1], 10) };
  }
  if (nextMatch) {
    return { rule: "next", day: parseInt(nextMatch[1], 10) };
  }
  return null;
}

/**
 * Get preset date based on placeholder rule and current date
 */
function getPresetDateFromPlaceholder(key) {
  const parsed = parseDatePlaceholderKey(key);
  if (!parsed) {
    // No preset rule: use today's date
    return new Date();
  }

  const today = new Date();
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth();

  if (parsed.rule === "next") {
    targetMonth++;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  }

  let targetDay = parsed.day;
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  if (targetDay > daysInMonth) {
    targetDay = daysInMonth;
  }

  return new Date(targetYear, targetMonth, targetDay);
}

/**
 * Convert YYYY-MM-DD date string to Divehi format: "Day Month Year"
 * Example: "2026-05-12" -> "12 މެއި 2026"
 */
function formatDivehiDate(dateString, short = false) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-index
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;
  if (month < 0 || month > 11) return dateString;

  return short ? `${day} ${DIVEHI_MONTHS[month]}` : `${day} ${DIVEHI_MONTHS[month]} ${year}`;
}

// Set input language for a specific field
async function setFieldLanguage(fieldElement, field, useDivehi) {
  if (!fieldElement) return;

  const language = useDivehi ? languageConfig.divehi : languageConfig.english;
  currentFieldLanguage = language.name;

  fieldElement.setAttribute("dir", language.direction);
  fieldElement.style.fontFamily = language.font;

  if (useDivehi) {
    fieldElement.classList.add("divehi-input");
    fieldElement.classList.remove("english-input");
  } else {
    fieldElement.classList.add("english-input");
    fieldElement.classList.remove("divehi-input");
  }

  const placeholder = field.placeholder || `Enter ${field.label || field.key}`;
  // if (useDivehi) {
  //   fieldElement.placeholder =
  //     convertToDivehiTransliteration(placeholder) || placeholder;
  // } else {
  //   fieldElement.placeholder = placeholder;
  // }

  try {
    if (useDivehi) {
      fieldElement.setAttribute("inputmode", "text");
      fieldElement.setAttribute("lang", "dv");
    } else {
      fieldElement.setAttribute("inputmode", "latin");
      fieldElement.setAttribute("lang", "en");
    }
  } catch (e) {
    console.log("Could not set IME mode:", e);
  }

  fieldElement.dataset.divehiMode = useDivehi ? "true" : "false";

  console.log(`Language switched to: ${language.name} for field: ${field.key}`);
}

// Show temporary notification when language changes
function showLanguageNotification(language) {
  const existingNotif = document.querySelector(".language-notification");
  if (existingNotif) existingNotif.remove();

  const notif = document.createElement("div");
  notif.className = `language-notification ${language.toLowerCase()}`;
  notif.innerHTML = `
        <span class="flag">${language === "Divehi" ? "🇲🇻" : "🇬🇧"}</span>
        <span>${language} Mode Active</span>
    `;

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.classList.add("show");
    setTimeout(() => {
      notif.classList.remove("show");
      setTimeout(() => notif.remove(), 300);
    }, 1500);
  }, 10);
}

// Setup Enter key navigation - move focus to next field
function setupEnterKeyNavigation(formElement) {
  const focusableElements = Array.from(
    formElement.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    ),
  );

  focusableElements.forEach((element, index) => {
    element.removeEventListener("keydown", handleEnterKey);
    element.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Don't submit on Enter in textarea or if button is pressed
        if (element.tagName === "TEXTAREA") {
          return;
        }
        if (element.tagName === "BUTTON") {
          e.preventDefault();
          element.click();
          return;
        }

        e.preventDefault();

        // Find next focusable element
        let nextIndex = index + 1;
        while (nextIndex < focusableElements.length) {
          const nextElement = focusableElements[nextIndex];
          if (
            nextElement &&
            !nextElement.disabled &&
            nextElement.offsetParent !== null
          ) {
            nextElement.focus();
            // Select text in input fields for easy replacement
            if (
              nextElement.tagName === "INPUT" ||
              nextElement.tagName === "TEXTAREA"
            ) {
              nextElement.select();
            }
            break;
          }
          nextIndex++;
        }
      }
    });
    function handleEnterKey(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        if (element.tagName === "TEXTAREA") return;
        if (element.tagName === "BUTTON") {
          e.preventDefault();
          element.click();
          return;
        }
        e.preventDefault();
        let nextIndex = index + 1;
        while (nextIndex < focusableElements.length) {
          const nextElement = focusableElements[nextIndex];
          if (
            nextElement &&
            !nextElement.disabled &&
            nextElement.offsetParent !== null
          ) {
            nextElement.focus();
            if (
              nextElement.tagName === "INPUT" ||
              nextElement.tagName === "TEXTAREA"
            ) {
              nextElement.select();
            }
            break;
          }
          nextIndex++;
        }
      }
    }
  });
}

// Setup automatic transliteration for Divehi mode
// Setup automatic transliteration for Divehi mode
function setupAutomaticTransliteration(fieldElement, fieldKey) {
  let lastValue = "";

  fieldElement.addEventListener("input", function (e) {
    const isDivehiMode = fieldElement.dataset.divehiMode === "true";

    if (isDivehiMode) {
      const currentValue = fieldElement.value;
      const cursorPosition = fieldElement.selectionStart;

      if (currentValue.length > lastValue.length && cursorPosition > 0) {
        const typedChar = currentValue[cursorPosition - 1];
        const latinRegex = /[a-zA-Z]/;

        if (latinRegex.test(typedChar)) {
          // REMOVED .toLowerCase() so it preserves case-sensitivity for mapping
          const divehiChar = latinToDivehiMap[typedChar] || typedChar;

          if (divehiChar !== typedChar) {
            const newValue =
              currentValue.slice(0, cursorPosition - 1) +
              divehiChar +
              currentValue.slice(cursorPosition);
            fieldElement.value = newValue;
            fieldElement.setSelectionRange(cursorPosition, cursorPosition);
          }
        }
      }

      lastValue = fieldElement.value;
    }
  });

  fieldElement.addEventListener("paste", function (e) {
    const isDivehiMode = fieldElement.dataset.divehiMode === "true";

    if (isDivehiMode) {
      e.preventDefault();
      let pastedText = (e.clipboardData || window.clipboardData).getData(
        "text",
      );
      const convertedText = convertToDivehiTransliteration(pastedText);
      document.execCommand("insertText", false, convertedText);
    }
  });
}
// Latin to Divehi mapping
const latinToDivehiMap = {
  // Lowercase letters
  a: "ަ", // short a
  b: "ބ",
  c: "ޗ",
  d: "ދ",
  e: "ެ", // short e
  f: "ފ",
  g: "ގ",
  h: "ހ",
  i: "ި", // short i
  j: "ޖ",
  k: "ކ",
  l: "ލ",
  m: "މ",
  n: "ނ",
  o: "ޮ", // short o
  p: "ޕ",
  q: "ް",
  r: "ރ",
  s: "ސ",
  t: "ތ",
  u: "ު", // short u
  v: "ވ",
  w: "އ", // alifu is more appropriate than duplicating v
  x: "ށ", // commonly mapped to Shaviyani
  y: "ޔ",
  z: "ޒ",

  // Uppercase letters
  A: "ާ", // long aa
  B: "ޞ", // Arabic Saad / heavy s
  C: "ޝ", // Sha
  D: "ޑ", // hard d
  E: "ޭ", // long ey
  F: "ﷲ", // often used for Allah ligature
  G: "ޣ", // Ghain
  H: "ޙ", // Arabic Haa
  I: "ީ", // long ee
  J: "ޛ", // Zaal
  K: "ޚ", // Khaa
  L: "ޅ", // Lhaviyani
  M: "ޟ", // Arabic Dhaad
  N: "ޏ", // Gnaviyani
  O: "ޯ", // long oo
  P: "÷", // punctuation/symbol
  Q: "ޤ", // sukun
  R: "ޜ", // Zhaa
  S: "ށ", // Shaviyani
  T: "ޓ", // hard t
  U: "ޫ", // long uu
  V: "ޥ", // Waavu
  W: "ޢ", // Ain
  X: "×", // multiplication sign
  Y: "ޔ",
  Z: "ޡ", // Zoa
};
// Helper function to get proper Divehi placeholder text
function getDivehiPlaceholder(field) {
  const label = field.label || field.key;
  const divehiPlaceholders = {
    string: `ލިޔޭ`,
    number: `ޢަދަދު ލިޔޭ`,
    email: `އީމެއިލް ލިޔޭ`,
    date: `ތާރީޚް އިޚްތިޔާރު ކުރޭ`,
    textarea: `ލިޔޭ`,
    boolean: `އިޚްތިޔާރު ކުރޭ`,
    dropdown: `ތިރީގައިވާ އޮޕްޝަންތަކުން އިޚްތިޔާރު ކުރޭ`,
  };
  return divehiPlaceholders[field.type] || `ލިޔޭ`;
}
function convertToDivehiTransliteration(text) {
  if (!text) return "";
  let result = "";
  for (let char of text) {
    result += latinToDivehiMap[char] || char;
  }
  return result;
}

// Get field input with proper styling (used in two-column layout)
// function getFieldInputWithAutoSwitch(field) {
//   const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
//   const placeholder = `Enter ${field.label || field.key}`;
//   const isDivehiField = shouldUseDivehi(field);

//   if (field.type === "date") {
//     // Compute preset value from placeholder key
//     const presetDate = getPresetDateFromPlaceholder(field.key);
//     // Format as YYYY-MM-DD using LOCAL date components (avoids timezone shift)
//     const year = presetDate.getFullYear();
//     const month = String(presetDate.getMonth() + 1).padStart(2, "0");
//     const day = String(presetDate.getDate()).padStart(2, "0");
//     const presetValue = `${year}-${month}-${day}`;

//     return `
//         <input type="date"
//                id="${fieldId}"
//                name="${field.key}"
//                value="${presetValue}"
//                ${field.required ? "required" : ""}
//                class="form-input ${isDivehiField ? "divehi-input" : "english-input"}"
//                dir="ltr">
//     `;
//   }

//   // Make sure NO disabled attribute is added
//   if (field.type === "textarea") {
//     return `
//             <textarea id="${fieldId}"
//                       name="${field.key}"
//                       ${field.required ? "required" : ""}
//                       placeholder="${placeholder}"
//                       rows="3"
//                       class="form-input ${isDivehiField ? "divehi-input" : "english-input"}"
//                       dir="${isDivehiField ? "rtl" : "ltr"}"></textarea>
//         `;
//   }

//   if (field.type === "boolean") {
//     return `
//             <select id="${fieldId}"
//                     name="${field.key}"
//                     ${field.required ? "required" : ""}
//                     class="form-input ${isDivehiField ? "divehi-input" : "english-input"}"
//                     dir="${isDivehiField ? "rtl" : "ltr"}">
//                 <option value="">-- Select --</option>
//                 <option value="true">Yes</option>
//                 <option value="false">No</option>
//             </select>
//         `;
//   }

//   return `
//         <input type="${field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}"
//                id="${fieldId}"
//                name="${field.key}"
//                ${field.required ? "required" : ""}
//                placeholder="${placeholder}"
//                class="form-input ${isDivehiField ? "divehi-input" : "english-input"}"
//                dir="${isDivehiField ? "rtl" : "ltr"}">
//     `;
// }
// form.js – getFieldInputWithAutoSwitch (add dropdown case)

function getFieldInputWithAutoSwitch(field) {
  const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
  //const placeholder = `Enter ${field.label || field.key}`;
  // Inside getFieldInputWithAutoSwitch, for each input generation:
  const englishPlaceholder = `Enter ${field.label || field.key}`;
  const divehiPlaceholder = getDivehiPlaceholder(field);
  const isDivehiField = shouldUseDivehi(field);
  const placeholder = isDivehiField ? divehiPlaceholder : englishPlaceholder;

  // IMAGE TYPE
  if (field.type === "image") {
    const defaultWidth = field.widthPx || 150;
    return `
      <div class="image-field-wrapper" id="${fieldId}-wrapper">
        <input type="file"
               id="${fieldId}"
               name="${field.key}"
               accept="image/png,image/jpeg,image/jpg"
               class="form-input image-file-input"
               onchange="handleImageFieldChange('${field.key}', this)">
        <div class="image-preview-container" id="${fieldId}-preview" style="display:none;">
          <img id="${fieldId}-img" src="" alt="Preview" class="image-field-preview">
          <button type="button" class="btn btn-danger btn-small image-clear-btn" onclick="clearImageField('${field.key}')">✕ Clear</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
          <label style="font-size:0.78rem;color:var(--text-muted,#888);white-space:nowrap;margin:0;">Width (px):</label>
          <input type="number" id="${fieldId}-width" value="${defaultWidth}" min="10" max="2000"
                 style="width:80px;padding:3px 6px;font-size:0.82rem;"
                 class="form-input" oninput="handleImageWidthChange('${field.key}', this.value)">
        </div>
        <p style="margin:4px 0 0;font-size:0.78rem;color:var(--text-muted,#888);">
          PNG or JPG · use <code>{%${field.key}}</code> in your Word template
        </p>
      </div>
    `;
  }

  // DATE TYPE
  if (field.type === "date") {
    const presetDate = getPresetDateFromPlaceholder(field.key);
    const year = presetDate.getFullYear();
    const month = String(presetDate.getMonth() + 1).padStart(2, "0");
    const day = String(presetDate.getDate()).padStart(2, "0");
    const presetValue = `${year}-${month}-${day}`;
    return `<input type="date" id="${fieldId}" name="${field.key}" value="${presetValue}" ${field.required ? "required" : ""} class="form-input ${isDivehiField ? "divehi-input" : "english-input"}" dir="ltr">`;
  }

  // DROPDOWN TYPE
  if (field.type === "dropdown") {
    const choices = field.choices || [];
    const options = choices
      .map(
        (choice) =>
          `<option value="${escapeHtml(choice)}">${escapeHtml(choice)}</option>`,
      )
      .join("");
    return `
      <select id="${fieldId}" name="${field.key}" ${field.required ? "required" : ""} class="form-input ${isDivehiField ? "divehi-input" : "english-input"}" dir="${isDivehiField ? "rtl" : "ltr"}">
        <option value="">-- Select an option --</option>
        ${options}
      </select>
    `;
  }

  // TEXTAREA TYPE
  if (field.type === "textarea") {
    return `<textarea id="${fieldId}" name="${field.key}" ${field.required ? "required" : ""} placeholder="${placeholder}" rows="3" class="form-input ${isDivehiField ? "divehi-input" : "english-input"}" dir="${isDivehiField ? "rtl" : "ltr"}"></textarea>`;
  }

  // BOOLEAN TYPE (Yes/No)
  if (field.type === "boolean") {
    return `
      <select id="${fieldId}" name="${field.key}" ${field.required ? "required" : ""} class="form-input ${isDivehiField ? "divehi-input" : "english-input"}" dir="${isDivehiField ? "rtl" : "ltr"}">
        <option value="">-- Select --</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    `;
  }

  // DEFAULT: text / number / email etc.
  return `<input type="${field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}" 
                id="${fieldId}" name="${field.key}" ${field.required ? "required" : ""} 
                placeholder="${placeholder}" class="form-input ${isDivehiField ? "divehi-input" : "english-input"}" 
                dir="${isDivehiField ? "rtl" : "ltr"}">`;
}

// ========== Image Field Helpers ==========

function handleImageFieldChange(fieldKey, inputEl) {
  const fieldId = `field-${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const wrapper = document.getElementById(`${fieldId}-wrapper`);
  const previewContainer = document.getElementById(`${fieldId}-preview`);
  const previewImg = document.getElementById(`${fieldId}-img`);

  const file = inputEl.files && inputEl.files[0];
  if (!file) {
    if (wrapper) { wrapper.dataset.imageBase64 = ""; wrapper.dataset.imageExt = ""; }
    if (previewContainer) previewContainer.style.display = "none";
    return;
  }

  const ext = file.name.split(".").pop().toLowerCase() || "png";
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64 = (e.target.result || "").split(",")[1] || "";
    if (wrapper) { wrapper.dataset.imageBase64 = base64; wrapper.dataset.imageExt = ext; }
    if (previewImg) previewImg.src = e.target.result;
    if (previewContainer) previewContainer.style.display = "flex";
  };
  reader.readAsDataURL(file);
}

function handleImageWidthChange(fieldKey, value) {
  const fieldId = `field-${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const wrapper = document.getElementById(`${fieldId}-wrapper`);
  if (wrapper) wrapper.dataset.imageWidth = value || "150";
}

function clearImageField(fieldKey) {
  const fieldId = `field-${fieldKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const input = document.getElementById(fieldId);
  const wrapper = document.getElementById(`${fieldId}-wrapper`);
  const previewContainer = document.getElementById(`${fieldId}-preview`);
  const previewImg = document.getElementById(`${fieldId}-img`);
  if (input) input.value = "";
  if (wrapper) { wrapper.dataset.imageBase64 = ""; wrapper.dataset.imageExt = ""; }
  if (previewImg) previewImg.src = "";
  if (previewContainer) previewContainer.style.display = "none";
}

// Enhanced renderFillForm with two-column layout
// async function renderFillForm() {
//   console.log("renderFillForm called");

//   if (!window.selectedTemplate) {
//     console.log("No template selected");
//     if (window.switchView) window.switchView("templates");
//     return;
//   }

//   if (
//     !window.selectedTemplate.fields ||
//     window.selectedTemplate.fields.length === 0
//   ) {
//     alert("No fields found for this template.");
//     if (window.switchView) window.switchView("templates");
//     return;
//   }

//   const container = document.getElementById("form-container");
//   if (!container) return;

//   const hasDivehiFields = window.selectedTemplate.fields.some((f) =>
//     shouldUseDivehi(f),
//   );
//   const fields = window.selectedTemplate.fields;

//   // Split fields into two columns for better layout
//   const midPoint = Math.ceil(fields.length / 2);
//   const leftColumnFields = fields.slice(0, midPoint);
//   const rightColumnFields = fields.slice(midPoint);

//   container.innerHTML = `
//         <div class="template-info-card">
//             <div class="template-info-content">
//                 <h3>📄 ${escapeHtml(window.selectedTemplate.name)}</h3>
//                 ${window.selectedTemplate.description ? `<p>${escapeHtml(window.selectedTemplate.description)}</p>` : ""}
//                 <!--
//                 <div class="template-meta">

//                     <span class="meta-badge">${window.selectedTemplate.type === "word" ? "📝 Word Document" : "📊 Excel Spreadsheet"}</span>
//                     <span class="meta-badge">${fields.length} field${fields.length !== 1 ? "s" : ""}</span>
//                     ${hasDivehiFields ? '<span class="meta-badge divehi-badge">🇲🇻 Divehi Support</span>' : ""}
//                 </div>
//                 -->
//             </div>
//             <div class="auto-switch-control">

//                 <div class="template-meta">
//                     <span class="meta-badge">${window.selectedTemplate.type === "word" ? "📝 Word Document" : "📊 Excel Spreadsheet"}</span>
//                     <span class="meta-badge">${fields.length} field${fields.length !== 1 ? "s" : ""}</span>
//                     ${hasDivehiFields ? '<span class="meta-badge divehi-badge">🇲🇻 Divehi Support</span>' : ""}
//                 </div>
//                 <span class="keyboard-hint">Press Enter to move to next field</span>
//             </div>
//         </div>

//         <form id="data-form" class="two-column-form">
//             <div class="form-column">
//                 ${leftColumnFields
//                   .map(
//                     (field) => `
//                     <div class="form-group ${shouldUseDivehi(field) ? "rtl-group" : ""}" data-field-key="${field.key}">
//                         <label ${shouldUseDivehi(field) ? 'dir="rtl"' : ""}>
//                             ${escapeHtml(field.label || field.key)}
//                             ${field.required ? '<span class="required-star">*</span>' : ""}
//                             ${field.type !== "string" ? `<span class="field-type-indicator">${getFieldTypeIcon(field.type)}</span>` : ""}
//                         </label>
//                         ${getFieldInputWithAutoSwitch(field)}
//                         <div class="field-hint">${getFieldHint(field)}</div>
//                     </div>
//                 `,
//                   )
//                   .join("")}
//             </div>
//             <div class="form-column">
//                 ${rightColumnFields
//                   .map(
//                     (field) => `
//                     <div class="form-group ${shouldUseDivehi(field) ? "rtl-group" : ""}" data-field-key="${field.key}">
//                         <label ${shouldUseDivehi(field) ? 'dir="rtl"' : ""}>
//                             ${escapeHtml(field.label || field.key)}
//                             ${field.required ? '<span class="required-star">*</span>' : ""}
//                             ${field.type !== "string" ? `<span class="field-type-indicator">${getFieldTypeIcon(field.type)}</span>` : ""}
//                         </label>
//                         ${getFieldInputWithAutoSwitch(field)}
//                         <div class="field-hint">${getFieldHint(field)}</div>
//                     </div>
//                 `,
//                   )
//                   .join("")}
//             </div>
//         </form>

//         <div class="form-actions-container">
//             <div class="form-actions">
//                 <button type="button" id="generate-btn" class="btn btn-primary btn-large">
//                     <span class="btn-icon">📄</span> Generate Document
//                 </button>
//                 <button type="button" class="btn btn-secondary btn-large" onclick="saveDataRecord()">
//                     <span class="btn-icon">💾</span> Save Record
//                 </button>
//                 <button type="button" class="btn btn-outline btn-large" onclick="clearForm()">
//                     <span class="btn-icon">🔄</span> Clear Form
//                 </button>
//                 <button type="button" class="btn btn-outline btn-large" onclick="switchView('templates')">
//                     <span class="btn-icon">←</span> Cancel
//                 </button>
//             </div>
//         </div>

//         <div class="data-records-section" id="data-records">
//             <div class="section-header">
//                 <h3>📋 Saved Records</h3>
//                 <button class="btn-icon-only" onclick="loadDataRecords()" title="Refresh">🔄</button>
//             </div>
//             <div class="records-list" id="records-list">
//                 <p class="loading-text">Loading saved records...</p>
//             </div>
//         </div>
//     `;

//   // Set up automatic language switching for each field
//   for (const field of window.selectedTemplate.fields) {
//     const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
//     const fieldElement = document.getElementById(fieldId);
//     if (fieldElement) {
//       const useDivehi = shouldUseDivehi(field);

//       await setFieldLanguage(fieldElement, field, useDivehi);

//       fieldElement.addEventListener("focus", async () => {
//         currentActiveField = field.key;
//         if (autoLanguageSwitch) {
//           const shouldBeDivehi = shouldUseDivehi(field);
//           const currentIsDivehi = fieldElement.dataset.divehiMode === "true";

//           if (shouldBeDivehi !== currentIsDivehi) {
//             await setFieldLanguage(fieldElement, field, shouldBeDivehi);
//             showLanguageNotification(shouldBeDivehi ? "Divehi" : "English");
//           }
//         }
//       });

//       if (useDivehi) {
//         setupAutomaticTransliteration(fieldElement, field.key);
//       }
//     }
//   }

//   // Setup Enter key navigation
//   const formElement = document.getElementById("data-form");
//   if (formElement) {
//     setupEnterKeyNavigation(formElement);
//   }

//   // Add generate button listener
//   const generateBtn = document.getElementById("generate-btn");
//   if (generateBtn) {
//     generateBtn.removeEventListener("click", handleGenerateClick);
//     generateBtn.addEventListener("click", handleGenerateClick);
//   }

//   await loadDataRecords();
//   // Inside renderFillForm, after setting up event listeners, add:
//   ensureFieldsEditable();
// }
async function renderFillForm() {
  console.log("renderFillForm called");

  if (!window.selectedTemplate) {
    console.log("No template selected");
    if (window.switchView) window.switchView("templates");
    return;
  }

  if (
    !window.selectedTemplate.fields ||
    window.selectedTemplate.fields.length === 0
  ) {
    alert("No fields found for this template.");
    if (window.switchView) window.switchView("templates");
    return;
  }

  const container = document.getElementById("form-container");
  if (!container) return;

  const hasDivehiFields = window.selectedTemplate.fields.some((f) =>
    shouldUseDivehi(f),
  );
  const fields = window.selectedTemplate.fields;

  // Build the unified grid
  // const fieldsHtml = fields
  //   .map((field) => {
  //     const isDivehiField = shouldUseDivehi(field);
  //     const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
  //     // In renderFillForm, inside the .map(field => ...) section:
  //     const isTextarea = field.type === "textarea";
  //     const fullWidthClass = isTextarea ? "full-width-field" : "";
  //     return `
  //     <div class="field-container ${fullWidthClass}" data-field-key="${field.key}">

  //         <!-- <label ${isDivehiField ? 'dir="rtl"' : ""}> -->
  //         <label>
  //           ${escapeHtml(field.label || field.key)}
  //           ${field.required ? '<span class="required-star">*</span>' : ""}
  //           ${field.type !== "string" ? `<span class="field-type-indicator">${getFieldTypeIcon(field.type)}</span>` : ""}
  //         </label>
  //         ${getFieldInputWithAutoSwitch(field)}
  //         <div class="field-hint">${getFieldHint(field)}</div>
  //       </div>
  //     `;
  //   })
  //   .join("");
  // Filter out hidden and auto-computed fields (never shown in the form)
  const visibleFields = window.selectedTemplate.fields.filter(
    (f) => !isAutoComputedField(f.key, window.selectedTemplate.fields),
  );

  // Build fieldsHtml using visibleFields instead of all fields
  const fieldsHtml = visibleFields
    .map((field) => {
      const isDivehiField = shouldUseDivehi(field);
      const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const isTextarea = field.type === "textarea";
      const isImage = field.type === "image";
      const fullWidthClass = (isTextarea || isImage) ? "full-width-field" : "";
      return `
        <div class="field-container ${fullWidthClass}" data-field-key="${field.key}">
          <label>
            ${escapeHtml(field.label || field.key)}
            ${field.required ? '<span class="required-star">*</span>' : ""}
            ${field.type !== "string" ? `<span class="field-type-indicator">${getFieldTypeIcon(field.type)}</span>` : ""}
          </label>
          ${getFieldInputWithAutoSwitch(field)}
          <div class="field-hint">${getFieldHint(field)}</div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="template-info-card">
      <div class="template-info-content">
        <h3>📄 ${escapeHtml(window.selectedTemplate.name)}</h3>
        ${
          window.selectedTemplate.description
            ? `<p>${escapeHtml(window.selectedTemplate.description)}</p>`
            : ""
        }
      </div>
      <div class="auto-switch-control">
        <div class="template-meta">
          <span class="meta-badge">${
            window.selectedTemplate.type === "word"
              ? "📝 Word Document"
              : "📊 Excel Spreadsheet"
          }</span>
          <span class="meta-badge">${fields.length} field${
            fields.length !== 1 ? "s" : ""
          }</span>
          ${
            hasDivehiFields
              ? '<span class="meta-badge divehi-badge">🇲🇻 Divehi Support</span>'
              : ""
          }
        </div>
        <!-- <span class="keyboard-hint">Press Enter to move to next field</span> -->
      </div>
    </div>

    <form id="data-form" class="unified-form-grid">
      ${fieldsHtml}
    </form>

    <div class="form-actions-container">
      <div class="form-actions">
        <button type="button" id="generate-btn" class="btn btn-primary btn-large" onclick="generateDocument()">
          <span class="btn-icon">📄</span> Generate & Print
        </button>
        <button type="button" id="generate-only-btn" class="btn btn-outline btn-large" onclick="generateDocumentOnly()">
          <span class="btn-icon">💾</span> Generate Only (Save)
        </button>
        <button type="button" class="btn btn-secondary btn-large" onclick="saveDataRecord()">
          <span class="btn-icon">💾</span> Save Record
        </button>
        <button type="button" class="btn btn-outline btn-large" onclick="clearForm()">
          <span class="btn-icon">🔄</span> Clear Form
        </button>
        <button type="button" class="btn btn-outline btn-large" onclick="switchView('templates')">
          <span class="btn-icon">←</span> Cancel
        </button>
      </div>
    </div>

    <div class="data-records-section" id="data-records">
      <div class="section-header">
        <h3>📋 Saved Records</h3>
        <button class="btn-icon-only" onclick="loadDataRecords()" title="Refresh">🔄</button>
      </div>
      <div class="records-list" id="records-list">
        <p class="loading-text">Loading saved records...</p>
      </div>
    </div>
  `;
  // if (window.selectedTemplate.dateRangeConfig) {
  //   const hintDiv = document.createElement("div");
  //   hintDiv.className = "date-range-hint";
  //   hintDiv.innerHTML =
  //     "📅 This template will generate dates for up to " +
  //     window.selectedTemplate.dateRangeConfig.count +
  //     " days based on the Start Date above.";
  //   container.insertBefore(hintDiv, document.getElementById("data-form"));
  // }

  // Setup language switching for each field
  for (const field of window.selectedTemplate.fields) {
    if (field.type === "image") continue; // image fields need no language setup
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const fieldElement = document.getElementById(fieldId);
    if (fieldElement) {
      const useDivehi = shouldUseDivehi(field);
      await setFieldLanguage(fieldElement, field, useDivehi);

      fieldElement.addEventListener("focus", async () => {
        currentActiveField = field.key;
        if (autoLanguageSwitch) {
          const shouldBeDivehi = shouldUseDivehi(field);
          const currentIsDivehi = fieldElement.dataset.divehiMode === "true";
          if (shouldBeDivehi !== currentIsDivehi) {
            await setFieldLanguage(fieldElement, field, shouldBeDivehi);
            showLanguageNotification(shouldBeDivehi ? "Divehi" : "English");
          }
        }
      });

      if (useDivehi) {
        setupAutomaticTransliteration(fieldElement, field.key);
      }
    }
  }

  // Setup Enter key navigation
  const formElement = document.getElementById("data-form");
  if (formElement) {
    setupEnterKeyNavigation(formElement);
  }

  // Add generate button listener
  // (buttons use onclick attributes directly — no addEventListener needed)

  await loadDataRecords();
  ensureFieldsEditable();
}
// Helper function to get field type icon
function getFieldTypeIcon(type) {
  const icons = {
    number: "🔢",
    date: "📅",
    email: "📧",
    textarea: "📝",
    boolean: "☑️",
    image: "🖼️",
  };
  return icons[type] || "";
}

// Helper function to get field hint text
function getFieldHint(field) {
  // If the field is marked as RTL (Divehi), return Divehi hints
  // if (field.isRTL) {
  //   const divehiHints = {
  //     number: "ޢަދަދެއް ލިޔޭށެވެ",
  //     email: "example@domain.com ފަދަ އީމެއިލް އެއް ލިޔޭ",
  //     date: "ތާރީޚެއް އިޚްތިޔާރު ކުރޭ",
  //     textarea: "އާ ލައިއަކަށް Enter ބިންދޭ",
  //     boolean: "އިޚްތިޔާރު ކުރޭ",
  //     dropdown: "ތިރީގައިވާ އޮޕްޝަންތަކުން އެއްޗެއް އިޚްތިޔާރު ކުރޭ",
  //   };
  //   return divehiHints[field.type] || "Press Enter to go to next field";
  // }
  const hints = {
    number: "Enter a numeric value",
    email: "e.g., name@example.com",
    date: "Select a date from the picker",
    textarea: "Press Enter to add line breaks",
    boolean: "Select Yes or No from dropdown",
  };
  return hints[field.type] || "Press Enter to go to next field";
}

// Handle generate click
async function handleGenerateClick(e) {
  e.preventDefault();
  await generateDocument();
}
async function handleGenerateOnlyClick(e) {
  e.preventDefault();
  await generateDocumentOnly();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function validateForm() {
  console.log("Validating form...");

  if (!window.selectedTemplate) {
    console.error("No template selected");
    return false;
  }

  const firstInvalidField = null;

  // Only validate visible fields (non-hidden, non-auto-computed)
  const visibleFields = window.selectedTemplate.fields.filter(
    (f) => !isAutoComputedField(f.key, window.selectedTemplate.fields),
  );

  for (const field of visibleFields) {
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const input = document.getElementById(fieldId);
    if (!input) continue;

    // Image fields: validate via wrapper dataset, not input.value
    if (field.type === "image") {
      if (field.required) {
        const wrapper = document.getElementById(`${fieldId}-wrapper`);
        if (!wrapper || !wrapper.dataset.imageBase64) {
          alert(`❌ ${field.label || field.key} is required — please select an image`);
          input.focus();
          return false;
        }
      }
      continue;
    }

    let value = input.value;
    if (input.type === "checkbox") {
      value = input.checked;
    } else if (input.type === "select-one") {
      value = input.value;
    } else {
      value = input.value?.trim() || "";
    }

    // Required validation
    if (field.required && (!value || value === "")) {
      alert(`❌ ${field.label || field.key} is required`);
      input.focus();
      input.style.borderColor = "#e74c3c";
      setTimeout(() => {
        input.style.borderColor = "";
      }, 2000);
      return false;
    }

    // Clear any error styling
    input.style.borderColor = "";

    if (value && value !== "") {
      switch (field.type) {
        case "number":
          if (isNaN(value)) {
            alert(`${field.label || field.key} must be a number`);
            input.focus();
            return false;
          }
          break;
        case "email":
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            alert(`${field.label || field.key} must be a valid email address`);
            input.focus();
            return false;
          }
          break;
        case "date":
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            alert(
              `${field.label || field.key} must be a valid date (YYYY-MM-DD)`,
            );
            input.focus();
            return false;
          }
          break;
      }
    }
  }

  console.log("Form validation passed");
  return true;
}

function collectFormData() {
  console.log("Collecting form data...");

  if (!window.selectedTemplate) {
    console.error("No template selected");
    return {};
  }

  const data = {};

  // for (const field of window.selectedTemplate.fields) {
  //   const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
  //   const input = document.getElementById(fieldId);
  //   if (input) {
  //     let value = input.value;

  //     if (input.type === "checkbox") {
  //       value = input.checked;
  //     } else if (input.type === "number") {
  //       value = input.value ? parseFloat(input.value) : "";
  //     } else if (input.type === "select-one" && field.type === "boolean") {
  //       value = value === "true";
  //     } else {
  //       value = input.value?.trim() || "";
  //     }

  //     data[field.key] = value;
  //     console.log(`Collected ${field.key}:`, value);
  //   }
  // }
  // Collect visible fields only (exclude hidden and auto-computed)
  const visibleFields = window.selectedTemplate.fields.filter(
    (f) => !isAutoComputedField(f.key, window.selectedTemplate.fields),
  );
  for (const field of visibleFields) {
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const input = document.getElementById(fieldId);
    if (input) {
      if (field.type === "image") {
        const wrapper = document.getElementById(`${fieldId}-wrapper`);
        const base64 = wrapper ? (wrapper.dataset.imageBase64 || "") : "";
        const ext = wrapper ? (wrapper.dataset.imageExt || "png") : "png";
        const widthPx = wrapper ? parseInt(wrapper.dataset.imageWidth || "150", 10) : 150;
        data[field.key] = base64 ? { base64, ext, widthPx } : null;
      } else {
        let value = input.value;
        if (input.type === "checkbox") {
          value = input.checked;
        } else if (input.type === "number") {
          value = input.value ? parseFloat(input.value) : "";
        } else if (input.type === "select-one" && field.type === "boolean") {
          value = value === "true";
        } else {
          value = input.value?.trim() || "";
        }
        data[field.key] = value;
      }
    }
  }

  // Populate hidden field start_date_hidden from date_range_start
  const hasStartDateHidden = window.selectedTemplate.fields.some(
    (f) => f.key === "start_date_hidden",
  );
  if (hasStartDateHidden && data["date_range_start"]) {
    data["start_date_hidden"] = data["date_range_start"];
  }

  return data;
}

async function generateDocument() {
  console.log("generateDocument function called");

  if (!validateForm()) {
    console.log("Form validation failed");
    return;
  }

  if (!window.selectedTemplate) {
    console.error("No template selected");
    alert("No template selected");
    return;
  }

  let formData = collectFormData();

  if (window.selectedTemplate && window.selectedTemplate.fields) {
    // 1. Populate date_range_* first (hidden fields may source from these)
    const hasDateRange = window.selectedTemplate.fields.some((f) =>
      /^date_range_(?:short_)?(?:divehi_|english_)?(?:short_)?\d+$/.test(f.key)
    );
    if (hasDateRange) {
      const startDateStr = resolveStartDateStr(formData, window.selectedTemplate.fields);
      if (startDateStr) {
        populateDateRangePlaceholders(formData, startDateStr, 0);
      } else {
        showToast("Please select a valid Start Date for the date range.", "warning");
        return;
      }
    }

    // 2. Now populate derived hidden date fields (can reference date_range_divehi_1 etc.)
    formData = populateDerivedHiddenDateFields(formData, window.selectedTemplate.fields);

    // 3. Populate weekday hidden fields
    populateWeekdayHiddenFields(formData, window.selectedTemplate.fields);
  }
  // Format date values at render time: Divehi if isRTL, English otherwise.
  // Applies to any field whose value is still a raw YYYY-MM-DD string.
  // Skips date_range_start (range seed) and _hidden fields (handled separately).
  if (window.selectedTemplate.fields) {
    for (const field of window.selectedTemplate.fields) {
      if (field.key === "date_range_start") continue;
      if (isAutoComputedField(field.key, window.selectedTemplate.fields)) continue;
      const rawDate = formData[field.key];
      if (field.type === "image") continue;
      if (!rawDate || typeof rawDate !== "string" || !rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      const short = field.key.toLowerCase().includes("_short");
      formData[field.key] = field.isRTL
        ? formatDivehiDate(rawDate, short)
        : formatEnglishDate(rawDate, short);
    }
  }

  if (!window.electronAPI) {
    console.error("electronAPI not available");
    alert("Application API not available. Please restart the app.");
    return;
  }

  const outputFormat =
    window.selectedTemplate.type === "excel" ? "xlsx" : "docx";

  const generateBtn = document.getElementById("generate-btn");
  const originalBtnHTML = generateBtn
    ? generateBtn.innerHTML
    : "Generate Document";
  if (generateBtn) {
    generateBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
    generateBtn.disabled = true;
  }

  try {
    const result = await window.electronAPI.generateDocument({
      templateId: window.selectedTemplate.id,
      formData: formData,
      outputFormat: outputFormat,
      printed: true,
    });

    // const shouldPrint = confirm(
    //   "✅ Document generated successfully!\n\nDo you want to send it to the printer?",
    // );
    const shouldPrint = true; // Always attempt to print, handle errors gracefully
    if (shouldPrint) {
      if (generateBtn) {
        generateBtn.innerHTML = '<span class="btn-icon">🖨️</span> Printing...';
      }

      try {
        if (typeof window.electronAPI.openAndPrint !== "function") {
          throw new Error("Print function not available");
        }

        await window.electronAPI.openAndPrint(result.outputPath);
        // alert("✅ Document has been sent to the printer successfully!");
        showToast(
          "✅ Document has been sent to the printer successfully!",
          "success",
        );
      } catch (printError) {
        console.error("Print error:", printError);
        // alert(
        //   `⚠️ Document generated but failed to print.\n\nFile saved at: ${result.outputPath}\n\nYou can manually open and print the file.`,
        // );
        showToast(
          `⚠️ Document generated but failed to print.\n\nFile saved at: ${result.outputPath}\n\nYou can manually open and print the file.`,
          "warning",
        );
      }
    } else {
      // alert(
      //   `✅ Document saved successfully!\n\nFile location: ${result.outputPath}`,
      // );
      showToast(
        `✅ Document saved successfully!\n\nFile location: ${result.outputPath}`,
        "success",
      );
    }

    // const another = confirm("Do you want to fill another form?");
    // if (!another) {
    //   if (typeof switchView === "function") {
    //     switchView("templates");
    //   }
    // } else {
    //   clearForm();
    // }
    clearForm();
  } catch (error) {
    console.error("Error generating document:", error);

    let errorMessage = "❌ Error generating document: " + error.message;

    if (error.message.includes("template not found")) {
      errorMessage =
        "❌ Template file not found. Please re-upload the template.";
    } else if (error.message.includes("permission")) {
      errorMessage =
        "❌ Permission denied when saving document. Please check your folder permissions.";
    }

    alert(errorMessage);
  } finally {
    if (generateBtn) {
      generateBtn.innerHTML = originalBtnHTML;
      generateBtn.disabled = false;
    }
  }
}
async function generateDocumentOnly() {
  console.log("generateDocumentOnly called");

  if (!validateForm()) {
    console.log("Form validation failed");
    return;
  }

  if (!window.selectedTemplate) {
    console.error("No template selected");
    alert("No template selected");
    return;
  }

  let formData = collectFormData();

  if (window.selectedTemplate && window.selectedTemplate.fields) {
    // 1. Populate date_range_* first (hidden fields may source from these)
    const hasDateRange = window.selectedTemplate.fields.some((f) =>
      /^date_range_(?:short_)?(?:divehi_|english_)?(?:short_)?\d+$/.test(f.key)
    );
    if (hasDateRange) {
      const startDateStr = resolveStartDateStr(formData, window.selectedTemplate.fields);
      if (startDateStr) {
        populateDateRangePlaceholders(formData, startDateStr, 0);
      } else {
        showToast("Please select a valid Start Date for the date range.", "warning");
        return;
      }
    }

    // 2. Now populate derived hidden date fields (can reference date_range_divehi_1 etc.)
    formData = populateDerivedHiddenDateFields(formData, window.selectedTemplate.fields);

    // 3. Populate weekday hidden fields
    populateWeekdayHiddenFields(formData, window.selectedTemplate.fields);
  }
  // Format date values at render time: Divehi if isRTL, English otherwise.
  // Applies to any field whose value is still a raw YYYY-MM-DD string.
  // Skips date_range_start (range seed) and _hidden fields (handled separately).
  if (window.selectedTemplate.fields) {
    for (const field of window.selectedTemplate.fields) {
      if (field.key === "date_range_start") continue;
      if (isAutoComputedField(field.key, window.selectedTemplate.fields)) continue;
      const rawDate = formData[field.key];
      if (field.type === "image") continue;
      if (!rawDate || typeof rawDate !== "string" || !rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      const short = field.key.toLowerCase().includes("_short");
      formData[field.key] = field.isRTL
        ? formatDivehiDate(rawDate, short)
        : formatEnglishDate(rawDate, short);
    }
  }
  

  // Populate hidden fields
  // if (
  //   window.selectedTemplate.hiddenFields &&
  //   window.selectedTemplate.hiddenFields.length > 0
  // ) {
  //   for (const hiddenField of window.selectedTemplate.hiddenFields) {
  //     if (
  //       hiddenField.key === "start_date_divehi_hidden" &&
  //       formData["date_range_start"]
  //     ) {
  //       formData[hiddenField.key] = formData["date_range_start"];
  //     }
  //     // Add more rules as needed
  //   }
  // }

  if (!window.electronAPI) {
    console.error("electronAPI not available");
    alert("Application API not available. Please restart the app.");
    return;
  }

  const outputFormat =
    window.selectedTemplate.type === "excel" ? "xlsx" : "docx";

  const generateOnlyBtn = document.getElementById("generate-only-btn");
  const originalBtnHTML = generateOnlyBtn
    ? generateOnlyBtn.innerHTML
    : "Generate Only";
  if (generateOnlyBtn) {
    generateOnlyBtn.innerHTML =
      '<span class="btn-icon">⏳</span> Generating...';
    generateOnlyBtn.disabled = true;
  }

  try {
    const result = await window.electronAPI.generateDocument({
      templateId: window.selectedTemplate.id,
      formData: formData,
      outputFormat: outputFormat,
      printed: false,
    });

    showToast(
      `✅ Document saved successfully!\n\nFile: ${result.outputPath}`,
      "success",
    );

    // Clear form after successful generation (optional)
    clearForm();
  } catch (error) {
    console.error("Error generating document:", error);

    let errorMessage = "❌ Error generating document: " + error.message;
    if (error.message.includes("template not found")) {
      errorMessage =
        "❌ Template file not found. Please re-upload the template.";
    } else if (error.message.includes("permission")) {
      errorMessage =
        "❌ Permission denied when saving document. Please check your folder permissions.";
    }
    alert(errorMessage);
  } finally {
    if (generateOnlyBtn) {
      generateOnlyBtn.innerHTML = originalBtnHTML;
      generateOnlyBtn.disabled = false;
    }
  }
}

function clearForm() {
  console.log("Clearing form...");

  if (!window.selectedTemplate) return;

  for (const field of window.selectedTemplate.fields) {
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const input = document.getElementById(fieldId);
    if (input) {
      // Enable the input first
      input.disabled = false;
      input.readOnly = false;

      // Clear the value
      if (input.type === "checkbox") {
        input.checked = false;
      } else if (input.type === "select-one") {
        input.selectedIndex = 0;
      } else {
        input.value = "";
      }

      // Remove any error styling
      input.style.borderColor = "";
      input.classList.remove("error");

      // Focus first field after clearing
      if (field === window.selectedTemplate.fields[0]) {
        input.focus();
      }
    }
  }

  console.log("Form cleared");
}

async function saveDataRecord() {
  console.log("saveDataRecord called");

  if (!validateForm()) return;

  if (!window.selectedTemplate) {
    console.error("No template selected");
    return;
  }

  const formData = collectFormData();

  try {
    const record = await window.electronAPI.saveDataRecord({
      templateId: window.selectedTemplate.id,
      data: formData,
    });

    showToast("💾 Record saved successfully!", "success");
    await loadDataRecords();
  } catch (error) {
    console.error("Error saving record:", error);
    showToast("Error saving record: " + error.message, "error");
  }
}

async function loadRecord(recordId) {
  console.log("loadRecord called with id:", recordId);

  if (!window.selectedTemplate) {
    console.error("No template selected");
    showToast("No template selected", "warning");
    return;
  }

  try {
    const records = await window.electronAPI.getDataRecords(
      window.selectedTemplate.id,
    );
    const record = records.find((r) => r.id === recordId);

    if (!record) {
      showToast("Record not found", "warning");
      return;
    }

    console.log("Loading record data:", record.data);

    // Small delay to ensure DOM is ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    let loadedCount = 0;

    // Load data into form fields
    for (const [key, value] of Object.entries(record.data)) {
      const fieldId = `field-${key.replace(/[^a-zA-Z0-9]/g, "_")}`;
      console.log(`Looking for field: ${fieldId} with value:`, value);

      const input = document.getElementById(fieldId);

      if (input) {
        // File inputs cannot be set programmatically — browser security restriction.
        // Image fields are skipped; the user must re-select the image if needed.
        if (input.type === "file") {
          loadedCount++;
          continue;
        }

        // Enable the input first
        input.disabled = false;
        input.readOnly = false;

        // Set the value based on input type
        if (input.type === "checkbox") {
          input.checked = value === true || value === "true";
          console.log(`Set checkbox ${key} to:`, input.checked);
        } else if (input.type === "select-one") {
          // For select dropdowns
          const stringValue = String(value);
          let optionExists = false;
          for (let i = 0; i < input.options.length; i++) {
            if (input.options[i].value === stringValue) {
              optionExists = true;
              break;
            }
          }
          input.value = optionExists ? stringValue : "";
          console.log(`Set select ${key} to:`, input.value);
        } else {
          input.value = value !== undefined && value !== null ? value : "";
          console.log(`Set input ${key} to:`, input.value);
        }

        // Trigger events
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));

        // Remove any error styling
        input.style.borderColor = "";
        input.classList.remove("error");

        loadedCount++;
      } else {
        console.warn(`Input not found for field: ${key} (ID: ${fieldId})`);
      }
    }

    console.log(
      `Loaded ${loadedCount} of ${Object.keys(record.data).length} fields`,
    );

    // Re-apply language settings after loading values
    for (const field of window.selectedTemplate.fields) {
      const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const fieldElement = document.getElementById(fieldId);
      if (fieldElement) {
        const useDivehi = shouldUseDivehi(field);
        await setFieldLanguage(fieldElement, field, useDivehi);
      }
    }

    // Focus first field after loading
    if (
      window.selectedTemplate.fields &&
      window.selectedTemplate.fields.length > 0
    ) {
      const firstFieldId = `field-${window.selectedTemplate.fields[0].key.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const firstInput = document.getElementById(firstFieldId);
      if (firstInput) {
        firstInput.focus();
        // Select text if it's a text input
        if (
          firstInput.type === "text" ||
          firstInput.type === "textarea" ||
          firstInput.type === "number"
        ) {
          firstInput.select();
        }
      }
    }

    // Show success message
    const notification = document.createElement("div");
    notification.className = "language-notification info";
    notification.textContent = `✅ Loaded ${loadedCount} fields successfully!`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add("show");
      setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
      }, 1500);
    }, 10);
  } catch (error) {
    console.error("Error loading record:", error);
    showToast("Error loading record: " + error.message, "error");
  }
}

async function loadDataRecords() {
  if (!window.selectedTemplate) return;

  try {
    const records = await window.electronAPI.getDataRecords(
      window.selectedTemplate.id,
    );
    const recordsList = document.getElementById("records-list");

    if (!recordsList) return;

    if (records.length === 0) {
      recordsList.innerHTML =
        '<p class="no-records">No saved records yet. Fill and save a form to see it here.</p>';
      return;
    }

    console.log("Loading records:", records.length);

    recordsList.innerHTML = records
      .map((record) => {
        // Truncate long values for preview
        const previewEntries = Object.entries(record.data)
          .slice(0, 3)
          .map(([key, value]) => {
            let displayValue = String(value || "—");
            if (displayValue.length > 50) {
              displayValue = displayValue.substring(0, 47) + "...";
            }
            return `<span class="record-field"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(displayValue)}</span>`;
          })
          .join("");

        return `
                <div class="record-card" data-record-id="${record.id}">
                    <div class="record-header">
                        <span class="record-date">📅 ${new Date(record.createdAt).toLocaleString()}</span>
                        <button class="record-load-btn" data-record-id="${record.id}">Load</button>
                    </div>
                    <div class="record-preview">
                        ${previewEntries}
                        ${Object.keys(record.data).length > 3 ? '<span class="record-more">+' + (Object.keys(record.data).length - 3) + " more</span>" : ""}
                    </div>
                </div>
            `;
      })
      .join("");

    // Attach event listeners to load buttons (better than onclick attribute)
    document.querySelectorAll(".record-load-btn").forEach((btn) => {
      btn.removeEventListener("click", handleRecordLoadClick);
      btn.addEventListener("click", handleRecordLoadClick);
    });

    // Also attach to record cards for clicking anywhere
    document.querySelectorAll(".record-card").forEach((card) => {
      card.removeEventListener("click", handleRecordCardClick);
      card.addEventListener("click", handleRecordCardClick);
    });
  } catch (error) {
    console.error("Error loading records:", error);
    const recordsList = document.getElementById("records-list");
    if (recordsList) {
      recordsList.innerHTML =
        '<p class="error">Error loading records: ' + error.message + "</p>";
    }
  }
}

// Helper function for record load button clicks
function handleRecordLoadClick(event) {
  event.stopPropagation();
  const recordId = event.currentTarget.getAttribute("data-record-id");
  if (recordId) {
    loadRecord(recordId);
  }
}

// Helper function for record card clicks
function handleRecordCardClick(event) {
  // Don't trigger if clicking on the load button
  if (event.target.classList.contains("record-load-btn")) {
    return;
  }
  const recordId = event.currentTarget.getAttribute("data-record-id");
  if (recordId) {
    loadRecord(recordId);
  }
}

function toggleAutoLanguageSwitch() {
  autoLanguageSwitch = !autoLanguageSwitch;
  const toggleBtn = document.getElementById("auto-switch-toggle");
  if (toggleBtn) {
    toggleBtn.innerHTML = autoLanguageSwitch
      ? "✓ Auto-switch ON"
      : "Auto-switch OFF";
    toggleBtn.classList.toggle("active", autoLanguageSwitch);
  }

  const notification = document.createElement("div");
  notification.className = "language-notification info";
  notification.textContent = autoLanguageSwitch
    ? "Auto language switching enabled"
    : "Auto language switching disabled";
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add("show");
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 1500);
  }, 10);
}

// Keyboard shortcut: Ctrl+Shift+A to toggle auto-switch
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    e.preventDefault();
    toggleAutoLanguageSwitch();
  }
});

// Force all form fields to be editable (overwrites any accidentally set readOnly/disabled)
function ensureFieldsEditable() {
  const allInputs = document.querySelectorAll(
    "#data-form input, #data-form select, #data-form textarea",
  );
  allInputs.forEach((input) => {
    input.removeAttribute("readonly");
    input.readOnly = false;
    input.removeAttribute("disabled");
    input.disabled = false;
    input.classList.remove("disabled", "readonly");
  });
}
// Make sure functions are available globally
window.renderFillForm = renderFillForm;
window.saveDataRecord = saveDataRecord;
window.loadRecord = loadRecord;
window.generateDocument = generateDocument;
window.generateDocumentOnly = generateDocumentOnly;
window.clearForm = clearForm;
window.toggleAutoLanguageSwitch = toggleAutoLanguageSwitch;
window.loadDataRecords = loadDataRecords;
window.handleRecordLoadClick = handleRecordLoadClick;
window.handleRecordCardClick = handleRecordCardClick;
window.handleImageFieldChange = handleImageFieldChange;
window.clearImageField = clearImageField;
window.handleImageWidthChange = handleImageWidthChange;