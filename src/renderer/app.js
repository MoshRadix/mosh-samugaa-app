/**
 * @file app.js
 * @description Optimized Renderer Controller and UI Engine managing view states,
 * modal layouts, dynamic template indexing, and direct IPC bridge handlers.
 */

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

/** @type {string} Keeps track of the active application viewport module context (e.g., 'search', 'templates', 'fill-form') */
let currentView = "search";

/** @type {Array<Object>} In-memory master collection containing all valid synced document template profiles */
let allTemplates = [];

/** @type {Object|null} Global cross-file handle declaring active template profiles inside generation modes */
window.selectedTemplate = null;

// Cached array references tracking DOM elements to minimize recalculations and prevent DOM thrashing
let cachedNavButtons = [];
let cachedViews = [];

// ============================================================================
// CORE APPLICATION INITIALIZATION
// ============================================================================

/**
 * Primary App Initialization Bootstrap routine. Fires securely to orchestrate UI lifecycle configurations.
 */
async function init() {
  console.log("App initializing...");

  try {
    // 1. Cache foundational DOM tree segments to guarantee high execution speed across lifecycle actions
    cachedNavButtons = []; // will be populated inside setupNavigation
    cachedViews = document.querySelectorAll(".view");

    // 2. Attach basic interactive event and click handlers across static layout controls
    setupNavigation();
    setupModals();
    setupEventListeners();

    // 3. Batch async dependencies neatly to load data stores without breaking view assembly pipelines
    await loadInitialData();

    console.log("App initialized successfully");
  } catch (error) {
    console.error("Init error:", error);
  }
}

/**
 * Helper to process dependency pipelines on boot cleanly without cascading timeout delays.
 */
async function loadInitialData() {
  // Check and safely invoke dynamic structural template lists
  if (typeof loadTemplates === "function") {
    await loadTemplates();
  } else {
    console.warn(
      "loadTemplates function not found initially. Retrying layout fallback mechanism...",
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof loadTemplates === "function") await loadTemplates();
  }

  // Enforce reliable route switching defaults to initialize search tables properly
  switchView("search");
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Creates a debounced function that delays execution until after a timeout period has elapsed.
 * Highly critical for optimizing search inputs without blocking rendering cycles during fast typing.
 * @param {Function} func - Target task reference to delay.
 * @param {number} wait - Timeout threshold in milliseconds.
 * @returns {Function} Wrapper orchestration closures executing targets at safe intervals.
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================================================
// UI ROUTING & NAVIGATION ENGINE
// ============================================================================

/**
 * Binds semantic events to top navigation elements and standard tracking routes.
 */
function setupNavigation() {
  // Cache all nav items (both flat buttons and dropdown items)
  cachedNavButtons = document.querySelectorAll(".nav-btn, .nav-dropdown-item");

  // Flat nav buttons (Work Logs, Settings, Help)
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const view = e.currentTarget.dataset.view;
      if (view) switchView(view);
    });
  });

  // Dropdown items
  document.querySelectorAll(".nav-dropdown-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const view = e.currentTarget.dataset.view;
      if (view) {
        closeAllDropdowns();
        switchView(view);
      }
    });
  });

  // Dropdown trigger buttons
  document.querySelectorAll(".nav-group-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const group = trigger.dataset.group;
      const dropdown = document.getElementById(`nav-dropdown-${group}`);
      const isOpen = dropdown?.classList.contains("nav-dropdown-open");
      closeAllDropdowns();
      if (!isOpen && dropdown) {
        dropdown.classList.add("nav-dropdown-open");
        trigger.classList.add("nav-trigger-open");
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => closeAllDropdowns());

  // Handle back navigation
  const backBtn = document.getElementById("back-to-search-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      switchView("search");
    });
  }
}

function closeAllDropdowns() {
  document
    .querySelectorAll(".nav-dropdown")
    .forEach((d) => d.classList.remove("nav-dropdown-open"));
  document
    .querySelectorAll(".nav-group-trigger")
    .forEach((t) => t.classList.remove("nav-trigger-open"));
}

/**
 * Switches the active viewport module, updating menu highlights and reloading views.
 * @param {string} view - Token matching target interface identifier schemas.
 */
