// Global state for automatic switching
let autoLanguageSwitch = true; // Enable automatic language switching by default
let currentActiveField = null;
let currentFieldLanguage = null;

// Language configurations
const languageConfig = {
    divehi: {
        name: 'Divehi',
        flag: '🇲🇻',
        direction: 'rtl',
        font: 'Noto Sans Thaana, MV Faseyha, Faruma',
        transliterate: true,
        imeMode: 'active'
    },
    english: {
        name: 'English',
        flag: '🇬🇧',
        direction: 'ltr',
        font: 'Segoe UI, Arial',
        transliterate: false,
        imeMode: 'inactive'
    }
};

// Detect if field should use Divehi based on field properties
function shouldUseDivehi(field) {
    if (field.isRTL === true) return true;
    if (field.key && field.key.toLowerCase().startsWith('divehi.')) return true;
    if (field.label && /ދިވެހި|Divehi|ދިވެހިބަސް/i.test(field.label)) return true;
    return false;
}

// Set input language for a specific field
async function setFieldLanguage(fieldElement, field, useDivehi) {
    if (!fieldElement) return;
    
    const language = useDivehi ? languageConfig.divehi : languageConfig.english;
    currentFieldLanguage = language.name;
    
    fieldElement.setAttribute('dir', language.direction);
    fieldElement.style.fontFamily = language.font;
    
    if (useDivehi) {
        fieldElement.classList.add('divehi-input');
        fieldElement.classList.remove('english-input');
    } else {
        fieldElement.classList.add('english-input');
        fieldElement.classList.remove('divehi-input');
    }
    
    const placeholder = field.placeholder || `Enter ${field.label || field.key}`;
    if (useDivehi) {
        fieldElement.placeholder = convertToDivehiTransliteration(placeholder) || placeholder;
    } else {
        fieldElement.placeholder = placeholder;
    }
    
    try {
        if (useDivehi) {
            fieldElement.setAttribute('inputmode', 'text');
            fieldElement.setAttribute('lang', 'dv');
        } else {
            fieldElement.setAttribute('inputmode', 'latin');
            fieldElement.setAttribute('lang', 'en');
        }
    } catch (e) {
        console.log('Could not set IME mode:', e);
    }
    
    fieldElement.dataset.divehiMode = useDivehi ? 'true' : 'false';
    
    console.log(`Language switched to: ${language.name} for field: ${field.key}`);
}

