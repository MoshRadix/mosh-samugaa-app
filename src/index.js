const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');

// Suppress experimental warnings for Node 24
process.noDeprecation = true;

let mainWindow;
const DB_PATH = path.join(app.getPath('userData'), 'database.json');
const TEMPLATES_DIR = path.join(app.getPath('userData'), 'templates');
const OUTPUTS_DIR = path.join(app.getPath('userData'), 'outputs');

// Initialize database with better error handling for Node 24
async function initDatabase() {
    try {
        await fs.access(DB_PATH);
    } catch {
        await fs.writeFile(DB_PATH, JSON.stringify({ templates: [], dataRecords: [] }, null, 2));
    }
    
    try {
        await fs.access(TEMPLATES_DIR);
    } catch {
        await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    }
    
    try {
        await fs.access(OUTPUTS_DIR);
    } catch {
        await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    }
}

// Database operations
async function getDatabase() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { templates: [], dataRecords: [] };
    }
}

async function saveDatabase(db) {
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

// Create the main application window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        title: 'Document Generator',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}



// IPC Handlers for file dialog
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Document Templates', extensions: ['docx', 'xlsx'] },
            { name: 'Word Documents', extensions: ['docx'] },
            { name: 'Excel Spreadsheets', extensions: ['xlsx'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('save-file-dialog', async (event, { defaultName, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: filters || [
            { name: 'Document', extensions: ['docx'] },
            { name: 'PDF', extensions: ['pdf'] }
        ]
    });
    
    if (!result.canceled) {
        return result.filePath;
    }
    return null;
});

// Template Management
ipcMain.handle('upload-template', async (event, { filePath, metadata }) => {
    try {
        const db = await getDatabase();
        
        // Validate file exists
        await fs.access(filePath);
        
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        const templateId = uuidv4();
        const templateFileName = `${templateId}_${fileName}`;
        const templatePath = path.join(TEMPLATES_DIR, templateFileName);
        
        // Save template file
        await fs.writeFile(templatePath, fileBuffer);
        
        const extension = path.extname(fileName).toLowerCase();
        const template = {
            id: templateId,
            name: metadata.name || fileName.replace(extension, ''),
            description: metadata.description || '',
            category: metadata.category || 'General',
            filePath: templatePath,
            originalName: fileName,
            type: extension === '.docx' ? 'word' : extension === '.xlsx' ? 'excel' : 'unknown',
            hasFields: false,
            fields: [],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Auto-detect placeholders for DOCX
        if (extension === '.docx') {
            try {
                const zip = new PizZip(fileBuffer);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    nullGetter: () => ''
                });
                
                const fullText = doc.getFullText();
                const regex = /\{([^}]+)\}/g;
                const matches = [...fullText.matchAll(regex)];
                
                if (matches.length > 0) {
                    template.hasFields = true;
                    const uniqueKeys = new Set();
                    template.fields = matches
                        .filter(match => {
                            const key = match[1].trim();
                            if (uniqueKeys.has(key)) return false;
                            uniqueKeys.add(key);
                            return true;
                        })
                        .map(match => ({
                            key: match[1].trim(),
                            label: match[1].trim()
                                .replace(/\./g, ' ')
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase()),
                            type: 'string',
                            required: false,
                            value: ''
                        }));
                }
            } catch (error) {
                console.log('No placeholders found or error reading DOCX template:', error.message);
            }
        }
        
        // Auto-detect placeholders for XLSX
        if (extension === '.xlsx') {
            try {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(fileBuffer);
                const placeholders = [];
                const uniqueKeys = new Set();
                
                workbook.eachSheet(sheet => {
                    sheet.eachRow(row => {
                        row.eachCell(cell => {
                            if (cell.value && typeof cell.value === 'string') {
                                const regex = /\{([^}]+)\}/g;
                                const matches = [...cell.value.matchAll(regex)];
                                matches.forEach(match => {
                                    const key = match[1].trim();
                                    if (!uniqueKeys.has(key)) {
                                        uniqueKeys.add(key);
                                        placeholders.push({
                                            key: key,
                                            label: key
                                                .replace(/\./g, ' ')
                                                .replace(/_/g, ' ')
                                                .replace(/\b\w/g, l => l.toUpperCase()),
                                            type: 'string',
                                            required: false,
                                            value: ''
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
                
                if (placeholders.length > 0) {
                    template.hasFields = true;
                    template.fields = placeholders;
                }
            } catch (error) {
                console.log('No placeholders found or error reading XLSX template:', error.message);
            }
        }
        
        db.templates.push(template);
        await saveDatabase(db);
        
        return template;
    } catch (error) {
        console.error('Error uploading template:', error);
        throw new Error(`Failed to upload template: ${error.message}`);
    }
});

ipcMain.handle('get-templates', async () => {
    const db = await getDatabase();
    return db.templates || [];
});

ipcMain.handle('update-template', async (event, { id, updates }) => {
    const db = await getDatabase();
    const index = db.templates.findIndex(t => t.id === id);
    if (index !== -1) {
        db.templates[index] = { 
            ...db.templates[index], 
            ...updates, 
            updatedAt: new Date().toISOString() 
        };
        await saveDatabase(db);
        return db.templates[index];
    }
    throw new Error('Template not found');
});

ipcMain.handle('delete-template', async (event, id) => {
    const db = await getDatabase();
    const template = db.templates.find(t => t.id === id);
    if (template) {
        try {
            await fs.unlink(template.filePath);
        } catch (error) {
            console.log('File already deleted or not found');
        }
        db.templates = db.templates.filter(t => t.id !== id);
        await saveDatabase(db);
        return true;
    }
    throw new Error('Template not found');
});

ipcMain.handle('update-template-fields', async (event, { templateId, fields }) => {
    const db = await getDatabase();
    const index = db.templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
        db.templates[index].fields = fields;
        db.templates[index].hasFields = fields.length > 0;
        db.templates[index].updatedAt = new Date().toISOString();
        await saveDatabase(db);
        return db.templates[index];
    }
    throw new Error('Template not found');
});

// Document Generation
ipcMain.handle('generate-document', async (event, { templateId, formData, outputFormat = 'docx' }) => {
    try {
        const db = await getDatabase();
        const template = db.templates.find(t => t.id === templateId);
        
        if (!template) {
            throw new Error('Template not found');
        }
        
        // Validate template file exists
        await fs.access(template.filePath);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFileName = `${template.name}_${timestamp}.${outputFormat}`;
        const outputPath = path.join(OUTPUTS_DIR, outputFileName);
        
        if (template.type === 'word') {
            await generateWordDocument(template.filePath, outputPath, formData);
        } else if (template.type === 'excel') {
            await generateExcelDocument(template.filePath, outputPath, formData);
        } else {
            throw new Error('Unsupported template type');
        }
        
        // Save data record automatically
        if (!db.dataRecords) db.dataRecords = [];
        db.dataRecords.push({
            id: uuidv4(),
            templateId,
            data: formData,
            outputPath,
            createdAt: new Date().toISOString()
        });
        await saveDatabase(db);
        
        return {
            outputPath,
            outputFileName,
            templateName: template.name
        };
    } catch (error) {
        console.error('Error generating document:', error);
        throw new Error(`Failed to generate document: ${error.message}`);
    }
});

async function generateWordDocument(templatePath, outputPath, data) {
    try {
        const content = await fs.readFile(templatePath);
        const zip = new PizZip(content);
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => '',
            delimiters: { start: '{', end: '}' }
        });
        
        // Render the document with data
        doc.render(data);
        
        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });
        
        await fs.writeFile(outputPath, buf);
    } catch (error) {
        console.error('Error generating Word document:', error);
        throw error;
    }
}

async function generateExcelDocument(templatePath, outputPath, data) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        
        // Replace placeholders in all sheets
        workbook.eachSheet(sheet => {
            // Replace placeholders in cells
            sheet.eachRow(row => {
                row.eachCell(cell => {
                    if (cell.value && typeof cell.value === 'string') {
                        let cellValue = cell.value;
                        Object.keys(data).forEach(key => {
                            const placeholder = `{${key}}`;
                            if (cellValue.includes(placeholder)) {
                                if (cellValue === placeholder) {
                                    // If the entire cell is just the placeholder, preserve type
                                    cell.value = data[key] !== undefined ? data[key] : '';
                                } else {
                                    // Replace within text
                                    cellValue = cellValue.replace(
                                        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                                        data[key] !== undefined ? String(data[key]) : ''
                                    );
                                    cell.value = cellValue;
                                }
                            }
                        });
                    }
                });
            });
            
            // Set A4 page setup
            sheet.pageSetup = {
                paperSize: 9, // A4
                orientation: 'portrait',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: {
                    left: 0.7,
                    right: 0.7,
                    top: 0.75,
                    bottom: 0.75,
                    header: 0.3,
                    footer: 0.3
                }
            };
        });
        
        await workbook.xlsx.writeFile(outputPath);
    } catch (error) {
        console.error('Error generating Excel document:', error);
        throw error;
    }
}

// Print document
// Add this new IPC handler to reload template fields
ipcMain.handle('reload-template-fields', async (event, templateId) => {
    try {
        const db = await getDatabase();
        const template = db.templates.find(t => t.id === templateId);
        
        if (!template) {
            throw new Error('Template not found');
        }
        
        // Reload the template file and detect fields again
        const fileBuffer = await fs.readFile(template.filePath);
        const extension = path.extname(template.originalName).toLowerCase();
        const fields = [];
        
        if (extension === '.docx') {
            try {
                const zip = new PizZip(fileBuffer);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    nullGetter: () => ''
                });
                
                const fullText = doc.getFullText();
                const regex = /\{([^}]+)\}/g;
                const matches = [...fullText.matchAll(regex)];
                
                if (matches.length > 0) {
                    const uniqueKeys = new Set();
                    matches.forEach(match => {
                        const key = match[1].trim();
                        if (!uniqueKeys.has(key)) {
                            uniqueKeys.add(key);
                            fields.push({
                                key: key,
                                label: key.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                type: 'string',
                                required: false,
                                value: ''
                            });
                        }
                    });
                }
            } catch (error) {
                console.log('Error reading DOCX template:', error.message);
            }
        } else if (extension === '.xlsx') {
            try {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(fileBuffer);
                const uniqueKeys = new Set();
                
                workbook.eachSheet(sheet => {
                    sheet.eachRow(row => {
                        row.eachCell(cell => {
                            if (cell.value && typeof cell.value === 'string') {
                                const regex = /\{([^}]+)\}/g;
                                const matches = [...cell.value.matchAll(regex)];
                                matches.forEach(match => {
                                    const key = match[1].trim();
                                    if (!uniqueKeys.has(key)) {
                                        uniqueKeys.add(key);
                                        fields.push({
                                            key: key,
                                            label: key.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                            type: 'string',
                                            required: false,
                                            value: ''
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
            } catch (error) {
                console.log('Error reading XLSX template:', error.message);
            }
        }
        
        // Update the template with reloaded fields
        template.fields = fields;
        template.hasFields = fields.length > 0;
        template.updatedAt = new Date().toISOString();
        
        // Save to database
        const index = db.templates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            db.templates[index] = template;
            await saveDatabase(db);
        }
        
        return template;
    } catch (error) {
        console.error('Error reloading template fields:', error);
        throw new Error(`Failed to reload fields: ${error.message}`);
    }
});

// Save data record
ipcMain.handle('save-data-record', async (event, { templateId, data }) => {
    try {
        const db = await getDatabase();
        const record = {
            id: uuidv4(),
            templateId,
            data,
            createdAt: new Date().toISOString()
        };
        
        if (!db.dataRecords) {
            db.dataRecords = [];
        }
        
        db.dataRecords.push(record);
        await saveDatabase(db);
        
        return record;
    } catch (error) {
        console.error('Error saving data record:', error);
        throw new Error(`Failed to save record: ${error.message}`);
    }
});

// Get data records
ipcMain.handle('get-data-records', async (event, templateId) => {
    try {
        const db = await getDatabase();
        return (db.dataRecords || []).filter(r => r.templateId === templateId);
    } catch (error) {
        console.error('Error getting data records:', error);
        return [];
    }
});

// Preview template
ipcMain.handle('preview-template', async (event, templateId) => {
    try {
        const db = await getDatabase();
        const template = db.templates.find(t => t.id === templateId);
        
        if (template && template.filePath) {
            await fs.access(template.filePath);
            const result = await shell.openPath(template.filePath);
            
            if (result) {
                throw new Error(`Failed to open file: ${result}`);
            }
            
            return true;
        }
        throw new Error('Template file not found');
    } catch (error) {
        console.error('Error previewing template:', error);
        throw new Error(`Failed to preview template: ${error.message}`);
    }
});

// Export document to custom location
ipcMain.handle('export-document', async (event, { sourcePath, suggestedName }) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Document',
            defaultPath: suggestedName,
            filters: [
                { name: 'Word Document', extensions: ['docx'] },
                { name: 'Excel Spreadsheet', extensions: ['xlsx'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            await fs.copyFile(sourcePath, result.filePath);
            return result.filePath;
        }
        return null;
    } catch (error) {
        console.error('Error exporting document:', error);
        throw new Error(`Failed to export document: ${error.message}`);
    }
});

// Get application version info
ipcMain.handle('get-app-info', () => {
    return {
        version: app.getVersion(),
        name: app.getName(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        platform: process.platform,
        arch: process.arch
    };
});

ipcMain.handle('open-and-print', async (event, filePath) => {
    try {
        console.log('open-and-print called with filePath:', filePath);
        
        // Check if file exists
        await fs.access(filePath);
        
        // For Windows
        if (process.platform === 'win32') {
            const { exec } = require('child_process');
            // Use PowerShell to print to default printer
            const command = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print -WindowStyle Hidden"`;
            
            return new Promise((resolve, reject) => {
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Print error:', error);
                        reject(new Error(`Failed to print: ${error.message}`));
                    } else {
                        console.log('Document sent to printer successfully');
                        resolve(true);
                    }
                });
            });
        } 
        // For macOS
        else if (process.platform === 'darwin') {
            const { exec } = require('child_process');
            // Use lp command for macOS
            const command = `lp "${filePath}"`;
            
            return new Promise((resolve, reject) => {
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Print error:', error);
                        reject(new Error(`Failed to print: ${error.message}`));
                    } else {
                        console.log('Document sent to printer successfully');
                        resolve(true);
                    }
                });
            });
        }
        // For Linux
        else if (process.platform === 'linux') {
            const { exec } = require('child_process');
            // Use lp command for Linux
            const command = `lp "${filePath}"`;
            
            return new Promise((resolve, reject) => {
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Print error:', error);
                        reject(new Error(`Failed to print: ${error.message}`));
                    } else {
                        console.log('Document sent to printer successfully');
                        resolve(true);
                    }
                });
            });
        }
        else {
            throw new Error('Printing not supported on this platform');
        }
    } catch (error) {
        console.error('Error in open-and-print:', error);
        throw new Error(`Failed to print document: ${error.message}`);
    }
});
// Print document directly to default printer
ipcMain.handle('print-document', async (event, filePath) => {
    try {
        console.log('print-document called with filePath:', filePath);
        
        // Check if file exists
        await fs.access(filePath);
        
        // For Windows
        if (process.platform === 'win32') {
            const { exec } = require('child_process');
            // Use PowerShell to print to default printer
            const command = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print -WindowStyle Hidden"`;
            
            return new Promise((resolve, reject) => {
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Print error:', error);
                        reject(new Error(`Failed to print: ${error.message}`));
                    } else {
                        console.log('Document sent to printer successfully');
                        resolve(true);
                    }
                });
            });
        } 
        // For macOS
        else if (process.platform === 'darwin') {
            const { exec } = require('child_process');
            // Use lp command for macOS
            const command = `lp "${filePath}"`;
            
            return new Promise((resolve, reject) => {
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Print error:', error);
                        reject(new Error(`Failed to print: ${error.message}`));
                    } else {
                        console.log('Document sent to printer successfully');
                        resolve(true);
                    }
                });
            });
        }
        // For Linux
        else if (process.platform === 'linux') {
            const { exec } = require('child_process');
            // Use lp command for Linux
            const command = `lp "${filePath}"`;
            
            return new Promise((resolve, reject) => {
                exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Print error:', error);
                        reject(new Error(`Failed to print: ${error.message}`));
                    } else {
                        console.log('Document sent to printer successfully');
                        resolve(true);
                    }
                });
            });
        }
        else {
            throw new Error('Printing not supported on this platform');
        }
    } catch (error) {
        console.error('Error in print-document:', error);
        throw new Error(`Failed to print document: ${error.message}`);
    }
});

// App lifecycle
app.whenReady().then(async () => {
    await initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});