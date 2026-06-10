// Navigation to fill form
async function fillTemplate(id) {
  console.log("fillTemplate called with id:", id);
  try {
    // Always get fresh template data
    const templates = await window.electronAPI.getTemplates();
    const foundTemplate = templates.find((t) => t.id === id);
    if (foundTemplate) {
      window.selectedTemplate = foundTemplate;
      console.log("Selected template:", window.selectedTemplate);
      if (typeof switchView === "function") {
        switchView("fill-form");
      } else {
        console.error("switchView missing");
      }
    } else {
      showToast("Template not found", "warning");
    }
  } catch (error) {
    console.error("Error loading template:", error);
    showToast("Error loading template", "error");
  }
}
async function editTemplate(id) {
  const template = allTemplates.find((t) => t.id === id);
  if (!template) {
    showToast("Template not found", "warning");
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
                      "Forms",
                      "Attendance Sheets",
                      "Contracts",
                      "Invoices",
                      "Reports",
                      "Letters",
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
      showToast("Template name is required", "warning");
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
      showToast("Template updated successfully!", "success");
    } catch (error) {
      console.error("Error updating template:", error);
      showToast("Error updating template: " + error.message, "error");
    }
  });

  openModal("template-modal");
}
// Template Management
// Load and display templates
async function loadTemplates() {
  try {
    allTemplates = await window.electronAPI.getTemplates();
    renderTemplates();
  } catch (error) {
    console.error("Error loading templates:", error);
  }
}
// async function renderTemplates() {
//   const searchTerm =
//     document.getElementById("template-search")?.value?.toLowerCase() || "";
//   const typeFilter = document.getElementById("type-filter")?.value || "all";
//   const fillableFilter =
//     document.getElementById("fillable-filter")?.value || "all";

//   let filtered = allTemplates;

//   // Apply search
//   if (searchTerm) {
//     filtered = filtered.filter(
//       (t) =>
//         t.name.toLowerCase().includes(searchTerm) ||
//         (t.description && t.description.toLowerCase().includes(searchTerm)) ||
//         (t.category && t.category.toLowerCase().includes(searchTerm)),
//     );
//   }

//   // Apply type filter
//   if (typeFilter !== "all") {
//     filtered = filtered.filter((t) => t.type === typeFilter);
//   }

//   // Apply fillable filter
//   if (fillableFilter === "static") {
//     filtered = filtered.filter((t) => !t.hasFields);
//   } else if (fillableFilter === "fillable") {
//     filtered = filtered.filter((t) => t.hasFields);
//   }

//   const container = document.getElementById("templates-grid");

//   if (!container) return;

//   if (filtered.length === 0) {
//     container.innerHTML =
//       '<p class="no-results">No templates found matching your criteria.</p>';
//     return;
//   }

//   container.innerHTML = filtered
//     .map(
//       (template) => `
//         <div class="template-card">
//             <div class="template-badges">
//         <span class="template-type-badge">🖨️ ${template.recordCount || 0}</span>
//         <span class="template-type-badge">${template.type === "word" ? "DOCX" : template.type === "excel" ? "XLSX" : "PDF"}</span>
//         <span class="badge ${template.hasFields ? "badge-fillable" : "badge-static"}">
//             ${template.hasFields ? "Fillable" : "Static"}
//         </span>
//     </div>
//             <p>${escapeHtml(template.description || "No description")}</p>
//             <p class="category">Category: ${escapeHtml(template.category)}</p>
//             <p>
//                 <span class="badge ${template.hasFields ? "badge-fillable" : "badge-static"}">
//                     ${template.hasFields ? "Fillable" : "Static"}
//                 </span>
//                 ${template.hasFields ? `<span style="font-size: 0.75rem;"> (${template.fields?.length || 0} fields)</span>` : ""}
//             </p>
            