// Show temporary notification when language changes
function showLanguageNotification(language) {
    const existingNotif = document.querySelector('.language-notification');
    if (existingNotif) existingNotif.remove();
    
    const notif = document.createElement('div');
    notif.className = `language-notification ${language.toLowerCase()}`;
    notif.innerHTML = `
        <span class="flag">${language === 'Divehi' ? '🇲🇻' : '🇬🇧'}</span>
        <span>${language} Mode Active</span>
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add('show');
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 1500);
    }, 10);
}

// Setup Enter key navigation - move focus to next field
function setupEnterKeyNavigation(formElement) {
    const focusableElements = Array.from(formElement.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
    ));
    
    focusableElements.forEach((element, index) => {
        element.removeEventListener('keydown', handleEnterKey);
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Don't submit on Enter in textarea or if button is pressed
                if (element.tagName === 'TEXTAREA') {
                    return;
                }
                if (element.tagName === 'BUTTON') {
                    e.preventDefault();
                    element.click();
                    return;
                }
                
                e.preventDefault();
                
                // Find next focusable element
                let nextIndex = index + 1;
                while (nextIndex < focusableElements.length) {
                    const nextElement = focusableElements[nextIndex];
                    if (nextElement && !nextElement.disabled && nextElement.offsetParent !== null) {
                        nextElement.focus();
                        // Select text in input fields for easy replacement
                        if (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA') {
                            nextElement.select();
                        }
                        break;
                    }
                    nextIndex++;
                }
            }
        });
        function handleEnterKey(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                if (element.tagName === 'TEXTAREA') return;
                if (element.tagName === 'BUTTON') {
                    e.preventDefault();
                    element.click();
                    return;
                }
                e.preventDefault();
                let nextIndex = index + 1;
                while (nextIndex < focusableElements.length) {
                    const nextElement = focusableElements[nextIndex];
                    if (nextElement && !nextElement.disabled && nextElement.offsetParent !== null) {
                        nextElement.focus();
                        if (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA') {
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
function setupAutomaticTransliteration(fieldElement, fieldKey) {
    let lastValue = '';
    
    fieldElement.addEventListener('input', function(e) {
        const isDivehiMode = fieldElement.dataset.divehiMode === 'true';
        
        if (isDivehiMode) {
            const currentValue = fieldElement.value;
            const cursorPosition = fieldElement.selectionStart;
            
            if (currentValue.length > lastValue.length && cursorPosition > 0) {
                const typedChar = currentValue[cursorPosition - 1];
                const latinRegex = /[a-zA-Z]/;
                
                if (latinRegex.test(typedChar)) {
                    const divehiChar = latinToDivehiMap[typedChar.toLowerCase()] || typedChar;
                    
                    if (divehiChar !== typedChar) {
                        const newValue = currentValue.slice(0, cursorPosition - 1) + 
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
    
    fieldElement.addEventListener('paste', function(e) {
        const isDivehiMode = fieldElement.dataset.divehiMode === 'true';
        
        if (isDivehiMode) {
            e.preventDefault();
            let pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const convertedText = convertToDivehiTransliteration(pastedText);
            document.execCommand('insertText', false, convertedText);
        }
    });
}

// Latin to Divehi mapping
const latinToDivehiMap = {
    'a': 'ަ', 'b': 'ބ', 'c': 'ޗ', 'd': 'ދ', 'e': 'ެ',
    'f': 'ފ', 'g': 'ގ', 'h': 'ހ', 'i': 'ި', 'j': 'ޖ',
    'k': 'ކ', 'l': 'ލ', 'm': 'މ', 'n': 'ނ', 'o': 'ޮ',
    'p': 'ޕ', 'q': 'ގ', 'r': 'ރ', 's': 'ސ', 't': 'ތ',
    'u': 'ު', 'v': 'ވ', 'w': 'ވ', 'x': 'ޒ', 'y': 'ޔ', 'z': 'ޅ',
    'A': 'ަ', 'B': 'ބ', 'C': 'ޗ', 'D': 'ދ', 'E': 'ެ',
    'F': 'ފ', 'G': 'ގ', 'H': 'ހ', 'I': 'ި', 'J': 'ޖ',
    'K': 'ކ', 'L': 'ލ', 'M': 'މ', 'N': 'ނ', 'O': 'ޮ',
    'P': 'ޕ', 'Q': 'ގ', 'R': 'ރ', 'S': 'ސ', 'T': 'ތ',
    'U': 'ު', 'V': 'ވ', 'W': 'ވ', 'X': 'ޒ', 'Y': 'ޔ', 'Z': 'ޅ'
};

function convertToDivehiTransliteration(text) {
    if (!text) return '';
    let result = '';
    for (let char of text) {
        result += latinToDivehiMap[char] || char;
    }
    return result;
}

// Get field input with proper styling (used in two-column layout)
function getFieldInputWithAutoSwitch(field) {
    const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const placeholder = `Enter ${field.label || field.key}`;
    const isDivehiField = shouldUseDivehi(field);
    
    if (field.type === 'date') {
        return `
            <input type="date" 
                   id="${fieldId}" 
                   name="${field.key}" 
                   ${field.required ? 'required' : ''} 
                   class="form-input ${isDivehiField ? 'divehi-input' : 'english-input'}"
                   dir="${isDivehiField ? 'rtl' : 'ltr'}">
        `;
    }
    
    // Make sure NO disabled attribute is added
    if (field.type === 'textarea') {
        return `
            <textarea id="${fieldId}" 
                      name="${field.key}" 
                      ${field.required ? 'required' : ''} 
                      placeholder="${placeholder}" 
                      rows="3"
                      class="form-input ${isDivehiField ? 'divehi-input' : 'english-input'}"
                      dir="${isDivehiField ? 'rtl' : 'ltr'}"></textarea>
        `;
    }
    
    if (field.type === 'boolean') {
        return `
            <select id="${fieldId}" 
                    name="${field.key}" 
                    ${field.required ? 'required' : ''}
                    class="form-input ${isDivehiField ? 'divehi-input' : 'english-input'}"
                    dir="${isDivehiField ? 'rtl' : 'ltr'}">
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
        `;
    }
    
    return `
        <input type="${field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}" 
               id="${fieldId}" 
               name="${field.key}" 
               ${field.required ? 'required' : ''} 
               placeholder="${placeholder}"
               class="form-input ${isDivehiField ? 'divehi-input' : 'english-input'}"
               dir="${isDivehiField ? 'rtl' : 'ltr'}">
    `;
}

// Enhanced renderFillForm with two-column layout
async function renderFillForm() {
    console.log('renderFillForm called');
    
    if (!window.selectedTemplate) {
        console.log('No template selected');
        if (window.switchView) window.switchView('templates');
        return;
    }
    
    if (!window.selectedTemplate.fields || window.selectedTemplate.fields.length === 0) {
        alert('No fields found for this template.');
        if (window.switchView) window.switchView('templates');
        return;
    }
    
    const container = document.getElementById('form-container');
    if (!container) return;
    
    const hasDivehiFields = window.selectedTemplate.fields.some(f => shouldUseDivehi(f));
    const fields = window.selectedTemplate.fields;
    
    // Split fields into two columns for better layout
    const midPoint = Math.ceil(fields.length / 2);
    const leftColumnFields = fields.slice(0, midPoint);
    const rightColumnFields = fields.slice(midPoint);
    
    container.innerHTML = `
        <div class="template-info-card">
            <div class="template-info-content">
                <h3>📄 ${escapeHtml(window.selectedTemplate.name)}</h3>
                ${window.selectedTemplate.description ? `<p>${escapeHtml(window.selectedTemplate.description)}</p>` : ''}
                <!--
                <div class="template-meta">

                    <span class="meta-badge">${window.selectedTemplate.type === 'word' ? '📝 Word Document' : '📊 Excel Spreadsheet'}</span>
                    <span class="meta-badge">${fields.length} field${fields.length !== 1 ? 's' : ''}</span>
                    ${hasDivehiFields ? '<span class="meta-badge divehi-badge">🇲🇻 Divehi Support</span>' : ''}
                </div>
                -->
            </div>
            <div class="auto-switch-control">
                
                <div class="template-meta">
                    <span class="meta-badge">${window.selectedTemplate.type === 'word' ? '📝 Word Document' : '📊 Excel Spreadsheet'}</span>
                    <span class="meta-badge">${fields.length} field${fields.length !== 1 ? 's' : ''}</span>
                    ${hasDivehiFields ? '<span class="meta-badge divehi-badge">🇲🇻 Divehi Support</span>' : ''}
                </div>
                <span class="keyboard-hint">Press Enter to move to next field</span>
            </div>
        </div>
        
        <form id="data-form" class="two-column-form">
            <div class="form-column">
                ${leftColumnFields.map(field => `
                    <div class="form-group ${shouldUseDivehi(field) ? 'rtl-group' : ''}" data-field-key="${field.key}">
                        <label ${shouldUseDivehi(field) ? 'dir="rtl"' : ''}>
                            ${escapeHtml(field.label || field.key)}
                            ${field.required ? '<span class="required-star">*</span>' : ''}
                            ${field.type !== 'string' ? `<span class="field-type-indicator">${getFieldTypeIcon(field.type)}</span>` : ''}
                        </label>
                        ${getFieldInputWithAutoSwitch(field)}
                        <div class="field-hint">${getFieldHint(field)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="form-column">
                ${rightColumnFields.map(field => `
                    <div class="form-group ${shouldUseDivehi(field) ? 'rtl-group' : ''}" data-field-key="${field.key}">
                        <label ${shouldUseDivehi(field) ? 'dir="rtl"' : ''}>
                            ${escapeHtml(field.label || field.key)}
                            ${field.required ? '<span class="required-star">*</span>' : ''}
                            ${field.type !== 'string' ? `<span class="field-type-indicator">${getFieldTypeIcon(field.type)}</span>` : ''}
                        </label>
                        ${getFieldInputWithAutoSwitch(field)}
                        <div class="field-hint">${getFieldHint(field)}</div>
                    </div>
                `).join('')}
            </div>
        </form>
        
        <div class="form-actions-container">
            <div class="form-actions">
                <button type="button" id="generate-btn" class="btn btn-primary btn-large">
                    <span class="btn-icon">📄</span> Generate Document
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
    
    // Set up automatic language switching for each field
    for (const field of window.selectedTemplate.fields) {
        const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement) {
            const useDivehi = shouldUseDivehi(field);
            
            await setFieldLanguage(fieldElement, field, useDivehi);
            
            fieldElement.addEventListener('focus', async () => {
                currentActiveField = field.key;
                if (autoLanguageSwitch) {
                    const shouldBeDivehi = shouldUseDivehi(field);
                    const currentIsDivehi = fieldElement.dataset.divehiMode === 'true';
                    
                    if (shouldBeDivehi !== currentIsDivehi) {
                        await setFieldLanguage(fieldElement, field, shouldBeDivehi);
                        showLanguageNotification(shouldBeDivehi ? 'Divehi' : 'English');
                    }
                }
            });
            
            if (useDivehi) {
                setupAutomaticTransliteration(fieldElement, field.key);
            }
        }
    }
    
    // Setup Enter key navigation
    const formElement = document.getElementById('data-form');
    if (formElement) {
        setupEnterKeyNavigation(formElement);
    }
    
    // Add generate button listener
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.removeEventListener('click', handleGenerateClick);
        generateBtn.addEventListener('click', handleGenerateClick);
    }
    
    await loadDataRecords();
}

// Helper function to get field type icon
function getFieldTypeIcon(type) {
    const icons = {
        'number': '🔢',
        'date': '📅',
        'email': '📧',
        'textarea': '📝',
        'boolean': '☑️'
    };
    return icons[type] || '';
}

// Helper function to get field hint text
function getFieldHint(field) {
    const hints = {
        'number': 'Enter a numeric value',
        'email': 'e.g., name@example.com',
        'date': 'Select a date from the picker',
        'textarea': 'Press Enter to add line breaks',
        'boolean': 'Select Yes or No from dropdown'
    };
    return hints[field.type] || 'Press Enter to go to next field';
}

// Handle generate click
async function handleGenerateClick(e) {
    e.preventDefault();
    await generateDocument();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateForm() {
    console.log('Validating form...');
    
    if (!window.selectedTemplate) {
        console.error('No template selected');
        return false;
    }
    
    const firstInvalidField = null;
    
    for (const field of window.selectedTemplate.fields) {
        const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const input = document.getElementById(fieldId);
        if (!input) {
            console.warn(`Input not found for field: ${field.key}`);
            continue;
        }
        
        let value = input.value;
        
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'select-one') {
            value = input.value;
        } else {
            value = input.value?.trim() || '';
        }
        
        if (field.required && (!value || value === '')) {
            alert(`❌ ${field.label || field.key} is required`);
            input.focus();
            input.style.borderColor = '#e74c3c';
            setTimeout(() => {
                input.style.borderColor = '';
            }, 2000);
            return false;
        }
        
        // Clear any error styling
        input.style.borderColor = '';
        
        if (value && value !== '') {
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
                        alert(`${field.label || field.key} must be a valid email address`);
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
        const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const input = document.getElementById(fieldId);
        if (input) {
            let value = input.value;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = input.value ? parseFloat(input.value) : '';
            } else if (input.type === 'select-one' && field.type === 'boolean') {
                value = value === 'true';
            } else {
                value = input.value?.trim() || '';
            }
            
            data[field.key] = value;
            console.log(`Collected ${field.key}:`, value);
        }
    }
    
    return data;
}

async function generateDocument() {
    console.log('generateDocument function called');
    
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
    
    if (!window.electronAPI) {
        console.error('electronAPI not available');
        alert('Application API not available. Please restart the app.');
        return;
    }
    
    const outputFormat = window.selectedTemplate.type === 'excel' ? 'xlsx' : 'docx';
    
    const generateBtn = document.getElementById('generate-btn');
    const originalBtnHTML = generateBtn ? generateBtn.innerHTML : 'Generate Document';
    if (generateBtn) {
        generateBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
        generateBtn.disabled = true;
    }
    
    try {
        const result = await window.electronAPI.generateDocument({
            templateId: window.selectedTemplate.id,
            formData: formData,
            outputFormat: outputFormat
        });
        
        const shouldPrint = confirm('✅ Document generated successfully!\n\nDo you want to send it to the printer?');
        
        if (shouldPrint) {
            if (generateBtn) {
                generateBtn.innerHTML = '<span class="btn-icon">🖨️</span> Printing...';
            }
            
            try {
                if (typeof window.electronAPI.openAndPrint !== 'function') {
                    throw new Error('Print function not available');
                }
                
                await window.electronAPI.openAndPrint(result.outputPath);
                alert('✅ Document has been sent to the printer successfully!');
            } catch (printError) {
                console.error('Print error:', printError);
                alert(`⚠️ Document generated but failed to print.\n\nFile saved at: ${result.outputPath}\n\nYou can manually open and print the file.`);
            }
        } else {
            alert(`✅ Document saved successfully!\n\nFile location: ${result.outputPath}`);
        }
        
        const another = confirm('Do you want to fill another form?');
        if (!another) {
            if (typeof switchView === 'function') {
                switchView('templates');
            }
        } else {
            clearForm();
        }
        
    } catch (error) {
        console.error('Error generating document:', error);
        
        let errorMessage = '❌ Error generating document: ' + error.message;
        
        if (error.message.includes('template not found')) {
            errorMessage = '❌ Template file not found. Please re-upload the template.';
        } else if (error.message.includes('permission')) {
            errorMessage = '❌ Permission denied when saving document. Please check your folder permissions.';
        }
        
        alert(errorMessage);
    } finally {
        if (generateBtn) {
            generateBtn.innerHTML = originalBtnHTML;
            generateBtn.disabled = false;
        }
    }
}

function clearForm() {
    console.log('Clearing form...');
    
    if (!window.selectedTemplate) return;
    
    for (const field of window.selectedTemplate.fields) {
        const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const input = document.getElementById(fieldId);
        if (input) {
            // Enable the input first
            input.disabled = false;
            input.readOnly = false;
            
            // Clear the value
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
            
            // Remove any error styling
            input.style.borderColor = '';
            input.classList.remove('error');
            
            // Focus first field after clearing
            if (field === window.selectedTemplate.fields[0]) {
                input.focus();
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
    
    try {
        const record = await window.electronAPI.saveDataRecord({
            templateId: window.selectedTemplate.id,
            data: formData
        });
        
        alert('💾 Record saved successfully!');
        await loadDataRecords();
    } catch (error) {
        console.error('Error saving record:', error);
        alert('Error saving record: ' + error.message);
    }
}

async function loadRecord(recordId) {
    console.log('loadRecord called with id:', recordId);
    
    if (!window.selectedTemplate) {
        console.error('No template selected');
        alert('No template selected');
        return;
    }
    
    try {
        const records = await window.electronAPI.getDataRecords(window.selectedTemplate.id);
        const record = records.find(r => r.id === recordId);
        
        if (!record) {
            alert('Record not found');
            return;
        }
        
        console.log('Loading record data:', record.data);
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        let loadedCount = 0;
        
        // Load data into form fields
        for (const [key, value] of Object.entries(record.data)) {
            const fieldId = `field-${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
            console.log(`Looking for field: ${fieldId} with value:`, value);
            
            const input = document.getElementById(fieldId);
            
            if (input) {
                // Enable the input first
                input.disabled = false;
                input.readOnly = false;
                
                // Set the value based on input type
                if (input.type === 'checkbox') {
                    input.checked = value === true || value === 'true';
                    console.log(`Set checkbox ${key} to:`, input.checked);
                } else if (input.type === 'select-one') {
                    // For select dropdowns
                    const stringValue = String(value);
                    let optionExists = false;
                    for (let i = 0; i < input.options.length; i++) {
                        if (input.options[i].value === stringValue) {
                            optionExists = true;
                            break;
                        }
                    }
                    input.value = optionExists ? stringValue : '';
                    console.log(`Set select ${key} to:`, input.value);
                } else {
                    input.value = value !== undefined && value !== null ? value : '';
                    console.log(`Set input ${key} to:`, input.value);
                }
                
                // Trigger events
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Remove any error styling
                input.style.borderColor = '';
                input.classList.remove('error');
                
                loadedCount++;
            } else {
                console.warn(`Input not found for field: ${key} (ID: ${fieldId})`);
            }
        }
        
        console.log(`Loaded ${loadedCount} of ${Object.keys(record.data).length} fields`);
        
        // Re-apply language settings after loading values
        for (const field of window.selectedTemplate.fields) {
            const fieldId = `field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const fieldElement = document.getElementById(fieldId);
            if (fieldElement) {
                const useDivehi = shouldUseDivehi(field);
                await setFieldLanguage(fieldElement, field, useDivehi);
            }
        }
        
        // Focus first field after loading
        if (window.selectedTemplate.fields && window.selectedTemplate.fields.length > 0) {
            const firstFieldId = `field-${window.selectedTemplate.fields[0].key.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const firstInput = document.getElementById(firstFieldId);
            if (firstInput) {
                firstInput.focus();
                // Select text if it's a text input
                if (firstInput.type === 'text' || firstInput.type === 'textarea' || firstInput.type === 'number') {
                    firstInput.select();
                }
            }
        }
        
        // Show success message
        const notification = document.createElement('div');
        notification.className = 'language-notification info';
        notification.textContent = `✅ Loaded ${loadedCount} fields successfully!`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 1500);
        }, 10);
        
    } catch (error) {
        console.error('Error loading record:', error);
        alert('Error loading record: ' + error.message);
    }
}

