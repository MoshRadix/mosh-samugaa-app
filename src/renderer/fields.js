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
                        <span class="field-key-badge">{${escapeHtml(field.key)}}</span>
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
                            <label>Hint / Helper Text</label>
                            <input type="text" value="${escapeHtml(field.hint || '')}" placeholder="Short helper shown under the field" onchange="updateField('${template.id}', ${index}, 'hint', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Data Type</label>
                            <select onchange="onFieldTypeChange('${template.id}', ${index}, this.value, this)">
                                ${['string', 'number', 'date', 'boolean', 'email', 'textarea', 'dropdown', 'image'].map(type =>
                                    `<option value="${type}" ${field.type === type ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        ${field.type === 'textarea' ? `
                        <div class="form-group">
                            <label>
                                <input type="checkbox" ${field.paragraphMode ? 'checked' : ''} onchange="updateField('${template.id}', ${index}, 'paragraphMode', this.checked)">
                                Paragraph mode
                            </label>
                            <small style="display:block;color:var(--text-muted,#888);margin-top:2px;">When enabled, blank lines in the textarea create separate Word paragraphs. Template syntax: <code>{#${field.key}_paragraphs}{paragraph}{/${field.key}_paragraphs}</code></small>
                        </div>
                        <div class="form-group">
                            <label>Rows (height hint)</label>
                            <input type="number" min="2" max="20" value="${field.rows || (field.paragraphMode ? 8 : 3)}" onchange="updateField('${template.id}', ${index}, 'rows', parseInt(this.value) || 3)">
                        </div>
                        ` : ''}
                        ${field.type === 'dropdown' ? `
                        <div class="form-group">
                            <label>Choices (one per line)</label>
                            <textarea rows="4" onchange="updateField('${template.id}', ${index}, 'choices', this.value.split('\\n').map(s=>s.trim()).filter(Boolean))">${(field.choices || []).join('\n')}</textarea>
                        </div>
                        ` : ''}
                        <div class="form-group">
                            <label>
                                <input type="checkbox" ${field.required ? 'checked' : ''} onchange="updateField('${template.id}', ${index}, 'required', this.checked)">
                                Required
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" ${field.isRTL ? 'checked' : ''} onchange="updateField('${template.id}', ${index}, 'isRTL', this.checked)">
                                RTL / Divehi field
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
                    <input type="text" id="new-field-key" placeholder="e.g. person_name or text_notes">
                </div>
                <div class="form-group">
                    <label>Label</label>
                    <input type="text" id="new-field-label" placeholder="Friendly Name">
                </div>
                <div class="form-group">
                    <label>Hint / Helper Text</label>
                    <input type="text" id="new-field-hint" placeholder="Optional — shown under the field">
                </div>
                <div class="form-group">
                    <label>Data Type</label>
                    <select id="new-field-type" onchange="onNewFieldTypeChange(this)">
                        ${['string', 'number', 'date', 'boolean', 'email', 'textarea', 'dropdown', 'image'].map(type =>
                            `<option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group" id="new-paragraph-mode-group" style="display:none;">
                    <label>
                        <input type="checkbox" id="new-field-paragraph-mode">
                        Paragraph mode
                    </label>
                    <small style="display:block;color:var(--text-muted,#888);margin-top:2px;">Blank lines in the textarea will create separate Word paragraphs.</small>
                </div>
                <div class="form-group" id="new-dropdown-choices-group" style="display:none;">
                    <label>Choices (one per line)</label>
                    <textarea id="new-field-choices" rows="4" placeholder="Option A&#10;Option B&#10;Option C"></textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="new-field-required">
                        Required
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="new-field-rtl">
                        RTL / Divehi field
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
    const hint = document.getElementById('new-field-hint').value.trim();
    const type = document.getElementById('new-field-type').value;
    const required = document.getElementById('new-field-required').checked;
    const isRTL = document.getElementById('new-field-rtl').checked;
    const paragraphMode = type === 'textarea'
        ? (document.getElementById('new-field-paragraph-mode')?.checked || false)
        : false;
    const choicesRaw = type === 'dropdown'
        ? (document.getElementById('new-field-choices')?.value || '')
        : '';
    const choices = choicesRaw.split('\n').map(s => s.trim()).filter(Boolean);
    
    if (!key || !label) {
        showToast("Please fill in both key and label", "error");
        return;
    }
    
    const newField = {
        key,
        label,
        hint,
        type,
        required,
        isRTL,
        paragraphMode,
        rows: type === 'textarea' ? (paragraphMode ? 8 : 3) : undefined,
        choices: type === 'dropdown' ? choices : [],
        widthPx: type === 'image' ? 150 : null,
        value: '',
        placeholder: '',
        originalKey: key,
        autoComputed: false,
    };
    template.fields.push(newField);
    
    // Re-render the modal
    const container = document.getElementById('fields-modal-body');
    renderFieldsModal(template, container);
}

/** Called when the type select changes for an existing field */
function onFieldTypeChange(templateId, fieldIndex, newType, selectEl) {
    updateField(templateId, fieldIndex, 'type', newType);
    // Re-render so conditional sections (paragraphMode, choices) appear/disappear
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;
    const container = document.getElementById('fields-modal-body');
    renderFieldsModal(template, container);
}

/** Called when the type select changes in the Add New Field form */
function onNewFieldTypeChange(selectEl) {
    const type = selectEl.value;
    const paraGroup = document.getElementById('new-paragraph-mode-group');
    const choicesGroup = document.getElementById('new-dropdown-choices-group');
    if (paraGroup) paraGroup.style.display = type === 'textarea' ? '' : 'none';
    if (choicesGroup) choicesGroup.style.display = type === 'dropdown' ? '' : 'none';
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