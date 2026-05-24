const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Template Management
    uploadTemplate: (data) => ipcRenderer.invoke('upload-template', data),
    getTemplates: () => ipcRenderer.invoke('get-templates'),
    updateTemplate: (data) => ipcRenderer.invoke('update-template', data),
    deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),
    updateTemplateFields: (data) => ipcRenderer.invoke('update-template-fields', data),
    reloadTemplateFields: (templateId) => ipcRenderer.invoke('reload-template-fields', templateId),
    
    // Document Generation
    generateDocument: (data) => ipcRenderer.invoke('generate-document', data),
    printDocument: (filePath) => ipcRenderer.invoke('print-document', filePath),
    openAndPrint: (filePath) => ipcRenderer.invoke('open-and-print', filePath), // Make sure this line exists
    
    // Data Records
    saveDataRecord: (data) => ipcRenderer.invoke('save-data-record', data),
    getDataRecords: (templateId) => ipcRenderer.invoke('get-data-records', templateId),
    
    // Preview
    previewTemplate: (templateId) => ipcRenderer.invoke('preview-template', templateId),
    
    // File Dialogs
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFileDialog: (data) => ipcRenderer.invoke('save-file-dialog', data),
    exportDocument: (data) => ipcRenderer.invoke('export-document', data),
    
    // App Info
    getAppInfo: () => ipcRenderer.invoke('get-app-info')
});