//             <div class="template-card-actions">
//                 ${
//                   template.hasFields
//                     ? `
//                     <button class="btn btn-success btn-small" onclick="fillTemplate('${template.id}')">Fill Form</button>
//                     <button class="btn btn-primary btn-small" onclick="editTemplate('${template.id}')">Edit</button>
//                     <button class="btn btn-info btn-small" onclick="editFieldTypes('${template.id}')">⚙️ Fields</button>
//                     <button class="btn btn-secondary btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
//                     <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
//                 `
//                     : `
//                     <button class="btn btn-success btn-small" onclick="printStaticDocument('${template.id}')">Print</button>
//                     <button class="btn btn-primary btn-small" onclick="editTemplate('${template.id}')">Edit</button>
//                     <button class="btn btn-info btn-small" onclick="editFieldTypes('${template.id}')">⚙️ Fields</button>
//                     <button class="btn btn-secondary btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
//                     <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
//                 `
//                 }
//             </div>
//         </div>
//     `,
//     )
//     .join("");
// }
async function renderTemplates() {
  const searchTerm =
    document.getElementById("template-search")?.value?.toLowerCase() || "";
  const typeFilter = document.getElementById("type-filter")?.value || "all";
  const fillableFilter =
    document.getElementById("fillable-filter")?.value || "all";

  let filtered = allTemplates;

  if (searchTerm) {
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm) ||
        (t.description && t.description.toLowerCase().includes(searchTerm)) ||
        (t.category && t.category.toLowerCase().includes(searchTerm))
    );
  }
  if (typeFilter !== "all") {
    filtered = filtered.filter((t) => t.type === typeFilter);
  }
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
      <div class="template-card" data-template-id="${template.id}">
        <div>
          <div class="template-card-header">
            <h3>${escapeHtml(template.name)}</h3>
            <div class="template-badges">
              <span class="template-type-badge">${template.type.toUpperCase()}</span>
              <span class="template-print-count-badge">🖨️ ${template.recordCount || 0}</span>
              <span class="badge ${template.hasFields ? "badge-fillable" : "badge-static"}">
                ${template.hasFields ? "Fillable" : "Static"}
              </span>
            </div>
          </div>
          <p>${escapeHtml(template.description || "No description provided")}</p>
          <div class="category">
            Category: ${escapeHtml(template.category || "General")}
            ${template.hasFields ? ` • (${template.fields?.length || 0} fields)` : ""}
          </div>
        </div>

        <div class="template-card-actions">
          ${
            template.hasFields
              ? `<button class="btn btn-primary btn-small" onclick="fillTemplate('${template.id}')">Fill Form</button>
                 <button class="btn btn-batch btn-small" onclick="batchGenerateTemplate('${template.id}')">⚡ Batch</button>`
              : `<button class="btn btn-success btn-small" onclick="printStaticDocument('${template.id}')">Print</button>`
          }
          <button class="btn btn-outline btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
          <button class="btn btn-outline btn-small" onclick="editTemplate('${template.id}')">Edit</button>
          <button class="btn btn-outline btn-small" onclick="editFieldTypes('${template.id}')">⚙️ Fields</button>
          <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
        </div>
      </div>
    `
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
      showToast("Template not found", "warning");
      return;
    }

    // Check if template has fields
    if (template.hasFields) {
      showToast(
        "This is a fillable template. Please fill out the form first before printing.",
        "warning",
      );
      return;
    }

    // Verify the file exists
    if (!template.filePath) {
      showToast(
        "Template file not found. Please re-upload the template.",
        "error",
      );
      return;
    }

    console.log("Printing static template:", template.name, template.filePath);

    // Confirm with user
    const confirmPrint = await showConfirm(
      `Print "${template.name}" to default printer?`,
      "Print",
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
      showToast("Document sent to printer successfully!", "success");
    } else {
      showToast(
        "Failed to print. Please check if a printer is available.",
        "error",
      );
    }

    // Reset buttons
    printButtons.forEach((btn) => {
      btn.textContent = "Print";
      btn.disabled = false;
    });
  } catch (error) {
    console.error("Error printing static document:", error);
    showToast("Error printing: " + error.message, "error");

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
// async function editFieldTypes(templateId) {
//   console.log("editFieldTypes called for template:", templateId);

//   // Get the latest template data
//   const templates = await window.electronAPI.getTemplates();
//   const template = templates.find((t) => t.id === templateId);

//   if (!template) {
//     showToast("Template not found", "warning");
//     return;
//   }

//   const modal = document.getElementById("fields-modal");
//   const modalBody = document.getElementById("fields-modal-body");
//   const modalTitle = document.querySelector("#fields-modal h2");

//   if (!modal || !modalBody) {
//     console.error("Fields modal not found in DOM");
//     showToast("Modal not found. Please check your HTML.", "error");
//     return;
//   }

//   modalTitle.textContent = `Configure Fields: ${template.name}`;
// // In editFieldTypes() – filter out hidden fields before rendering
// const visibleFields = template.fields.filter(f => !f.key.endsWith('_hidden'));
//   modalBody.innerHTML = `
//     <div class="fields-list">
//       ${
//         template.fields && template.fields.length > 0
//           ? template.fields
//               .map(
//                 (field, index) => `
//             <div class="field-item">
//               <div class="field-item-header">
//                 <strong>${escapeHtml(field.key)}</strong>
//                 <button class="btn btn-danger btn-small" onclick="removeField('${templateId}', ${index})">Remove</button>
//               </div>
//               <div class="field-item-details">
//                 <div class="form-group">
//                   <label>Display Label</label>
//                   <input type="text" id="label-${index}" value="${escapeHtml(field.label || "")}" class="field-label-input">
//                 </div>
//                 <div class="form-group">
//                   <label>Field Type</label>
//                   <select id="type-${index}" class="field-type-select" onchange="toggleChoicesInput(${index})">
//                     <option value="string" ${field.type === "string" ? "selected" : ""}>Text</option>
//                     <option value="number" ${field.type === "number" ? "selected" : ""}>Number</option>
//                     <option value="date" ${field.type === "date" ? "selected" : ""}>Date Picker</option>
//                     <option value="email" ${field.type === "email" ? "selected" : ""}>Email</option>
//                     <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>Text Area</option>
//                     <option value="boolean" ${field.type === "boolean" ? "selected" : ""}>Yes/No</option>
//                     <option value="dropdown" ${field.type === "dropdown" ? "selected" : ""}>Dropdown</option>
//                   </select>
//                 </div>
//                 <div class="form-group choices-group" id="choices-group-${index}" style="display: ${field.type === "dropdown" ? "block" : "none"}">
//                   <label>Dropdown Choices (one per line)</label>
//                   <textarea id="choices-${index}" rows="3" placeholder="Option 1&#10;Option 2&#10;Option 3">${field.choices ? field.choices.join("\n") : ""}</textarea>
//                   <small>Each line becomes one selectable option.</small>
//                 </div>
//                 <div class="form-group">
//                   <label>
//                     <input type="checkbox" id="rtl-${index}" ${field.isRTL ? "checked" : ""}>
//                     RTL (Divehi) Support
//                   </label>
//                 </div>
//                 <div class="form-group">
//                   <label>
//                     <input type="checkbox" id="required-${index}" ${field.required ? "checked" : ""}>
//                     Required Field
//                   </label>
//                 </div>
//               </div>
//             </div>
//           `,
//               )
//               .join("")
//           : "<p>No fields detected...</p>"
//       }
//     </div>
//     <div class="form-actions" style="margin-top: 2rem;">
//       <button class="btn btn-primary" onclick="saveFieldSettings('${templateId}')">Save Settings</button>
//       <button class="btn btn-secondary" onclick="closeModal('fields-modal')">Cancel</button>
//     </div>
//   `;

