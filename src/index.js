const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
// const ExcelJS = require("exceljs");
const ExcelJS = require("@protobi/exceljs");
const { v4: uuidv4 } = require("uuid");
const initSqlJs = require("sql.js");
const { updateElectronApp, UpdateSourceType } = require("update-electron-app");

process.noDeprecation = true;
// At the very top of src/index.js, before any other code
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;
let db = null; // SQL.js database instance
let dbPath = null; // Current database file path

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
let settings = {
  dataDir: app.getPath("userData"),
  templatesDir: path.join(app.getPath("userData"), "templates"),
  outputsDir: path.join(app.getPath("userData"), "outputs"),
  dbPath: path.join(app.getPath("userData"), "mto_forms.db"),
};

// ========== SQL.js Helpers ==========
async function initSQLite(filePath) {
  dbPath = filePath;
  const SQL = await initSqlJs();
  if (db) db.close();
  let fileData = null;
  try {
    fileData = await fs.readFile(filePath);
  } catch (e) {}
  db = new SQL.Database(fileData);
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      filePath TEXT NOT NULL,
      originalName TEXT NOT NULL,
      type TEXT NOT NULL,
      hasFields INTEGER NOT NULL DEFAULT 0,
      fields TEXT,
      dateRangeConfig TEXT,
      hasDateRange INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS data_records (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      data TEXT NOT NULL,
      outputPath TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
    CREATE INDEX IF NOT EXISTS idx_templates_hasFields ON templates(hasFields);
    CREATE INDEX IF NOT EXISTS idx_records_templateId ON data_records(templateId);
  `);
  await saveDatabase();
}

async function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(dbPath, buffer);
}

async function migrateFromJSONIfNeeded() {
  const oldJsonPath = path.join(app.getPath("userData"), "database.json");
  if (!fsSync.existsSync(oldJsonPath)) return false;
  console.log("Migrating from legacy JSON...");
  try {
    const jsonData = JSON.parse(await fs.readFile(oldJsonPath, "utf8"));
    const templates = jsonData.templates || [];
    const dataRecords = jsonData.dataRecords || [];
    for (const t of templates) {
      db.run(
        `
        INSERT OR REPLACE INTO templates (
          id, name, description, category, filePath, originalName, type,
          hasFields, fields, dateRangeConfig, hasDateRange, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          t.id,
          t.name,
          t.description || "",
          t.category || "General",
          t.filePath,
          t.originalName,
          t.type,
          t.hasFields ? 1 : 0,
          JSON.stringify(t.fields || []),
          t.dateRangeConfig ? JSON.stringify(t.dateRangeConfig) : null,
          t.hasDateRange ? 1 : 0,
          t.isActive !== false ? 1 : 0,
          t.createdAt,
          t.updatedAt,
        ],
      );
    }
    for (const r of dataRecords) {
      db.run(
        `
        INSERT OR REPLACE INTO data_records (id, templateId, data, outputPath, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          r.id,
          r.templateId,
          JSON.stringify(r.data),
          r.outputPath || "",
          r.createdAt,
        ],
      );
    }
    await saveDatabase();
    await fs.rename(oldJsonPath, oldJsonPath + ".backup");
    console.log("Migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}
// ========== Config & Utilities ==========
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf8");
    settings = { ...settings, ...JSON.parse(data) };
  } catch (err) {}
}
async function saveConfig() {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(settings, null, 2));
}
function getTemplatesDir() {
  return settings.templatesDir;
}
function getOutputsDir() {
  return settings.outputsDir;
}
function getDbPath() {
  return settings.dbPath;
}

// ========== Database Operations ==========
// function getTemplates() {
//   const rows = db.exec("SELECT * FROM templates ORDER BY name");
//   if (rows.length === 0) return [];
//   return rows[0].values.map(row => ({
//     id: row[0], name: row[1], description: row[2], category: row[3],
//     filePath: row[4], originalName: row[5], type: row[6],
//     hasFields: row[7] === 1,
//     fields: JSON.parse(row[8] || "[]"),
//     dateRangeConfig: row[9] ? JSON.parse(row[9]) : null,
//     hasDateRange: row[10] === 1,
//     isActive: row[11] === 1,
//     createdAt: row[12], updatedAt: row[13]
//   }));
// }
function getTemplates() {
  const rows = db.exec(`
    SELECT t.*, 
           (SELECT COUNT(*) FROM data_records WHERE templateId = t.id) as recordCount 
    FROM templates t 
    ORDER BY name
  `);
  if (rows.length === 0) return [];
  return rows[0].values.map((row) => ({
    id: row[0],
    name: row[1],
    description: row[2],
    category: row[3],
    filePath: row[4],
    originalName: row[5],
    type: row[6],
    hasFields: row[7] === 1,
    fields: JSON.parse(row[8] || "[]"),
    dateRangeConfig: row[9] ? JSON.parse(row[9]) : null,
    hasDateRange: row[10] === 1,
    isActive: row[11] === 1,
    createdAt: row[12],
    updatedAt: row[13],
    recordCount: row[14] || 0, // <-- new field
  }));
}

function getTemplateById(id) {
  const stmt = db.prepare("SELECT * FROM templates WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) return null;
  const row = stmt.getAsObject();
  stmt.free();
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    filePath: row.filePath,
    originalName: row.originalName,
    type: row.type,
    hasFields: row.hasFields === 1,
    fields: JSON.parse(row.fields || "[]"),
    dateRangeConfig: row.dateRangeConfig
      ? JSON.parse(row.dateRangeConfig)
      : null,
    hasDateRange: row.hasDateRange === 1,
    isActive: row.isActive === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function insertTemplate(template) {
  db.run(
    `
    INSERT INTO templates (
      id, name, description, category, filePath, originalName, type,
      hasFields, fields, dateRangeConfig, hasDateRange, isActive, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      template.id,
      template.name,
      template.description || "",
      template.category || "General",
      template.filePath,
      template.originalName,
      template.type,
      template.hasFields ? 1 : 0,
      JSON.stringify(template.fields || []),
      template.dateRangeConfig
        ? JSON.stringify(template.dateRangeConfig)
        : null,
      template.hasDateRange ? 1 : 0,
      template.isActive !== false ? 1 : 0,
      template.createdAt,
      template.updatedAt,
    ],
  );
}