function switchView(view) {
  console.log("Switching to view:", view);
  currentView = view;

  // 1. Update active state on all nav elements (flat buttons + dropdown items)
  document.querySelectorAll(".nav-btn, .nav-dropdown-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  // 2. Highlight parent group trigger if an item inside it is active
  document.querySelectorAll(".nav-group").forEach((group) => {
    const hasActiveChild = group.querySelector(`.nav-dropdown-item.active`);
    group
      .querySelector(".nav-group-trigger")
      ?.classList.toggle("nav-trigger-active", !!hasActiveChild);
  });

  // 2. Hide active visibility across all available viewport layer containers
  cachedViews.forEach((v) => {
    v.classList.remove("active");
  });

  // 3. Mount targeting panel container references to present context content fields cleanly
  const targetView = document.getElementById(`${view}-view`);
  if (targetView) {
    targetView.classList.add("active");
  }

  // Remove padding/scroll from main-content for views that manage their own layout
  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.classList.toggle(
      "main-content--flush",
      view === "notes" || view === "social-media",
    );
  }

  // 4. Trigger isolated component updates contextually depending on selected pathway targets
  switch (view) {
    case "templates":
      // Always re-fetch so recordCount (and any other live data) is up to date
      if (typeof loadTemplates === "function") {
        loadTemplates();
      } else if (typeof renderTemplates === "function") {
        renderTemplates();
      } else {
        console.error("renderTemplates function context missing unexpectedly.");
      }
      setTimeout(() => document.getElementById("template-search")?.focus(), 50);
      break;

    case "fill-form":
      // Fall back safely to library layouts if users drop into creation interfaces without assets loaded
      if (!window.selectedTemplate) {
        switchView("templates");
        return;
      }
      if (typeof renderFillForm === "function") {
        renderFillForm();
      } else {
        console.error(
          "renderFillForm utility is currently unavailable inside rendering dependencies.",
        );
      }
      break;

    case "search":
      if (typeof initSearch === "function") {
        initSearch();
      } else if (typeof loadSearchResults === "function") {
        loadSearchResults();
      } else {
        console.error(
          "Search module indexing pathways could not resolve successfully.",
        );
      }
      setTimeout(() => document.getElementById("document-search")?.focus(), 50);
      break;

    case "settings":
      if (typeof initSettings === "function") {
        initSettings();
      }
      break;

    case "backup":
      if (typeof initSettings === "function") {
        initSettings();
      }
      break;

    case "help":
      if (typeof initHelp === "function") {
        initHelp();
      }
      break;

    case "utilities":
      if (typeof initUtilities === "function") {
        initUtilities();
      }
      break;

    case "watermark":
      if (typeof initWatermarkTool === "function") {
        initWatermarkTool();
      }
      break;

    case "worklogs":
      if (typeof initWorkLogs === "function") {
        initWorkLogs();
      }
      break;

    case "randompicker":
      if (typeof initRandomPicker === "function") {
        initRandomPicker();
      }
      break;

    case "prayer-times":
      if (typeof initPrayerTimes === "function") {
        initPrayerTimes();
      }
      break;

    case "calendar":
      if (typeof initCalendar === "function") {
        initCalendar();
      }
      break;

    case "notes":
      if (typeof initNotes === "function") {
        initNotes();
      }
      break;

    case "todo":
      if (typeof initTodo === "function") {
        initTodo();
      }
      break;

    case "social-media":
      if (typeof initSocialMedia === "function") {
        initSocialMedia();
      }
      break;
  }
}

// ============================================================================
// MODAL MANAGEMENT CONTROLS
// ============================================================================

/**
 * Initializes listeners to gracefully dismiss active modal prompt dialog interfaces.
 */
function setupModals() {
  // Assign standard close operations over close action markup targets
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) closeModal(modal.id);
    });
  });

  // Handle light dismiss workflows to shut down layouts when clicking outside container spaces
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target.id);
    }
  });
}

/**
 * Displays a target modal block by changing its rendering visibility.
 * @param {string} modalId - Component layout container DOM element string identifier.
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "block";
}

/**
 * Dismisses a target modal layout from view.
 * @param {string} modalId - Component layout container DOM element string identifier.
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

// ============================================================================
// SYSTEM EVENT INTERACTIVE PIPELINES
// ============================================================================

/**
 * Binds action triggers to application search fields and file upload pipelines.
 */
function setupEventListeners() {
  const addBtn = document.getElementById("add-template-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => openUploadDialog());
  }

  // Cache template processing updates and optimize processing performance by incorporating a 150ms debounce window
  const onFilterChangeDebounced = debounce(() => {
    if (typeof renderTemplates === "function") renderTemplates();
  }, 150);

  // Apply optimized action attachments over textual content query blocks smoothly
  const templateSearch = document.getElementById("template-search");
  if (templateSearch) {
    templateSearch.addEventListener("input", onFilterChangeDebounced);
  }

  const typeFilter = document.getElementById("type-filter");
  if (typeFilter) {
    typeFilter.addEventListener("change", onFilterChangeDebounced);
  }

  const fillableFilter = document.getElementById("fillable-filter");
  if (fillableFilter) {
    fillableFilter.addEventListener("change", onFilterChangeDebounced);
  }
}