//   openModal("fields-modal");
// }
async function editFieldTypes(templateId) {
  console.log("editFieldTypes called for template:", templateId);

  // Get the latest template data
  const templates = await window.electronAPI.getTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template) {
    showToast("Template not found", "warning");
    return;
  }

  // 🔽 FILTER OUT HIDDEN FIELDS (keys ending with '_hidden')
  const visibleFields = template.fields.filter(
    (f) => !f.key.endsWith("_hidden"),
  );

  const modal = document.getElementById("fields-modal");
  const modalBody = document.getElementById("fields-modal-body");
  const modalTitle = document.querySelector("#fields-modal h2");

  if (!modal || !modalBody) {
    console.error("Fields modal not found in DOM");
    showToast("Modal not found. Please check your HTML.", "error");
    return;
  }

  modalTitle.textContent = `Configure Fields: ${template.name}`;

  modalBody.innerHTML = `
    <div class="fields-list">
      ${
        visibleFields.length > 0
          ? visibleFields
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
                  <select id="type-${index}" class="field-type-select" onchange="toggleChoicesInput(${index})">
                    <option value="string" ${field.type === "string" ? "selected" : ""}>Text</option>
                    <option value="number" ${field.type === "number" ? "selected" : ""}>Number</option>
                    <option value="date" ${field.type === "date" ? "selected" : ""}>Date Picker</option>
                    <option value="email" ${field.type === "email" ? "selected" : ""}>Email</option>
                    <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>Text Area</option>
                    <option value="boolean" ${field.type === "boolean" ? "selected" : ""}>Yes/No</option>
                    <option value="dropdown" ${field.type === "dropdown" ? "selected" : ""}>Dropdown</option>
                  </select>
                </div>
                <div class="form-group choices-group" id="choices-group-${index}" style="display: ${field.type === "dropdown" ? "block" : "none"}">
                  <label>Dropdown Choices (one per line)</label>
                  <textarea id="choices-${index}" rows="3" placeholder="Option 1&#10;Option 2&#10;Option 3">${field.choices ? field.choices.join("\n") : ""}</textarea>
                  <small>Each line becomes one selectable option.</small>
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
          : "<p>No visible fields detected. Hidden fields are not shown here.</p>"
      }
    </div>
    <div class="form-actions" style="margin-top: 2rem;">
      <button class="btn btn-primary" onclick="saveFieldSettings('${templateId}')">Save Settings</button>
      <button class="btn btn-secondary" onclick="closeModal('fields-modal')">Cancel</button>
    </div>
  `;

  openModal("fields-modal");
}

// Helper function to toggle choices input visibility
function toggleChoicesInput(index) {
  const typeSelect = document.getElementById(`type-${index}`);
  const choicesGroup = document.getElementById(`choices-group-${index}`);
  if (typeSelect && choicesGroup) {
    choicesGroup.style.display =
      typeSelect.value === "dropdown" ? "block" : "none";
  }
}
// Save field settings
// async function saveFieldSettings(templateId) {
//   console.log("saveFieldSettings called for template:", templateId);

//   const templates = await window.electronAPI.getTemplates();
//   const template = templates.find((t) => t.id === templateId);