function updateTemplateFields(templateId, fields, dateRangeConfig = null) {
  const hasFields = fields && fields.length > 0;
  const hasDateRange = !!(dateRangeConfig && dateRangeConfig.enabled);
  db.run(
    `
    UPDATE templates SET fields = ?, hasFields = ?, dateRangeConfig = ?, hasDateRange = ?, updatedAt = ?
    WHERE id = ?
  `,
    [
      JSON.stringify(fields || []),
      hasFields ? 1 : 0,
      dateRangeConfig ? JSON.stringify(dateRangeConfig) : null,
      hasDateRange ? 1 : 0,
      new Date().toISOString(),
      templateId,
    ],
  );
}

function updateTemplateMetadata(templateId, updates) {
  const allowed = ["name", "description", "category", "isActive"];
  const fields = [],
    values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(key === "isActive" ? (value ? 1 : 0) : value);
    }
  }
  if (fields.length === 0) return;
  fields.push("updatedAt = ?");
  values.push(new Date().toISOString(), templateId);
  db.run(`UPDATE templates SET ${fields.join(", ")} WHERE id = ?`, values);
}

function deleteTemplateRecord(templateId) {
  const template = getTemplateById(templateId);
  if (template && template.filePath) {
    try {
      fsSync.unlinkSync(template.filePath);
    } catch (e) {}
  }
  db.run("DELETE FROM templates WHERE id = ?", [templateId]);
}

// --- NEW HELPER: count records for a template ---
function getDataRecordCount(templateId) {
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM data_records WHERE templateId = ?",
  );
  stmt.bind([templateId]);
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return result.count;
}

// --- NEW HELPER: delete oldest records until keepCount remains ---
function deleteOldestDataRecords(templateId, keepCount) {
  const currentCount = getDataRecordCount(templateId);
  const toDelete = currentCount - keepCount;
  if (toDelete > 0) {
    const stmt = db.prepare(`
      DELETE FROM data_records
      WHERE id IN (
        SELECT id FROM data_records
        WHERE templateId = ?
        ORDER BY createdAt ASC
        LIMIT ?
      )
    `);
    stmt.run([templateId, toDelete]);
    stmt.free();
  }
}