// ============================================================================
// INGESTION & TEMPLATE UPLOAD LIFECYCLE
// ============================================================================

/**
 * Opens a native OS dialog to select local files to ingest.
 */
async function openUploadDialog() {
  try {
    const filePath = await window.electronAPI.openFileDialog();
    if (!filePath) return; // User cancelled file picker selection
    showUploadMetadataForm(filePath);
  } catch (error) {
    console.error(
      "Error launching OS upload interaction dialog pathways:",
      error,
    );
    showToast("Error opening file dialog", "error");
  }
}

/**
 * Renders and prepares structural forms allowing users to modify details prior to template ingestion.
 * @param {string} filePath - Local target file resource absolute destination string path reference.
 */
function showUploadMetadataForm(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  const modalBody = document.getElementById("modal-body");
  const modalTitle = document.getElementById("modal-title");

  modalTitle.textContent = "Upload New Template";
  modalBody.innerHTML = `
    <form id="upload-form">
        <div class="form-group">
            <label>Selected File</label>
            <input type="text" value="${escapeHtml(fileName)}" disabled class="disabled-input">
        </div>
        <div class="form-group">
            <label>Template Name *</label>
            <input type="text" id="template-name" value="${escapeHtml(fileName.replace(/\.[^/.]+$/, ""))}" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="template-description" rows="3" placeholder="Enter template description..."></textarea>
        </div>
        <div class="form-group">
            <label>Category</label>
            <select id="template-category">
                <option value="General">General</option>
                <option value="Forms">Forms</option>
                <option value="Attendance Sheets">Attendance Sheets</option>
                <option value="Invoices">Invoices</option>
                <option value="Reports">Reports</option>
                <option value="Letters">Letters</option>
                <option value="Contracts">Contracts</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div class="form-actions">
            <button type="submit" class="btn btn-primary">Upload</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal('template-modal')">Cancel</button>
        </div>
    </form>
  `;

  // Process data submissions directly from template metadata setup controls
  document
    .getElementById("upload-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const metadata = {
        name: document.getElementById("template-name").value.trim(),
        description: document
          .getElementById("template-description")
          .value.trim(),
        category: document.getElementById("template-category").value,
      };

      try {
        // Dispatches file ingestion sequences via pre-exposed runtime window bridges securely
        await window.electronAPI.uploadTemplate({ filePath, metadata });
        closeModal("template-modal");

        if (typeof loadTemplates === "function") {
          await loadTemplates();
        } else {
          console.warn(
            "Storage syncing methods missing. Forcing local navigation layout fallback refreshing cycle...",
          );
          window.location.reload();
        }

        showToast("Template uploaded successfully!", "success");
      } catch (error) {
        showToast("Error processing upload: " + error.message, "error");
      }
    });

  openModal("template-modal");
}

// ============================================================================
// SYSTEM SECURITY & NOTIFICATION UTILITIES
// ============================================================================

/**
 * Escapes unsafe alphanumeric strings cleanly to block script injections inside innerHTML blocks.
 * @param {string} text - Raw template literal input parameters string.
 * @returns {string} Safe text parameter conversions parsing dangerous structural components.
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Appends automated alert message blocks dynamically to screen layers.
 * @param {string} message - Description literal detailing active notification conditions to present.
 * @param {string} [type="success"] - Design styling flag context identifier (e.g., 'success', 'error').
 */