//   if (!template || !template.fields) {
//     showToast("Template or fields not found", "warning");
//     return;
//   }

//   const updatedFields = template.fields.map((field, index) => {
//     const labelInput = document.getElementById(`label-${index}`);
//     const typeSelect = document.getElementById(`type-${index}`);
//     const rtlCheckbox = document.getElementById(`rtl-${index}`);
//     const requiredCheckbox = document.getElementById(`required-${index}`);

//     return {
//       ...field,
//       label: labelInput ? labelInput.value : field.label,
//       type: typeSelect ? typeSelect.value : field.type,
//       isRTL: rtlCheckbox ? rtlCheckbox.checked : false,
//       required: requiredCheckbox ? requiredCheckbox.checked : false,
//     };
//   });

//   try {
//     await window.electronAPI.updateTemplateFields({
//       templateId,
//       fields: updatedFields,
//     });

//     closeModal("fields-modal");

//     // Update the global allTemplates array
//     const index = allTemplates.findIndex((t) => t.id === templateId);
//     if (index !== -1) {
//       allTemplates[index].fields = updatedFields;
//       allTemplates[index].hasFields = updatedFields.length > 0;
//     }

//     // Refresh the templates view
//     if (typeof renderTemplates === "function") {
//       await renderTemplates();
//     }

//     showToast("Field settings saved successfully!", "success");
//   } catch (error) {
//     console.error("Error saving field settings:", error);
//     showToast("Error saving settings: " + error.message, "error");
//   }
// }

// Modified saveFieldSettings to store choices
// Save field settings (including dropdown choices)
async function saveFieldSettings(templateId) {
  console.log("saveFieldSettings called for template:", templateId);

  // Get the latest template data
  let template = allTemplates.find((t) => t.id === templateId);
  if (!template) {
    const templates = await window.electronAPI.getTemplates();
    template = templates.find((t) => t.id === templateId);
  }
  if (!template || !template.fields) {
    showToast("Template or fields not found", "warning");
    return;
  }
  // Separate hidden fields from the original template
  const hiddenFields = template.fields.filter((f) => f.key.endsWith("_hidden"));

  // Build updated fields array from form inputs
  const updatedVisibleFields = template.fields
    .filter((f) => !f.key.endsWith("_hidden"))
    .map((field, index) => {
      const labelInput = document.getElementById(`label-${index}`);
      const typeSelect = document.getElementById(`type-${index}`);
      const rtlCheckbox = document.getElementById(`rtl-${index}`);
      const requiredCheckbox = document.getElementById(`required-${index}`);
      const choicesTextarea = document.getElementById(`choices-${index}`);

      let choices = null;
      if (typeSelect && typeSelect.value === "dropdown" && choicesTextarea) {
        choices = choicesTextarea.value
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line !== "");
      }

      return {
        ...field,
        label: labelInput ? labelInput.value : field.label,
        type: typeSelect ? typeSelect.value : field.type,
        isRTL: rtlCheckbox ? rtlCheckbox.checked : false,
        required: requiredCheckbox ? requiredCheckbox.checked : false,
        choices: choices,
      };
    });
  // Combine visible + hidden
  const updatedFields = [...updatedVisibleFields, ...hiddenFields];

  // Preserve dateRangeConfig if it exists
  const dateRangeConfig = template.dateRangeConfig || null;

  try {
    // Save fields to backend
    await window.electronAPI.updateTemplateFields({
      templateId,
      fields: updatedFields,
    });

    // If there is a dateRangeConfig, also update the template to keep it
    if (dateRangeConfig) {
      await window.electronAPI.updateTemplate({
        id: templateId,
        updates: { dateRangeConfig: dateRangeConfig },
      });
    }

    // Update global state
    const index = allTemplates.findIndex((t) => t.id === templateId);
    if (index !== -1) {
      allTemplates[index].fields = updatedFields;
      allTemplates[index].hasFields = updatedFields.length > 0;
      if (dateRangeConfig)
        allTemplates[index].dateRangeConfig = dateRangeConfig;
    }

    // Refresh UI
    if (typeof renderTemplates === "function") await renderTemplates();
    closeModal("fields-modal");
    showToast("Field settings saved successfully!", "success");
  } catch (error) {
    console.error("Error saving field settings:", error);
    showToast("Error saving settings: " + error.message, "error");
  }
}

// Remove a field from template
async function removeField(templateId, fieldIndex) {
  if (!await showConfirm("Are you sure you want to remove this field?", "Remove")) {
    return;
  }

  const templates = await window.electronAPI.getTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template || !template.fields) {
    showToast("Template not found", "warning");
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

    showToast("Field removed successfully!", "success");
  } catch (error) {
    console.error("Error removing field:", error);
    showToast("Error removing field: " + error.message, "error");
  }
}

