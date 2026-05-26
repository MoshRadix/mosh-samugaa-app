// Global state
let currentView = "search";
let allTemplates = [];
// Use window.selectedTemplate for cross-file access
window.selectedTemplate = null;

// Initialize application
async function init() {
  console.log("App initializing...");

  try {
    // Setup navigation
    setupNavigation();

    // Setup modals
    setupModals();

    // Wait a bit for other scripts to load
    setTimeout(async () => {
      // Load templates
      if (typeof loadTemplates === "function") {
        await loadTemplates();
      } else {
        console.error("loadTemplates function not found yet");
        // Try again after a short delay
        setTimeout(async () => {
          if (typeof loadTemplates === "function") {
            await loadTemplates();
          } else {
            console.error("loadTemplates still not available");
          }
        }, 500);
      }
    }, 100);
    setTimeout(async () => {
      // Automatically switch to search view on startup to initialize filters and list data
      switchView("search");
    }, 100);

    // Setup event listeners
    setupEventListeners();

    console.log("App initialized successfully");
  } catch (error) {
    console.error("Init error:", error);
  }
}

function setupNavigation() {
  // Navigation buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const view = e.target.dataset.view;
      switchView(view);
    });
  });

  // Back button
  const backBtn = document.getElementById("back-to-search-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      switchView("search"); // Switches back to Search & Print page
    });
  }
}

function setupModals() {
  // Close buttons
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) {
        closeModal(modal.id);
      }
    });
  });

  // Click outside
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target.id);
    }
  });
}

function setupEventListeners() {
  // Add template button
  const addBtn = document.getElementById("add-template-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      openUploadDialog();
    });
  }

  // Filters
  const templateSearch = document.getElementById("template-search");
  if (templateSearch) {
    templateSearch.addEventListener("input", () => {
      if (typeof renderTemplates === "function") renderTemplates();
    });
  }

  const typeFilter = document.getElementById("type-filter");
  if (typeFilter) {
    typeFilter.addEventListener("change", () => {
      if (typeof renderTemplates === "function") renderTemplates();
    });
  }

  const fillableFilter = document.getElementById("fillable-filter");
  if (fillableFilter) {
    fillableFilter.addEventListener("change", () => {
      if (typeof renderTemplates === "function") renderTemplates();
    });
  }
}

function switchView(view) {
  console.log("Switching to view:", view);
  currentView = view;

  // Update nav buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  // Update views
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.remove("active");
  });

  const targetView = document.getElementById(`${view}-view`);
  if (targetView) {
    targetView.classList.add("active");
  }

  // Load view content
  if (view === "templates") {
    if (typeof renderTemplates === "function") {
      renderTemplates();
    } else {
      console.error("renderTemplates not available");
    }
  } else if (view === "fill-form") {
    if (!window.selectedTemplate) {
      switchView("templates");
      return;
    }
    if (typeof renderFillForm === "function") {
      renderFillForm();
    } else {
      console.error("renderFillForm not available");
    }
  } else if (view === "search") {
    // Initialize search when switching to search view
    if (typeof initSearch === "function") {
      initSearch();
    } else if (typeof loadSearchResults === "function") {
      loadSearchResults();
    } else {
      console.error("Search functions not available");
    }
  }else if (view === 'settings') {
  if (typeof initSettings === 'function') initSettings();
}
}
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "block";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

async function openUploadDialog() {
  try {
    const filePath = await window.electronAPI.openFileDialog();
    if (!filePath) return;
    showUploadMetadataForm(filePath);
  } catch (error) {
    console.error("Error:", error);
    //alert("Error opening file dialog");
    showToast("Error opening file dialog", "error");
  }
}

function showUploadMetadataForm(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  const modal = document.getElementById("template-modal");
  const modalBody = document.getElementById("modal-body");
  const modalTitle = document.getElementById("modal-title");

  modalTitle.textContent = "Upload New Template";
  modalBody.innerHTML = `
        <form id="upload-form">
            <div class="form-group">
                <label>Selected File</label>
                <input type="text" value="${escapeHtml(fileName)}" disabled>
            </div>
            <div class="form-group">
                <label>Template Name *</label>
                <input type="text" id="template-name" value="${escapeHtml(fileName.replace(/\.[^/.]+$/, ""))}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="template-description" rows="3"></textarea>
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
        const template = await window.electronAPI.uploadTemplate({
          filePath,
          metadata,
        });
        closeModal("template-modal");

        // Check if loadTemplates exists before calling
        if (typeof loadTemplates === "function") {
          await loadTemplates();
        } else {
          console.error("loadTemplates function not found");
          // Manually refresh the page as fallback
          window.location.reload();
        }

        showToast("Template uploaded successfully!", "success");
      } catch (error) {
        showToast("Error: " + error.message, "error");
      }
    });

  openModal("template-modal");
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `language-notification show ${type === "error" ? "danger" : "success"}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// Make functions global
window.showToast = showToast;
window.switchView = switchView;
window.closeModal = closeModal;
window.openModal = openModal;
window.openUploadDialog = openUploadDialog;

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(init, 100);
  });
} else {
  setTimeout(init, 100);
}
