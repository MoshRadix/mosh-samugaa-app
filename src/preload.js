/**
 * @file preload.js
 * @description Secure Electron Preload Script.
 * Context-isolated bridge exposing IPC (Inter-Process Communication) safe channels 
 * from the Node.js main process to the isolated frontend Renderer environment.
 */

const { contextBridge, ipcRenderer } = require("electron");

/**
 * Expose safe, explicit APIs to the Renderer Process main window object via 'window.electronAPI'
 * protects against full Node.js access vulnerabilities.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  
  // ==========================================
  // TEMPLATE MANAGEMENT
  // ==========================================

  /**
   * Uploads a new raw template file along with contextual metadata.
   * @param {Object} data - Contains { filePath, metadata: { name, description, category } }
   * @returns {Promise<Object>} Resolves with the newly created database template object.
   */
  uploadTemplate: (data) => ipcRenderer.invoke("upload-template", data),

  /**
   * Retrieves all loaded document templates stored inside the persistent database.
   * @returns {Promise<Array>} Array of saved template entities.
   */
  getTemplates: () => ipcRenderer.invoke("get-templates"),

  /**
   * Updates core metadata elements of a specific template.
   * @param {Object} data - Contains target { id, updates: { name, description, category } }
   * @returns {Promise<Object>} Updated template object details.
   */
  updateTemplate: (data) => ipcRenderer.invoke("update-template", data),

  /**
   * Permanently deletes a template and its underlying file resource.
   * @param {string} id - The unique template identifier string (UUID).
   * @returns {Promise<boolean>} Success validation status.
   */
  deleteTemplate: (id) => ipcRenderer.invoke("delete-template", id),

  /**
   * Overwrites or updates structural structural schema fields linked to a template.
   * @param {Object} data - Contains { templateId, fields: [...] }
   * @returns {Promise<Object>} Refreshed template state.
   */
  updateTemplateFields: (data) => ipcRenderer.invoke("update-template-fields", data),

  /**
   * Parses underlying file variables and overwrites existing form structure schemas.
   * @param {string} templateId - Unique template UUID identifier.
   * @returns {Promise<Object>} The parsed field array state map.
   */
  reloadTemplateFields: (templateId) => ipcRenderer.invoke("reload-template-fields", templateId),

  // ==========================================
  // DOCUMENT GENERATION
  // ==========================================

  /**
   * Compiles template schema data bindings directly into concrete downloadable files (.docx / .xlsx).
   * @param {Object} data - Contains { templateId, formData, outputFormat }
   * @returns {Promise<Object>} Data parameters containing the newly generated output file metadata paths.
   */
  generateDocument: (data) => ipcRenderer.invoke("generate-document", data),

  /**
   * dispatches an execution process request directly to system printers for physical production.
   * @param {string} filePath - Path string indicating local target document files.
   * @returns {Promise<boolean>} Print spool engine completion confirmation.
   */
  printDocument: (filePath) => ipcRenderer.invoke("print-document", filePath),

  /**
   * Fallback variant pipeline for legacy execution threads calling an automated open-print interface.
   * @param {string} filePath - Absolute path string pointing directly to target documents.
   * @returns {Promise<boolean>} Print spool completion handling confirmations.
   */
  openAndPrint: (filePath) => ipcRenderer.invoke("print-document", filePath),

  // ==========================================
  // DATA RECORDS
  // ==========================================

  /**
   * Records completed form transactions into persistent structural audit logs.
   * @param {Object} data - Object package enclosing tracking parameters and form responses.
   * @returns {Promise<Object>} Created database historical transaction record trace.
   */
  saveDataRecord: (data) => ipcRenderer.invoke("save-data-record", data),

  /**
   * Fetches historical document generator entry logs tied directly to a single parent template reference.
   * @param {string} templateId - Filter context template tracking UUID.
   * @returns {Promise<Array>} List containing valid data records linked to the key context.
   */
  getDataRecords: (templateId) => ipcRenderer.invoke("get-data-records", templateId),

  // ==========================================
  // PREVIEW
  // ==========================================

  /**
   * Launches shell actions to render a non-editable, viewable preview window instance for an item template.
   * @param {string} templateId - Unique template layout target key context.
   * @returns {Promise<void>}
   */
  previewTemplate: (templateId) => ipcRenderer.invoke("preview-template", templateId),

  // ==========================================
  // FILE DIALOGS
  // ==========================================

  /**
   * Invokes native dialog selectors allowing end-users safely select local assets to ingest.
   * @returns {Promise<string|null>} Target selected absolute file location reference string, or null on cancellation.
   */
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),

  /**
   * Triggers native workspace destination picker utilities specifying download pathways.
   * @param {Object} data - Configuration properties for the native prompt interface.
   * @returns {Promise<string|null>} Safe targeting path to confirm where exports land.
   */
  saveFileDialog: (data) => ipcRenderer.invoke("save-file-dialog", data),

  /**
   * Finalizes document generation actions and relocates target assets cleanly into custom external directories.
   * @param {Object} data - Struct mapping operational keys and path arguments.
   * @returns {Promise<void>}
   */
  exportDocument: (data) => ipcRenderer.invoke("export-document", data),

  // ==========================================
  // APP CONFIGURATION & SETTINGS
  // ==========================================

  /**
   * Extracts build distribution properties (version tracker, repository URLs, developer profiles).
   * @returns {Promise<Object>} Key-value information mapping the active system release.
   */
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  /**
   * Extracts localized user preferences and workspace folder rules.
   * @returns {Promise<Object>} Contains dynamic system directories (templatesDir, outputsDir, dbPath).
   */
  getSettings: () => ipcRenderer.invoke("get-settings"),

  /**
   * Overwrites runtime configuration state directories and settings preferences safely.
   * @param {Object} settings - New tracking settings preferences mapping variables.
   * @returns {Promise<void>}
   */
  updateSettings: (settings) => ipcRenderer.invoke("update-settings", settings),

  /**
   * Clears out target parameters and resets configuration structures back to baseline parameters.
   * @returns {Promise<Object>} Returns defaults to safely update views inside components cleanly.
   */
  resetSettings: () => ipcRenderer.invoke("reset-settings"),

  /**
   * Spawns OS native windows directly to pick local storage directory folders seamlessly.
   * @returns {Promise<string|null>} Path identifier string indicating picked targeted context locations.
   */
  openDirectoryDialog: () => ipcRenderer.invoke("open-directory-dialog"),

  /**
   * Saves a base64-encoded watermarked image to a "watermarked/" subfolder
   * alongside the original source image file.
   * @param {Object} data - { sourceFilePath, outputFileName, base64Data, mimeType }
   * @returns {Promise<{ success: boolean, outputPath: string }>}
   */
  saveWatermarkedImage: (data) =>
    ipcRenderer.invoke("save-watermarked-image", data),

  /**
   * Opens a native folder-picker so the renderer can obtain a real filesystem
   * path without relying on File.path (which is stripped in sandboxed renderers).
   * @returns {Promise<string|null>} Absolute path chosen by the user, or null.
   */
  chooseOutputDirectory: () =>
    ipcRenderer.invoke("choose-output-directory"),

  // ==========================================
  // WORK LOGS
  // ==========================================

  /**
   * Adds a new work log entry to the dedicated work_logs table.
   * @param {Object} data - { task, notes, createdAt, tags, photoPath }
   * @returns {Promise<Object>} The newly created work log record.
   */
  addWorkLog: (data) => ipcRenderer.invoke("add-work-log", data),

  /**
   * Retrieves all work log entries, newest first.
   * @returns {Promise<Array>} Array of work log objects.
   */
  getWorkLogs: () => ipcRenderer.invoke("get-work-logs"),

  /**
   * Permanently deletes a work log by its ID.
   * @param {string} id - UUID of the work log to delete.
   * @returns {Promise<boolean>} True on success.
   */
  deleteWorkLog: (id) => ipcRenderer.invoke("delete-work-log", id),

  /**
   * Exports an array of work log row objects to an Excel file
   * via a native save dialog.
   * @param {Object} data - { rows: Array<{no,date,time,task,notes,tags}> }
   * @returns {Promise<{success:boolean, path:string}|null>}
   */
  exportWorkLogsExcel: (data) => ipcRenderer.invoke("export-work-logs-excel", data),

  /**
   * Saves a base64 photo attached to a work log entry.
   * @param {Object} data - { dataUrl, fileName, mimeType }
   * @returns {Promise<{path: string}>}
   */
  saveWorkLogPhoto: (data) => ipcRenderer.invoke("save-work-log-photo", data),

  /**
   * Reads a saved work log photo and returns it as a data URL.
   * @param {string} photoPath - Absolute path to the stored photo file.
   * @returns {Promise<string|null>} Base64 data URL or null.
   */
  getWorkLogPhoto: (photoPath) => ipcRenderer.invoke("get-work-log-photo", photoPath),

  /**
   * Exports a formatted monthly summary as a Word (.docx) report.
   * @param {Object} data - { rows, month, officer }
   * @returns {Promise<{success:boolean, path:string}|null>}
   */
  exportWorkLogsWord: (data) => ipcRenderer.invoke("export-work-logs-word", data),

  /**
   * Exports a formatted monthly summary as a styled Excel report.
   * @param {Object} data - { rows, month, officer }
   * @returns {Promise<{success:boolean, path:string}|null>}
   */
  exportWorkLogsMonthlyExcel: (data) => ipcRenderer.invoke("export-work-logs-monthly-excel", data),

  /**
   * Opens a native file dialog restricted to CSV / XLSX files (for batch generation).
   * @returns {Promise<string|null>} Absolute path of selected file, or null if cancelled.
   */
  openCsvXlsxDialog: () => ipcRenderer.invoke("open-csv-xlsx-dialog"),

  /**
   * Parses an XLSX workbook buffer (sent as base64) and returns columns + rows.
   * @param {Object} data - { base64: string }
   * @returns {Promise<{ columns: string[], rows: Object[] }>}
   */
  parseSpreadsheetBuffer: (data) => ipcRenderer.invoke("parse-spreadsheet-buffer", data),

  /**
   * Generates a document for every row in the provided data array using the
   * given template, applying the same pipeline (meta_, paragraph mode, etc.)
   * as single-record generation. Returns a result summary.
   * @param {Object} data - { templateId, rows: Array<Object>, outputFormat }
   * @returns {Promise<{ total, succeeded, failed, results: Array }>}
   */
  batchGenerateDocuments: (data) => ipcRenderer.invoke("batch-generate-documents", data),
  batchMergeToPdf: (data) => ipcRenderer.invoke("batch-merge-to-pdf", data),

  // ==========================================
  // SOCIAL MEDIA TEMPLATES
  // ==========================================

  /** List all saved SM templates (metadata + thumbnail, no imageDataUrl). */
  smListTemplates: () => ipcRenderer.invoke("sm-list-templates"),

  /** Save (create or update) a SM template. Image stored as a file; JSON stored as metadata. */
  smSaveTemplate: (data) => ipcRenderer.invoke("sm-save-template", data),

  /** Load a single SM template by id, with imageDataUrl rehydrated from disk. */
  smLoadTemplate: (id) => ipcRenderer.invoke("sm-load-template", id),

  /** Delete a SM template and its associated image file. */
  smDeleteTemplate: (id) => ipcRenderer.invoke("sm-delete-template", id),

  /** Export a generated image — opens native save dialog and writes the file. */
  smExportImage: (data) => ipcRenderer.invoke("sm-export-image", data),
});