// Delete template function
async function deleteTemplate(id) {
  if (
    !await showConfirm(
      "Are you sure you want to delete this template? This action cannot be undone.",
      "Delete",
    )
  ) {
    return;
  }

  try {
    await window.electronAPI.deleteTemplate(id);
    await loadTemplates();
    showToast("Template deleted successfully!", "success");
  } catch (error) {
    console.error("Error deleting template:", error);
    showToast("Error deleting template: " + error.message, "error");
  }
}

// Preview template function
async function previewTemplate(id) {
  try {
    await window.electronAPI.previewTemplate(id);
  } catch (error) {
    console.error("Error previewing template:", error);
    showToast("Error previewing template: " + error.message, "error");
  }
}
// ============================================================
// BATCH GENERATION
// ============================================================

// State shared across batch modal steps
let _batchTemplateId = null;
let _batchParsedRows = [];    // raw row objects from parsed file
let _batchColumns = [];       // column headers from file
let _batchTemplate = null;
let _batchCombinePdf = false; // whether to combine output into a single PDF

/**
 * Entry point — called from template card "⚡ Batch" button.
 */
async function batchGenerateTemplate(templateId) {
  const templates = await window.electronAPI.getTemplates();
  const template = templates.find((t) => t.id === templateId);
  if (!template) { showToast("Template not found", "warning"); return; }
  if (!template.hasFields || !template.fields || template.fields.length === 0) {
    showToast("This template has no fields — batch generation requires fillable fields.", "warning");
    return;
  }

  _batchTemplateId = templateId;
  _batchTemplate = template;
  _batchParsedRows = [];
  _batchColumns = [];
  _batchCombinePdf = false;
  _batchCurrentStep = "upload";

  // Reset modal to step 1
  document.getElementById("batch-modal-title").textContent = `Batch Generate: ${escapeHtml(template.name)}`;
  document.getElementById("batch-modal-subtitle").textContent =
    `${template.fields.filter(f => !f.key.endsWith("_hidden")).length} fillable fields · ${template.type.toUpperCase()} output`;

  // Reset upload zone
  const uploadZone = document.getElementById("batch-upload-zone");
  const fileInfo = document.getElementById("batch-file-info");
  if (uploadZone) uploadZone.style.display = "";
  if (fileInfo) fileInfo.style.display = "none";
  // Reset next button label
  const nextBtn = document.getElementById("batch-next-btn");
  if (nextBtn) { nextBtn.style.display = ""; nextBtn.disabled = true; nextBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg> Next`; }
  // Reset cancel
  const cancelBtn = document.getElementById("batch-cancel-btn");
  if (cancelBtn) cancelBtn.disabled = false;

  _batchShowStep("upload");
  _batchSetNextBtn("disabled");

  openModal("batch-modal");
  _batchWireModal();
}

/**
 * Wire up all event handlers inside the batch modal.
 * Safe to call multiple times — uses a flag guard.
 */
let _batchWired = false;
function _batchWireModal() {
  if (_batchWired) return;
  _batchWired = true;

  // Close / cancel
  const modal = document.getElementById("batch-modal");
  modal.querySelector(".close").addEventListener("click", () => closeModal("batch-modal"));
  document.getElementById("batch-cancel-btn").addEventListener("click", () => closeModal("batch-modal"));

  // Upload zone — click to browse
  document.getElementById("batch-browse-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    _batchOpenFilePicker();
  });
  document.getElementById("batch-change-file-btn").addEventListener("click", () => _batchOpenFilePicker());

  // Upload zone — drag & drop
  const zone = document.getElementById("batch-upload-zone");
  zone.addEventListener("click", () => _batchOpenFilePicker());
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) _batchParseFile(file);
  });

  // Next button
  document.getElementById("batch-next-btn").addEventListener("click", _batchNextStep);
}

async function _batchOpenFilePicker() {
  const filePath = await window.electronAPI.openCsvXlsxDialog();
  if (!filePath) return;
  // We need to read file contents. Since file.path is unavailable in sandboxed renderer,
  // the user must pick via Electron dialog, but we still need to parse it renderer-side.
  // We'll pass the path back to main via a dedicated read-file IPC, or use fetch on file://
  // Actually we already have the path from openCsvXlsxDialog — read it via fetch file://
  try {
    const ext = filePath.split(".").pop().toLowerCase();
    const url = "file://" + filePath.replace(/\\/g, "/");
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();

    let rows = [], columns = [];

    if (ext === "csv") {
      const text = new TextDecoder("utf-8").decode(buf);
      const parsed = _batchParseCSV(text);
      columns = parsed.columns;
      rows = parsed.rows;
    } else if (ext === "xlsx") {
      // Parse xlsx in renderer using a minimal built-in approach:
      // We'll send the buffer to main for parsing via a small helper IPC,
      // or we can parse it here with the SheetJS-compatible approach.
      // Since index.js already has ExcelJS, use a dedicated IPC for reading.
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const parsed = await window.electronAPI.parseSpreadsheetBuffer({ base64 });
      columns = parsed.columns;
      rows = parsed.rows;
    } else {
      showToast("Unsupported file type. Please select a CSV or XLSX file.", "warning");
      return;
    }

    if (rows.length === 0) {
      showToast("The file appears to be empty or has no data rows.", "warning");
      return;
    }

    _batchColumns = columns;
    _batchParsedRows = rows;

    const fileName = filePath.split(/[\\/]/).pop();
    document.getElementById("batch-upload-zone").style.display = "none";
    const fileInfo = document.getElementById("batch-file-info");
    fileInfo.style.display = "flex";
    document.getElementById("batch-file-name").textContent = fileName;
    document.getElementById("batch-row-count").textContent = `${rows.length} row${rows.length !== 1 ? "s" : ""} detected`;

    _batchSetNextBtn("enabled", "Map Fields →");
    _batchBuildMappingTable();
  } catch (err) {
    console.error("[Batch] File parse error:", err);
    showToast("Could not read the file: " + err.message, "error");
  }
}

function _batchParseFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const buf = e.target.result;
    const ext = file.name.split(".").pop().toLowerCase();
    let rows = [], columns = [];

    try {
      if (ext === "csv") {
        const text = new TextDecoder("utf-8").decode(buf);
        const parsed = _batchParseCSV(text);
        columns = parsed.columns;
        rows = parsed.rows;
      } else if (ext === "xlsx") {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const parsed = await window.electronAPI.parseSpreadsheetBuffer({ base64 });
        columns = parsed.columns;
        rows = parsed.rows;
      } else {
        showToast("Unsupported file type. Please drop a CSV or XLSX file.", "warning");
        return;
      }

      if (rows.length === 0) {
        showToast("The file appears to be empty or has no data rows.", "warning");
        return;
      }

      _batchColumns = columns;
      _batchParsedRows = rows;

      document.getElementById("batch-upload-zone").style.display = "none";
      const fileInfo = document.getElementById("batch-file-info");
      fileInfo.style.display = "flex";
      document.getElementById("batch-file-name").textContent = file.name;
      document.getElementById("batch-row-count").textContent = `${rows.length} row${rows.length !== 1 ? "s" : ""} detected`;

      _batchSetNextBtn("enabled", "Map Fields →");
      _batchBuildMappingTable();
    } catch (err) {
      console.error("[Batch] Drag-drop parse error:", err);
      showToast("Could not read the file: " + err.message, "error");
    }
  };
  reader.readAsArrayBuffer(file);
}

/**
 * Minimal RFC 4180-compliant CSV parser.
 * Returns { columns: string[], rows: Object[] }
 */
function _batchParseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length < 2) return { columns: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { result.push(cur); cur = ""; }
        else { cur += ch; }
      }
    }
    result.push(cur);
    return result;
  };

  const columns = parseLine(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map((line) => {
    const vals = parseLine(line);
    const obj = {};
    columns.forEach((col, i) => { obj[col] = vals[i] !== undefined ? vals[i] : ""; });
    return obj;
  });

  return { columns, rows };
}

function _batchBuildMappingTable() {
  if (!_batchTemplate) return;
  const visibleFields = (_batchTemplate.fields || []).filter(
    (f) => !f.key.endsWith("_hidden")
  );
  const firstRow = _batchParsedRows[0] || {};
  const tbody = document.getElementById("batch-mapping-body");

  const colOptions = ['<option value="">— skip —</option>']
    .concat(_batchColumns.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`))
    .join("");

  tbody.innerHTML = visibleFields.map((field, idx) => {
    // Auto-match: case-insensitive exact or partial match on key / label
    const autoMatch = _batchColumns.find(
      (c) =>
        c.toLowerCase() === field.key.toLowerCase() ||
        (field.label && c.toLowerCase() === field.label.toLowerCase()) ||
        c.toLowerCase().replace(/[\s_-]/g, "") === field.key.toLowerCase().replace(/[\s_-]/g, "")
    ) || "";

    const selectedOptions = _batchColumns.map(
      (c) => `<option value="${escapeHtml(c)}" ${c === autoMatch ? "selected" : ""}>${escapeHtml(c)}</option>`
    );
    const opts = '<option value="">— skip —</option>' + selectedOptions.join("");

    const preview = autoMatch ? escapeHtml(String(firstRow[autoMatch] || "")) : '<em class="log-info">—</em>';

    return `<tr>
      <td>
        <div class="batch-field-label">${escapeHtml(field.label || field.key)}</div>
        <span class="batch-field-key">${escapeHtml(field.key)}</span>
      </td>
      <td>
        <select data-field-key="${escapeHtml(field.key)}" data-field-idx="${idx}" onchange="_batchUpdatePreview(this)">
          ${opts}
        </select>
      </td>
      <td>
        <span class="batch-preview-val" id="batch-preview-${idx}">${preview}</span>
      </td>
    </tr>`;
  }).join("");

  // Render the "Combined PDF" toggle below the table (only for Word templates)
  const isWordTemplate = (_batchTemplate.type === "word");
  let pdfToggleEl = document.getElementById("batch-combine-pdf-row");
  if (!pdfToggleEl) {
    pdfToggleEl = document.createElement("div");
    pdfToggleEl.id = "batch-combine-pdf-row";
    pdfToggleEl.className = "batch-combine-pdf-row";
    const mapStep = document.getElementById("batch-step-mapping");
    if (mapStep) mapStep.appendChild(pdfToggleEl);
  }
  if (isWordTemplate) {
    pdfToggleEl.style.display = "";
    pdfToggleEl.innerHTML = `
      <label class="batch-combine-pdf-label">
        <input type="checkbox" id="batch-combine-pdf-chk" ${_batchCombinePdf ? "checked" : ""}>
        <span class="batch-combine-pdf-text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Combine all documents into a single PDF
          <span class="batch-combine-pdf-hint">(requires Microsoft Word to be installed)</span>
        </span>
      </label>`;
    document.getElementById("batch-combine-pdf-chk").onchange = function() {
      _batchCombinePdf = this.checked;
    };
  } else {
    pdfToggleEl.style.display = "none";
  }
}

