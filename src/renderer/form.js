let currentFormData = {};

async function renderFillForm() {
    console.log('renderFillForm called');
    console.log('window.selectedTemplate:', window.selectedTemplate);
    
    // Use window.selectedTemplate consistently
    if (!window.selectedTemplate) {
        console.log('No template selected');
        if (window.switchView) {
            window.switchView('templates');
        }
        return;
    }
    
    console.log('Template details:', {
        id: window.selectedTemplate.id,
        name: window.selectedTemplate.name,
        hasFields: window.selectedTemplate.hasFields,
        fieldsCount: window.selectedTemplate.fields ? window.selectedTemplate.fields.length : 0,
        fields: window.selectedTemplate.fields
    });
    
    // Check if template has fields
    if (!window.selectedTemplate.hasFields) {
        console.log('Template has no fields (hasFields=false)');
        
        // Double-check if fields array exists but hasFields is false
        if (window.selectedTemplate.fields && window.selectedTemplate.fields.length > 0) {
            console.log('Fields exist but hasFields is false, fixing...');
            window.selectedTemplate.hasFields = true;
        } else {
            alert('This template does not have any fillable fields. Please configure fields first.');
            if (window.switchView) {
                window.switchView('templates');
            }
            return;
        }
    }
    
    // Check if fields array exists and has items
    if (!window.selectedTemplate.fields || window.selectedTemplate.fields.length === 0) {
        console.error('Fields array is empty or missing');
        alert('No fields found for this template. Please reconfigure the template fields.');
        if (window.switchView) {
            window.switchView('templates');
        }
        return;
    }
    
    const container = document.getElementById('form-container');
    if (!container) {
        console.error('Form container not found');
        return;
    }
    
    // Render the form with fields
    container.innerHTML = `
        <div class="template-info">
            <h3>${escapeHtml(window.selectedTemplate.name)}</h3>
            <p>${escapeHtml(window.selectedTemplate.description || '')}</p>
            <p class="field-count">Total fields: ${window.selectedTemplate.fields.length}</p>
        </div>
        
        <form id="data-form">
            ${window.selectedTemplate.fields.map(field => `
                <div class="form-group">
                    <label>
                        ${escapeHtml(field.label || field.key)}
                        ${field.required ? '<span class="required">*</span>' : ''}
                    </label>
                    ${getFieldInput(field)}
                    <small class="field-key" style="color: #999; font-size: 0.8rem;">Field: ${escapeHtml(field.key)}</small>
                </div>
            `).join('')}
            
            <div class="form-actions">
                <button type="button" id="generate-btn" class="btn btn-success">Generate Document</button>
                <button type="button" class="btn btn-primary" onclick="saveDataRecord()">Save Record</button>
                <button type="button" class="btn btn-secondary" onclick="switchView('templates')">Cancel</button>
            </div>
        </form>
        
        <div class="data-records" id="data-records">
            <h3>Saved Records</h3>
        </div>
    `;
    
    // Add event listener to the generate button
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Generate button clicked');
            await generateDocument();
        });
    }
    
    await loadDataRecords();
}

function getFieldInput(field) {
    const fieldId = `field-${field.key}`;
    const placeholder = `Enter ${field.label || field.key}`;
    
    switch (field.type) {
        case 'number':
            return `<input type="number" id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''} placeholder="${placeholder}">`;
        case 'date':
            return `<input type="date" id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''}>`;
        case 'boolean':
            return `<select id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''}>
                <option value="">Select...</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>`;
        case 'email':
            return `<input type="email" id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''} placeholder="${placeholder}">`;
        case 'textarea':
            return `<textarea id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''} placeholder="${placeholder}" rows="4"></textarea>`;
        default:
            return `<input type="text" id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''} placeholder="${placeholder}">`;
    }
}