// --- MODIFIED: saveDataRecord with auto-rollover (limit 30) ---
function saveDataRecord(record) {
  db.run(
    `
    INSERT INTO data_records (id, templateId, data, outputPath, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `,
    [
      record.id,
      record.templateId,
      JSON.stringify(record.data),
      record.outputPath || "",
      record.createdAt,
    ],
  );

  // Enforce maximum 30 records per template (delete oldest if exceeded)
  deleteOldestDataRecords(record.templateId, 30);
}

function getDataRecords(templateId) {
  const rows = db.exec(
    "SELECT * FROM data_records WHERE templateId = ? ORDER BY createdAt DESC",
    [templateId],
  );
  if (rows.length === 0) return [];
  return rows[0].values.map((row) => ({
    id: row[0],
    templateId: row[1],
    data: JSON.parse(row[2]),
    outputPath: row[3],
    createdAt: row[4],
  }));
}

// ========== Helper: date_range placeholders ==========
function processDateRangePlaceholders(fields) {
  const dateRangePattern = /^date_range_(\d+)$/i;
  const dateRangeFields = [];
  const otherFields = [];
  for (const field of fields) {
    if (dateRangePattern.test(field.key)) dateRangeFields.push(field);
    else otherFields.push(field);
  }
  if (dateRangeFields.length === 0) return { fields, dateRangeConfig: null };
  let maxIndex = 0;
  for (const field of dateRangeFields) {
    const match = field.key.match(dateRangePattern);
    if (match) maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
  }
  const startDateField = {
    key: "date_range_start",
    label: "Start Date",
    type: "date",
    required: true,
    value: "",
    isRTL: false,
    originalKey: "date_range_start",
  };
  otherFields.push(startDateField);
  const dateRangeConfig = {
    enabled: true,
    startKey: "date_range_start",
    count: maxIndex,
    keys: dateRangeFields.map((f) => f.key),
  };
  return { fields: otherFields, dateRangeConfig };
}

// ========== Document Generation ==========
async function generateWordDocument(templatePath, outputPath, data) {
  const content = await fs.readFile(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
    delimiters: { start: "{", end: "}" },
  });
  doc.render(data);
  const buf = doc
    .getZip()
    .generate({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(outputPath, buf);
}

async function generateExcelDocument(templatePath, outputPath, data) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value && typeof cell.value === "string") {
          let cellValue = cell.value;
          Object.keys(data).forEach((key) => {
            const placeholder = `{${key}}`;
            if (cellValue.includes(placeholder)) {
              if (cellValue === placeholder) {
                cell.value = data[key] !== undefined ? data[key] : "";
              } else {
                cellValue = cellValue.replace(
                  new RegExp(
                    placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    "g",
                  ),
                  data[key] !== undefined ? String(data[key]) : "",
                );
                cell.value = cellValue;
              }
            }
          });
        }
      });
    });
  });
  await workbook.xlsx.writeFile(outputPath);
}

// ========== IPC Handlers (with auto-save after mutations) ==========
async function withAutoSave(fn) {
  const result = await fn();
  await saveDatabase();
  return result;
}

