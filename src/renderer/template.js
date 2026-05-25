// Navigation to fill form
function fillTemplate(id) {
  console.log("fillTemplate called with id:", id);
  console.log("allTemplates:", allTemplates);

  const foundTemplate = allTemplates.find((t) => t.id === id);
  console.log("Found template:", foundTemplate);

  if (foundTemplate) {
    // Set the GLOBAL selectedTemplate
    window.selectedTemplate = foundTemplate;
    console.log("Set window.selectedTemplate:", window.selectedTemplate);
    console.log("Template has fields:", foundTemplate.hasFields);

    // Call switchView to change to fill form
    if (typeof switchView === "function") {
      switchView("fill-form");
    } else {
      console.error("switchView is not available");
      alert("Navigation error");
    }
  } else {
    console.error("Template not found with id:", id);
    alert("Template not found");
  }
}
async function editTemplate(id) {
  const template = allTemplates.find((t) => t.id === id);
  if (!template) {
    alert("Template not found");
    return;
  }

  console.log("Editing template:", template);
  console.log("Template fields:", template.fields);

  const modal = document.getElementById("template-modal");
  const modalBody = document.getElementById("modal-body");
  const modalTitle = document.getElementById("modal-title");

  modalTitle.textContent = "Edit Template";
  modalBody.innerHTML = `
        <form id="edit-form">
            <div class="form-group">
                <label>Template Name *</label>
                <input type="text" id="edit-name" value="${escapeHtml(template.name)}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit-description" rows="3">${escapeHtml(template.description || "")}</textarea>
            </div>
            <div class="form-group">
                <label>Category</label>
                <select id="edit-category">
                    ${[
                      "General",
                      "Invoices",
                      "Reports",
                      "Letters",
                      "Contracts",
                      "Other",
                    ]
                      .map(
                        (cat) =>
                          `<option value="${cat}" ${template.category === cat ? "selected" : ""}>${cat}</option>`,
                      )
                      .join("")}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="edit-status">
                    <option value="true" ${template.isActive ? "selected" : ""}>Active</option>
                    <option value="false" ${!template.isActive ? "selected" : ""}>Inactive</option>
                </select>
            </div>
            <div class="form-group">
                <label>Fields Count</label>
                <input type="text" value="${template.fields ? template.fields.length : 0} fields detected" disabled>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('template-modal')">Cancel</button>
            </div>
        </form>
    `;

  document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const updates = {
      name: document.getElementById("edit-name").value.trim(),
      description: document.getElementById("edit-description").value.trim(),
      category: document.getElementById("edit-category").value,
      isActive: document.getElementById("edit-status").value === "true",
    };

    if (!updates.name) {
      alert("Template name is required");
      return;
    }

    try {
      // Preserve existing fields when updating
      const updatedTemplate = await window.electronAPI.updateTemplate({
        id,
        updates,
      });
      console.log("Template updated:", updatedTemplate);
      closeModal("template-modal");
      await loadTemplates();
      alert("Template updated successfully!");
    } catch (error) {
      console.error("Error updating template:", error);
      alert("Error updating template: " + error.message);
    }
  });

  openModal("template-modal");
}
async function renderTemplates() {
  const searchTerm =
    document.getElementById("template-search")?.value?.toLowerCase() || "";
  const typeFilter = document.getElementById("type-filter")?.value || "all";
  const fillableFilter =
    document.getElementById("fillable-filter")?.value || "all";

  let filtered = allTemplates;

  // Apply search
  if (searchTerm) {
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm) ||
        (t.description && t.description.toLowerCase().includes(searchTerm)) ||
        (t.category && t.category.toLowerCase().includes(searchTerm)),
    );
  }

  // Apply type filter
  if (typeFilter !== "all") {
    filtered = filtered.filter((t) => t.type === typeFilter);
  }

  // Apply fillable filter
  if (fillableFilter === "static") {
    filtered = filtered.filter((t) => !t.hasFields);
  } else if (fillableFilter === "fillable") {
    filtered = filtered.filter((t) => t.hasFields);
  }

  const container = document.getElementById("templates-grid");

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML =
      '<p class="no-results">No templates found matching your criteria.</p>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (template) => `
        <div class="template-card">
            <div class="template-card-header">
                <h3>${escapeHtml(template.name)}</h3>
                <span class="template-type-badge">${template.type === "word" ? "DOCX" : "XLSX"}</span>
            </div>
            <p>${escapeHtml(template.description || "No description")}</p>
            <p class="category">Category: ${escapeHtml(template.category)}</p>
            <p>
                <span class="badge ${template.hasFields ? "badge-fillable" : "badge-static"}">
                    ${template.hasFields ? "Fillable" : "Static"}
                </span>
                ${template.hasFields ? `<span style="font-size: 0.75rem;"> (${template.fields?.length || 0} fields)</span>` : ""}
            </p>
            // In renderTemplates function, update the template-card-actions section
            <div class="template-card-actions">
                ${
                template.hasFields
                    ? `
                    <button class="btn btn-success btn-small" onclick="fillTemplate('${template.id}')">Fill Form</button>
                    <button class="btn btn-primary btn-small" onclick="editTemplate('${template.id}')">Edit</button>
                    <button class="btn btn-info btn-small" onclick="editFieldTypes('${template.id}')">⚙️ Fields</button>
                    <button class="btn btn-secondary btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
                    <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
                `
                    : `
                    <button class="btn btn-success btn-small" onclick="printStaticDocument('${template.id}')">Print</button>
                    <button class="btn btn-primary btn-small" onclick="editTemplate('${template.id}')">Edit</button>
                    <button class="btn btn-info btn-small" onclick="editFieldTypes('${template.id}')">⚙️ Fields</button>
                    <button class="btn btn-secondary btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
                    <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
                `
                }
            </div>
        </div>
    `,
    )
    .join("");
}

async function printStaticDocument(templateId) {
  console.log("printStaticDocument called with id:", templateId);

  try {
    // Get the latest template data
    const templates = await window.electronAPI.getTemplates();
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      alert("Template not found");
      return;
    }

    // Check if template has fields
    if (template.hasFields) {
      alert(
        "This is a fillable template. Please fill out the form first before printing.",
      );
      return;
    }

    // Verify the file exists
    if (!template.filePath) {
      alert("Template file not found. Please re-upload the template.");
      return;
    }

    console.log("Printing static template:", template.name, template.filePath);

    // Confirm with user
    const confirmPrint = confirm(
      `Print "${template.name}" to default printer?`,
    );
    if (!confirmPrint) return;

    // Show printing indicator
    const printButtons = document.querySelectorAll(
      `[onclick*="printStaticDocument('${templateId}')"]`,
    );
    printButtons.forEach((btn) => {
      btn.textContent = "Printing...";
      btn.disabled = true;
    });

    // Call the print function
    const result = await window.electronAPI.printDocument(template.filePath);

    if (result) {
      alert("Document sent to printer successfully!");
    } else {
      alert("Failed to print. Please check if a printer is available.");
    }

    // Reset buttons
    printButtons.forEach((btn) => {
      btn.textContent = "Print";
      btn.disabled = false;
    });
  } catch (error) {
    console.error("Error printing static document:", error);
    alert("Error printing: " + error.message);

    // Reset buttons
    const printButtons = document.querySelectorAll(
      `[onclick*="printStaticDocument('${templateId}')"]`,
    );
    printButtons.forEach((btn) => {
      btn.textContent = "Print";
      btn.disabled = false;
    });
  }
}
// Add these functions to your existing template.js file

// Edit field types for a template
async function editFieldTypes(templateId) {
  console.log("editFieldTypes called for template:", templateId);

  // Get the latest template data
  const templates = await window.electronAPI.getTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template) {
    alert("Template not found");
    return;
  }

  const modal = document.getElementById("fields-modal");
  const modalBody = document.getElementById("fields-modal-body");
  const modalTitle = document.querySelector("#fields-modal h2");

  if (!modal || !modalBody) {
    console.error("Fields modal not found in DOM");
    alert("Modal not found. Please check your HTML.");
    return;
  }

  modalTitle.textContent = `Configure Fields: ${template.name}`;

  modalBody.innerHTML = `
        <div class="fields-list">
            ${
              template.fields && template.fields.length > 0
                ? template.fields
                    .map(
                      (field, index) => `
                <div class="field-item">
                    <div class="field-item-header">
                        <strong>${escapeHtml(field.key)}</strong>
                        <button class="btn btn-danger btn-small" onclick="removeField('${templateId}', ${index})">Remove</button>
                    </div>
                    <div class="field-item-details">
                        <div class="form-group">
                            <label>Display Label</label>
                            <input type="text" id="label-${index}" value="${escapeHtml(field.label || "")}" class="field-label-input">
                        </div>
                        <div class="form-group">
                            <label>Field Type</label>
                            <select id="type-${index}" class="field-type-select">
                                <option value="string" ${field.type === "string" ? "selected" : ""}>Text</option>
                                <option value="number" ${field.type === "number" ? "selected" : ""}>Number</option>
                                <option value="date" ${field.type === "date" ? "selected" : ""}>Date Picker</option>
                                <option value="email" ${field.type === "email" ? "selected" : ""}>Email</option>
                                <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>Text Area</option>
                                <option value="boolean" ${field.type === "boolean" ? "selected" : ""}>Yes/No</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="rtl-${index}" ${field.isRTL ? "checked" : ""}>
                                RTL (Divehi) Support
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="required-${index}" ${field.required ? "checked" : ""}>
                                Required Field
                            </label>
                        </div>
                    </div>
                </div>
            `,
                    )
                    .join("")
                : "<p>No fields detected in this template. Please ensure your template contains placeholders like {fieldname} or {divehi.fieldname} or {date.fieldname}</p>"
            }
        </div>
        ${
          template.fields && template.fields.length > 0
            ? `
            <div class="form-actions" style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="saveFieldSettings('${templateId}')">Save Settings</button>
                <button class="btn btn-secondary" onclick="closeModal('fields-modal')">Cancel</button>
            </div>
        `
            : `
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeModal('fields-modal')">Close</button>
            </div>
        `
        }
    `;

  openModal("fields-modal");
}

// Save field settings
async function saveFieldSettings(templateId) {
  console.log("saveFieldSettings called for template:", templateId);

  const templates = await window.electronAPI.getTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template || !template.fields) {
    alert("Template or fields not found");
    return;
  }

  const updatedFields = template.fields.map((field, index) => {
    const labelInput = document.getElementById(`label-${index}`);
    const typeSelect = document.getElementById(`type-${index}`);
    const rtlCheckbox = document.getElementById(`rtl-${index}`);
    const requiredCheckbox = document.getElementById(`required-${index}`);

    return {
      ...field,
      label: labelInput ? labelInput.value : field.label,
      type: typeSelect ? typeSelect.value : field.type,
      isRTL: rtlCheckbox ? rtlCheckbox.checked : false,
      required: requiredCheckbox ? requiredCheckbox.checked : false,
    };
  });

  try {
    await window.electronAPI.updateTemplateFields({
      templateId,
      fields: updatedFields,
    });

    closeModal("fields-modal");

    // Update the global allTemplates array
    const index = allTemplates.findIndex((t) => t.id === templateId);
    if (index !== -1) {
      allTemplates[index].fields = updatedFields;
      allTemplates[index].hasFields = updatedFields.length > 0;
    }

    // Refresh the templates view
    if (typeof renderTemplates === "function") {
      await renderTemplates();
    }

    alert("Field settings saved successfully!");
  } catch (error) {
    console.error("Error saving field settings:", error);
    alert("Error saving settings: " + error.message);
  }
}

// Remove a field from template
async function removeField(templateId, fieldIndex) {
  if (!confirm("Are you sure you want to remove this field?")) {
    return;
  }

  const templates = await window.electronAPI.getTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template || !template.fields) {
    alert("Template not found");
    return;
  }

  const updatedFields = template.fields.filter(
    (_, index) => index !== fieldIndex,
  );

  try {
    await window.electronAPI.updateTemplateFields({
      templateId,
      fields: updatedFields,
    });

    // Refresh the field editor
    editFieldTypes(templateId);

    // Update the global allTemplates array
    const index = allTemplates.findIndex((t) => t.id === templateId);
    if (index !== -1) {
      allTemplates[index].fields = updatedFields;
      allTemplates[index].hasFields = updatedFields.length > 0;
    }

    // Refresh the templates view
    if (typeof renderTemplates === "function") {
      await renderTemplates();
    }

    alert("Field removed successfully!");
  } catch (error) {
    console.error("Error removing field:", error);
    alert("Error removing field: " + error.message);
  }
}

// Delete template function
async function deleteTemplate(id) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
        return;
    }
    
    try {
        await window.electronAPI.deleteTemplate(id);
        await loadTemplates();
        alert('Template deleted successfully!');
    } catch (error) {
        console.error('Error deleting template:', error);
        alert('Error deleting template: ' + error.message);
    }
}

// Preview template function
async function previewTemplate(id) {
    try {
        await window.electronAPI.previewTemplate(id);
    } catch (error) {
        console.error('Error previewing template:', error);
        alert('Error previewing template: ' + error.message);
    }
}
// Make sure these functions are available globally
window.editFieldTypes = editFieldTypes;
window.saveFieldSettings = saveFieldSettings;
window.removeField = removeField;
// Make sure functions are available globally
window.printStaticDocument = printStaticDocument;
// Ensure functions are available globally immediately
window.loadTemplates = loadTemplates;
window.renderTemplates = renderTemplates;
window.fillTemplate = fillTemplate;
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.previewTemplate = previewTemplate;
window.printStaticDocument = printStaticDocument;