async function loadDataRecords() {
    if (!window.selectedTemplate) return;
    
    try {
        const records = await window.electronAPI.getDataRecords(window.selectedTemplate.id);
        const recordsList = document.getElementById('records-list');
        
        if (!recordsList) return;
        
        if (records.length === 0) {
            recordsList.innerHTML = '<p class="no-records">No saved records yet. Fill and save a form to see it here.</p>';
            return;
        }
        
        console.log('Loading records:', records.length);
        
        recordsList.innerHTML = records.map(record => {
            // Truncate long values for preview
            const previewEntries = Object.entries(record.data).slice(0, 3).map(([key, value]) => {
                let displayValue = String(value || '—');
                if (displayValue.length > 50) {
                    displayValue = displayValue.substring(0, 47) + '...';
                }
                return `<span class="record-field"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(displayValue)}</span>`;
            }).join('');
            
            return `
                <div class="record-card" data-record-id="${record.id}">
                    <div class="record-header">
                        <span class="record-date">📅 ${new Date(record.createdAt).toLocaleString()}</span>
                        <button class="record-load-btn" data-record-id="${record.id}">Load</button>
                    </div>
                    <div class="record-preview">
                        ${previewEntries}
                        ${Object.keys(record.data).length > 3 ? '<span class="record-more">+' + (Object.keys(record.data).length - 3) + ' more</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach event listeners to load buttons (better than onclick attribute)
        document.querySelectorAll('.record-load-btn').forEach(btn => {
            btn.removeEventListener('click', handleRecordLoadClick);
            btn.addEventListener('click', handleRecordLoadClick);
        });
        
        // Also attach to record cards for clicking anywhere
        document.querySelectorAll('.record-card').forEach(card => {
            card.removeEventListener('click', handleRecordCardClick);
            card.addEventListener('click', handleRecordCardClick);
        });
        
    } catch (error) {
        console.error('Error loading records:', error);
        const recordsList = document.getElementById('records-list');
        if (recordsList) {
            recordsList.innerHTML = '<p class="error">Error loading records: ' + error.message + '</p>';
        }
    }
}

// Helper function for record load button clicks
function handleRecordLoadClick(event) {
    event.stopPropagation();
    const recordId = event.currentTarget.getAttribute('data-record-id');
    if (recordId) {
        loadRecord(recordId);
    }
}

// Helper function for record card clicks
function handleRecordCardClick(event) {
    // Don't trigger if clicking on the load button
    if (event.target.classList.contains('record-load-btn')) {
        return;
    }
    const recordId = event.currentTarget.getAttribute('data-record-id');
    if (recordId) {
        loadRecord(recordId);
    }
}

function toggleAutoLanguageSwitch() {
    autoLanguageSwitch = !autoLanguageSwitch;
    const toggleBtn = document.getElementById('auto-switch-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = autoLanguageSwitch ? '✓ Auto-switch ON' : 'Auto-switch OFF';
        toggleBtn.classList.toggle('active', autoLanguageSwitch);
    }
    
    const notification = document.createElement('div');
    notification.className = 'language-notification info';
    notification.textContent = autoLanguageSwitch ? 'Auto language switching enabled' : 'Auto language switching disabled';
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 1500);
    }, 10);
}

// Keyboard shortcut: Ctrl+Shift+A to toggle auto-switch
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleAutoLanguageSwitch();
    }
});


// Make sure functions are available globally
window.renderFillForm = renderFillForm;
window.saveDataRecord = saveDataRecord;
window.loadRecord = loadRecord;
window.generateDocument = generateDocument;
window.clearForm = clearForm;
window.toggleAutoLanguageSwitch = toggleAutoLanguageSwitch;
window.loadDataRecords = loadDataRecords;
window.handleRecordLoadClick = handleRecordLoadClick;
window.handleRecordCardClick = handleRecordCardClick;