ipcMain.handle("upload-template", async (event, { filePath, metadata }) => {
  return withAutoSave(async () => {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const templateId = uuidv4();
    const templateFileName = `${templateId}_${fileName}`;
    const templatePath = path.join(getTemplatesDir(), templateFileName);
    await fs.writeFile(templatePath, fileBuffer);
    const extension = path.extname(fileName).toLowerCase();
    let type = "unknown";
    if (extension === ".docx") type = "word";
    else if (extension === ".xlsx") type = "excel";
    else if (extension === ".pdf") type = "pdf";

    let fields = [];
    let dateRangeConfig = null;

    if (extension === ".docx") {
      try {
        const zip = new PizZip(fileBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: () => "",
        });
        const fullText = doc.getFullText();
        const regex = /\{([^}]+)\}/g;
        const matches = [...fullText.matchAll(regex)];
        const uniqueKeys = new Set();
        fields = matches
          .filter((m) => {
            const k = m[1].trim();
            if (uniqueKeys.has(k)) return false;
            uniqueKeys.add(k);
            return true;
          })
          .map((m) => {
            const key = m[1].trim();
            const isDivehi = /divehi/i.test(key);
            const isDate = /date/i.test(key);
            const cleanKey = key.replace(/^(divehi[._]|date[._])/, "");
            return {
              key,
              label: cleanKey
                .replace(/[._]/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              type: isDate ? "date" : "string",
              required: false,
              value: "",
              isRTL: isDivehi,
              originalKey: key,
            };
          });
        const processed = processDateRangePlaceholders(fields);
        fields = processed.fields;
        dateRangeConfig = processed.dateRangeConfig;
      } catch (e) {}
    } else if (extension === ".xlsx") {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const uniqueKeys = new Set();
        const placeholders = [];
        workbook.eachSheet((sheet) => {
          sheet.eachRow((row) => {
            row.eachCell((cell) => {
              if (cell.value && typeof cell.value === "string") {
                const regex = /\{([^}]+)\}/g;
                const matches = [...cell.value.matchAll(regex)];
                matches.forEach((m) => {
                  const key = m[1].trim();
                  if (!uniqueKeys.has(key)) {
                    uniqueKeys.add(key);
                    const isDivehi = /divehi/i.test(key);
                    const isDate = /date/i.test(key);
                    const cleanKey = key.replace(/^(divehi[._]|date[._])/, "");
                    placeholders.push({
                      key,
                      label: cleanKey
                        .replace(/[._]/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase()),
                      type: isDate ? "date" : "string",
                      required: false,
                      value: "",
                      isRTL: isDivehi,
                      originalKey: key,
                    });
                  }
                });
              }
            });
          });
        });
        const processed = processDateRangePlaceholders(placeholders);
        fields = processed.fields;
        dateRangeConfig = processed.dateRangeConfig;
      } catch (e) {}
    }

    const template = {
      id: templateId,
      name: metadata.name || fileName.replace(extension, ""),
      description: metadata.description || "",
      category: metadata.category || "General",
      filePath: templatePath,
      originalName: fileName,
      type: type,
      hasFields: fields.length > 0,
      fields: fields,
      dateRangeConfig: dateRangeConfig,
      hasDateRange: !!dateRangeConfig,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    insertTemplate(template);
    return template;
  });
});

