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
 * Convert YYYY-MM-DD date string to English format: "DD Month YYYY"
 * Example: "2026-05-12" -> "12 May 2026"
 */
function formatEnglishDate(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-index
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  // Or use short format: 'Jan', 'Feb', ... depending on preference
  return `${day} ${monthNames[month]} ${year}`;
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
function formatDivehiDate(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-index
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;
  if (month < 0 || month > 11) return dateString;

  return `${day} ${DIVEHI_MONTHS[month]} ${year}`;
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
  const fieldsHtml = fields
    .map((field) => {
      const isDivehiField = shouldUseDivehi(field);
      const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
      // In renderFillForm, inside the .map(field => ...) section:
      const isTextarea = field.type === "textarea";
      const fullWidthClass = isTextarea ? "full-width-field" : "";
      return `
      <div class="field-container ${fullWidthClass}" data-field-key="${field.key}">
        
          <!-- <label ${isDivehiField ? 'dir="rtl"' : ""}> -->
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
        <button type="button" id="generate-btn" class="btn btn-primary btn-large">
          <span class="btn-icon">📄</span> Generate & Print
        </button>
        <button type="button" id="generate-only-btn" class="btn btn-outline btn-large">
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

  // Setup language switching for each field
  for (const field of window.selectedTemplate.fields) {
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
  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) {
    generateBtn.removeEventListener("click", handleGenerateClick);
    generateBtn.addEventListener("click", handleGenerateClick);
  }
  const generateOnlyBtn = document.getElementById("generate-only-btn");
  if (generateOnlyBtn) {
    generateOnlyBtn.removeEventListener("click", handleGenerateOnlyClick);
    generateOnlyBtn.addEventListener("click", handleGenerateOnlyClick);
  }

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

  for (const field of window.selectedTemplate.fields) {
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const input = document.getElementById(fieldId);
    if (!input) {
      console.warn(`Input not found for field: ${field.key}`);
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
  for (const field of window.selectedTemplate.fields) {
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const input = document.getElementById(fieldId);
    if (input) {
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
      console.log(`Collected ${field.key}:`, value);
    }
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
  // Convert date fields: Divehi if key contains 'divehi', otherwise English
  if (window.selectedTemplate.fields) {
    for (const field of window.selectedTemplate.fields) {
      // if (field.type === "date" && formData[field.key]) {
      //   const rawDate = formData[field.key];
      //   const isDivehiDate = field.key.toLowerCase().includes("divehi");
      //   if (isDivehiDate) {
      //     formData[field.key] = formatDivehiDate(rawDate);
      //     console.log(
      //       `Converted date field ${field.key} to Divehi: ${formData[field.key]}`,
      //     );
      //   } else {
      //     formData[field.key] = formatEnglishDate(rawDate);
      //     console.log(
      //       `Converted date field ${field.key} to English: ${formData[field.key]}`,
      //     );
      //   }
      // }
      if (field.type === "date" && formData[field.key]) {
        const rawDate = formData[field.key];
        // Use the isRTL flag from the field configuration
        if (field.isRTL) {
          formData[field.key] = formatDivehiDate(rawDate);
        } else {
          formData[field.key] = formatEnglishDate(rawDate);
        }
      }
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

  // Convert date fields based on isRTL flag
  if (window.selectedTemplate.fields) {
    for (const field of window.selectedTemplate.fields) {
      if (field.type === "date" && formData[field.key]) {
        const rawDate = formData[field.key];
        if (field.isRTL) {
          formData[field.key] = formatDivehiDate(rawDate);
        } else {
          formData[field.key] = formatEnglishDate(rawDate);
        }
      }
    }
  }

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