function validateForm() {
    console.log('Validating form...');
    
    if (!window.selectedTemplate) {
        console.error('No template selected');
        return false;
    }
    
    for (const field of window.selectedTemplate.fields) {
        const input = document.getElementById(`field-${field.key}`);
        if (!input) {
            console.warn(`Input not found for field: ${field.key}`);
            continue;
        }
        
        let value = input.value;
        
        // Handle different input types
        if (input.type === 'checkbox') {
            value = input.checked;
        } else {
            value = input.value.trim();
        }
        
        console.log(`Field ${field.key}: value = "${value}", required = ${field.required}`);
        
        if (field.required && !value) {
            alert(`${field.label || field.key} is required`);
            input.focus();
            return false;
        }
        
        if (value) {
            switch (field.type) {
                case 'number':
                    if (isNaN(value)) {
                        alert(`${field.label || field.key} must be a number`);
                        input.focus();
                        return false;
                    }
                    break;
                case 'email':
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        alert(`${field.label || field.key} must be a valid email`);
                        input.focus();
                        return false;
                    }
                    break;
                case 'date':
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        alert(`${field.label || field.key} must be a valid date (YYYY-MM-DD)`);
                        input.focus();
                        return false;
                    }
                    break;
            }
        }
    }
    
    console.log('Form validation passed');
    return true;
}

function collectFormData() {
    console.log('Collecting form data...');
    
    if (!window.selectedTemplate) {
        console.error('No template selected');
        return {};
    }
    
    const data = {};
    for (const field of window.selectedTemplate.fields) {
        const input = document.getElementById(`field-${field.key}`);
        if (input) {
            let value = input.value;
            
            // Handle different input types
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = input.value ? parseFloat(input.value) : '';
            } else {
                value = input.value.trim();
            }
            
            // Handle boolean selects
            if (field.type === 'boolean' && value) {
                value = value === 'true';
            }
            
            data[field.key] = value;
            console.log(`Collected ${field.key}:`, value);
        } else {
            console.warn(`Input not found for field: ${field.key}`);
        }
    }
    
    console.log('Collected form data:', data);
    return data;
}

async function generateDocument() {
    console.log('generateDocument function called');
    
    // Validate form first
    if (!validateForm()) {
        console.log('Form validation failed');
        return;
    }
    
    if (!window.selectedTemplate) {
        console.error('No template selected');
        alert('No template selected');
        return;
    }
    
    const formData = collectFormData();
    console.log('Form data collected:', formData);
    
    // Check if electronAPI is available
    if (!window.electronAPI) {
        console.error('electronAPI not available');
        alert('Application API not available. Please restart the app.');
        return;
    }
    
    // Determine output format based on template type
    const outputFormat = window.selectedTemplate.type === 'excel' ? 'xlsx' : 'docx';
    console.log('Output format determined:', outputFormat);
    
    // Show loading indicator
    const generateBtn = document.getElementById('generate-btn');
    const originalBtnText = generateBtn ? generateBtn.textContent : 'Generate Document';
    if (generateBtn) {
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
    }
    
    try {
        console.log('Calling electronAPI.generateDocument with:', {
            templateId: window.selectedTemplate.id,
            formData: formData,
            outputFormat: outputFormat
        });
        
        const result = await window.electronAPI.generateDocument({
            templateId: window.selectedTemplate.id,
            formData: formData,
            outputFormat: outputFormat
        });
        
        console.log('Generation result:', result);
        
        // Ask if user wants to print
        // After successful generation, ask if user wants to print
const shouldPrint = confirm('Document generated successfully!\n\nDo you want to send it to the printer?');

if (shouldPrint) {
    console.log('Sending document to printer...');
    console.log('File path:', result.outputPath);
    
    // Show printing status
    if (generateBtn) {
        generateBtn.textContent = 'Printing...';
    }
    
    try {
        // Check if openAndPrint function exists
        if (typeof window.electronAPI.openAndPrint !== 'function') {
            console.error('openAndPrint is not a function. Available APIs:', Object.keys(window.electronAPI));
            throw new Error('Print function not available. Please restart the application.');
        }
        
        // Send to printer
        const printResult = await window.electronAPI.openAndPrint(result.outputPath);
        console.log('Print result:', printResult);
        
        if (printResult) {
            alert('Document has been sent to the printer successfully!');
        } else {
            alert('Print command was sent but no confirmation received. File saved at: ' + result.outputPath);
        }
    } catch (printError) {
        console.error('Print error details:', printError);
        alert(`Document generated but failed to print.\n\nError: ${printError.message}\n\nFile saved at: ${result.outputPath}\n\nYou can manually open and print the file.`);
    }
} else {
    alert(`Document saved successfully!\n\nFile location: ${result.outputPath}`);
}
        
        // Ask if user wants to generate another or go back
        const another = confirm('Do you want to fill another form?');
        if (!another) {
            if (typeof switchView === 'function') {
                switchView('templates');
            }
        } else {
            // Clear the form for next entry
            clearForm();
        }
        
    } catch (error) {
        console.error('Error generating document:', error);
        console.error('Error details:', error.message);
        
        let errorMessage = 'Error generating document: ' + error.message;
        
        // Provide more specific error messages
        if (error.message.includes('template not found')) {
            errorMessage = 'Template file not found. Please re-upload the template.';
        } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied when saving document. Please check your folder permissions.';
        } else if (error.message.includes('docxtemplater')) {
            errorMessage = 'Error processing the Word document. Please check the template format.';
        } else if (error.message.includes('excel')) {
            errorMessage = 'Error processing the Excel document. Please check the template format.';
        }
        
        alert(errorMessage);
    } finally {
        // Reset button
        if (generateBtn) {
            generateBtn.textContent = originalBtnText;
            generateBtn.disabled = false;
        }
    }
}
function clearForm() {
    console.log('Clearing form...');
    
    if (!window.selectedTemplate) return;
    
    for (const field of window.selectedTemplate.fields) {
        const input = document.getElementById(`field-${field.key}`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        }
    }
    
    console.log('Form cleared');
}