ipcMain.handle("get-templates", async () => getTemplates());
ipcMain.handle("update-template", async (event, { id, updates }) => {
  return withAutoSave(async () => {
    updateTemplateMetadata(id, updates);
    return getTemplateById(id);
  });
});
ipcMain.handle("delete-template", async (event, id) => {
  return withAutoSave(async () => {
    deleteTemplateRecord(id);
    return true;
  });
});
ipcMain.handle(
  "update-template-fields",
  async (event, { templateId, fields }) => {
    return withAutoSave(async () => {
      updateTemplateFields(templateId, fields);
      return getTemplateById(templateId);
    });
  },
);
ipcMain.handle("reload-template-fields", async (event, templateId) => {
  return withAutoSave(async () => {
    const template = getTemplateById(templateId);
    if (!template) throw new Error("Template not found");
    const fileBuffer = await fs.readFile(template.filePath);
    const extension = path.extname(template.originalName).toLowerCase();
    let newFields = [];
    if (extension === ".docx") {
      const zip = new PizZip(fileBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
      });
      const fullText = doc.getFullText();
      const regex = /\{([^}]+)\}/g;
      const matches = [...fullText.matchAll(regex)];
      const uniqueKeys = new Set();
      newFields = matches
        .filter((m) => {
          const k = m[1].trim();
          if (uniqueKeys.has(k)) return false;
          uniqueKeys.add(k);
          return true;
        })
        .map((m) => {
          const key = m[1].trim();
          const isDivehi = /divehi/i.test(key);
          const isDate = /date/i.test(key);
          const cleanKey = key.replace(/^(divehi[._]|date[._])/, "");
          return {
            key,
            label: cleanKey
              .replace(/[._]/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            type: isDate ? "date" : "string",
            required: false,
            value: "",
            isRTL: isDivehi,
            originalKey: key,
          };
        });
    } else if (extension === ".xlsx") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const uniqueKeys = new Set();
      workbook.eachSheet((sheet) => {
        sheet.eachRow((row) => {
          row.eachCell((cell) => {
            if (cell.value && typeof cell.value === "string") {
              const regex = /\{([^}]+)\}/g;
              const matches = [...cell.value.matchAll(regex)];
              matches.forEach((m) => {
                const key = m[1].trim();
                if (!uniqueKeys.has(key)) {
                  uniqueKeys.add(key);
                  const isDivehi = /divehi/i.test(key);
                  const isDate = /date/i.test(key);
                  const cleanKey = key.replace(/^(divehi[._]|date[._])/, "");
                  newFields.push({
                    key,
                    label: cleanKey
                      .replace(/[._]/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase()),
                    type: isDate ? "date" : "string",
                    required: false,
                    value: "",
                    isRTL: isDivehi,
                    originalKey: key,
                  });
                }
              });
            }
          });
        });
      });
    }
    const processed = processDateRangePlaceholders(newFields);
    newFields = processed.fields;
    const dateRangeConfig = processed.dateRangeConfig;
    updateTemplateFields(templateId, newFields, dateRangeConfig);
    return getTemplateById(templateId);
  });
});
ipcMain.handle(
  "generate-document",
  async (event, { templateId, formData, outputFormat = "docx" }) => {
    const template = getTemplateById(templateId);
    if (!template) throw new Error("Template not found");
    await fs.access(template.filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `${template.name}_${timestamp}.${outputFormat}`;
    const outputPath = path.join(getOutputsDir(), outputFileName);
    if (template.type === "word")
      await generateWordDocument(template.filePath, outputPath, formData);
    else if (template.type === "excel")
      await generateExcelDocument(template.filePath, outputPath, formData);
    else throw new Error("Unsupported template type");
    const record = {
      id: uuidv4(),
      templateId: template.id,
      data: formData,
      outputPath,
      createdAt: new Date().toISOString(),
    };
    saveDataRecord(record);
    await saveDatabase();
    return { outputPath, outputFileName, templateName: template.name };
  },
);
ipcMain.handle("save-data-record", async (event, { templateId, data }) => {
  const record = {
    id: uuidv4(),
    templateId,
    data,
    createdAt: new Date().toISOString(),
    outputPath: "",
  };
  saveDataRecord(record);
  await saveDatabase();
  return record;
});
ipcMain.handle("get-data-records", async (event, templateId) =>
  getDataRecords(templateId),
);
ipcMain.handle("preview-template", async (event, templateId) => {
  const template = getTemplateById(templateId);
  if (template && template.filePath) {
    await fs.access(template.filePath);
    const result = await shell.openPath(template.filePath);
    if (result) throw new Error(`Failed to open file: ${result}`);
    return true;
  }
  throw new Error("Template file not found");
});
ipcMain.handle(
  "export-document",
  async (event, { sourcePath, suggestedName }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Document",
      defaultPath: suggestedName,
      filters: [
        { name: "Word Document", extensions: ["docx"] },
        { name: "Excel Spreadsheet", extensions: ["xlsx"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!result.canceled && result.filePath) {
      await fs.copyFile(sourcePath, result.filePath);
      return result.filePath;
    }
    return null;
  },
);
ipcMain.handle("get-app-info", () => ({
  version: app.getVersion(),
  name: app.getName(),
  version: app.getVersion(),
  author: "Mohamed Shamil",
  email: "shaamil.is@gmail.com",
  phone: "+960 999-0166", // 👈 Add your phone number here
  repo: "https://github.com/MoshRadix/mosh-forms-app",
  quote: "Simplify document generation, one form at a time.",
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  platform: process.platform,
  arch: process.arch,
}));
// ipcMain.handle("print-document", async (event, filePath) => {
//   await fs.access(filePath);
//   const isPdf = path.extname(filePath).toLowerCase() === ".pdf";
//   if (process.platform === "win32") {
//     if (isPdf) {
//       return new Promise((resolve, reject) => {
//         let pdfWindow = new BrowserWindow({ show: false, webPreferences: { plugins: true } });
//         pdfWindow.loadURL(`file://${filePath}`);
//         pdfWindow.webContents.on("did-finish-load", () => {
//           pdfWindow.webContents.print({ silent: true, printBackground: true }, (success, reason) => {
//             pdfWindow.close();
//             if (success) resolve(true);
//             else reject(new Error(`Print failed: ${reason}`));
//           });
//         });
//         pdfWindow.webContents.on("did-fail-load", () => {
//           pdfWindow.close();
//           reject(new Error("Failed to load PDF"));
//         });
//       });
//     } else {
//       const { exec } = require("child_process");
//       const command = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print -WindowStyle Hidden"`;
//       return new Promise((resolve, reject) => {
//         exec(command, { timeout: 30000 }, (error) => {
//           if (error) reject(new Error(`Print failed: ${error.message}`));
//           else resolve(true);
//         });
//       });
//     }
//   } else if (process.platform === "darwin" || process.platform === "linux") {
//     const { exec } = require("child_process");
//     const command = `lp "${filePath}"`;
//     return new Promise((resolve, reject) => {
//       exec(command, { timeout: 30000 }, (error) => {
//         if (error) reject(new Error(`Print failed: ${error.message}`));
//         else resolve(true);
//       });
//     });
//   } else {
//     throw new Error("Printing not supported on this platform");
//   }
// });
//const { print } = require("pdf-to-printer"); // add at top of file

// ipcMain.handle("print-document", async (event, filePath) => {
//   await fs.access(filePath);
//   const ext = path.extname(filePath).toLowerCase();
//   const isPdf = ext === ".pdf";

//   if (process.platform === "win32") {
//     if (isPdf) {
//       try {
//         // Direct PDF printing via Windows API – no viewer needed
//         await print(filePath);
//         return true;
//       } catch (err) {
//         console.error("PDF printing error:", err);
//         // Fallback: open the file for manual printing
//         await shell.openPath(filePath);
//         throw new Error(
//           `PDF could not be printed automatically: ${err.message}. The file has been opened for manual printing.`,
//         );
//       }
//     } else {
//       // Word / Excel – use PowerShell
//       const { exec } = require("child_process");
//       const escapedPath = filePath.replace(/'/g, "''");
//       const command = `powershell -Command "Start-Process -FilePath '${escapedPath}' -Verb Print -WindowStyle Hidden"`;
//       return new Promise((resolve, reject) => {
//         exec(command, { timeout: 30000 }, (error) => {
//           if (error) {
//             shell.openPath(filePath).catch(() => {});
//             reject(
//               new Error(
//                 `Print failed: ${error.message}. File opened for manual printing.`,
//               ),
//             );
//           } else {
//             resolve(true);
//           }
//         });
//       });
//     }
//   } else if (process.platform === "darwin" || process.platform === "linux") {
//     const { exec } = require("child_process");
//     const escapedPath = filePath.replace(/(["\s'$`\\])/g, "\\$1");
//     const command = `lp "${escapedPath}"`;
//     return new Promise((resolve, reject) => {
//       exec(command, { timeout: 30000 }, (error) => {
//         if (error) {
//           shell.openPath(filePath).catch(() => {});
//           reject(
//             new Error(
//               `Print failed: ${error.message}. File opened for manual printing.`,
//             ),
//           );
//         } else {
//           resolve(true);
//         }
//       });
//     });
//   } else {
//     throw new Error("Printing not supported on this platform");
//   }
// });
ipcMain.handle("print-document", async (event, filePath) => {
  await fs.access(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isPdf = ext === ".pdf";

  if (isPdf) {
    // Cross-platform native silent PDF printing using a hidden window
    return new Promise((resolve, reject) => {
      let workerWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          plugins: true, // Allows PDF rendering internally
        },
      });

      // Load the PDF file directly into the hidden window
      workerWindow.loadURL(`file://${filePath}`);

      workerWindow.webContents.on("did-finish-load", () => {
        // Trigger silent printing once loaded
        workerWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
          },
          (success, failureReason) => {
            workerWindow.close();
            if (success) {
              resolve(true);
            } else {
              reject(new Error(`Silent print failed: ${failureReason}`));
            }
          },
        );
      });

      workerWindow.webContents.on("did-fail-load", (err) => {
        workerWindow.close();
        reject(new Error(`Failed to load PDF into printing engine: ${err}`));
      });
    });
  }

  // --- Non-PDF fallback handling (Word / Excel) ---
  if (process.platform === "win32") {
    // Word / Excel – use PowerShell
    const { exec } = require("child_process");
    const escapedPath = filePath.replace(/'/g, "''");
    const command = `powershell -Command "Start-Process -FilePath '${escapedPath}' -Verb Print -WindowStyle Hidden"`;
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error) => {
        if (error) {
          shell.openPath(filePath).catch(() => {});
          reject(
            new Error(
              `Print failed: ${error.message}. File opened for manual printing.`,
            ),
          );
        } else {
          resolve(true);
        }
      });
    });
  } else if (process.platform === "darwin" || process.platform === "linux") {
    const { exec } = require("child_process");
    const escapedPath = filePath.replace(/(["\s'$`\\])/g, "\\$1");
    const command = `lp "${escapedPath}"`;
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error) => {
        if (error) {
          shell.openPath(filePath).catch(() => {});
          reject(
            new Error(
              `Print failed: ${error.message}. File opened for manual printing.`,
            ),
          );
        } else {
          resolve(true);
        }
      });
    });
  } else {
    throw new Error("Printing not supported on this platform");
  }
});
ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Document Templates", extensions: ["docx", "xlsx", "pdf"] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("save-file-dialog", async (event, { defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters,
  });
  return result.canceled ? null : result.filePath;
});
ipcMain.handle("open-directory-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("get-settings", () => ({
  dataDir: settings.dataDir,
  templatesDir: settings.templatesDir,
  outputsDir: settings.outputsDir,
  dbPath: settings.dbPath,
}));
ipcMain.handle("update-settings", async (event, newSettings) => {
  const old = { ...settings };
  if (newSettings.dbFolder) {
    newSettings.dbPath = path.join(newSettings.dbFolder, "mto_forms.db");
    delete newSettings.dbFolder;
  }
  Object.assign(settings, newSettings);
  await saveConfig();
  await fs.mkdir(settings.templatesDir, { recursive: true });
  await fs.mkdir(settings.outputsDir, { recursive: true });
  const dbDir = path.dirname(settings.dbPath);
  await fs.mkdir(dbDir, { recursive: true });

  const migrate = async (oldPath, newPath, name) => {
    if (oldPath !== newPath && fsSync.existsSync(oldPath)) {
      const answer = dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        buttons: ["Yes", "No"],
        message: `Move existing ${name} to the new location?`,
        detail: `From: ${oldPath}\nTo: ${newPath}`,
      });
      if (answer === 0) {
        try {
          await fs.rename(oldPath, newPath);
        } catch (err) {
          if (err.code === "EXDEV") {
            const stat = await fs.stat(oldPath);
            if (stat.isDirectory()) {
              await fs.cp(oldPath, newPath, { recursive: true });
              await fs.rm(oldPath, { recursive: true, force: true });
            } else {
              await fs.copyFile(oldPath, newPath);
              await fs.unlink(oldPath);
            }
          } else throw err;
        }
      }
    }
  };
  await migrate(old.templatesDir, settings.templatesDir, "templates");
  await migrate(old.outputsDir, settings.outputsDir, "outputs");
  if (old.dbPath !== settings.dbPath && fsSync.existsSync(old.dbPath)) {
    const answer = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["Yes", "No"],
      message: "Move existing SQLite database to new location?",
      detail: `From: ${old.dbPath}\nTo: ${settings.dbPath}`,
    });
    if (answer === 0) {
      await fs.rename(old.dbPath, settings.dbPath).catch(async () => {
        await fs.copyFile(old.dbPath, settings.dbPath);
        await fs.unlink(old.dbPath);
      });
    }
  }
  await initSQLite(settings.dbPath);
  return true;
});
ipcMain.handle("reset-settings", async () => {
  settings = {
    dataDir: app.getPath("userData"),
    templatesDir: path.join(app.getPath("userData"), "templates"),
    outputsDir: path.join(app.getPath("userData"), "outputs"),
    dbPath: path.join(app.getPath("userData"), "mto_forms.db"),
  };
  await saveConfig();
  await initSQLite(settings.dbPath);
  return true;
});

// ========== App Lifecycle ==========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: "Document Generator",
    autoHideMenuBar: true,
    show: false,
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  if (process.argv.includes("--dev")) mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await loadConfig();
  await initSQLite(getDbPath());
  await migrateFromJSONIfNeeded();
  await fs.mkdir(settings.templatesDir, { recursive: true });
  await fs.mkdir(settings.outputsDir, { recursive: true });
  //updateElectronApp(); // additional configuration options available
  process.env.ELECTRON_IS_DEV = "false";
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "moshradix/mosh-forms-app",
    },
    updateInterval: "1 hour",
    logger: require("electron-log"),
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    app.quit();
  }
});