function _batchUpdatePreview(selectEl) {
  const idx = selectEl.getAttribute("data-field-idx");
  const col = selectEl.value;
  const firstRow = _batchParsedRows[0] || {};
  const previewEl = document.getElementById(`batch-preview-${idx}`);
  if (previewEl) {
    previewEl.innerHTML = col
      ? escapeHtml(String(firstRow[col] || ""))
      : '<em class="log-info">—</em>';
  }
}

function _batchShowStep(step) {
  ["upload", "mapping", "progress", "done"].forEach((s) => {
    const el = document.getElementById(`batch-step-${s}`);
    if (el) el.style.display = s === step ? "block" : "none";
  });
}

function _batchSetNextBtn(state, label) {
  const btn = document.getElementById("batch-next-btn");
  if (!btn) return;
  if (state === "disabled") {
    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg> ${label || "Next"}`;
  } else if (state === "enabled") {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg> ${label || "Next"}`;
  } else if (state === "hidden") {
    btn.style.display = "none";
  } else if (state === "show") {
    btn.style.display = "";
  }
}

let _batchCurrentStep = "upload"; // upload | mapping | generating | done

async function _batchNextStep() {
  if (_batchCurrentStep === "upload") {
    // Move to mapping
    _batchShowStep("mapping");
    _batchCurrentStep = "mapping";
    _batchSetNextBtn("enabled", "Generate Documents →");
  } else if (_batchCurrentStep === "mapping") {
    // Collect mapping and start generation
    await _batchRunGeneration();
  } else if (_batchCurrentStep === "done") {
    closeModal("batch-modal");
  }
}

