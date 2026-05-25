// Global variable to store templates for search
let searchTemplates = [];

async function loadSearchResults() {
    console.log('loadSearchResults called');
    const searchTerm = document.getElementById('document-search')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('search-type-filter')?.value || 'all';
    const fillableFilter = document.getElementById('search-fillable-filter')?.value || 'all';
    
    try {
        // Get fresh templates
        searchTemplates = await window.electronAPI.getTemplates();
        console.log('Loaded templates for search:', searchTemplates.length);
        
        let filtered = searchTemplates;
        
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
        
        renderSearchResults(filtered);
    } catch (error) {
        console.error('Error loading search results:', error);
        const container = document.getElementById('search-results');
        if (container) {
            container.innerHTML = '<p class="error">Error loading templates. Please try again.</p>';
        }
    }
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results');
    
    if (!container) {
        console.error('Search results container not found');
        return;
    }
    
    if (results.length === 0) {
        container.innerHTML = '<p class="no-results">No documents found matching your criteria.</p>';
        return;
    }
    
    // Re-mapped to perfectly replicate the layout block structure of the templates grid
    container.innerHTML = results.map(doc => `
        <div class="template-card" data-template-id="${doc.id}">
            <div>
                <div class="template-card-header">
                    <h3>${escapeHtml(doc.name)}</h3>
                    <div class="template-badges">
                        <span class="template-type-badge">${doc.type.toUpperCase()}</span>
                        <span class="badge ${doc.hasFields ? 'badge-fillable' : 'badge-static'}">
                            ${doc.hasFields ? 'Fillable' : 'Static'}
                        </span>
                    </div>
                </div>
                <p>${escapeHtml(doc.description || 'No description provided')}</p>
                <div class="category">
                    Category: ${escapeHtml(doc.category || 'General')} 
                    ${doc.hasFields ? `• (${doc.fields?.length || 0} fields)` : ''}
                </div>
            </div>
            
            <div class="template-card-actions">
                ${doc.hasFields ? `
                    <button class="btn btn-primary btn-small fill-from-search-btn" data-template-id="${doc.id}">Fill Form</button>
                    <button class="btn btn-outline btn-small preview-template-btn" data-template-id="${doc.id}">Preview</button>
                ` : `
                    <button class="btn btn-success btn-small print-static-btn" data-template-id="${doc.id}">Print</button>
                    <button class="btn btn-outline btn-small preview-template-btn" data-template-id="${doc.id}">Preview</button>
                `}
            </div>
        </div>
    `).join('');
    
    // Attach event listeners to the buttons
    attachSearchEventListeners();
}

function attachSearchEventListeners() {
    // Fill form buttons
    document.querySelectorAll('.fill-from-search-btn').forEach(btn => {
        btn.removeEventListener('click', handleFillFromSearch);
        btn.addEventListener('click', handleFillFromSearch);
    });
    
    // Print static buttons
    document.querySelectorAll('.print-static-btn').forEach(btn => {
        btn.removeEventListener('click', handlePrintStatic);
        btn.addEventListener('click', handlePrintStatic);
    });
    
    // Preview buttons
    document.querySelectorAll('.preview-template-btn').forEach(btn => {
        btn.removeEventListener('click', handlePreview);
        btn.addEventListener('click', handlePreview);
    });
}

async function handleFillFromSearch(event) {
    const button = event.currentTarget;
    const templateId = button.getAttribute('data-template-id');
    console.log('Fill from search clicked for template:', templateId);
    
    try {
        // Get fresh template data
        const templates = await window.electronAPI.getTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            showToast('Template not found', "warning");
            return;
        }
        
        if (!template.hasFields || !template.fields || template.fields.length === 0) {
            showToast('This template has no fillable fields. Please reconfigure the template.', "warning");
            return;
        }
        
        window.selectedTemplate = template;
        if (typeof switchView === 'function') {
            switchView('fill-form');
        } else {
            console.error('switchView not available');
            //alert('Navigation error');
            showToast('Navigation error', "error");
        }
    } catch (error) {
        console.error('Error in fill from search:', error);
        //alert('Error loading template: ' + error.message);
        showToast('Error loading template: ' + error.message, "error");
    }
}

async function handlePrintStatic(event) {
    const button = event.currentTarget;
    const templateId = button.getAttribute('data-template-id');
    console.log('Print static clicked for template:', templateId);
    
    try {
        // Get fresh template data
        const templates = await window.electronAPI.getTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            //alert('Template not found');
            showToast('Template not found', "warning");
            
            return;
        }
        
        // Check if it's static (no fillable fields)
        if (template.hasFields) {
            //alert('This template has fillable fields. Please use the Fill Form option instead.');
            showToast('This template has fillable fields. Please use the Fill Form option instead.', "warning");
            return;
        }
        
        // Verify file exists
        if (!template.filePath) {
            // alert('Template file not found. Please re-upload the template.');
            showToast('Template file not found. Please re-upload the template.', "error");
            return;
        }
        
        console.log('Printing template:', template.name, template.filePath);
        
        // Show printing indicator
        const originalText = button.textContent;
        button.textContent = 'Printing...';
        button.disabled = true;
        
        // Confirm with user
        // const confirmPrint = confirm(`Print "${template.name}" to default printer?`);
        // if (!confirmPrint) {
        //     button.textContent = originalText;
        //     button.disabled = false;
        //     return;
        // }
        
        // Send to printer
        const result = await window.electronAPI.printDocument(template.filePath);
        
        if (result) {
            // alert('Document sent to printer successfully!');
            showToast('Document sent to printer successfully!', "success");
        } else {
            // alert('Failed to print. Please check if a printer is available.');
            showToast('Failed to print. Please check if a printer is available.', "error");
        }
        
        button.textContent = originalText;
        button.disabled = false;
        
    } catch (error) {
        console.error('Error printing document:', error);
        // alert('Error printing: ' + error.message);
        showToast('Error printing: ' + error.message, "error");
        button.disabled = false;
        button.textContent = 'Print';
    }
}

async function handlePreview(event) {
    const button = event.currentTarget;
    const templateId = button.getAttribute('data-template-id');
    console.log('Preview clicked for template:', templateId);
    
    try {
        await window.electronAPI.previewTemplate(templateId);
    } catch (error) {
        // console.error('Error previewing template:', error);
        showToast('Error previewing template: ' + error.message, "error");
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize search when the view becomes active
function initSearch() {
    console.log('Initializing search');
    const searchInput = document.getElementById('document-search');
    const typeFilter = document.getElementById('search-type-filter');
    const fillableFilter = document.getElementById('search-fillable-filter');
    
    if (searchInput) {
        searchInput.removeEventListener('input', loadSearchResults);
        searchInput.addEventListener('input', loadSearchResults);
    }
    
    if (typeFilter) {
        typeFilter.removeEventListener('change', loadSearchResults);
        typeFilter.addEventListener('change', loadSearchResults);
    }
    
    if (fillableFilter) {
        fillableFilter.removeEventListener('change', loadSearchResults);
        fillableFilter.addEventListener('change', loadSearchResults);
    }
    
    // Load results
    loadSearchResults();
}

// Make functions globally available
window.loadSearchResults = loadSearchResults;
window.initSearch = initSearch;