//OLD ONE
// const { contextBridge, ipcRenderer } = require("electron");

// // Expose protected methods that allow the renderer process to use
// // the ipcRenderer without exposing the entire object
// contextBridge.exposeInMainWorld("electronAPI", {
//   // Template Management
//   uploadTemplate: (data) => ipcRenderer.invoke("upload-template", data),
//   getTemplates: () => ipcRenderer.invoke("get-templates"),
//   updateTemplate: (data) => ipcRenderer.invoke("update-template", data),
//   deleteTemplate: (id) => ipcRenderer.invoke("delete-template", id),
//   updateTemplateFields: (data) =>
//     ipcRenderer.invoke("update-template-fields", data),
//   reloadTemplateFields: (templateId) =>
//     ipcRenderer.invoke("reload-template-fields", templateId),

//   // Document Generation
//   generateDocument: (data) => ipcRenderer.invoke("generate-document", data),
//   printDocument: (filePath) => ipcRenderer.invoke("print-document", filePath),
//   openAndPrint: (filePath) => ipcRenderer.invoke("print-document", filePath), // Make sure this line exists

//   // Data Records
//   saveDataRecord: (data) => ipcRenderer.invoke("save-data-record", data),
//   getDataRecords: (templateId) =>
//     ipcRenderer.invoke("get-data-records", templateId),

//   // Preview
//   previewTemplate: (templateId) =>
//     ipcRenderer.invoke("preview-template", templateId),

//   // File Dialogs
//   openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
//   saveFileDialog: (data) => ipcRenderer.invoke("save-file-dialog", data),
//   exportDocument: (data) => ipcRenderer.invoke("export-document", data),

//   // App Info
//   getAppInfo: () => ipcRenderer.invoke("get-app-info"),
//   //settings management
//   getSettings: () => ipcRenderer.invoke("get-settings"),
//   updateSettings: (settings) => ipcRenderer.invoke("update-settings", settings),
//   resetSettings: () => ipcRenderer.invoke("reset-settings"),
//   openDirectoryDialog: () => ipcRenderer.invoke("open-directory-dialog"),
// });