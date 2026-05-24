// Navigation to fill form
function fillTemplate(id) {
    console.log('fillTemplate called with id:', id);
    console.log('allTemplates:', allTemplates);
    
    const foundTemplate = allTemplates.find(t => t.id === id);
    console.log('Found template:', foundTemplate);
    
    if (foundTemplate) {
        // Set the GLOBAL selectedTemplate
        window.selectedTemplate = foundTemplate;
        console.log('Set window.selectedTemplate:', window.selectedTemplate);
        console.log('Template has fields:', foundTemplate.hasFields);
        
        // Call switchView to change to fill form
        if (typeof switchView === 'function') {
            switchView('fill-form');
        } else {
            console.error('switchView is not available');
            alert('Navigation error');
        }
    } else {
        console.error('Template not found with id:', id);
        alert('Template not found');
    }
}
async function editTemplate(id) {
    const template = allTemplates.find(t => t.id === id);
    if (!template) {
        alert('Template not found');
        return;
    }
    
    console.log('Editing template:', template);
    console.log('Template fields:', template.fields);
    
    const modal = document.getElementById('template-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = 'Edit Template';
    modalBody.innerHTML = `
        <form id="edit-form">
            <div class="form-group">
                <label>Template Name *</label>
                <input type="text" id="edit-name" value="${escapeHtml(template.name)}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit-description" rows="3">${escapeHtml(template.description || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Category</label>
                <select id="edit-category">
                    ${['General', 'Invoices', 'Reports', 'Letters', 'Contracts', 'Other'].map(cat => 
                        `<option value="${cat}" ${template.category === cat ? 'selected' : ''}>${cat}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="edit-status">
                    <option value="true" ${template.isActive ? 'selected' : ''}>Active</option>
                    <option value="false" ${!template.isActive ? 'selected' : ''}>Inactive</option>
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
    
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            name: document.getElementById('edit-name').value.trim(),
            description: document.getElementById('edit-description').value.trim(),
            category: document.getElementById('edit-category').value,
            isActive: document.getElementById('edit-status').value === 'true'
        };
        
        if (!updates.name) {
            alert('Template name is required');
            return;
        }
        
        try {
            // Preserve existing fields when updating
            const updatedTemplate = await window.electronAPI.updateTemplate({ id, updates });
            console.log('Template updated:', updatedTemplate);
            closeModal('template-modal');
            await loadTemplates();
            alert('Template updated successfully!');
        } catch (error) {
            console.error('Error updating template:', error);
            alert('Error updating template: ' + error.message);
        }
    });
    
    openModal('template-modal');
}
async function renderTemplates() {
    const searchTerm = document.getElementById('template-search')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('type-filter')?.value || 'all';
    const fillableFilter = document.getElementById('fillable-filter')?.value || 'all';
    
    let filtered = allTemplates;
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(searchTerm) ||
            (t.description && t.description.toLowerCase().includes(searchTerm)) ||
            (t.category && t.category.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Apply fillable filter
    if (fillableFilter === 'static') {
        filtered = filtered.filter(t => !t.hasFields);
    } else if (fillableFilter === 'fillable') {
        filtered = filtered.filter(t => t.hasFields);
    }
    
    const container = document.getElementById('templates-grid');
    
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-results">No templates found matching your criteria.</p>';
        return;
    }
    
    container.innerHTML = filtered.map(template => `
        <div class="template-card">
            <div class="template-card-header">
                <h3>${escapeHtml(template.name)}</h3>
                <span class="template-type-badge">${template.type === 'word' ? 'DOCX' : 'XLSX'}</span>
            </div>
            <p>${escapeHtml(template.description || 'No description')}</p>
            <p class="category">Category: ${escapeHtml(template.category)}</p>
            <p>
                <span class="badge ${template.hasFields ? 'badge-fillable' : 'badge-static'}">
                    ${template.hasFields ? 'Fillable' : 'Static'}
                </span>
                ${template.hasFields ? `<span style="font-size: 0.75rem;"> (${template.fields?.length || 0} fields)</span>` : ''}
            </p>
            <div class="template-card-actions">
                ${template.hasFields ? `
                    <button class="btn btn-success btn-small" onclick="fillTemplate('${template.id}')">Fill Form</button>
                    <button class="btn btn-primary btn-small" onclick="editTemplate('${template.id}')">Edit</button>
                    <button class="btn btn-secondary btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
                    <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
                ` : `
                    <button class="btn btn-success btn-small" onclick="printStaticDocument('${template.id}')">Print</button>
                    <button class="btn btn-primary btn-small" onclick="editTemplate('${template.id}')">Edit</button>
                    <button class="btn btn-secondary btn-small" onclick="previewTemplate('${template.id}')">Preview</button>
                    <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">Delete</button>
                `}
            </div>
        </div>
    `).join('');
}

async function printStaticDocument(templateId) {
    console.log('printStaticDocument called with id:', templateId);
    
    try {
        // Get the latest template data
        const templates = await window.electronAPI.getTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            alert('Template not found');
            return;
        }
        
        // Check if template has fields
        if (template.hasFields) {
            alert('This is a fillable template. Please fill out the form first before printing.');
            return;
        }
        
        // Verify the file exists
        if (!template.filePath) {
            alert('Template file not found. Please re-upload the template.');
            return;
        }
        
        console.log('Printing static template:', template.name, template.filePath);
        
        // Confirm with user
        const confirmPrint = confirm(`Print "${template.name}" to default printer?`);
        if (!confirmPrint) return;
        
        // Show printing indicator
        const printButtons = document.querySelectorAll(`[onclick*="printStaticDocument('${templateId}')"]`);
        printButtons.forEach(btn => {
            btn.textContent = 'Printing...';
            btn.disabled = true;
        });
        
        // Call the print function
        const result = await window.electronAPI.printDocument(template.filePath);
        
        if (result) {
            alert('Document sent to printer successfully!');
        } else {
            alert('Failed to print. Please check if a printer is available.');
        }
        
        // Reset buttons
        printButtons.forEach(btn => {
            btn.textContent = 'Print';
            btn.disabled = false;
        });
        
    } catch (error) {
        console.error('Error printing static document:', error);
        alert('Error printing: ' + error.message);
        
        // Reset buttons
        const printButtons = document.querySelectorAll(`[onclick*="printStaticDocument('${templateId}')"]`);
        printButtons.forEach(btn => {
            btn.textContent = 'Print';
            btn.disabled = false;
        });
    }
}
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