function showToast(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `language-notification show ${type === "error" ? "danger" : "success"}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Transition parameters cleaning elements out of rendering layers dynamically automatically
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

/**
 * Show a styled in-app confirmation dialog.
 * @param {string} message - The question to display.
 * @param {string} [okLabel="Confirm"] - Label for the confirm button.
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled.
 */
function showConfirm(message, okLabel = "Confirm") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("app-confirm-overlay");
    const msgEl = document.getElementById("app-confirm-msg");
    const okBtn = document.getElementById("app-confirm-ok");
    const cancelBtn = document.getElementById("app-confirm-cancel");
    if (!overlay) {
      resolve(false);
      return;
    }

    msgEl.textContent = message;
    okBtn.textContent = okLabel;
    overlay.style.display = "flex";

    function cleanup(result) {
      overlay.style.display = "none";
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onBackdrop);
      resolve(result);
    }
    function onOk() {
      cleanup(true);
    }
    function onCancel() {
      cleanup(false);
    }
    function onBackdrop(e) {
      if (e.target === overlay) cleanup(false);
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onBackdrop);
  });
}

// ============================================================================
// WINDOW TARGET GLOBAL REGISTRATIONS
// ============================================================================

window.showToast = showToast;
window.showConfirm = showConfirm;
window.switchView = switchView;
window.closeModal = closeModal;
window.openModal = openModal;
window.openUploadDialog = openUploadDialog;

// ============================================================================
// STARTUP BOOTSTRAP EXECUTIONS
// ============================================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(init, 100); // Guarantees layout files complete compilation threads entirely prior to initialization routines
  });
} else {
  setTimeout(init, 100);
}
// old app.js - kept for reference during refactor, may be removed later
// // Global state
// let currentView = "search";
// let allTemplates = [];
// // Use window.selectedTemplate for cross-file access
// window.selectedTemplate = null;

// // Initialize application
// async function init() {
//   console.log("App initializing...");

//   try {
//     // Setup navigation
//     setupNavigation();

//     // Setup modals
//     setupModals();

//     // Wait a bit for other scripts to load
//     setTimeout(async () => {
//       // Load templates
//       if (typeof loadTemplates === "function") {
//         await loadTemplates();
//       } else {
//         console.error("loadTemplates function not found yet");
//         // Try again after a short delay
//         setTimeout(async () => {
//           if (typeof loadTemplates === "function") {
//             await loadTemplates();
//           } else {
//             console.error("loadTemplates still not available");
//           }
//         }, 500);
//       }
//     }, 100);
//     setTimeout(async () => {
//       // Automatically switch to search view on startup to initialize filters and list data
//       switchView("search");
//     }, 100);

//     // Setup event listeners
//     setupEventListeners();

//     console.log("App initialized successfully");
//   } catch (error) {
//     console.error("Init error:", error);
//   }
// }

// function setupNavigation() {
//   // Navigation buttons
//   document.querySelectorAll(".nav-btn").forEach((btn) => {
//     btn.addEventListener("click", (e) => {
//       const view = e.target.dataset.view;
//       switchView(view);
//     });
//   });

//   // Back button
//   const backBtn = document.getElementById("back-to-search-btn");
//   if (backBtn) {
//     backBtn.addEventListener("click", () => {
//       switchView("search"); // Switches back to Search & Print page
//     });
//   }
// }

// function setupModals() {
//   // Close buttons
//   document.querySelectorAll(".close").forEach((closeBtn) => {
//     closeBtn.addEventListener("click", (e) => {
//       const modal = e.target.closest(".modal");
//       if (modal) {
//         closeModal(modal.id);
//       }
//     });
//   });

//   // Click outside
//   window.addEventListener("click", (e) => {
//     if (e.target.classList.contains("modal")) {
//       closeModal(e.target.id);
//     }
//   });
// }

// function setupEventListeners() {
//   // Add template button
//   const addBtn = document.getElementById("add-template-btn");
//   if (addBtn) {
//     addBtn.addEventListener("click", () => {
//       openUploadDialog();
//     });
//   }

//   // Filters
//   const templateSearch = document.getElementById("template-search");
//   if (templateSearch) {
//     templateSearch.addEventListener("input", () => {
//       if (typeof renderTemplates === "function") renderTemplates();
//     });
//   }

//   const typeFilter = document.getElementById("type-filter");
//   if (typeFilter) {
//     typeFilter.addEventListener("change", () => {
//       if (typeof renderTemplates === "function") renderTemplates();
//     });
//   }

//   const fillableFilter = document.getElementById("fillable-filter");
//   if (fillableFilter) {
//     fillableFilter.addEventListener("change", () => {
//       if (typeof renderTemplates === "function") renderTemplates();
//     });
//   }
// }

// function switchView(view) {
//   console.log("Switching to view:", view);
//   currentView = view;

//   // Update nav buttons
//   document.querySelectorAll(".nav-btn").forEach((btn) => {
//     btn.classList.toggle("active", btn.dataset.view === view);
//   });

//   // Update views
//   document.querySelectorAll(".view").forEach((v) => {
//     v.classList.remove("active");
//   });

//   const targetView = document.getElementById(`${view}-view`);
//   if (targetView) {
//     targetView.classList.add("active");
//   }

//   // Load view content
//   if (view === "templates") {
//     if (typeof renderTemplates === "function") {
//       renderTemplates();
//     } else {
//       console.error("renderTemplates not available");
//     }
//   } else if (view === "fill-form") {
//     if (!window.selectedTemplate) {
//       switchView("templates");
//       return;
//     }
//     if (typeof renderFillForm === "function") {
//       renderFillForm();
//     } else {
//       console.error("renderFillForm not available");
//     }
//   } else if (view === "search") {
//     // Initialize search when switching to search view
//     if (typeof initSearch === "function") {
//       initSearch();
//     } else if (typeof loadSearchResults === "function") {
//       loadSearchResults();
//     } else {
//       console.error("Search functions not available");
//     }
//   }else if (view === 'settings') {
//   if (typeof initSettings === 'function') initSettings();
// }
// }
// function openModal(modalId) {
//   const modal = document.getElementById(modalId);
//   if (modal) modal.style.display = "block";
// }

// function closeModal(modalId) {
//   const modal = document.getElementById(modalId);
//   if (modal) modal.style.display = "none";
// }

// async function openUploadDialog() {
//   try {
//     const filePath = await window.electronAPI.openFileDialog();
//     if (!filePath) return;
//     showUploadMetadataForm(filePath);
//   } catch (error) {
//     console.error("Error:", error);
//     //alert("Error opening file dialog");
//     showToast("Error opening file dialog", "error");
//   }
// }

// function showUploadMetadataForm(filePath) {
//   const fileName = filePath.split(/[\\/]/).pop();
//   const modal = document.getElementById("template-modal");
//   const modalBody = document.getElementById("modal-body");
//   const modalTitle = document.getElementById("modal-title");

//   modalTitle.textContent = "Upload New Template";
//   modalBody.innerHTML = `
//         <form id="upload-form">
//             <div class="form-group">
//                 <label>Selected File</label>
//                 <input type="text" value="${escapeHtml(fileName)}" disabled>
//             </div>
//             <div class="form-group">
//                 <label>Template Name *</label>
//                 <input type="text" id="template-name" value="${escapeHtml(fileName.replace(/\.[^/.]+$/, ""))}" required>
//             </div>
//             <div class="form-group">
//                 <label>Description</label>
//                 <textarea id="template-description" rows="3"></textarea>
//             </div>
//             <div class="form-group">
//                 <label>Category</label>
//                 <select id="template-category">
//                     <option value="General">General</option>
//                     <option value="Forms">Forms</option>
//                     <option value="Attendance Sheets">Attendance Sheets</option>
//                     <option value="Invoices">Invoices</option>
//                     <option value="Reports">Reports</option>
//                     <option value="Letters">Letters</option>
//                     <option value="Contracts">Contracts</option>
//                     <option value="Other">Other</option>
//                 </select>
//             </div>
//             <div class="form-actions">
//                 <button type="submit" class="btn btn-primary">Upload</button>
//                 <button type="button" class="btn btn-secondary" onclick="closeModal('template-modal')">Cancel</button>
//             </div>
//         </form>
//     `;

//   document
//     .getElementById("upload-form")
//     .addEventListener("submit", async (e) => {
//       e.preventDefault();

//       const metadata = {
//         name: document.getElementById("template-name").value.trim(),
//         description: document
//           .getElementById("template-description")
//           .value.trim(),
//         category: document.getElementById("template-category").value,
//       };

//       try {
//         const template = await window.electronAPI.uploadTemplate({
//           filePath,
//           metadata,
//         });
//         closeModal("template-modal");

//         // Check if loadTemplates exists before calling
//         if (typeof loadTemplates === "function") {
//           await loadTemplates();
//         } else {
//           console.error("loadTemplates function not found");
//           // Manually refresh the page as fallback
//           window.location.reload();
//         }

//         showToast("Template uploaded successfully!", "success");
//       } catch (error) {
//         showToast("Error: " + error.message, "error");
//       }
//     });

//   openModal("template-modal");
// }

// function escapeHtml(text) {
//   if (!text) return "";
//   const div = document.createElement("div");
//   div.textContent = text;
//   return div.innerHTML;
// }

// function showToast(message, type = "success") {
//   const notification = document.createElement("div");
//   notification.className = `language-notification show ${type === "error" ? "danger" : "success"}`;
//   notification.textContent = message;
//   document.body.appendChild(notification);

//   setTimeout(() => {
//     notification.classList.remove("show");
//     setTimeout(() => notification.remove(), 300);
//   }, 2500);
// }

// // Make functions global
// window.showToast = showToast;
// window.switchView = switchView;
// window.closeModal = closeModal;
// window.openModal = openModal;
// window.openUploadDialog = openUploadDialog;

// // Start app when DOM is ready
// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => {
//     // Small delay to ensure all scripts are loaded
//     setTimeout(init, 100);
//   });
// } else {
//   setTimeout(init, 100);
// }