async function saveDataRecord() {
    console.log('saveDataRecord called');
    
    if (!validateForm()) return;
    
    if (!window.selectedTemplate) {
        console.error('No template selected');
        return;
    }
    
    const formData = collectFormData();
    console.log('Saving record with data:', formData);
    
    try {
        const record = await window.electronAPI.saveDataRecord({
            templateId: window.selectedTemplate.id,
            data: formData
        });
        
        console.log('Record saved:', record);
        alert('Record saved successfully!');
        await loadDataRecords();
    } catch (error) {
        console.error('Error saving record:', error);
        alert('Error saving record: ' + error.message);
    }
}

async function loadDataRecords() {
    if (!window.selectedTemplate) return;
    
    try {
        const records = await window.electronAPI.getDataRecords(window.selectedTemplate.id);
        const container = document.getElementById('data-records');
        
        if (!container) return;
        
        if (records.length === 0) {
            container.innerHTML = '<h3>Saved Records</h3><p>No saved records yet.</p>';
            return;
        }
        
        container.innerHTML = `
            <h3>Saved Records (${records.length})</h3>
            ${records.map(record => `
                <div class="record-item" onclick="loadRecord('${record.id}')">
                    <strong>${new Date(record.createdAt).toLocaleString()}</strong>
                    <div>
                        ${Object.entries(record.data).slice(0, 3).map(([key, value]) => 
                            `<span style="margin-right: 1rem;">${key}: ${value}</span>`
                        ).join('')}
                        ${Object.keys(record.data).length > 3 ? '...' : ''}
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Error loading records:', error);
    }
}

async function loadRecord(recordId) {
    if (!window.selectedTemplate) return;
    
    try {
        const records = await window.electronAPI.getDataRecords(window.selectedTemplate.id);
        const record = records.find(r => r.id === recordId);
        
        if (record) {
            console.log('Loading record:', record);
            for (const [key, value] of Object.entries(record.data)) {
                const input = document.getElementById(`field-${key}`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value;
                    } else {
                        input.value = value !== undefined && value !== null ? value : '';
                    }
                }
            }
            alert('Record loaded successfully!');
        } else {
            alert('Record not found');
        }
    } catch (error) {
        console.error('Error loading record:', error);
        alert('Error loading record: ' + error.message);
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally
window.renderFillForm = renderFillForm;
window.saveDataRecord = saveDataRecord;
window.loadRecord = loadRecord;
window.generateDocument = generateDocument;
window.clearForm = clearForm;