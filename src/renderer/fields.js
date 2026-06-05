async function configureFields(templateId) {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    const modal = document.getElementById('fields-modal');
    const modalBody = document.getElementById('fields-modal-body');
    
    renderFieldsModal(template, modalBody);
    openModal('fields-modal');
}

function renderFieldsModal(template, container) {
    container.innerHTML = `
        <div class="fields-list" id="fields-list">
            ${template.fields.map((field, index) => `
                <div class="field-item">
                    <div class="field-item-header">
                        <strong>${escapeHtml(field.label || field.key)}</strong>
                        <button class="btn btn-danger btn-small" onclick="removeField('${template.id}', ${index})">Remove</button>
                    </div>
                    <div class="field-item-details">
                        <div class="form-group">
                            <label>Field Key</label>
                            <input type="text" value="${escapeHtml(field.key)}" onchange="updateField('${template.id}', ${index}, 'key', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Label</label>
                            <input type="text" value="${escapeHtml(field.label)}" onchange="updateField('${template.id}', ${index}, 'label', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Data Type</label>
                            <select onchange="updateField('${template.id}', ${index}, 'type', this.value)">
                                ${['string', 'number', 'date', 'boolean', 'email', 'image'].map(type => 
                                    `<option value="${type}" ${field.type === type ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" ${field.required ? 'checked' : ''} onchange="updateField('${template.id}', ${index}, 'required', this.checked)">
                                Required
                            </label>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="add-field-form">
            <h3>Add New Field</h3>
            <div class="field-item-details">
                <div class="form-group">
                    <label>Field Key</label>
                    <input type="text" id="new-field-key" placeholder="{example.key}">
                </div>
                <div class="form-group">
                    <label>Label</label>
                    <input type="text" id="new-field-label" placeholder="Friendly Name">
                </div>
                <div class="form-group">
                    <label>Data Type</label>
                    <select id="new-field-type">
                        ${['string', 'number', 'date', 'boolean', 'email', 'image'].map(type => 
                            `<option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="new-field-required">
                        Required
                    </label>
                </div>
            </div>
            <button class="btn btn-primary" onclick="addField('${template.id}')">Add Field</button>
        </div>
        
        <div class="form-actions" style="margin-top: 2rem;">
            <button class="btn btn-primary" onclick="saveFields('${template.id}')">Save Fields</button>
            <button class="btn btn-secondary" onclick="closeModal('fields-modal')">Cancel</button>
        </div>
    `;
}

async function addField(templateId) {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    const key = document.getElementById('new-field-key').value.trim();
    const label = document.getElementById('new-field-label').value.trim();
    const type = document.getElementById('new-field-type').value;
    const required = document.getElementById('new-field-required').checked;
    
    if (!key || !label) {
        showToast("Please fill in both key and label", "error");
        return;
    }
    
    const newField = { key, label, type, required, value: '' };
    template.fields.push(newField);
    
    // Re-render the modal
    const container = document.getElementById('fields-modal-body');
    renderFieldsModal(template, container);
}

function updateField(templateId, fieldIndex, property, value) {
    const template = allTemplates.find(t => t.id === templateId);
    if (template && template.fields[fieldIndex]) {
        template.fields[fieldIndex][property] = value;
    }
}

async function removeField(templateId, fieldIndex) {
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
        template.fields.splice(fieldIndex, 1);
        const container = document.getElementById('fields-modal-body');
        renderFieldsModal(template, container);
    }
}

async function saveFields(templateId) {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    try {
        await window.electronAPI.updateTemplateFields({
            templateId,
            fields: template.fields
        });
        
        closeModal('fields-modal');
        await loadTemplates();
        alert('Fields saved successfully!');
    } catch (error) {
        showToast('Error saving fields: ' + error.message, "error");
    }
}