async function _batchRunGeneration() {
  if (!_batchTemplate || _batchParsedRows.length === 0) return;

  // Build mapping: fieldKey → column name
  const mapping = {};
  document.querySelectorAll("#batch-mapping-body select").forEach((sel) => {
    const key = sel.getAttribute("data-field-key");
    if (key && sel.value) mapping[key] = sel.value;
  });

  // Build rows with only mapped values
  const rows = _batchParsedRows.map((rawRow) => {
    const obj = {};
    Object.entries(mapping).forEach(([fieldKey, colName]) => {
      obj[fieldKey] = rawRow[colName] !== undefined ? String(rawRow[colName]) : "";
    });
    return obj;
  });

  // Switch to progress step
  _batchShowStep("progress");
  _batchCurrentStep = "generating";
  _batchSetNextBtn("disabled", "Generating…");
  document.getElementById("batch-cancel-btn").disabled = true;

  const total = rows.length;
  const logEl = document.getElementById("batch-log");
  const barEl = document.getElementById("batch-progress-bar");
  const textEl = document.getElementById("batch-progress-text");
  const pctEl = document.getElementById("batch-progress-pct");

  const combineLabel = _batchCombinePdf ? " + combining into PDF…" : "";
  logEl.innerHTML = `<span class="log-info">Starting batch generation of ${total} document${total !== 1 ? "s" : ""}${combineLabel}</span>\n`;

  const outputFormat = _batchTemplate.type === "excel" ? "xlsx" : "docx";

  // Process in chunks of 5 so the UI can update
  const CHUNK = 5;
  let succeeded = 0;
  let failed = 0;
  const successOutputPaths = []; // track for PDF merging

  for (let start = 0; start < total; start += CHUNK) {
    const chunk = rows.slice(start, Math.min(start + CHUNK, total));

    // Run chunk via IPC
    let chunkResult;
    try {
      chunkResult = await window.electronAPI.batchGenerateDocuments({
        templateId: _batchTemplateId,
        rows: chunk,
        outputFormat,
      });
    } catch (err) {
      // Whole chunk failed
      chunk.forEach((_, i) => {
        logEl.innerHTML += `<span class="log-err">✗ Row ${start + i + 1}: ${escapeHtml(err.message)}</span>\n`;
        failed++;
      });
      continue;
    }

    chunkResult.results.forEach((r) => {
      const rowNum = start + r.row;
      if (r.success) {
        logEl.innerHTML += `<span class="log-ok">✓ Row ${rowNum}: ${escapeHtml(r.outputFileName)}</span>\n`;
        succeeded++;
        if (r.outputPath) successOutputPaths.push(r.outputPath);
      } else {
        logEl.innerHTML += `<span class="log-err">✗ Row ${rowNum}: ${escapeHtml(r.error || "Unknown error")}</span>\n`;
        failed++;
      }
    });

    // Update progress
    const done = Math.min(start + CHUNK, total);
    const pct = Math.round((done / total) * 100);
    barEl.style.width = pct + "%";
    textEl.textContent = `${done} of ${total}`;
    pctEl.textContent = pct + "%";
    logEl.scrollTop = logEl.scrollHeight;

    // Yield to keep UI responsive
    await new Promise((r) => setTimeout(r, 10));
  }

  barEl.style.width = "100%";
  textEl.textContent = `${total} of ${total}`;
  pctEl.textContent = "100%";
  logEl.scrollTop = logEl.scrollHeight;

  // ── Combined PDF step ──────────────────────────────────────────────────────
  let combinedPdfFileName = null;
  if (_batchCombinePdf && successOutputPaths.length > 0 && _batchTemplate.type === "word") {
    logEl.innerHTML += `<span class="log-info">Converting and merging ${successOutputPaths.length} document${successOutputPaths.length !== 1 ? "s" : ""} into PDF…</span>\n`;
    logEl.scrollTop = logEl.scrollHeight;
    try {
      const mergeResult = await window.electronAPI.batchMergeToPdf({
        docxPaths: successOutputPaths,
        templateName: _batchTemplate.name,
      });
      combinedPdfFileName = mergeResult.combinedFileName;
      logEl.innerHTML += `<span class="log-ok">✅ Combined PDF created: ${escapeHtml(mergeResult.combinedFileName)} (${mergeResult.pageCount} page${mergeResult.pageCount !== 1 ? "s" : ""})</span>\n`;
      if (mergeResult.conversionErrors && mergeResult.conversionErrors.length > 0) {
        logEl.innerHTML += `<span class="log-err">⚠ ${mergeResult.conversionErrors.length} file${mergeResult.conversionErrors.length !== 1 ? "s" : ""} could not be converted to PDF.</span>\n`;
      }
    } catch (mergeErr) {
      logEl.innerHTML += `<span class="log-err">✗ PDF merge failed: ${escapeHtml(mergeErr.message)}</span>\n`;
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  // Done step
  _batchShowStep("done");
  _batchCurrentStep = "done";

  const doneIcon = document.getElementById("batch-done-icon");
  const doneSummary = document.getElementById("batch-done-summary");
  doneIcon.textContent = failed === 0 ? "✅" : "⚠️";

  if (_batchCombinePdf && combinedPdfFileName) {
    doneSummary.innerHTML = `
      <strong>${succeeded}</strong> document${succeeded !== 1 ? "s" : ""} generated and merged into:<br>
      <code style="font-size:0.85em;word-break:break-all;">${escapeHtml(combinedPdfFileName)}</code><br>
      ${failed > 0 ? `<span style="color:var(--accent-danger)">${failed} row${failed !== 1 ? "s" : ""} failed.</span><br>` : ""}
      Saved to the outputs folder.
    `;
  } else if (_batchCombinePdf) {
    doneSummary.innerHTML = `
      <strong>${succeeded}</strong> document${succeeded !== 1 ? "s" : ""} generated successfully.<br>
      ${failed > 0 ? `<span style="color:var(--accent-danger)">${failed} row${failed !== 1 ? "s" : ""} failed.</span><br>` : ""}
      <span style="color:var(--accent-warning)">PDF merge did not complete — individual files saved to the outputs folder.</span>
    `;
  } else {
    doneSummary.innerHTML = `
      <strong>${succeeded}</strong> document${succeeded !== 1 ? "s" : ""} generated successfully.<br>
      ${failed > 0 ? `<span style="color:var(--accent-danger)">${failed} row${failed !== 1 ? "s" : ""} failed.</span><br>` : ""}
      Files saved to the outputs folder.
    `;
  }

  document.getElementById("batch-cancel-btn").disabled = false;
  _batchSetNextBtn("show");
  _batchSetNextBtn("enabled", "Close");

  // Reload templates to update print count
  await loadTemplates();
}

window.batchGenerateTemplate = batchGenerateTemplate;
window._batchUpdatePreview = _batchUpdatePreview;

// Make sure functions are available globally
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
// Make sure toggleChoicesInput is defined globally
window.toggleChoicesInput = toggleChoicesInput;