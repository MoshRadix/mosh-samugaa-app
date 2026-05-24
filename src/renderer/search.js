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
    
    container.innerHTML = results.map(doc => `
        <div class="search-result-item" data-template-id="${doc.id}">
            <div class="search-result-info">
                <h3>${escapeHtml(doc.name)}</h3>
                <p>${escapeHtml(doc.description || 'No description')} | Category: ${escapeHtml(doc.category || 'General')}</p>
                <p>
                    <span class="badge ${doc.hasFields ? 'badge-fillable' : 'badge-static'}">
                        ${doc.hasFields ? 'Fillable' : 'Static'}
                    </span>
                    <span class="template-type-badge">${doc.type.toUpperCase()}</span>
                    ${doc.hasFields ? `<span style="font-size: 0.75rem;"> (${doc.fields?.length || 0} fields)</span>` : ''}
                </p>
            </div>
            <div class="search-result-actions">
                ${doc.hasFields ? `
                    <button class="btn btn-primary btn-small fill-from-search-btn" data-template-id="${doc.id}">Fill Form</button>
                    <button class="btn btn-secondary btn-small preview-template-btn" data-template-id="${doc.id}">Preview</button>
                ` : `
                    <button class="btn btn-success btn-small print-static-btn" data-template-id="${doc.id}">Print</button>
                    <button class="btn btn-secondary btn-small preview-template-btn" data-template-id="${doc.id}">Preview</button>
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
            alert('Template not found');
            return;
        }
        
        if (!template.hasFields || !template.fields || template.fields.length === 0) {
            alert('This template has no fillable fields. Please reconfigure the template.');
            return;
        }
        
        window.selectedTemplate = template;
        if (typeof switchView === 'function') {
            switchView('fill-form');
        } else {
            console.error('switchView not available');
            alert('Navigation error');
        }
    } catch (error) {
        console.error('Error in fill from search:', error);
        alert('Error loading template: ' + error.message);
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
            alert('Template not found');
            return;
        }
        
        // Check if it's static (no fillable fields)
        if (template.hasFields) {
            alert('This template has fillable fields. Please use the Fill Form option instead.');
            return;
        }
        
        // Verify file exists
        if (!template.filePath) {
            alert('Template file not found. Please re-upload the template.');
            return;
        }
        
        console.log('Printing template:', template.name, template.filePath);
        
        // Show printing indicator
        const originalText = button.textContent;
        button.textContent = 'Printing...';
        button.disabled = true;
        
        // Confirm with user
        const confirmPrint = confirm(`Print "${template.name}" to default printer?`);
        if (!confirmPrint) {
            button.textContent = originalText;
            button.disabled = false;
            return;
        }
        
        // Send to printer
        const result = await window.electronAPI.printDocument(template.filePath);
        
        if (result) {
            alert('Document sent to printer successfully!');
        } else {
            alert('Failed to print. Please check if a printer is available.');
        }
        
        button.textContent = originalText;
        button.disabled = false;
        
    } catch (error) {
        console.error('Error printing document:', error);
        alert('Error printing: ' + error.message);
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
        console.error('Error previewing template:', error);
        alert('Error previewing template: ' + error.message);
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