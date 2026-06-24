const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  screen,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
// Safe optional require — app works normally even if package not yet installed
let ImageModule = null;
try {
  ImageModule = require("docxtemplater-image-module-free");
} catch (_) {}

// pdf-lib for merging batch output into a single PDF
let PDFLib = null;
try {
  PDFLib = require("pdf-lib");
} catch (_) {}
// const ExcelJS = require("exceljs");
const ExcelJS = require("@protobi/exceljs");
const { v4: uuidv4 } = require("uuid");
const initSqlJs = require("sql.js");
const { updateElectronApp, UpdateSourceType } = require("update-electron-app");
const { registerSyncHandlers } = require('./sync-service');
const {
  initNotesStore,
  registerNotesHandlers,
  closeNotesStore,
  flushNotesCache,
  getNotes,
  getNotesDbPath,
  migrateLegacyNotes,
} = require("./notes-store");

process.noDeprecation = true;
// At the very top of src/index.js, before any other code
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;
let db = null; // SQL.js database instance
let dbPath = null; // Current database file path
const APP_ICON_PATH = path.join(__dirname, "..", "assets", "icons", "app.ico");

// Work Logs — always stored in a fixed, separate database (not user-configurable)
let wlDb = null;
const WL_DB_PATH = path.join(app.getPath("userData"), "worklogs.db");

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
let settings = {
  dataDir: app.getPath("userData"),
  templatesDir: path.join(app.getPath("userData"), "templates"),
  outputsDir: path.join(app.getPath("userData"), "outputs"),
  dbPath: path.join(app.getPath("userData"), "mto_forms.db"),
  // Dynamic Wallpaper — only the parts that must be known *before* any
  // renderer is involved (so the scheduler can start on app launch).
  // Theme/colour customization lives in renderer localStorage (see wallpaper.js)
  // since it's only ever needed at the moment a wallpaper image is generated.
  wallpaper: {
    enabled: false,
    lastGeneratedAt: null,
    lastError: null,
    lastImagePath: null,
  },
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

  // NOTE on `templates.fileName`: templates are no longer addressed by an
  // absolute path stored in the database. Only the on-disk file name lives
  // here — the directory always comes from the live `templatesDir` setting
  // (see resolveTemplatePath()). This means moving or repointing the
  // template directory in Settings never leaves stale/broken path
  // references behind.
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      fileName TEXT NOT NULL,
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
      printed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
    CREATE INDEX IF NOT EXISTS idx_templates_hasFields ON templates(hasFields);
    CREATE INDEX IF NOT EXISTS idx_records_templateId ON data_records(templateId);
  `);

  // Schema migrations — add new columns to existing databases safely.
  // PRAGMA table_info returns one row per column; we check if a column exists before adding it.
  const recordCols = db.exec("PRAGMA table_info(data_records)");
  const recordColNames =
    recordCols.length > 0
      ? recordCols[0].values.map((r) => r[1]) // column index 1 = name
      : [];
  if (!recordColNames.includes("printed")) {
    db.exec(
      "ALTER TABLE data_records ADD COLUMN printed INTEGER NOT NULL DEFAULT 0",
    );
    console.log("[DB Migration] Added 'printed' column to data_records");
  }

  // Migration: older versions of the app stored an absolute `filePath` on
  // each template row. The new design stores only `fileName` and resolves
  // the directory from settings at read-time. No backward compatibility is
  // required for this change, so an old-schema `templates` table (one that
  // has `filePath` but not `fileName`) is dropped and recreated empty —
  // old template catalog records referencing absolute paths are discarded.
  // Document files already sitting in the templates folder are untouched;
  // only the database catalog entries are reset, so templates can simply
  // be re-uploaded.
  const templateCols = db.exec("PRAGMA table_info(templates)");
  const templateColNames =
    templateCols.length > 0 ? templateCols[0].values.map((r) => r[1]) : [];
  if (
    templateColNames.includes("filePath") &&
    !templateColNames.includes("fileName")
  ) {
    console.log(
      "[DB Migration] Old 'templates' schema (absolute filePath) detected — recreating table with filename-based storage. Old template catalog entries are discarded; re-upload templates if needed.",
    );
    db.exec("DROP TABLE IF EXISTS templates");
    db.exec(`
      CREATE TABLE templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        fileName TEXT NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
      CREATE INDEX IF NOT EXISTS idx_templates_hasFields ON templates(hasFields);
    `);
  }

  await saveDatabase();
}

async function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(dbPath, buffer);
}

// ========== Work Logs DB (separate, fixed-path database) ==========

async function initWorkLogsDB() {
  const SQL = await initSqlJs();
  if (wlDb) wlDb.close();
  let fileData = null;
  try {
    fileData = await fs.readFile(WL_DB_PATH);
  } catch (e) {}
  wlDb = new SQL.Database(fileData);
  wlDb.exec(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      photoPath TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_work_logs_createdAt ON work_logs(createdAt);
    CREATE TABLE IF NOT EXISTS cal_todos (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cal_todos_date ON cal_todos(date);
    CREATE TABLE IF NOT EXISTS cal_weather (
      date TEXT PRIMARY KEY,
      fetched_at TEXT NOT NULL,
      condition TEXT,
      condition_dv TEXT,
      temp_min REAL,
      temp_max REAL,
      humidity INTEGER,
      wind_speed REAL,
      wind_dir INTEGER,
      sunrise TEXT,
      sunset TEXT,
      wmo_code INTEGER
    );
  `);

  // Schema migrations for existing databases
  const wlCols = wlDb.exec("PRAGMA table_info(work_logs)");
  const wlColNames = wlCols.length ? wlCols[0].values.map((r) => r[1]) : [];
  if (!wlColNames.includes("tags")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN tags TEXT DEFAULT '[]'");
    console.log("[WorkLogs DB] Added 'tags' column");
  }
  if (!wlColNames.includes("photoPath")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN photoPath TEXT");
    console.log("[WorkLogs DB] Added 'photoPath' column");
  }
  if (!wlColNames.includes("linkedTodoId")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN linkedTodoId TEXT");
    console.log("[WorkLogs DB] Added 'linkedTodoId' column");
  }
  if (!wlColNames.includes("todoStatusHistory")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN todoStatusHistory TEXT DEFAULT '[]'");
    console.log("[WorkLogs DB] Added 'todoStatusHistory' column");
  }
  if (!wlColNames.includes("enrichNote")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN enrichNote TEXT");
    console.log("[WorkLogs DB] Added 'enrichNote' column");
  }
  if (!wlColNames.includes("remote_id")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN remote_id TEXT");
    console.log("[WorkLogs DB] Added 'remote_id' column");
  }
  if (!wlColNames.includes("client_id")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN client_id TEXT");
    console.log("[WorkLogs DB] Added 'client_id' column");
  }
  if (!wlColNames.includes("is_deleted")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0");
    console.log("[WorkLogs DB] Added 'is_deleted' column");
  }
  if (!wlColNames.includes("synced")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN synced INTEGER NOT NULL DEFAULT 0");
    console.log("[WorkLogs DB] Added 'synced' column");
  }
  if (!wlColNames.includes("created_at")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN created_at TEXT");
    console.log("[WorkLogs DB] Added 'created_at' column");
  }
  if (!wlColNames.includes("updated_at")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN updated_at TEXT");
    console.log("[WorkLogs DB] Added 'updated_at' column");
  }
  wlDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_work_logs_remote_id ON work_logs(remote_id);
    CREATE INDEX IF NOT EXISTS idx_work_logs_client_id ON work_logs(client_id);
    CREATE INDEX IF NOT EXISTS idx_work_logs_synced ON work_logs(synced);
    CREATE INDEX IF NOT EXISTS idx_work_logs_updated_at ON work_logs(updated_at);
  `);

  // cal_todos migrations
  const todoColsRes = wlDb.exec("PRAGMA table_info(cal_todos)");
  const todoColNames = todoColsRes.length ? todoColsRes[0].values.map((r) => r[1]) : [];
  if (!todoColNames.includes("tags")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN tags TEXT DEFAULT '[]'");
    console.log("[WorkLogs DB] Added 'tags' column to cal_todos");
  }
  if (!todoColNames.includes("priority")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN priority TEXT DEFAULT 'medium'");
    console.log("[WorkLogs DB] Added 'priority' column to cal_todos");
  }
  if (!todoColNames.includes("linkedWorklogId")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN linkedWorklogId TEXT");
    console.log("[WorkLogs DB] Added 'linkedWorklogId' column to cal_todos");
  }
  if (!todoColNames.includes("remote_id")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN remote_id TEXT");
    console.log("[WorkLogs DB] Added 'remote_id' column to cal_todos");
  }
  if (!todoColNames.includes("client_id")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN client_id TEXT");
    console.log("[WorkLogs DB] Added 'client_id' column to cal_todos");
  }
  if (!todoColNames.includes("is_deleted")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0");
    console.log("[WorkLogs DB] Added 'is_deleted' column to cal_todos");
  }
  if (!todoColNames.includes("synced")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN synced INTEGER NOT NULL DEFAULT 0");
    console.log("[WorkLogs DB] Added 'synced' column to cal_todos");
  }
  if (!todoColNames.includes("created_at")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN created_at TEXT");
    console.log("[WorkLogs DB] Added 'created_at' column to cal_todos");
  }
  if (!todoColNames.includes("updated_at")) {
    wlDb.exec("ALTER TABLE cal_todos ADD COLUMN updated_at TEXT");
    console.log("[WorkLogs DB] Added 'updated_at' column to cal_todos");
  }

  // Ensure photos directory exists
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");
  try {
    await fs.mkdir(photosDir, { recursive: true });
  } catch (_) {}

  await saveWorkLogsDB();
  console.log("[WorkLogs DB] Initialized at:", WL_DB_PATH);
}

async function saveWorkLogsDB() {
  const data = wlDb.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(WL_DB_PATH, buffer);
}

function todoSyncTimestamp() {
  return new Date().toISOString();
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
      // Legacy JSON records stored an absolute filePath; the new schema only
      // keeps the file name (the directory comes from settings at read-time).
      const fileName = t.fileName || (t.filePath ? path.basename(t.filePath) : "");
      db.run(
        `
        INSERT OR REPLACE INTO templates (
          id, name, description, category, fileName, originalName, type,
          hasFields, fields, dateRangeConfig, hasDateRange, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          t.id,
          t.name,
          t.description || "",
          t.category || "General",
          fileName,
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
        INSERT OR REPLACE INTO data_records (id, templateId, data, outputPath, printed, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          r.id,
          r.templateId,
          JSON.stringify(r.data),
          r.outputPath || "",
          r.printed ? 1 : 0,
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

// ========== Template Path Resolution ==========
// Templates are stored in the database by FILE NAME ONLY. The directory is
// always pulled live from `settings.templatesDir`, so the full on-disk path
// is constructed dynamically every time a template is read or used — never
// persisted. This means changing the template directory in Settings (or
// restoring a backup on a different machine) never leaves a stale absolute
// path behind.

/**
 * Combine the current templatesDir setting with a stored file name to get
 * a full, on-disk path. Throws a descriptive error if either piece is
 * missing, rather than silently producing a broken path.
 */
function resolveTemplatePath(fileName) {
  if (!fileName) {
    throw new Error("Template record is missing its file name.");
  }
  const templatesDir = getTemplatesDir();
  if (!templatesDir) {
    throw new Error(
      "Template directory is not configured. Please set the Template Directory in Settings before working with templates.",
    );
  }
  return path.join(templatesDir, fileName);
}

/**
 * Same as resolveTemplatePath(), but non-throwing — used for list views
 * where a missing/invalid settings path shouldn't crash the whole list,
 * just leave filePath as null for that row so the UI can show a
 * "missing file" state.
 */
function resolveTemplatePathSafe(fileName) {
  try {
    return resolveTemplatePath(fileName);
  } catch (_) {
    return null;
  }
}

/**
 * Validates that the configured template directory exists (creating it if
 * needed) and returns it. Use before any operation that writes into the
 * template directory (e.g. uploading a new template).
 */
async function ensureTemplatesDirReady() {
  const templatesDir = getTemplatesDir();
  if (!templatesDir || !String(templatesDir).trim()) {
    throw new Error(
      "Template directory is not configured. Please set the Template Directory in Settings before uploading templates.",
    );
  }
  try {
    await fs.mkdir(templatesDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `The configured template directory is invalid or inaccessible: "${templatesDir}" (${err.message}). Please update the Template Directory path in Settings.`,
    );
  }
  return templatesDir;
}

/**
 * Resolves a template's on-disk path AND confirms the file actually exists,
 * throwing a clear, actionable error otherwise (missing settings path,
 * moved/deleted file, etc.). Use before any read of a template file
 * (document generation, preview/print, field reload, batch generation).
 */
async function ensureTemplateFileExists(template) {
  const fullPath = resolveTemplatePath(template.fileName);
  try {
    await fs.access(fullPath);
  } catch (_) {
    throw new Error(
      `Template file "${template.fileName}" was not found in the configured template directory ("${getTemplatesDir()}"). It may have been moved, renamed, or deleted — try re-uploading the template, or check the Template Directory path in Settings.`,
    );
  }
  return fullPath;
}

// ========== Database Operations ==========
function getTemplates() {
  const rows = db.exec(`
    SELECT t.*, 
           (SELECT COUNT(*) FROM data_records WHERE templateId = t.id AND printed = 1) as recordCount 
    FROM templates t 
    ORDER BY name
  `);
  if (rows.length === 0) return [];
  return rows[0].values.map((row) => {
    const fileName = row[4];
    return {
      id: row[0],
      name: row[1],
      description: row[2],
      category: row[3],
      fileName: fileName,
      // filePath is derived on every read from settings.templatesDir + fileName.
      // It is never stored — only fileName is persisted in the database.
      filePath: resolveTemplatePathSafe(fileName),
      originalName: row[5],
      type: row[6],
      hasFields: row[7] === 1,
      fields: JSON.parse(row[8] || "[]"),
      dateRangeConfig: row[9] ? JSON.parse(row[9]) : null,
      hasDateRange: row[10] === 1,
      isActive: row[11] === 1,
      createdAt: row[12],
      updatedAt: row[13],
      recordCount: row[14] || 0,
    };
  });
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
    fileName: row.fileName,
    // filePath is derived on every read from settings.templatesDir + fileName.
    filePath: resolveTemplatePathSafe(row.fileName),
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
      id, name, description, category, fileName, originalName, type,
      hasFields, fields, dateRangeConfig, hasDateRange, isActive, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      template.id,
      template.name,
      template.description || "",
      template.category || "General",
      template.fileName,
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

function saveDataRecord(record) {
  db.run(
    `
    INSERT INTO data_records (id, templateId, data, outputPath, printed, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      record.id,
      record.templateId,
      JSON.stringify(record.data),
      record.outputPath || "",
      record.printed ? 1 : 0,
      record.createdAt,
    ],
  );
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

// ========== Helper: image placeholders ==========
function extractImagePlaceholderFields(text) {
  const regex = /\{%%?([a-zA-Z0-9_]+)\}/g;
  const seen = new Set();
  const fields = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const key = m[1];
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({
      key,
      label: key.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      type: "image",
      required: false,
      value: "",
      isRTL: false,
      originalKey: key,
      widthPx: null,
    });
  }
  return fields;
}

// ========== Helper: field type / locale inference ==========
/**
 * Infer field type, RTL flag, autoComputed flag, and paragraphMode from a
 * placeholder key using the taxonomy defined in the placeholder guide.
 *
 * Category-prefix rules take priority. Legacy heuristics apply as fallback so
 * that templates created before the taxonomy was introduced continue to work.
 *
 * @param {string} key  The raw placeholder key as found in the template.
 * @returns {{ type: string, isRTL: boolean, autoComputed: boolean, paragraphMode: boolean }}
 */
function inferFieldFromKey(key) {
  const k = key.toLowerCase();

  // ── Images: img_ prefix ──────────────────────────────────────────────────
  if (k.startsWith("img_")) {
    return {
      type: "image",
      isRTL: false,
      autoComputed: false,
      paragraphMode: false,
    };
  }

  // ── Paragraph text: text_ prefix ─────────────────────────────────────────
  if (k.startsWith("text_")) {
    return {
      type: "textarea",
      isRTL: k.endsWith("_divehi"),
      autoComputed: false,
      paragraphMode: false,
    };
  }

  // ── Numbers: num_ prefix (serial stays string) ───────────────────────────
  if (k.startsWith("num_") && !k.includes("serial")) {
    return {
      type: "number",
      isRTL: false,
      autoComputed: false,
      paragraphMode: false,
    };
  }

  // ── Boolean: bool_ prefix ────────────────────────────────────────────────
  if (k.startsWith("bool_")) {
    return {
      type: "boolean",
      isRTL: false,
      autoComputed: false,
      paragraphMode: false,
    };
  }

  // ── Dates: date_ prefix exactly ──────────────────────────────────────────
  if (k.startsWith("date_")) {
    const isRTL = k.endsWith("_divehi") || k.includes("_divehi_");
    return { type: "date", isRTL, autoComputed: false, paragraphMode: false };
  }

  // ── Ranges: range_ prefix ────────────────────────────────────────────────
  if (k === "range_start_date") {
    return {
      type: "date",
      isRTL: false,
      autoComputed: false,
      paragraphMode: false,
    };
  }
  if (k.startsWith("range_")) {
    return {
      type: "string",
      isRTL: false,
      autoComputed: true,
      paragraphMode: false,
    };
  }

  // ── Metadata: meta_ prefix — always auto-computed ────────────────────────
  if (k.startsWith("meta_")) {
    return {
      type: "string",
      isRTL: false,
      autoComputed: true,
      paragraphMode: false,
    };
  }

  // ── Person: person_ prefix ───────────────────────────────────────────────
  if (k.startsWith("person_")) {
    return {
      type: "string",
      isRTL: k.endsWith("_divehi"),
      autoComputed: false,
      paragraphMode: false,
    };
  }

  // ── Organisation: org_ prefix ────────────────────────────────────────────
  if (k.startsWith("org_")) {
    return {
      type: "string",
      isRTL: k.endsWith("_divehi"),
      autoComputed: false,
      paragraphMode: false,
    };
  }

  // ── Legacy fallback: detect by embedded keyword ───────────────────────────
  const isLegacyDivehi = /divehi/i.test(key);
  // Only flag as date if the key starts with date_ or ends with _date — not if
  // "date" appears in the middle (e.g. "update_notes").
  const isLegacyDate =
    /^date[_.]/.test(k) || /[_.]date$/.test(k) || /[_.]date[_.]/.test(k);
  return {
    type: isLegacyDate ? "date" : "string",
    isRTL: isLegacyDivehi,
    autoComputed: false,
    paragraphMode: false,
  };
}

/**
 * Build a canonical field object from a raw placeholder key.
 * Merges inferred properties with any existing saved field properties so that
 * hand-edited labels / required flags are preserved on reload.
 */
function buildFieldFromKey(key, existingField = {}) {
  const inferred = inferFieldFromKey(key);
  const k = key.toLowerCase();

  // Generate a human-readable label from the key, stripping category prefix
  const CATEGORY_PREFIXES = [
    "person_",
    "org_",
    "date_",
    "range_",
    "text_",
    "num_",
    "bool_",
    "img_",
    "meta_",
  ];
  let cleanKey = key;
  for (const prefix of CATEGORY_PREFIXES) {
    if (k.startsWith(prefix)) {
      cleanKey = key.slice(prefix.length);
      break;
    }
  }
  // Also strip legacy prefixes that used to be stripped
  cleanKey = cleanKey.replace(/^(divehi[._]|date[._])/, "");

  const label = cleanKey
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    key,
    label: existingField.label || label,
    label_divehi: existingField.label_divehi || "",
    type: existingField.type || inferred.type,
    required: existingField.required || false,
    isRTL:
      existingField.isRTL !== undefined ? existingField.isRTL : inferred.isRTL,
    autoComputed: inferred.autoComputed, // always re-infer — not user-editable
    paragraphMode: existingField.paragraphMode || false,
    rows: existingField.rows || (inferred.type === "textarea" ? 4 : undefined),
    widthPx: existingField.widthPx || null,
    choices: existingField.choices || [],
    placeholder: existingField.placeholder || "",
    hint: existingField.hint || "",
    value: existingField.value || "",
    originalKey: key,
  };
}

// ========== Helper: date_range placeholders ==========
function processDateRangePlaceholders(fields) {
  // Match both legacy (date_range_N) and new taxonomy (range_english_N / range_divehi_N etc.)
  const legacyPattern = /^date_range_(\d+)$/i;
  const newRangeSeriesPattern = /^range_(?:english|divehi)(?:_short)?_(\d+)$/i;
  const newRangeWeekdayPattern =
    /^range_weekday_(?:english|divehi)(?:_short)?(?:_[a-z]{3})?_(\d+)$/i;

  const rangeSeriesFields = [];
  const otherFields = [];

  for (const field of fields) {
    const k = field.key;
    if (
      legacyPattern.test(k) ||
      newRangeSeriesPattern.test(k) ||
      newRangeWeekdayPattern.test(k)
    ) {
      rangeSeriesFields.push(field);
    } else {
      otherFields.push(field);
    }
  }

  if (rangeSeriesFields.length === 0) return { fields, dateRangeConfig: null };

  let maxIndex = 0;
  for (const field of rangeSeriesFields) {
    const m =
      field.key.match(legacyPattern) ||
      field.key.match(newRangeSeriesPattern) ||
      field.key.match(newRangeWeekdayPattern);
    if (m) maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
  }

  // Determine which start-date key the template uses
  const hasNewStartKey = fields.some((f) => f.key === "range_start_date");
  const startKey = hasNewStartKey ? "range_start_date" : "date_range_start";

  // Only inject the start-date field if it isn't already present
  if (!otherFields.some((f) => f.key === startKey)) {
    otherFields.push({
      key: startKey,
      label: "Start Date",
      type: "date",
      required: true,
      value: "",
      isRTL: false,
      autoComputed: false,
      paragraphMode: false,
      originalKey: startKey,
    });
  }

  const dateRangeConfig = {
    enabled: true,
    startKey,
    count: maxIndex,
    keys: rangeSeriesFields.map((f) => f.key),
  };
  return { fields: otherFields, dateRangeConfig };
}

// ========== Document Generation ==========
async function generateWordDocument(templatePath, outputPath, data) {
  const content = await fs.readFile(templatePath);
  const zip = new PizZip(content);

  // Store image buffers and widths
  const imageDataMap = {};
  const imageWidthMap = {};

  // Process image fields: extract base64 to buffer, then replace with key string
  // (data[k] must stay as a string value so docxtemplater resolves the {%key} tag
  //  and the image module's getImage() callback gets invoked)
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && v.base64) {
      imageDataMap[k] = Buffer.from(v.base64, "base64");
      if (v.widthPx) imageWidthMap[k] = v.widthPx;
      data[k] = k; // keep the key as value — image module uses tagName to look up the buffer
      delete data[`%${k}`]; // remove any phantom %key entries
      console.log(`[Image] Stored buffer for key "${k}"`);
    }
  }

  const hasImages = Object.keys(imageDataMap).length > 0;
  console.log(
    `[Image] hasImages: ${hasImages}, keys:`,
    Object.keys(imageDataMap),
  );

  // Clean legacy {image:key} tags (remove them completely)
  const cleanLegacyImageTags = (xml) => {
    xml = xml.replace(/\{image:[a-zA-Z0-9_]+(?::\d+)?\}/g, "");
    return xml;
  };

  // Merge split XML runs so {%tag_name} placeholders aren't fragmented across <w:r> elements.
  // Word sometimes splits a tag like {%image_1} into multiple runs e.g. {%image_ and 1},
  // which prevents docxtemplater-image-module-free from recognising it.
  const mergeImageTagRuns = (xml) => {
    // Repeatedly collapse any <w:t>...</w:t></w:r><w:r ...><w:t ...> seams that are
    // inside an open { ... } so the full tag lands in a single run.
    // Strategy: strip all <w:r>/<w:rPr> wrapper tags that sit between an
    // opening '{' and its matching '}', leaving only the text content.
    let prev;
    do {
      prev = xml;
      // If a <w:t> ends mid-tag and the very next <w:t> (possibly in a new run) continues it,
      // pull the continuation text into the current run's <w:t>.
      xml = xml.replace(
        /(<w:t(?:\s[^>]*)?>)((?:[^{}]*\{[^{}]*))(<\/w:t>(?:<\/w:r>)?(?:<w:r>|<w:r\s[^>]*>)?(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:\s[^>]*)?>)/g,
        (match, openTag, text, runSeam) => {
          // Only merge if the text has an open brace with no closing brace yet
          if (
            (text.match(/\{/g) || []).length > (text.match(/\}/g) || []).length
          ) {
            return openTag + text; // drop the run seam, continue in same <w:t>
          }
          return match;
        },
      );
    } while (xml !== prev);
    return xml;
  };

  const xmlPartsToClean = ["word/document.xml"];
  for (const fname of Object.keys(zip.files)) {
    if (/^word\/(header|footer)\d*\.xml$/.test(fname))
      xmlPartsToClean.push(fname);
  }
  for (const fname of xmlPartsToClean) {
    const part = zip.file(fname);
    if (!part) continue;
    let cleaned = cleanLegacyImageTags(part.asText());
    cleaned = mergeImageTagRuns(cleaned);
    zip.file(fname, cleaned);
  }

  // Log placeholders found in the template
  const docXmlFile = zip.file("word/document.xml");
  if (docXmlFile) {
    const rawXml = docXmlFile.asText();
    const tags = [...rawXml.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    console.log("[Template] Placeholders found:", [...new Set(tags)]);
  }

  const modules = [];

  if (ImageModule && hasImages) {
    const DEFAULT_W_PX = 150;

    modules.push(
      new ImageModule({
        centered: false,
        getImage(tagValue, tagName) {
          console.log(`[ImageModule] getImage called: tagName="${tagName}"`);
          // The tagName will be e.g. "%photo" (because delimiters are { } and content is %photo)
          // Strip leading '%' to get the clean key
          let cleanKey = tagName;
          if (cleanKey.startsWith("%")) cleanKey = cleanKey.slice(1);
          const buffer = imageDataMap[cleanKey] || null;
          console.log(
            `[ImageModule] Looking for key "${cleanKey}", buffer exists: ${!!buffer}`,
          );
          return buffer;
        },
        getSize(imgBuffer, tagValue, tagName) {
          // NOTE: docxtemplater-image-module-free multiplies return values by 9525 internally
          // to convert pixels → EMU. So getSize must return PIXELS, not EMU.
          let cleanKey = tagName;
          if (cleanKey.startsWith("%")) cleanKey = cleanKey.slice(1);
          const wPx = imageWidthMap[cleanKey] || DEFAULT_W_PX;
          if (!imgBuffer) return [wPx, wPx];
          try {
            let nW = 0,
              nH = 0;
            if (imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50) {
              // PNG
              nW = imgBuffer.readUInt32BE(16);
              nH = imgBuffer.readUInt32BE(20);
            } else if (imgBuffer[0] === 0xff && imgBuffer[1] === 0xd8) {
              // JPEG
              let i = 2;
              while (i < imgBuffer.length - 8) {
                if (imgBuffer[i] !== 0xff) break;
                const seg = imgBuffer.readUInt16BE(i + 2);
                if (imgBuffer[i + 1] >= 0xc0 && imgBuffer[i + 1] <= 0xc3) {
                  nH = imgBuffer.readUInt16BE(i + 5);
                  nW = imgBuffer.readUInt16BE(i + 7);
                  break;
                }
                i += 2 + seg;
              }
            }
            // Return [width, height] in PIXELS — module converts to EMU automatically
            if (nW > 0 && nH > 0) return [wPx, Math.round(wPx * (nH / nW))];
          } catch (_) {}
          return [wPx, wPx];
        },
      }),
    );
  } else if (hasImages && !ImageModule) {
    throw new Error(
      "Image module not installed. Run: npm install docxtemplater-image-module-free",
    );
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
    delimiters: { start: "{", end: "}" },
    modules,
  });

  try {
    doc.render(data);
  } catch (renderError) {
    let msg = renderError.message || "Unknown render error";
    if (renderError.properties && renderError.properties.errors) {
      msg = renderError.properties.errors
        .map((e) =>
          e.properties ? e.properties.explanation || e.message : e.message,
        )
        .join("; ");
    }
    throw new Error("Template render error: " + msg);
  }

  const buf = doc
    .getZip()
    .generate({ type: "nodebuffer", compression: "DEFLATE" });

  // Validate the output is a valid zip before writing
  try {
    new PizZip(buf);
  } catch (zipErr) {
    throw new Error(
      "Generated document is corrupt (invalid zip): " + zipErr.message,
    );
  }

  await fs.writeFile(outputPath, buf);
  console.log("[Image] Document written to", outputPath);
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
    // Validate/create the configured template directory before touching any files.
    const templatesDir = await ensureTemplatesDirReady();

    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const templateId = uuidv4();
    const templateFileName = `${templateId}_${fileName}`;
    const destPath = path.join(templatesDir, templateFileName);
    await fs.writeFile(destPath, fileBuffer);
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
        const rawXml = zip.file("word/document.xml")
          ? zip.file("word/document.xml").asText()
          : "";
        const regex = /\{([^}]+)\}/g;
        const matches = [...fullText.matchAll(regex)];
        const uniqueKeys = new Set();
        fields = matches
          .filter((m) => {
            const k = m[1].trim();
            if (uniqueKeys.has(k)) return false;
            if (/^%/.test(k)) return false; // skip {%key} image module tags
            if (/^image:[a-zA-Z0-9_]/.test(k)) return false; // skip legacy {image:key} tags
            uniqueKeys.add(k);
            return true;
          })
          .map((m) => buildFieldFromKey(m[1].trim()));
        const processed = processDateRangePlaceholders(fields);
        fields = processed.fields;
        dateRangeConfig = processed.dateRangeConfig;
        // Merge image fields from raw XML (invisible to getFullText)
        for (const imgField of extractImagePlaceholderFields(fullText)) {
          if (!fields.find((f) => f.key === imgField.key))
            fields.push(imgField);
        }
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
                    placeholders.push(buildFieldFromKey(key));
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
      // Only the file name is persisted — the directory always comes from
      // the live templatesDir setting at read-time (see resolveTemplatePath).
      fileName: templateFileName,
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
    // Return the freshly-read record so the renderer gets a fully-formed
    // object (including the derived `filePath`), matching get-templates shape.
    return getTemplateById(templateId);
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
    const templateFullPath = await ensureTemplateFileExists(template);
    const fileBuffer = await fs.readFile(templateFullPath);
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
      const rawXml = zip.file("word/document.xml")
        ? zip.file("word/document.xml").asText()
        : "";
      const regex = /\{([^}]+)\}/g;
      const matches = [...fullText.matchAll(regex)];
      const uniqueKeys = new Set();
      newFields = matches
        .filter((m) => {
          const k = m[1].trim();
          if (uniqueKeys.has(k)) return false;
          if (/^%/.test(k)) return false; // skip {%key} image module tags
          if (/^image:[a-zA-Z0-9_]/.test(k)) return false; // skip legacy {image:key} tags
          uniqueKeys.add(k);
          return true;
        })
        .map((m) => buildFieldFromKey(m[1].trim()));
      // Merge image fields from raw XML
      for (const imgField of extractImagePlaceholderFields(fullText)) {
        if (!newFields.find((f) => f.key === imgField.key))
          newFields.push(imgField);
      }
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
                  newFields.push(buildFieldFromKey(key));
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
  async (
    event,
    { templateId, formData, outputFormat = "docx", printed = false },
  ) => {
    const template = getTemplateById(templateId);
    if (!template) throw new Error("Template not found");
    const templateFullPath = await ensureTemplateFileExists(template);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `${template.name}_${timestamp}.${outputFormat}`;
    const outputPath = path.join(getOutputsDir(), outputFileName);

    // ── Paragraph mode: split textarea values into paragraph arrays ──────────
    // For fields with paragraphMode: true, split on blank lines and produce:
    //   formData[`${key}_paragraphs`] = [{ paragraph: "..." }, ...]
    // Template usage: {#text_body_paragraphs}{paragraph}{/text_body_paragraphs}
    if (template.fields && Array.isArray(template.fields)) {
      for (const field of template.fields) {
        if (field.type !== "textarea") continue;
        const raw = formData[field.key];
        if (typeof raw !== "string" || !raw.trim()) continue;

        if (field.paragraphMode) {
          // Paragraph loop mode — split on blank lines, each becomes a <w:p>
          formData[`${field.key}_paragraphs`] = raw
            .split(/\n{2,}/)
            .map((p) => ({ paragraph: p.replace(/\n/g, " ").trim() }))
            .filter((p) => p.paragraph.length > 0);
        }
        // linebreaks mode is handled automatically by Docxtemplater's linebreaks:true option
      }
    }

    // ── Auto-populate meta_ fields (Maldives Time, UTC+5) ───────────────────
    try {
      const mvtNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Indian/Maldives" }),
      );
      const pad = (n) => String(n).padStart(2, "0");
      const mvtDateStr = `${mvtNow.getFullYear()}-${pad(mvtNow.getMonth() + 1)}-${pad(mvtNow.getDate())}`;

      // Use the same formatters from form.js (duplicated here since index.js runs in main process)
      const DIVEHI_MONTHS_META = [
        "ޖެނުއަރީ",
        "ފެބްރުއަރީ",
        "މާރޗް",
        "އެޕްރީލް",
        "މެއި",
        "ޖޫން",
        "ޖުލައި",
        "އޯގަސްޓް",
        "ސެޕްޓެމްބަރ",
        "އޮކްޓޯބަރ",
        "ނޮވެމްބަރ",
        "ޑިސެމްބަރ",
      ];
      const ENGLISH_MONTHS_META = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const [yr, mo, dy] = mvtDateStr.split("-").map(Number);
      const metaEn = `${dy} ${ENGLISH_MONTHS_META[mo - 1]} ${yr}`;
      const metaDv = `${dy} ${DIVEHI_MONTHS_META[mo - 1]} ${yr}`;

      formData["meta_generated_date"] =
        formData["meta_generated_date"] || metaEn;
      formData["meta_generated_date_divehi"] =
        formData["meta_generated_date_divehi"] || metaDv;
      formData["meta_generated_time"] =
        formData["meta_generated_time"] ||
        `${pad(mvtNow.getHours())}:${pad(mvtNow.getMinutes())}`;
      formData["meta_template_name"] =
        formData["meta_template_name"] || template.name || "";
    } catch (_metaErr) {
      // Non-critical — generation continues without meta fields
      console.warn("[meta] Failed to populate meta_ fields:", _metaErr.message);
    }

    if (template.type === "word")
      await generateWordDocument(templateFullPath, outputPath, formData);
    else if (template.type === "excel")
      await generateExcelDocument(templateFullPath, outputPath, formData);
    else throw new Error("Unsupported template type");
    const record = {
      id: uuidv4(),
      templateId: template.id,
      data: formData,
      outputPath,
      printed: printed ? true : false,
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
  if (!template) throw new Error("Template not found");
  const templateFullPath = await ensureTemplateFileExists(template);
  const result = await shell.openPath(templateFullPath);
  if (result) throw new Error(`Failed to open file: ${result}`);
  return true;
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
  phone: "+960 999-0166",
  repo: "https://github.com/MoshRadix/mosh-samugaa-app",
  website: "https://www.mosh-one.us/",
  quote:
    "Guiding Addu City Council's work with precision — from documents to the tides.",
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  platform: process.platform,
  arch: process.arch,
}));
ipcMain.handle("print-document", async (event, filePath) => {
  await fs.access(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isPdf = ext === ".pdf";

  if (isPdf) {
    return new Promise((resolve, reject) => {
      let workerWindow = new BrowserWindow({
        show: false,
        icon: APP_ICON_PATH,
        webPreferences: {
          plugins: true,
        },
      });
      workerWindow.loadURL(`file://${filePath}`);
      workerWindow.webContents.on("did-finish-load", () => {
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

  if (process.platform === "win32") {
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

// ── Batch generation: CSV / XLSX file picker ─────────────────────────────────
ipcMain.handle("open-csv-xlsx-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select data file for batch generation",
    properties: ["openFile"],
    filters: [{ name: "CSV / Excel files", extensions: ["csv", "xlsx"] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── Parse spreadsheet buffer (sent as base64 from renderer) ──────────────────
ipcMain.handle("parse-spreadsheet-buffer", async (event, { base64 }) => {
  const buf = Buffer.from(base64, "base64");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { columns: [], rows: [] };

  const rawRows = [];
  sheet.eachRow((row, rowNumber) => {
    const vals = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let v = cell.value;
      if (v === null || v === undefined) v = "";
      else if (typeof v === "object" && v.text)
        v = v.text; // rich text
      else if (typeof v === "object" && v.result !== undefined)
        v = v.result; // formula
      else v = String(v);
      vals.push(v);
    });
    rawRows.push(vals);
  });

  if (rawRows.length < 2) return { columns: [], rows: [] };

  const maxCols = Math.max(...rawRows.map((r) => r.length));
  const columns = rawRows[0].map((h, i) =>
    h !== "" ? String(h) : `Column${i + 1}`,
  );
  const rows = rawRows.slice(1).map((vals) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = i < vals.length ? String(vals[i] || "") : "";
    });
    return obj;
  });

  return { columns, rows };
});

// ── Helper: convert a .docx file to .pdf using PowerShell + Word COM ──────────
// Works on Windows where Microsoft Word is installed (standard office machines).
// Returns the path to the generated PDF (same base name, .pdf extension).
async function convertDocxToPdf(docxPath) {
  const pdfPath = docxPath.replace(/\.docx$/i, ".pdf");
  if (process.platform !== "win32") {
    throw new Error(
      "DOCX→PDF conversion requires Windows with Microsoft Word installed.",
    );
  }
  const { exec } = require("child_process");
  // Use Word COM via PowerShell. wdFormatPDF = 17.
  const escaped = docxPath.replace(/\\/g, "\\\\").replace(/'/g, "''");
  const pdfEscaped = pdfPath.replace(/\\/g, "\\\\").replace(/'/g, "''");
  const ps = `
$w = New-Object -ComObject Word.Application;
$w.Visible = $false;
$doc = $w.Documents.Open('${escaped}');
$doc.SaveAs([ref]'${pdfEscaped}', [ref]17);
$doc.Close();
$w.Quit();
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null;
`
    .trim()
    .replace(/\n/g, " ");
  await new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -NonInteractive -Command "${ps}"`,
      { timeout: 60000 },
      (err) => {
        if (err)
          reject(new Error(`Word COM conversion failed: ${err.message}`));
        else resolve();
      },
    );
  });
  // Verify the PDF was created
  await fs.access(pdfPath);
  return pdfPath;
}

// ── Helper: merge an array of PDF file paths into one PDF ──────────────────────
async function mergePdfsToSingleFile(pdfPaths, outputPath) {
  if (!PDFLib)
    throw new Error("pdf-lib is not installed. Run: npm install pdf-lib");
  const { PDFDocument } = PDFLib;
  const merged = await PDFDocument.create();
  for (const pdfPath of pdfPaths) {
    const bytes = await fs.readFile(pdfPath);
    const srcDoc = await PDFDocument.load(bytes);
    const pageCount = srcDoc.getPageCount();
    const copiedPages = await merged.copyPages(srcDoc, [
      ...Array(pageCount).keys(),
    ]);
    copiedPages.forEach((page) => merged.addPage(page));
  }
  const mergedBytes = await merged.save();
  await fs.writeFile(outputPath, mergedBytes);
  return outputPath;
}

// ── Batch generation: generate one document per row ──────────────────────────
ipcMain.handle(
  "batch-generate-documents",
  async (event, { templateId, rows, outputFormat = "docx" }) => {
    const template = getTemplateById(templateId);
    if (!template) throw new Error("Template not found");
    const templateFullPath = await ensureTemplateFileExists(template);

    const DIVEHI_MONTHS_BATCH = [
      "ޖެނުއަރީ",
      "ފެބްރުއަރީ",
      "މާރޗް",
      "އެޕްރީލް",
      "މެއި",
      "ޖޫން",
      "ޖުލައި",
      "އޯގަސްޓް",
      "ސެޕްޓެމްބަރ",
      "އޮކްޓޯބަރ",
      "ނޮވެމްބަރ",
      "ޑިސެމްބަރ",
    ];
    const ENGLISH_MONTHS_BATCH = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const total = rows.length;
    let succeeded = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const formData = { ...rows[i] };

      try {
        // ── Paragraph mode ─────────────────────────────────────────────
        if (template.fields && Array.isArray(template.fields)) {
          for (const field of template.fields) {
            if (field.type !== "textarea" || !field.paragraphMode) continue;
            const raw = formData[field.key];
            if (typeof raw !== "string" || !raw.trim()) continue;
            formData[`${field.key}_paragraphs`] = raw
              .split(/\n{2,}/)
              .map((p) => ({ paragraph: p.replace(/\n/g, " ").trim() }))
              .filter((p) => p.paragraph.length > 0);
          }
        }

        // ── Meta fields (Maldives Time) ────────────────────────────────
        try {
          const mvtNow = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Indian/Maldives" }),
          );
          const pad = (n) => String(n).padStart(2, "0");
          const mvtDateStr = `${mvtNow.getFullYear()}-${pad(mvtNow.getMonth() + 1)}-${pad(mvtNow.getDate())}`;
          const [yr, mo, dy] = mvtDateStr.split("-").map(Number);
          const metaEn = `${dy} ${ENGLISH_MONTHS_BATCH[mo - 1]} ${yr}`;
          const metaDv = `${dy} ${DIVEHI_MONTHS_BATCH[mo - 1]} ${yr}`;
          formData["meta_generated_date"] =
            formData["meta_generated_date"] || metaEn;
          formData["meta_generated_date_divehi"] =
            formData["meta_generated_date_divehi"] || metaDv;
          formData["meta_generated_time"] =
            formData["meta_generated_time"] ||
            `${pad(mvtNow.getHours())}:${pad(mvtNow.getMinutes())}`;
          formData["meta_template_name"] =
            formData["meta_template_name"] || template.name || "";
        } catch (_) {}

        // ── Output path ────────────────────────────────────────────────
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rowLabel = String(i + 1).padStart(4, "0");
        const outputFileName = `${template.name}_batch_${rowLabel}_${timestamp}.${outputFormat}`;
        const outputPath = path.join(getOutputsDir(), outputFileName);

        if (template.type === "word") {
          await generateWordDocument(templateFullPath, outputPath, formData);
        } else if (template.type === "excel") {
          await generateExcelDocument(templateFullPath, outputPath, formData);
        } else {
          throw new Error("Unsupported template type");
        }

        // Save record
        const record = {
          id: uuidv4(),
          templateId: template.id,
          data: formData,
          outputPath,
          printed: false,
          createdAt: new Date().toISOString(),
        };
        saveDataRecord(record);

        succeeded++;
        results.push({ row: i + 1, success: true, outputPath, outputFileName });
      } catch (rowErr) {
        failed++;
        results.push({ row: i + 1, success: false, error: rowErr.message });
      }
    }

    await saveDatabase();
    return { total, succeeded, failed, results };
  },
);

// ── Merge-to-PDF: convert a list of .docx files to PDF then merge into one ────
ipcMain.handle(
  "batch-merge-to-pdf",
  async (event, { docxPaths, templateName }) => {
    if (!docxPaths || docxPaths.length === 0)
      throw new Error("No files to merge");

    // Step 1: convert each docx → pdf via Word COM
    const pdfPaths = [];
    const conversionErrors = [];
    for (const docxPath of docxPaths) {
      try {
        const pdfPath = await convertDocxToPdf(docxPath);
        pdfPaths.push(pdfPath);
      } catch (convErr) {
        conversionErrors.push({ path: docxPath, error: convErr.message });
      }
    }

    if (pdfPaths.length === 0) {
      throw new Error(
        "PDF conversion failed for all documents. Ensure Microsoft Word is installed on this computer.\n" +
          (conversionErrors[0] ? conversionErrors[0].error : ""),
      );
    }

    // Step 2: merge into a single PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const combinedFileName = `${templateName}_batch_combined_${timestamp}.pdf`;
    const combinedPath = path.join(getOutputsDir(), combinedFileName);
    await mergePdfsToSingleFile(pdfPaths, combinedPath);

    // Step 3: clean up individual docx + intermediate pdf files
    for (const docxPath of docxPaths) {
      try {
        await fs.unlink(docxPath);
      } catch (_) {}
    }
    for (const pdfPath of pdfPaths) {
      try {
        await fs.unlink(pdfPath);
      } catch (_) {}
    }

    return {
      combinedPath,
      combinedFileName,
      pageCount: pdfPaths.length,
      conversionErrors,
    };
  },
);
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

  // Validate the template directory path up front. Templates are resolved
  // as settings.templatesDir + fileName on every read, so this setting must
  // always be a usable, non-empty directory.
  if (
    Object.prototype.hasOwnProperty.call(newSettings, "templatesDir") &&
    !String(newSettings.templatesDir || "").trim()
  ) {
    throw new Error(
      "Template Directory cannot be empty — templates are located using this path.",
    );
  }

  const candidate = { ...settings, ...newSettings };

  // Verify every directory is actually creatable/writable BEFORE persisting
  // the new settings, so a bad path (e.g. on a removed drive) can't leave
  // the app pointing at a template directory it can't use.
  try {
    await fs.mkdir(candidate.templatesDir, { recursive: true });
    await fs.mkdir(candidate.outputsDir, { recursive: true });
    await fs.mkdir(path.dirname(candidate.dbPath), { recursive: true });
  } catch (err) {
    throw new Error(
      `Could not access one of the configured directories (${err.path || ""}): ${err.message}. Settings were not changed.`,
    );
  }

  Object.assign(settings, newSettings);
  await saveConfig();

  // Optional convenience: physically move existing files into the new
  // location so they stay colocated with the setting. This is not required
  // for correctness anymore — templates are looked up dynamically by
  // fileName + the current templatesDir setting — but keeps the folder on
  // disk consistent with what Settings shows.
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
  await initNotesStore(path.dirname(settings.dbPath));
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
  await initNotesStore(path.dirname(settings.dbPath));
  return true;
});

// ========== Watermark Tool ==========
ipcMain.handle("choose-output-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose folder to save watermarked images",
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(
  "save-watermarked-image",
  async (event, { outputDirectory, outputFileName, base64Data }) => {
    if (!outputDirectory || !outputFileName || !base64Data) {
      throw new Error("save-watermarked-image: missing required fields");
    }
    const outputDir = path.join(outputDirectory, "watermarked");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFileName);
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(outputPath, buffer);
    return { success: true, outputPath };
  },
);

// ========== Work Logs IPC Handlers ==========

ipcMain.handle(
  "add-work-log",
  async (event, { task, notes, createdAt, tags, photoPath }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const logCreatedAt = createdAt || now;
    wlDb.run(
      `INSERT INTO work_logs
         (id, task, notes, createdAt, tags, photoPath, client_id, synced, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [
        id,
        task || "",
        notes || "",
        logCreatedAt,
        tags || "[]",
        photoPath || null,
        id,
        now,
        now,
      ],
    );
    await saveWorkLogsDB();
    const rows = wlDb.exec(
      "SELECT id, task, notes, createdAt, tags, photoPath FROM work_logs WHERE id = ?",
      [id],
    );
    if (!rows.length || !rows[0].values.length)
      return { id, task, notes, createdAt, tags, photoPath };
    const [rid, rtask, rnotes, rca, rtags, rphoto] = rows[0].values[0];
    return {
      id: rid,
      task: rtask,
      notes: rnotes,
      createdAt: rca,
      tags: rtags,
      photoPath: rphoto,
    };
  },
);

ipcMain.handle("get-work-logs", async () => {
  const rows = wlDb.exec(
    "SELECT id, task, notes, createdAt, tags, photoPath, linkedTodoId, todoStatusHistory, enrichNote FROM work_logs WHERE COALESCE(is_deleted, 0) = 0 ORDER BY createdAt DESC",
  );
  if (!rows.length) return [];
  return rows[0].values.map(
    ([id, task, notes, createdAt, tags, photoPath, linkedTodoId, todoStatusHistory, enrichNote]) => ({
      id,
      task,
      notes,
      createdAt,
      tags: tags || "[]",
      photoPath: photoPath || null,
      linkedTodoId: linkedTodoId || null,
      todoStatusHistory: (() => { try { return JSON.parse(todoStatusHistory || "[]"); } catch(_) { return []; } })(),
      enrichNote: enrichNote || null,
    }),
  );
});

ipcMain.handle("delete-work-log", async (event, id) => {
  wlDb.run(
    "UPDATE work_logs SET is_deleted = 1, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
    [new Date().toISOString(), id],
  );
  await saveWorkLogsDB();
  return true;
});

// ── Todo → Work Log integration ──────────────────────────────────────────────

/**
 * Called when a To-Do item is marked done.
 * Creates a linked Work Log entry (idempotent — only one entry per todo).
 * If one already exists, returns the existing entry and appends a status-history event.
 * @param {Object} payload - { todoId, todoText, todoDate, todoTags, todoPriority }
 * @returns {Object} { worklogId, isNew: boolean }
 */
ipcMain.handle("todo-complete-to-worklog", async (event, { todoId, todoText, todoDate, todoTags, todoPriority }) => {
  // Check if a linked worklog already exists for this todo
  const existing = wlDb.exec(
    "SELECT id, todoStatusHistory FROM work_logs WHERE linkedTodoId = ?",
    [todoId],
  );

  const nowIso = (() => {
    const d = new Date(Date.now() + 5 * 60 * 60 * 1000); // MVT UTC+5
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}T${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  })();

  if (existing.length && existing[0].values.length) {
    // Already linked — append a status history event (re-completed)
    const [wlId, histRaw] = existing[0].values[0];
    let hist = [];
    try { hist = JSON.parse(histRaw || "[]"); } catch(_) {}
    hist.push({ event: "completed", at: nowIso });
    wlDb.run(
      "UPDATE work_logs SET todoStatusHistory = ?, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
      [JSON.stringify(hist), new Date().toISOString(), wlId],
    );
    await saveWorkLogsDB();
    return { worklogId: wlId, isNew: false };
  }

  // Create new linked work log entry
  const id = uuidv4();
  const tags = JSON.stringify(Array.isArray(todoTags) ? todoTags : []);
  const history = JSON.stringify([{ event: "completed", at: nowIso }]);
  // createdAt uses the todo's due date + current MVT time
  const createdAt = `${todoDate}T${nowIso.split("T")[1]}`;

  wlDb.run(
    `INSERT INTO work_logs
       (id, task, notes, createdAt, tags, photoPath, linkedTodoId, todoStatusHistory, enrichNote,
        client_id, synced, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, 0, 0, ?, ?)`,
    [id, todoText, "", createdAt, tags, todoId, history, id, new Date().toISOString(), new Date().toISOString()],
  );

  // Store the worklog ID back on the todo for quick lookup
  wlDb.run("UPDATE cal_todos SET linkedWorklogId = ? WHERE id = ?", [id, todoId]);

  await saveWorkLogsDB();
  return { worklogId: id, isNew: true };
});

/**
 * Called when a To-Do item is un-done (reopened).
 * Appends a "reopened" event to the linked worklog's status history.
 * Does NOT delete the worklog entry.
 * @param {string} todoId - The todo's ID.
 */
ipcMain.handle("todo-reopen-worklog", async (event, todoId) => {
  const existing = wlDb.exec(
    "SELECT id, todoStatusHistory FROM work_logs WHERE linkedTodoId = ?",
    [todoId],
  );
  if (!existing.length || !existing[0].values.length) return false;
  const [wlId, histRaw] = existing[0].values[0];
  let hist = [];
  try { hist = JSON.parse(histRaw || "[]"); } catch(_) {}
  const nowIso = (() => {
    const d = new Date(Date.now() + 5 * 60 * 60 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}T${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  })();
  hist.push({ event: "reopened", at: nowIso });
  wlDb.run(
    "UPDATE work_logs SET todoStatusHistory = ?, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
    [JSON.stringify(hist), new Date().toISOString(), wlId],
  );
  await saveWorkLogsDB();
  return true;
});

/**
 * Enriches a linked work log entry with an additional note.
 * @param {Object} payload - { worklogId, note }
 */
ipcMain.handle("worklog-add-note", async (event, { worklogId, note }) => {
  wlDb.run(
    "UPDATE work_logs SET enrichNote = ?, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
    [note || null, new Date().toISOString(), worklogId],
  );
  await saveWorkLogsDB();
  return true;
});

/**
 * Enriches a linked work log entry with a photo (saves file, stores path).
 * @param {Object} payload - { worklogId, dataUrl, fileName, mimeType }
 */
ipcMain.handle("worklog-enrich-photo", async (event, { worklogId, dataUrl, fileName, mimeType }) => {
  if (!dataUrl) return { success: false };
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");
  try { await fs.mkdir(photosDir, { recursive: true }); } catch(_) {}
  const ext = fileName ? path.extname(fileName) : ".jpg";
  const safeName = `wl_${worklogId.slice(0, 8)}_${Date.now()}${ext}`;
  const destPath = path.join(photosDir, safeName);
  const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
  await fs.writeFile(destPath, Buffer.from(base64Data, "base64"));
  wlDb.run(
    "UPDATE work_logs SET photoPath = ?, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
    [destPath, new Date().toISOString(), worklogId],
  );
  await saveWorkLogsDB();
  return { success: true, path: destPath };
});

// ── Calendar To-Do handlers ──────────────────────────────────────────────────

ipcMain.handle("cal-todo-get", async (event, date) => {
  const rows = wlDb.exec(
    "SELECT id, text, done FROM cal_todos WHERE date = ? AND COALESCE(is_deleted, 0) = 0 ORDER BY sort_order ASC, rowid ASC",
    [date],
  );
  if (!rows.length) return [];
  return rows[0].values.map(([id, text, done]) => ({ id, text, done: !!done }));
});

ipcMain.handle("cal-todo-save", async (event, { date, todos }) => {
  // Replace all todos for this date atomically
  const now = todoSyncTimestamp();
  wlDb.run(
    "UPDATE cal_todos SET is_deleted = 1, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE date = ? AND COALESCE(is_deleted, 0) = 0",
    [now, date],
  );
  todos.forEach((item, idx) => {
    const id = item.id || uuidv4();
    wlDb.run(
      `INSERT OR REPLACE INTO cal_todos
         (id, date, text, done, sort_order, client_id, synced, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [id, date, item.text, item.done ? 1 : 0, idx, id, now, now],
    );
  });
  await saveWorkLogsDB();
  return true;
});

ipcMain.handle("cal-todo-has", async (event, date) => {
  const rows = wlDb.exec("SELECT COUNT(*) FROM cal_todos WHERE date = ? AND COALESCE(is_deleted, 0) = 0", [
    date,
  ]);
  return !!(rows.length && rows[0].values[0][0] > 0);
});

/** Get all todos (optionally filtered by date range). Returns [{id, date, text, done, tags, linkedWorklogId}]. */
ipcMain.handle("cal-todo-get-all", async (event, { from, to } = {}) => {
  let sql = "SELECT id, date, text, done, sort_order, tags, priority, linkedWorklogId FROM cal_todos";
  const params = [];
  const where = ["COALESCE(is_deleted, 0) = 0"];
  if (from && to) {
    where.push("date >= ? AND date <= ?");
    params.push(from, to);
  } else if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY date ASC, sort_order ASC, rowid ASC";
  const rows = wlDb.exec(sql, params);
  if (!rows.length) return [];
  return rows[0].values.map(([id, date, text, done, sort_order, tags, priority, linkedWorklogId]) => ({
    id,
    date,
    text,
    done: !!done,
    sort_order,
    tags: (() => { try { return JSON.parse(tags || "[]"); } catch(_) { return []; } })(),
    priority: priority || "medium",
    linkedWorklogId: linkedWorklogId || null,
  }));
});

/** Move a single todo item to a new date (updates the date column). */
ipcMain.handle("cal-todo-move", async (event, { id, newDate }) => {
  wlDb.run(
    "UPDATE cal_todos SET date = ?, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
    [newDate, todoSyncTimestamp(), id],
  );
  await saveWorkLogsDB();
  return true;
});

/** Update text and/or done status and/or tags and/or priority of a single todo item. */
ipcMain.handle("cal-todo-update", async (event, { id, text, done, tags, priority }) => {
  const parts = [];
  const vals = [];
  if (text !== undefined) { parts.push("text = ?"); vals.push(text); }
  if (done !== undefined) { parts.push("done = ?"); vals.push(done ? 1 : 0); }
  if (tags !== undefined) { parts.push("tags = ?"); vals.push(JSON.stringify(tags)); }
  if (priority !== undefined) { parts.push("priority = ?"); vals.push(priority); }
  if (parts.length) {
    parts.push("synced = 0");
    parts.push("updated_at = ?");
    vals.push(todoSyncTimestamp());
    parts.push("client_id = COALESCE(client_id, id)");
    vals.push(id);
    wlDb.run(`UPDATE cal_todos SET ${parts.join(", ")} WHERE id = ?`, vals);
  }
  await saveWorkLogsDB();
  return true;
});

/** Delete a single todo item by id — also cascade-deletes the linked work log entry if one exists. */
ipcMain.handle("cal-todo-delete", async (event, { id }) => {
  // Find linked worklog before deleting todo
  const linked = wlDb.exec(
    "SELECT linkedWorklogId FROM cal_todos WHERE id = ?",
    [id],
  );
  const worklogId = linked.length && linked[0].values.length
    ? linked[0].values[0][0]
    : null;

  wlDb.run(
    "UPDATE cal_todos SET is_deleted = 1, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
    [todoSyncTimestamp(), id],
  );

  // Cascade-delete the linked work log entry
  if (worklogId) {
    wlDb.run(
      "UPDATE work_logs SET is_deleted = 1, synced = 0, updated_at = ?, client_id = COALESCE(client_id, id) WHERE id = ?",
      [new Date().toISOString(), worklogId],
    );
  }

  await saveWorkLogsDB();
  return true;
});

/**
 * Sync a todo's edits to the linked work log entry (if one exists).
 * Called whenever a todo's text, tags, or date is changed on the To-Do page.
 * @param {Object} payload - { todoId, text, tags, date }
 */
ipcMain.handle("worklog-sync-from-todo", async (event, { todoId, text, tags, date }) => {
  // Look up the linked worklog id
  const linked = wlDb.exec(
    "SELECT linkedWorklogId FROM cal_todos WHERE id = ?",
    [todoId],
  );
  if (!linked.length || !linked[0].values.length) return false;
  const worklogId = linked[0].values[0][0];
  if (!worklogId) return false;

  // Build update
  const parts = [];
  const vals = [];
  if (text !== undefined && text !== null) {
    parts.push("task = ?");
    vals.push(text);
  }
  if (tags !== undefined && tags !== null) {
    parts.push("tags = ?");
    vals.push(JSON.stringify(Array.isArray(tags) ? tags : []));
  }
  if (date !== undefined && date !== null) {
    // Preserve the time portion from the existing createdAt, replace only the date
    const existing = wlDb.exec(
      "SELECT createdAt FROM work_logs WHERE id = ?",
      [worklogId],
    );
    const existingCreatedAt = existing.length && existing[0].values.length
      ? existing[0].values[0][0] || ""
      : "";
    const timePart = existingCreatedAt.includes("T")
      ? existingCreatedAt.split("T")[1]
      : "00:00";
    parts.push("createdAt = ?");
    vals.push(`${date}T${timePart}`);
  }
  if (parts.length) {
    parts.push("synced = 0");
    parts.push("updated_at = ?");
    vals.push(new Date().toISOString());
    parts.push("client_id = COALESCE(client_id, id)");
    vals.push(worklogId);
    wlDb.run(`UPDATE work_logs SET ${parts.join(", ")} WHERE id = ?`, vals);
    await saveWorkLogsDB();
  }
  return true;
});

/** Insert a new todo item. */
ipcMain.handle("cal-todo-add", async (event, { date, text, tags, priority }) => {
  const id = uuidv4();
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const prio = ["low","medium","high"].includes(priority) ? priority : "medium";
  const rowsNow = wlDb.exec("SELECT COUNT(*) FROM cal_todos WHERE date = ? AND COALESCE(is_deleted, 0) = 0", [
    date,
  ]);
  const now = todoSyncTimestamp();
  const count = rowsNow.length ? rowsNow[0].values[0][0] : 0;
  wlDb.run(
    `INSERT INTO cal_todos
       (id, date, text, done, sort_order, tags, priority, client_id, synced, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [id, date, text, count, tagsJson, prio, id, now, now],
  );
  await saveWorkLogsDB();
  return { id, date, text, done: false, sort_order: count, tags: Array.isArray(tags) ? tags : [], priority: prio };
});

// ── Calendar Weather handlers ────────────────────────────────────────────────

/**
 * Retrieve cached weather for a date (YYYY-MM-DD). Returns null if not cached.
 */
ipcMain.handle("cal-weather-get", async (event, date) => {
  const rows = wlDb.exec(
    "SELECT date, fetched_at, condition, condition_dv, temp_min, temp_max, humidity, wind_speed, wind_dir, sunrise, sunset, wmo_code FROM cal_weather WHERE date = ?",
    [date]
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [d, fa, cond, condDv, tMin, tMax, hum, ws, wd, sr, ss, wmo] = rows[0].values[0];
  return { date: d, fetched_at: fa, condition: cond, condition_dv: condDv, temp_min: tMin, temp_max: tMax, humidity: hum, wind_speed: ws, wind_dir: wd, sunrise: sr, sunset: ss, wmo_code: wmo };
});

/**
 * Fetch a 7-day weather forecast from Open-Meteo for Addu City (Gan, 0.629°N 73.099°E)
 * and upsert into cal_weather. Returns array of inserted weather records.
 * Uses the free, no-auth Open-Meteo API.
 */
ipcMain.handle("cal-weather-refresh", async () => {
  const ADDU_LAT = 0.629;
  const ADDU_LON = 73.099;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ADDU_LAT}&longitude=${ADDU_LON}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset` +
    `&timezone=Indian%2FMaldives&forecast_days=14`;

  let json;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    json = await resp.json();
  } catch (err) {
    console.warn("[Weather] Fetch failed:", err.message);
    return { ok: false, error: err.message };
  }

  const daily = json.daily;
  if (!daily || !Array.isArray(daily.time)) return { ok: false, error: "Bad payload" };

  const WMO_EN = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
  };
  // Dhivehi weather condition labels (Thaana for common codes, English fallback for rare ones)
  const WMO_DV = {
    0:  "ސާފު",
    1:  "ގިނައިން ސާފު",
    2:  "ތަންތަންކޮޅު ވިލާ",
    3:  "ވިލާ",
    45: "ދުން",
    48: "ދުން",
  };

  const fetchedAt = new Date().toISOString();
  const inserted = [];

  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    const wmo = daily.weathercode ? daily.weathercode[i] : null;
    const condEn = WMO_EN[wmo] || "Unknown";

    const sunrise = daily.sunrise ? daily.sunrise[i] : null;
    const sunset = daily.sunset ? daily.sunset[i] : null;

    // Sunrise/sunset come as full ISO strings; extract HH:MM
    const srTime = sunrise ? sunrise.slice(11, 16) : null;
    const ssTime = sunset ? sunset.slice(11, 16) : null;

    const rec = {
      date,
      fetched_at: fetchedAt,
      condition: condEn,
      condition_dv: WMO_DV[wmo] || condEn,
      temp_min: daily.temperature_2m_min ? daily.temperature_2m_min[i] : null,
      temp_max: daily.temperature_2m_max ? daily.temperature_2m_max[i] : null,
      humidity: daily.relative_humidity_2m_max ? daily.relative_humidity_2m_max[i] : null,
      wind_speed: daily.windspeed_10m_max ? daily.windspeed_10m_max[i] : null,
      wind_dir: daily.winddirection_10m_dominant ? daily.winddirection_10m_dominant[i] : null,
      sunrise: srTime,
      sunset: ssTime,
      wmo_code: wmo,
    };

    wlDb.run(
      `INSERT OR REPLACE INTO cal_weather
        (date, fetched_at, condition, condition_dv, temp_min, temp_max, humidity, wind_speed, wind_dir, sunrise, sunset, wmo_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rec.date, rec.fetched_at, rec.condition, rec.condition_dv,
       rec.temp_min, rec.temp_max, rec.humidity, rec.wind_speed, rec.wind_dir,
       rec.sunrise, rec.sunset, rec.wmo_code]
    );
    inserted.push(rec);
  }

  await saveWorkLogsDB();
  console.log(`[Weather] Stored ${inserted.length} daily forecasts`);
  return { ok: true, count: inserted.length, records: inserted };
});

/**
 * Fetch historical weather for a specific date (YYYY-MM-DD) from Open-Meteo
 * archive API and store in cal_weather. Called when a past date has no cached
 * record. Returns the stored record or null on failure.
 */
ipcMain.handle("cal-weather-fetch-historical", async (event, date) => {
  // Validate date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  // Check DB first — avoid redundant API calls
  const existing = wlDb.exec(
    "SELECT date, fetched_at, condition, condition_dv, temp_min, temp_max, humidity, wind_speed, wind_dir, sunrise, sunset, wmo_code FROM cal_weather WHERE date = ?",
    [date]
  );
  if (existing.length && existing[0].values.length) {
    const [d, fa, cond, condDv, tMin, tMax, hum, ws, wd, sr, ss, wmo] = existing[0].values[0];
    return { date: d, fetched_at: fa, condition: cond, condition_dv: condDv,
             temp_min: tMin, temp_max: tMax, humidity: hum, wind_speed: ws,
             wind_dir: wd, sunrise: sr, sunset: ss, wmo_code: wmo };
  }

  const ADDU_LAT = 0.629;
  const ADDU_LON = 73.099;
  // Open-Meteo archive requires start_date and end_date (same date for single day)
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${ADDU_LAT}&longitude=${ADDU_LON}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset` +
    `&timezone=Indian%2FMaldives`;

  let json;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    json = await resp.json();
  } catch (err) {
    console.warn(`[Weather] Historical fetch failed for ${date}:`, err.message);
    return null;
  }

  const daily = json.daily;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) return null;

  const WMO_EN = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
  };
  const WMO_DV = {
    0: "ސާފު", 1: "ގިނައިން ސާފު", 2: "ތަންތަންކޮޅު ވިލާ", 3: "ވިލާ",
    45: "ދުން", 48: "ދުން",
  };

  const i = 0; // single-day response
  const wmo = daily.weathercode ? daily.weathercode[i] : null;
  const sunrise = daily.sunrise ? daily.sunrise[i] : null;
  const sunset = daily.sunset ? daily.sunset[i] : null;
  const srTime = sunrise ? sunrise.slice(11, 16) : null;
  const ssTime = sunset ? sunset.slice(11, 16) : null;

  const rec = {
    date: daily.time[i],
    fetched_at: new Date().toISOString(),
    condition: WMO_EN[wmo] || "Unknown",
    condition_dv: WMO_DV[wmo] || WMO_EN[wmo] || "Unknown",
    temp_min: daily.temperature_2m_min ? daily.temperature_2m_min[i] : null,
    temp_max: daily.temperature_2m_max ? daily.temperature_2m_max[i] : null,
    humidity: daily.relative_humidity_2m_max ? daily.relative_humidity_2m_max[i] : null,
    wind_speed: daily.windspeed_10m_max ? daily.windspeed_10m_max[i] : null,
    wind_dir: daily.winddirection_10m_dominant ? daily.winddirection_10m_dominant[i] : null,
    sunrise: srTime,
    sunset: ssTime,
    wmo_code: wmo,
  };

  wlDb.run(
    `INSERT OR REPLACE INTO cal_weather
      (date, fetched_at, condition, condition_dv, temp_min, temp_max, humidity, wind_speed, wind_dir, sunrise, sunset, wmo_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rec.date, rec.fetched_at, rec.condition, rec.condition_dv,
     rec.temp_min, rec.temp_max, rec.humidity, rec.wind_speed, rec.wind_dir,
     rec.sunrise, rec.sunset, rec.wmo_code]
  );

  await saveWorkLogsDB();
  console.log(`[Weather] Stored historical record for ${date}`);
  return rec;
});

ipcMain.handle("export-work-logs-excel", async (event, { rows }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export Work Logs to Excel",
    defaultPath: path.join(
      app.getPath("documents"),
      `WorkLogs_${new Date().toISOString().slice(0, 10)}.xlsx`,
    ),
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });
  if (canceled || !filePath) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MTO Document Generator";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Work Logs");
  sheet.columns = [
    { header: "No.", key: "no", width: 6 },
    { header: "Date", key: "date", width: 14 },
    { header: "Time (MVT)", key: "time", width: 14 },
    { header: "Task Description", key: "task", width: 50 },
    { header: "Tags", key: "tags", width: 24 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4A6B5A" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB0C8BC" } } };
  });
  headerRow.height = 22;

  rows.forEach((r, idx) => {
    const row = sheet.addRow(r);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F4F2" },
        };
      }
    });
    row.height = 18;
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  await workbook.xlsx.writeFile(filePath);
  return { success: true, path: filePath };
});

// ── Save a work log photo ──────────────────────────────────────────────────
ipcMain.handle(
  "save-work-log-photo",
  async (event, { dataUrl, fileName, mimeType }) => {
    const photosDir = path.join(app.getPath("userData"), "worklog_photos");
    try {
      await fs.mkdir(photosDir, { recursive: true });
    } catch (_) {}
    const ext = fileName ? path.extname(fileName) : ".jpg";
    const outName = `${uuidv4()}${ext}`;
    const outPath = path.join(photosDir, outName);
    // dataUrl: "data:image/jpeg;base64,..."
    const base64 = dataUrl.split(",")[1];
    await fs.writeFile(outPath, Buffer.from(base64, "base64"));
    return { path: outPath };
  },
);

// ── Read a work log photo as data URL ────────────────────────────────────
ipcMain.handle("get-work-log-photo", async (event, photoPath) => {
  if (!photoPath) return null;
  try {
    const buf = await fs.readFile(photoPath);
    const ext = path.extname(photoPath).toLowerCase().replace(".", "");
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (_) {
    return null;
  }
});

// ── Monthly Word export ───────────────────────────────────────────────────
ipcMain.handle(
  "export-work-logs-word",
  async (event, { rows, month, officer }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save Monthly Report",
      defaultPath: path.join(
        app.getPath("documents"),
        `WorkLog_Report_${month.replace(/\s/g, "_")}.docx`,
      ),
      filters: [{ name: "Word Document", extensions: ["docx"] }],
    });
    if (canceled || !filePath) return null;

    // Build a clean OOXML docx from scratch
    const tableRows = rows
      .map((r, i) => {
        const bg = i % 2 === 0 ? "F6F8F7" : "FFFFFF";
        return `
    <w:tr>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${r.no}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${r.date}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="1200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${r.time}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${(r.task || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${(r.tags || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${(r.notes || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</w:t></w:r></w:p></w:tc>
    </w:tr>`;
      })
      .join("");

    const headerCells = [
      "#",
      "Date",
      "Time (MVT)",
      "Task Description",
      "Tags",
      "Notes",
    ]
      .map(
        (h) =>
          `<w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="4A6B5A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t>${h}</w:t></w:r></w:p></w:tc>`,
      )
      .join("");

    const officerLine = officer
      ? `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">Officer: ${officer.replace(/&/g, "&amp;")}</w:t></w:r></w:p>`
      : "";

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="4A6B5A"/></w:rPr><w:t>Monthly Work Log Report</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>${month.replace(/&/g, "&amp;")}</w:t></w:r>
    </w:p>
    ${officerLine}
    <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="6B7C73"/></w:rPr><w:t xml:space="preserve">Total entries: ${rows.length}    |    Addu City Council — MTO</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="11600" w:type="dxa"/>
        <w:tblBorders>
          <w:top    w:val="single" w:sz="4" w:space="0" w:color="C2C8C5"/>
          <w:left   w:val="single" w:sz="4" w:space="0" w:color="C2C8C5"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="C2C8C5"/>
          <w:right  w:val="single" w:sz="4" w:space="0" w:color="C2C8C5"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D6DBD9"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D6DBD9"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>${headerCells}</w:tr>
      ${tableRows}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:before="200"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="6B7C73"/></w:rPr>
        <w:t xml:space="preserve">Generated by MTO Document Generator on ${new Date().toLocaleDateString("en-MV", { timeZone: "Indian/Maldives" })} (MVT)</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    // Build minimal valid .docx zip
    const zip = new PizZip();
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    );
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    );
    zip.file("word/document.xml", docXml);
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
    );

    const buffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    await fs.writeFile(filePath, buffer);
    return { success: true, path: filePath };
  },
);

// ── Monthly styled Excel export ───────────────────────────────────────────
ipcMain.handle(
  "export-work-logs-monthly-excel",
  async (event, { rows, month, officer }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save Monthly Excel Report",
      defaultPath: path.join(
        app.getPath("documents"),
        `WorkLog_Report_${month.replace(/\s/g, "_")}.xlsx`,
      ),
      filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return null;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MTO Document Generator";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(month);

    // Title rows
    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `Monthly Work Log Report — ${month}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FF4A6B5A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 32;

    if (officer) {
      sheet.mergeCells("A2:F2");
      const offCell = sheet.getCell("A2");
      offCell.value = `Officer: ${officer}   |   Addu City Council — MTO`;
      offCell.font = { size: 11, color: { argb: "FF6B7C73" } };
      offCell.alignment = { horizontal: "center" };
      sheet.getRow(2).height = 20;
    }

    const dataStartRow = officer ? 4 : 3;
    sheet.getRow(dataStartRow).values = [
      "No.",
      "Date",
      "Time (MVT)",
      "Task Description",
      "Tags",
      "Notes",
    ];
    sheet.getRow(dataStartRow).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4A6B5A" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    sheet.getRow(dataStartRow).height = 22;

    sheet.columns = [
      { key: "no", width: 6 },
      { key: "date", width: 14 },
      { key: "time", width: 14 },
      { key: "task", width: 52 },
      { key: "tags", width: 22 },
      { key: "notes", width: 40 },
    ];

    rows.forEach((r, idx) => {
      const rowIdx = dataStartRow + 1 + idx;
      const row = sheet.getRow(rowIdx);
      row.values = [r.no, r.date, r.time, r.task, r.tags, r.notes];
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true };
        if (idx % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F4F2" },
          };
        }
      });
      row.height = 18;
    });

    sheet.views = [{ state: "frozen", ySplit: dataStartRow }];

    // Summary row
    const sumRow = sheet.getRow(dataStartRow + rows.length + 2);
    sumRow.getCell(1).value = `Total: ${rows.length} entries`;
    sumRow.getCell(1).font = {
      bold: true,
      italic: true,
      color: { argb: "FF6B7C73" },
      size: 10,
    };

    await workbook.xlsx.writeFile(filePath);
    return { success: true, path: filePath };
  },
);

// ========== Social Media Templates ==========

const SM_SUBDIR = "social-media";

function smDir() {
  return path.join(settings.templatesDir, SM_SUBDIR);
}
function smImagesDir() {
  return path.join(smDir(), "images");
}

/** Ensure the subdirectories exist. */
async function ensureSmDirs() {
  await fs.mkdir(smDir(), { recursive: true });
  await fs.mkdir(smImagesDir(), { recursive: true });
}

/**
 * List all SM templates — reads every *.json in the social-media/ subdir.
 * Returns array of parsed template objects (without embedded imageDataUrl;
 * that is loaded separately on demand).
 */
ipcMain.handle("sm-list-templates", async () => {
  await ensureSmDirs();
  let entries;
  try {
    entries = await fs.readdir(smDir());
  } catch (_) {
    return [];
  }

  const templates = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(smDir(), entry), "utf8");
      const tpl = JSON.parse(raw);
      templates.push(tpl);
    } catch (_) {
      /* skip corrupt files */
    }
  }
  // Sort newest first
  templates.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  return templates;
});

/**
 * Save (create or update) a SM template.
 * data: { id, name, fields, imageName, imageDataUrl, savedAt }
 * The imageDataUrl (if provided) is stripped from the JSON and written as a
 * separate file under social-media/images/<id>.<ext>.
 */
ipcMain.handle("sm-save-template", async (event, data) => {
  await ensureSmDirs();
  const id = data.id || uuidv4();
  const tpl = { ...data, id };

  // Persist image separately
  if (tpl.imageDataUrl) {
    const match = tpl.imageDataUrl.match(
      /^data:(image\/[a-z+]+);base64,(.+)$/s,
    );
    if (match) {
      const mime = match[1];
      const ext =
        mime === "image/png"
          ? ".png"
          : mime === "image/gif"
            ? ".gif"
            : mime === "image/webp"
              ? ".webp"
              : ".jpg";
      const imgPath = path.join(smImagesDir(), `${id}${ext}`);
      await fs.writeFile(imgPath, Buffer.from(match[2], "base64"));
      tpl.imagePath = imgPath;
    }
    delete tpl.imageDataUrl; // don't store in JSON
  }

  // Thumbnail stays embedded (it's tiny — 240px JPEG ~15 KB)
  const jsonPath = path.join(smDir(), `${id}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(tpl, null, 2), "utf8");
  return tpl;
});

/**
 * Load a single template including its image as a data URL.
 */
ipcMain.handle("sm-load-template", async (event, id) => {
  const jsonPath = path.join(smDir(), `${id}.json`);
  const raw = await fs.readFile(jsonPath, "utf8");
  const tpl = JSON.parse(raw);

  if (tpl.imagePath) {
    try {
      const buf = await fs.readFile(tpl.imagePath);
      const ext = path.extname(tpl.imagePath).toLowerCase().replace(".", "");
      const mime =
        ext === "png"
          ? "image/png"
          : ext === "gif"
            ? "image/gif"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      tpl.imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch (_) {
      tpl.imageDataUrl = null;
    }
  }
  return tpl;
});

/**
 * Delete a SM template and its associated image file.
 */
ipcMain.handle("sm-delete-template", async (event, id) => {
  const jsonPath = path.join(smDir(), `${id}.json`);
  try {
    const raw = await fs.readFile(jsonPath, "utf8");
    const tpl = JSON.parse(raw);
    if (tpl.imagePath) {
      try {
        await fs.unlink(tpl.imagePath);
      } catch (_) {}
    }
  } catch (_) {}
  try {
    await fs.unlink(jsonPath);
  } catch (_) {}
  return true;
});

/**
 * Export a generated image (PNG) — saves to social-media/images/ and returns the path.
 * data: { base64Data, fileName }
 */
ipcMain.handle("sm-export-image", async (event, { base64Data, fileName }) => {
  await ensureSmDirs();
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export Social Media Image",
    defaultPath: path.join(
      app.getPath("pictures"),
      fileName || "social_media_export.png",
    ),
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });
  if (canceled || !filePath) return null;
  await fs.writeFile(filePath, Buffer.from(base64Data, "base64"));
  return { success: true, path: filePath };
});

/**
 * Backup all SM templates (JSON + images) into a single .zip file.
 * The zip contains:
 *   templates/<id>.json   — one per template
 *   images/<id>.<ext>     — one per background image
 */
ipcMain.handle("sm-backup", async () => {
  await ensureSmDirs();

  // Pick save location
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Backup Social Media Templates",
    defaultPath: path.join(
      app.getPath("documents"),
      `sm-templates-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    ),
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  const zip = new PizZip();

  // Add every .json template
  let entries;
  try {
    entries = await fs.readdir(smDir());
  } catch (_) {
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const buf = await fs.readFile(path.join(smDir(), entry));
      zip.file(`templates/${entry}`, buf);
    } catch (_) {}
  }

  // Add every image file
  let imgEntries;
  try {
    imgEntries = await fs.readdir(smImagesDir());
  } catch (_) {
    imgEntries = [];
  }
  for (const entry of imgEntries) {
    try {
      const buf = await fs.readFile(path.join(smImagesDir(), entry));
      zip.file(`images/${entry}`, buf);
    } catch (_) {}
  }

  const zipBuf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(filePath, zipBuf);
  return {
    success: true,
    path: filePath,
    count: entries.filter((e) => e.endsWith(".json")).length,
  };
});

/**
 * Restore SM templates from a .zip backup.
 * Overwrites existing templates and images.
 */
ipcMain.handle("sm-restore", async () => {
  await ensureSmDirs();

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Social Media Templates",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };

  const zipBuf = await fs.readFile(filePaths[0]);
  let zip;
  try {
    zip = new PizZip(zipBuf);
  } catch (e) {
    throw new Error("Invalid or corrupted ZIP file.");
  }

  let restored = 0;
  for (const [relPath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir) continue;
    const content = zipObj.asNodeBuffer
      ? zipObj.asNodeBuffer()
      : Buffer.from(zipObj.asBinary(), "binary");
    if (relPath.startsWith("templates/") && relPath.endsWith(".json")) {
      const dest = path.join(smDir(), path.basename(relPath));
      // Fix imagePath to use current smImagesDir
      try {
        const tpl = JSON.parse(content.toString("utf8"));
        if (tpl.imagePath) {
          tpl.imagePath = path.join(
            smImagesDir(),
            path.basename(tpl.imagePath),
          );
        }
        await fs.writeFile(dest, JSON.stringify(tpl, null, 2), "utf8");
        restored++;
      } catch (_) {
        await fs.writeFile(dest, content);
        restored++;
      }
    } else if (relPath.startsWith("images/")) {
      const dest = path.join(smImagesDir(), path.basename(relPath));
      await fs.writeFile(dest, content);
    }
  }

  return { success: true, count: restored };
});

// ========== Notes Backup & Restore ==========

function parseNotesJson(jsonString) {
  if (!jsonString) return [];
  let notes;
  try {
    notes = JSON.parse(jsonString);
  } catch (_) {
    throw new Error("Invalid notes JSON backup.");
  }
  if (!Array.isArray(notes)) {
    throw new Error("Invalid notes backup - expected an array of notes.");
  }
  return notes;
}

async function addNotesToZip(zip, legacyNotesJson = "[]", prefix = "") {
  await migrateLegacyNotes(parseNotesJson(legacyNotesJson || "[]"));
  await flushNotesCache();

  const notes = getNotes();
  const notesJson = JSON.stringify(notes, null, 2);
  const notesDbPath = getNotesDbPath();
  if (notesDbPath && fsSync.existsSync(notesDbPath)) {
    zip.file(`${prefix}notes/Notes.db`, await fs.readFile(notesDbPath));
  }
  zip.file(`${prefix}notes.json`, notesJson);
  zip.file(`${prefix}notes/notes.json`, notesJson);
  return notes.length;
}

async function restoreNotesDbBuffer(dbContent) {
  closeNotesStore();
  await fs.writeFile(path.join(path.dirname(settings.dbPath), "Notes.db"), dbContent);
  await initNotesStore(path.dirname(settings.dbPath));
}

async function restoreNotesJson(jsonString) {
  closeNotesStore();
  await initNotesStore(path.dirname(settings.dbPath));
  await migrateLegacyNotes(parseNotesJson(jsonString));
  await flushNotesCache();
}

/**
 * Backup notes — receives the JSON string from the renderer (localStorage)
 * and writes it to a user-chosen file.
 */
ipcMain.handle("notes-backup", async (event, jsonString) => {
  const zip = new PizZip();
  const count = await addNotesToZip(zip, jsonString || "[]");

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Backup Notes",
    defaultPath: path.join(
      app.getPath("documents"),
      `notes-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    ),
    filters: [
      { name: "ZIP Archive", extensions: ["zip"] },
      { name: "JSON File", extensions: ["json"] },
    ],
  });
  if (canceled || !filePath) return { canceled: true };

  if (path.extname(filePath).toLowerCase() === ".json") {
    await fs.writeFile(filePath, JSON.stringify(getNotes(), null, 2), "utf8");
  } else {
    await fs.writeFile(filePath, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
  }
  return { success: true, path: filePath, count };
});

/**
 * Restore notes — opens a JSON file and returns its contents to the renderer,
 * which writes it back into localStorage.
 */
ipcMain.handle("notes-restore", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Notes",
    filters: [
      { name: "Notes Backup", extensions: ["zip", "json"] },
      { name: "ZIP Archive", extensions: ["zip"] },
      { name: "JSON File", extensions: ["json"] },
    ],
    properties: ["openFile"],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };

  if (path.extname(filePaths[0]).toLowerCase() === ".zip") {
    const zipBuf = await fs.readFile(filePaths[0]);
    let zip;
    try {
      zip = new PizZip(zipBuf);
    } catch (_) {
      throw new Error("Invalid or corrupted ZIP file.");
    }

    const notesDbEntry = zip.files["notes/Notes.db"] || zip.files["Notes.db"];
    const notesJsonEntry = zip.files["notes.json"] || zip.files["notes/notes.json"];
    if (notesDbEntry) {
      const dbContent = notesDbEntry.asNodeBuffer
        ? notesDbEntry.asNodeBuffer()
        : Buffer.from(notesDbEntry.asBinary(), "binary");
      await restoreNotesDbBuffer(dbContent);
    } else if (notesJsonEntry) {
      const rawZipNotes = notesJsonEntry.asText
        ? notesJsonEntry.asText()
        : notesJsonEntry.asNodeBuffer().toString("utf8");
      await restoreNotesJson(rawZipNotes);
    } else {
      throw new Error("ZIP does not contain Notes.db or notes.json.");
    }

    const restoredNotes = getNotes();
    return {
      success: true,
      data: JSON.stringify(restoredNotes),
      count: restoredNotes.length,
    };
  }

  const raw = await fs.readFile(filePaths[0], "utf8");
  // Validate it's an array of notes
  let notes;
  try {
    notes = JSON.parse(raw);
  } catch (_) {
    throw new Error("Invalid backup file — could not parse JSON.");
  }
  if (!Array.isArray(notes))
    throw new Error("Invalid backup file — expected an array of notes.");
  await restoreNotesJson(JSON.stringify(notes));
  const restoredNotes = getNotes();
  return {
    success: true,
    data: JSON.stringify(restoredNotes),
    count: restoredNotes.length,
  };
});

// ========== Work Logs Backup & Restore ==========

/**
 * Backup work logs — zips the worklogs.db file and all photos into one archive.
 */
ipcMain.handle("wl-backup", async () => {
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Backup Work Logs",
    defaultPath: path.join(
      app.getPath("documents"),
      `worklogs-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    ),
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  // Flush current wlDb to disk before reading
  await saveWorkLogsDB();

  const zip = new PizZip();

  // Add the SQLite DB file
  try {
    const dbBuf = await fs.readFile(WL_DB_PATH);
    zip.file("worklogs.db", dbBuf);
  } catch (e) {
    throw new Error("Could not read worklogs database: " + e.message);
  }

  // Add all photos
  let photoEntries = [];
  try {
    photoEntries = await fs.readdir(photosDir);
  } catch (_) {}
  for (const entry of photoEntries) {
    try {
      const buf = await fs.readFile(path.join(photosDir, entry));
      zip.file(`photos/${entry}`, buf);
    } catch (_) {}
  }

  const zipBuf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(filePath, zipBuf);
  return { success: true, path: filePath, photos: photoEntries.length };
});

/**
 * Restore work logs — extracts worklogs.db and photos from a zip.
 * Closes and reinitialises wlDb after writing the new DB file.
 */
ipcMain.handle("wl-restore", async () => {
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Work Logs",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };

  const zipBuf = await fs.readFile(filePaths[0]);
  let zip;
  try {
    zip = new PizZip(zipBuf);
  } catch (_) {
    throw new Error("Invalid or corrupted ZIP file.");
  }

  if (!zip.files["worklogs.db"])
    throw new Error(
      "ZIP does not contain a worklogs.db — is this a valid work logs backup?",
    );

  // Write the DB file
  const dbContent = zip.files["worklogs.db"].asNodeBuffer
    ? zip.files["worklogs.db"].asNodeBuffer()
    : Buffer.from(zip.files["worklogs.db"].asBinary(), "binary");

  if (wlDb) {
    try {
      wlDb.close();
    } catch (_) {}
    wlDb = null;
  }
  await fs.writeFile(WL_DB_PATH, dbContent);

  // Restore photos
  await fs.mkdir(photosDir, { recursive: true });
  let photoCount = 0;
  for (const [relPath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir || !relPath.startsWith("photos/")) continue;
    const content = zipObj.asNodeBuffer
      ? zipObj.asNodeBuffer()
      : Buffer.from(zipObj.asBinary(), "binary");
    const dest = path.join(photosDir, path.basename(relPath));
    await fs.writeFile(dest, content);
    photoCount++;
  }

  // Reinitialise the work logs DB from the restored file
  await initWorkLogsDB();

  return { success: true, photos: photoCount };
});

// ========== Document Templates Backup & Restore ==========

/**
 * Zip mto_forms.db + every file in templatesDir (excluding social-media/ subdir).
 * Archive layout:
 *   mto_forms.db
 *   files/<uuid>_originalname.docx  (etc.)
 */
ipcMain.handle("docs-backup", async () => {
  await saveDatabase();

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Backup Document Templates",
    defaultPath: path.join(
      app.getPath("documents"),
      `doc-templates-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    ),
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  const zip = new PizZip();

  // Add the SQLite DB
  const dbBuf = await fs.readFile(settings.dbPath);
  zip.file("mto_forms.db", dbBuf);

  // Add template files (skip social-media/ subdir)
  let entries = [];
  try {
    entries = await fs.readdir(settings.templatesDir);
  } catch (_) {}
  let count = 0;
  for (const entry of entries) {
    if (entry === SM_SUBDIR) continue; // skip social-media folder
    const fullPath = path.join(settings.templatesDir, entry);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        const buf = await fs.readFile(fullPath);
        zip.file(`files/${entry}`, buf);
        count++;
      }
    } catch (_) {}
  }

  const zipBuf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(filePath, zipBuf);
  return { success: true, path: filePath, count };
});

/**
 * Restore document templates from a backup zip.
 * Writes template files into the current templatesDir. The DB only stores
 * each template's fileName (no absolute path), so once the files are
 * restored into settings.templatesDir, every catalog record resolves
 * correctly on this machine automatically — no path fix-up required.
 */
ipcMain.handle("docs-restore", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Document Templates",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };

  const zipBuf = await fs.readFile(filePaths[0]);
  let zip;
  try {
    zip = new PizZip(zipBuf);
  } catch (_) {
    throw new Error("Invalid or corrupted ZIP file.");
  }
  if (!zip.files["mto_forms.db"])
    throw new Error(
      "ZIP does not contain mto_forms.db — is this a valid document templates backup?",
    );

  // Restore template files first
  await fs.mkdir(settings.templatesDir, { recursive: true });
  let count = 0;
  for (const [relPath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir || !relPath.startsWith("files/")) continue;
    const content = zipObj.asNodeBuffer
      ? zipObj.asNodeBuffer()
      : Buffer.from(zipObj.asBinary(), "binary");
    const dest = path.join(settings.templatesDir, path.basename(relPath));
    await fs.writeFile(dest, content);
    count++;
  }

  // Write the DB and reinitialise
  const dbContent = zip.files["mto_forms.db"].asNodeBuffer
    ? zip.files["mto_forms.db"].asNodeBuffer()
    : Buffer.from(zip.files["mto_forms.db"].asBinary(), "binary");

  if (db) {
    try {
      db.close();
    } catch (_) {}
    db = null;
  }
  await fs.writeFile(settings.dbPath, dbContent);
  await initSQLite(settings.dbPath);

  // No path repointing needed: templates are stored by fileName only, and
  // fileName is resolved against the current settings.templatesDir on every
  // read. As long as the files above were restored into settings.templatesDir
  // (which they were, just above), the catalog entries already line up.

  return { success: true, count };
});

// ========== Full Backup & Restore (everything) ==========

/**
 * Archive layout:
 *   docs/mto_forms.db
 *   docs/files/<template files>
 *   social-media/templates/<id>.json
 *   social-media/images/<id>.<ext>
 *   worklogs/worklogs.db
 *   worklogs/photos/<photo files>
 *   notes.json          (notes array from renderer, passed in)
 */
ipcMain.handle("full-backup", async (event, notesJson) => {
  // Flush all databases
  await saveDatabase();
  await saveWorkLogsDB();
  await flushNotesCache();

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Backup Everything",
    defaultPath: path.join(
      app.getPath("documents"),
      `mto-full-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    ),
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  const zip = new PizZip();

  // ── Document templates ──
  const dbBuf = await fs.readFile(settings.dbPath);
  zip.file("docs/mto_forms.db", dbBuf);
  let docEntries = [];
  try {
    docEntries = await fs.readdir(settings.templatesDir);
  } catch (_) {}
  for (const entry of docEntries) {
    if (entry === SM_SUBDIR) continue;
    const fullPath = path.join(settings.templatesDir, entry);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        zip.file(`docs/files/${entry}`, await fs.readFile(fullPath));
      }
    } catch (_) {}
  }

  // ── Social Media templates ──
  await ensureSmDirs();
  let smEntries = [];
  try {
    smEntries = await fs.readdir(smDir());
  } catch (_) {}
  for (const entry of smEntries) {
    if (!entry.endsWith(".json")) continue;
    try {
      zip.file(
        `social-media/templates/${entry}`,
        await fs.readFile(path.join(smDir(), entry)),
      );
    } catch (_) {}
  }
  let smImgEntries = [];
  try {
    smImgEntries = await fs.readdir(smImagesDir());
  } catch (_) {}
  for (const entry of smImgEntries) {
    try {
      zip.file(
        `social-media/images/${entry}`,
        await fs.readFile(path.join(smImagesDir(), entry)),
      );
    } catch (_) {}
  }

  // ── Work Logs ──
  try {
    zip.file("worklogs/worklogs.db", await fs.readFile(WL_DB_PATH));
  } catch (_) {}
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");
  let photoEntries = [];
  try {
    photoEntries = await fs.readdir(photosDir);
  } catch (_) {}
  for (const entry of photoEntries) {
    try {
      zip.file(
        `worklogs/photos/${entry}`,
        await fs.readFile(path.join(photosDir, entry)),
      );
    } catch (_) {}
  }

  // ── Notes (passed from renderer) ──
  try {
    await addNotesToZip(zip, notesJson || "[]");
    zip.file("notes/legacy-localStorage-notes.json", notesJson || "[]");
  } catch (_) {}

  const zipBuf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(filePath, zipBuf);
  return { success: true, path: filePath };
});

/**
 * Restore everything from a full backup zip.
 * Returns { success, notes } where notes is the raw JSON string for the
 * renderer to write back into localStorage.
 */
ipcMain.handle("full-restore", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Full Backup",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };

  const zipBuf = await fs.readFile(filePaths[0]);
  let zip;
  try {
    zip = new PizZip(zipBuf);
  } catch (_) {
    throw new Error("Invalid or corrupted ZIP file.");
  }

  const hasAny = Object.keys(zip.files).some(
    (k) =>
      k.startsWith("docs/") ||
      k.startsWith("social-media/") ||
      k.startsWith("worklogs/") ||
      k.startsWith("notes/") ||
      k === "notes.json",
  );
  if (!hasAny)
    throw new Error("This does not appear to be a valid full backup ZIP.");

  const readZipFile = (key) => {
    const f = zip.files[key];
    if (!f) return null;
    return f.asNodeBuffer
      ? f.asNodeBuffer()
      : Buffer.from(f.asBinary(), "binary");
  };

  // ── Document templates ──
  await fs.mkdir(settings.templatesDir, { recursive: true });
  for (const [relPath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir || !relPath.startsWith("docs/files/")) continue;
    const content = zipObj.asNodeBuffer
      ? zipObj.asNodeBuffer()
      : Buffer.from(zipObj.asBinary(), "binary");
    await fs.writeFile(
      path.join(settings.templatesDir, path.basename(relPath)),
      content,
    );
  }
  const docDbBuf = readZipFile("docs/mto_forms.db");
  if (docDbBuf) {
    if (db) {
      try {
        db.close();
      } catch (_) {}
      db = null;
    }
    await fs.writeFile(settings.dbPath, docDbBuf);
    await initSQLite(settings.dbPath);
    // No path repointing needed: templates are stored by fileName only and
    // resolved against the current settings.templatesDir on every read —
    // the files restored just above already line up with the DB records.
  }

  // ── Social Media templates ──
  await ensureSmDirs();
  for (const [relPath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir) continue;
    const content = zipObj.asNodeBuffer
      ? zipObj.asNodeBuffer()
      : Buffer.from(zipObj.asBinary(), "binary");
    if (
      relPath.startsWith("social-media/templates/") &&
      relPath.endsWith(".json")
    ) {
      const dest = path.join(smDir(), path.basename(relPath));
      try {
        const tpl = JSON.parse(content.toString("utf8"));
        if (tpl.imagePath)
          tpl.imagePath = path.join(
            smImagesDir(),
            path.basename(tpl.imagePath),
          );
        await fs.writeFile(dest, JSON.stringify(tpl, null, 2), "utf8");
      } catch (_) {
        await fs.writeFile(dest, content);
      }
    } else if (relPath.startsWith("social-media/images/")) {
      await fs.writeFile(
        path.join(smImagesDir(), path.basename(relPath)),
        content,
      );
    }
  }

  // ── Work Logs ──
  const wlDbBuf = readZipFile("worklogs/worklogs.db");
  if (wlDbBuf) {
    if (wlDb) {
      try {
        wlDb.close();
      } catch (_) {}
      wlDb = null;
    }
    await fs.writeFile(WL_DB_PATH, wlDbBuf);
    const photosDir = path.join(app.getPath("userData"), "worklog_photos");
    await fs.mkdir(photosDir, { recursive: true });
    for (const [relPath, zipObj] of Object.entries(zip.files)) {
      if (zipObj.dir || !relPath.startsWith("worklogs/photos/")) continue;
      const content = zipObj.asNodeBuffer
        ? zipObj.asNodeBuffer()
        : Buffer.from(zipObj.asBinary(), "binary");
      await fs.writeFile(path.join(photosDir, path.basename(relPath)), content);
    }
    await initWorkLogsDB();
  }

  // ── Notes ──
  let notesJson = null;
  const notesDbBuf = readZipFile("notes/Notes.db") || readZipFile("Notes.db");
  const notesBuf =
    readZipFile("notes.json") ||
    readZipFile("notes/notes.json") ||
    readZipFile("notes/legacy-localStorage-notes.json");
  if (notesDbBuf) {
    await restoreNotesDbBuffer(notesDbBuf);
  } else if (notesBuf) {
    await restoreNotesJson(notesBuf.toString("utf8"));
  }
  notesJson = JSON.stringify(getNotes());

  return { success: true, notes: notesJson };
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
    icon: APP_ICON_PATH,
    autoHideMenuBar: true,
    show: false,
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  if (process.argv.includes("--dev")) mainWindow.webContents.openDevTools();
}

// ── Export To-Do list as Excel ────────────────────────────────────────────
ipcMain.handle("export-todo-excel", async (event, { todos, rangeLabel }) => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export To-Do List to Excel",
    defaultPath: path.join(app.getPath("documents"), `Todo_Export_${dateStr}.xlsx`),
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });
  if (canceled || !filePath) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MTO Document Generator";
  workbook.created = new Date();

  const NAVY   = "FF1B3A5C";
  const GREEN  = "FF2E7D32";
  const AMBER  = "FFE65100";
  const WHITE  = "FFFFFFFF";
  const LIGHT  = "FFF0F4FA";
  const DONE_BG  = "FFEAF4EA";
  const PEND_BG  = "FFFFF8E7";
  const ODD_BG   = "FFF7F9FC";

  function hdrCell(cell, text) {
    cell.value = text;
    cell.font = { bold: true, color: { argb: WHITE }, size: 11, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: WHITE } },
      bottom: { style: "thin", color: { argb: WHITE } },
      left: { style: "thin", color: { argb: WHITE } },
      right: { style: "thin", color: { argb: WHITE } },
    };
  }

  function thinBorder() {
    const s = { style: "thin", color: { argb: "FFD0D7E2" } };
    return { top: s, bottom: s, left: s, right: s };
  }

  function prettyDate(ds) {
    if (!ds) return "";
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }

  const total     = todos.length;
  const doneCount = todos.filter(t => t.done).length;
  const pending   = total - doneCount;

  // ── Sheet 1: All Tasks ──────────────────────────────────────────────────
  const ws = workbook.addWorksheet("All Tasks");
  ws.views = [{ showGridLines: false }];

  // Title
  ws.mergeCells("A1:F1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "MTO — To-Do List Export";
  titleCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: "Arial" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  ws.mergeCells("A2:F2");
  const subCell = ws.getCell("A2");
  subCell.value = rangeLabel ? `Range: ${rangeLabel}  ·  Generated: ${dateStr}` : `Generated: ${dateStr}`;
  subCell.font = { size: 10, color: { argb: "FF8899AA" }, italic: true, name: "Arial" };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 8;

  // Headers
  const headers = ["#", "Due Date", "Task", "Status", "Done", "Category"];
  const colWidths = [5, 16, 56, 12, 8, 14];
  headers.forEach((h, i) => {
    hdrCell(ws.getCell(4, i + 1), h);
  });
  ws.getRow(4).height = 24;
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Data rows
  todos.forEach((t, i) => {
    const row = ws.getRow(i + 5);
    const fill = t.done ? DONE_BG : (i % 2 === 0 ? ODD_BG : "FFFFFFFF");
    const fgColor = { argb: fill };
    const statusText = t.done ? "Done" : "Pending";
    const statusArgb = t.done ? GREEN : AMBER;

    const vals = [i + 1, prettyDate(t.date), t.text, statusText, t.done ? "Yes" : "No", "General"];
    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.fill = { type: "pattern", pattern: "solid", fgColor };
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: ci === 2 ? "left" : "center", wrapText: ci === 2 };
      if (ci === 3) {
        cell.font = { bold: true, color: { argb: statusArgb }, size: 10, name: "Arial" };
      } else {
        cell.font = { color: { argb: t.done ? "FF888888" : "FF222222" }, size: 10, name: "Arial",
                      strike: t.done && ci === 2 };
      }
    });
    row.height = 20;
  });

  // Summary block
  const sumStart = todos.length + 6;
  ws.getRow(sumStart - 1).height = 10;
  [
    ["Total Tasks", total, "FF222222"],
    ["Completed",   doneCount, GREEN],
    ["Pending",     pending,   AMBER],
    [`Completion`,  `${Math.round(doneCount / (total || 1) * 100)}%`, doneCount === total ? GREEN : AMBER],
  ].forEach(([label, val, argb], i) => {
    const r = sumStart + i;
    const lc = ws.getCell(r, 4);
    const vc = ws.getCell(r, 5);
    lc.value = label;
    lc.font = { bold: true, size: 10, color: { argb: NAVY }, name: "Arial" };
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF5" } };
    lc.border = thinBorder();
    lc.alignment = { horizontal: "right", vertical: "middle" };
    vc.value = val;
    vc.font = { bold: true, size: 10, color: { argb: argb }, name: "Arial" };
    vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FA" } };
    vc.border = thinBorder();
    vc.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(r).height = 18;
  });

  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // ── Sheet 2: Pending ───────────────────────────────────────────────────
  const pendingTodos = todos.filter(t => !t.done);
  const ws2 = workbook.addWorksheet("Pending");
  ws2.views = [{ showGridLines: false }];

  ws2.mergeCells("A1:D1");
  const pt = ws2.getCell("A1");
  pt.value = `Pending Tasks (${pendingTodos.length})`;
  pt.font = { bold: true, size: 14, color: { argb: WHITE }, name: "Arial" };
  pt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB35C00" } };
  pt.alignment = { horizontal: "center", vertical: "middle" };
  ws2.getRow(1).height = 30;

  ["#", "Due Date", "Task", "Overdue?"].forEach((h, i) => hdrCell(ws2.getCell(2, i + 1), h));
  ws2.getRow(2).height = 22;
  [5, 16, 56, 12].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  pendingTodos.forEach((t, i) => {
    const row = ws2.getRow(i + 3);
    const fill = { argb: i % 2 === 0 ? "FFFFF3E0" : "FFFFFFFF" };
    const due = new Date(t.date); due.setHours(0, 0, 0, 0);
    const overdue = due < today;
    const diff = Math.round((due - today) / 86400000);
    const overdueText = overdue ? `Overdue (${Math.abs(diff)}d)` : diff === 0 ? "Today" : `${diff}d left`;
    const overdueArgb = overdue ? "FFCC0000" : diff <= 2 ? AMBER : GREEN;

    [i + 1, prettyDate(t.date), t.text, overdueText].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: fill };
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: ci === 2 ? "left" : "center", wrapText: ci === 2 };
      cell.font = { size: 10, name: "Arial",
        color: { argb: ci === 3 ? overdueArgb : (ci === 1 && overdue ? "FFCC0000" : "FF222222") },
        bold: ci === 3 };
    });
    row.height = 20;
  });
  ws2.views = [{ state: "frozen", ySplit: 2, showGridLines: false }];

  // ── Sheet 3: Completed ─────────────────────────────────────────────────
  const doneTodos = todos.filter(t => t.done);
  const ws3 = workbook.addWorksheet("Completed");
  ws3.views = [{ showGridLines: false }];

  ws3.mergeCells("A1:C1");
  const ct = ws3.getCell("A1");
  ct.value = `Completed Tasks (${doneTodos.length})`;
  ct.font = { bold: true, size: 14, color: { argb: WHITE }, name: "Arial" };
  ct.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
  ct.alignment = { horizontal: "center", vertical: "middle" };
  ws3.getRow(1).height = 30;

  ["#", "Due Date", "Task"].forEach((h, i) => hdrCell(ws3.getCell(2, i + 1), h));
  ws3.getRow(2).height = 22;
  [5, 16, 60].forEach((w, i) => { ws3.getColumn(i + 1).width = w; });

  doneTodos.forEach((t, i) => {
    const row = ws3.getRow(i + 3);
    const fill = { argb: i % 2 === 0 ? "FFEAF4EA" : "FFFFFFFF" };
    [i + 1, prettyDate(t.date), t.text].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: fill };
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: ci === 2 ? "left" : "center", wrapText: ci === 2 };
      cell.font = { size: 10, name: "Arial", color: { argb: ci === 0 ? "FF888888" : "FF666666" },
                    strike: ci === 2 };
    });
    row.height = 20;
  });
  ws3.views = [{ state: "frozen", ySplit: 2, showGridLines: false }];

  await workbook.xlsx.writeFile(filePath);
  return { success: true, path: filePath };
});

// ── Export To-Do list as Word report ─────────────────────────────────────
ipcMain.handle("export-todo-word", async (event, { todos, rangeLabel }) => {
  const dateStr = new Date().toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Maldives",
  });
  const fileDateStr = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export To-Do List to Word",
    defaultPath: path.join(app.getPath("documents"), `Todo_Report_${fileDateStr}.docx`),
    filters: [{ name: "Word Document", extensions: ["docx"] }],
  });
  if (canceled || !filePath) return null;

  const total     = todos.length;
  const doneCount = todos.filter(t => t.done).length;
  const pending   = total - doneCount;
  const pct       = total ? Math.round(doneCount / total * 100) : 0;

  function xmlEsc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function prettyDate(ds) {
    if (!ds) return "";
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }

  // Table borders snippet
  const tblBorders = `
    <w:tblBorders>
      <w:top    w:val="single" w:sz="4" w:space="0" w:color="D0D7E2"/>
      <w:left   w:val="single" w:sz="4" w:space="0" w:color="D0D7E2"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D7E2"/>
      <w:right  w:val="single" w:sz="4" w:space="0" w:color="D0D7E2"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D0D7E2"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D0D7E2"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>
      <w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
    </w:tblCellMar>`;

  function hdrTc(text, w) {
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>
      <w:shd w:val="clear" w:color="auto" w:fill="1B3A5C"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
      <w:t>${xmlEsc(text)}</w:t></w:r></w:p></w:tc>`;
  }

  function dataTc(text, w, opts = {}) {
    const { bold = false, color = "222222", fill = "FFFFFF", center = false, strike = false } = opts;
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>
      <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/></w:tcPr>
      <w:p><w:pPr>${center ? "<w:jc w:val=\"center\"/>" : ""}</w:pPr>
      <w:r><w:rPr>${bold ? "<w:b/>" : ""}${strike ? "<w:strike/>" : ""}
        <w:color w:val="${color}"/><w:sz w:val="18"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
      <w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p></w:tc>`;
  }

  // Summary table (4-row, 2-col)
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const summaryRows = [
    ["Total Tasks", String(total), "222222"],
    ["Completed",   String(doneCount), "2E7D32"],
    ["Pending",     String(pending),   "E65100"],
    ["Completion",  `${pct}%`,         pct >= 75 ? "2E7D32" : "E65100"],
  ].map(([label, val, color]) => `
    <w:tr>
      ${dataTc(label, 2800, { bold: true, color: "1B3A5C", fill: "F0F4FA", center: false })}
      ${dataTc(val,   1400, { bold: true, color, fill: "FFFFFF", center: true })}
    </w:tr>`).join("");

  // Main tasks table
  const COL = [480, 1440, 5040, 1000, 800];
  const mainRows = todos.map((t, i) => {
    const fill = t.done ? "EAF4EA" : (i % 2 === 0 ? "F7F9FC" : "FFFFFF");
    const statusText = t.done ? "Done" : "Pending";
    const statusColor = t.done ? "2E7D32" : "E65100";
    return `<w:tr>
      ${dataTc(String(i + 1),        COL[0], { fill, color: "888888", center: true })}
      ${dataTc(prettyDate(t.date),   COL[1], { fill, color: "444444", center: true })}
      ${dataTc(t.text,               COL[2], { fill, color: t.done ? "888888" : "222222", strike: t.done })}
      ${dataTc(statusText,           COL[3], { fill, color: statusColor, bold: true, center: true })}
      ${dataTc(t.done ? "Yes" : "No",COL[4], { fill, color: statusColor, center: true })}
    </w:tr>`;
  }).join("");

  // Pending tasks table
  const pendingTodos = todos.filter(t => !t.done);
  const COL2 = [480, 1440, 7840];
  const pendingRows = pendingTodos.map((t, i) => {
    const due = new Date(t.date); due.setHours(0, 0, 0, 0);
    const overdue = due < todayD;
    const fill = overdue ? "FFF3F3" : (i % 2 === 0 ? "FFF8E7" : "FFFFFF");
    const dateColor = overdue ? "CC0000" : "444444";
    return `<w:tr>
      ${dataTc(String(i + 1),      COL2[0], { fill, color: "888888", center: true })}
      ${dataTc(prettyDate(t.date), COL2[1], { fill, color: dateColor, center: true })}
      ${dataTc(t.text,             COL2[2], { fill })}
    </w:tr>`;
  }).join("");

  // Completed tasks table
  const doneTodos = todos.filter(t => t.done);
  const COL3 = [480, 1440, 7840];
  const completedRows = doneTodos.map((t, i) => {
    const fill = i % 2 === 0 ? "EAF4EA" : "FFFFFF";
    return `<w:tr>
      ${dataTc(String(i + 1),      COL3[0], { fill, color: "888888", center: true })}
      ${dataTc(prettyDate(t.date), COL3[1], { fill, color: "555555", center: true })}
      ${dataTc(t.text,             COL3[2], { fill, color: "666666", strike: true })}
    </w:tr>`;
  }).join("");

  const rangeNote = rangeLabel
    ? `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/><w:i/>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
          <w:t>Range: ${xmlEsc(rangeLabel)}</w:t></w:r></w:p>`
    : "";

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>

    <!-- ── Title block ── -->
    <w:p><w:pPr><w:spacing w:before="0" w:after="80"/>
        <w:rPr><w:b/><w:sz w:val="52"/><w:color w:val="1B3A5C"/>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="52"/><w:color w:val="1B3A5C"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>MTO To-Do Report</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/><w:i/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>Generated: ${xmlEsc(dateStr)}</w:t></w:r></w:p>

    ${rangeNote}

    <w:p><w:pPr><w:spacing w:before="200" w:after="360"/>
      <w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="1B3A5C"/></w:pBdr>
    </w:pPr></w:p>

    <!-- ── 1. Summary ── -->
    <w:p><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1B3A5C"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>1. Summary</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t xml:space="preserve">This report covers ${total} to-do item${total !== 1 ? "s" : ""}. Of these, ${doneCount} ${doneCount === 1 ? "has" : "have"} been completed and ${pending} remain pending, giving a completion rate of ${pct}%.</w:t></w:r></w:p>

    <w:tbl>
      <w:tblPr><w:tblW w:w="4200" w:type="dxa"/>${tblBorders}</w:tblPr>
      ${summaryRows}
    </w:tbl>

    <!-- ── 2. All Tasks ── -->
    <w:p><w:pPr><w:spacing w:before="480" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1B3A5C"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>2. All Tasks (${total})</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>Full list sorted by due date. Completed tasks appear in strikethrough.</w:t></w:r></w:p>

    <w:tbl>
      <w:tblPr><w:tblW w:w="8760" w:type="dxa"/>${tblBorders}</w:tblPr>
      <w:tr>${hdrTc("#", COL[0])}${hdrTc("Due Date", COL[1])}${hdrTc("Task", COL[2])}${hdrTc("Status", COL[3])}${hdrTc("Done", COL[4])}</w:tr>
      ${mainRows}
    </w:tbl>

    <!-- ── 3. Pending ── -->
    <w:p><w:pPr><w:spacing w:before="480" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1B3A5C"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>3. Pending Tasks (${pending})</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>Tasks not yet completed. Overdue items are highlighted.</w:t></w:r></w:p>

    <w:tbl>
      <w:tblPr><w:tblW w:w="9760" w:type="dxa"/>${tblBorders}</w:tblPr>
      <w:tr>${hdrTc("#", COL2[0])}${hdrTc("Due Date", COL2[1])}${hdrTc("Task", COL2[2])}</w:tr>
      ${pendingRows || `<w:tr>${dataTc("No pending tasks.", 9760, { color: "888888" })}</w:tr>`}
    </w:tbl>

    <!-- ── 4. Completed ── -->
    <w:p><w:pPr><w:spacing w:before="480" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1B3A5C"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>4. Completed Tasks (${doneCount})</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>Tasks marked as done.</w:t></w:r></w:p>

    <w:tbl>
      <w:tblPr><w:tblW w:w="9760" w:type="dxa"/>${tblBorders}</w:tblPr>
      <w:tr>${hdrTc("#", COL3[0])}${hdrTc("Due Date", COL3[1])}${hdrTc("Task", COL3[2])}</w:tr>
      ${completedRows || `<w:tr>${dataTc("No completed tasks.", 9760, { color: "888888" })}</w:tr>`}
    </w:tbl>

    <w:p><w:pPr><w:spacing w:before="600" w:after="0"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="AAAAAA"/><w:i/>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
        <w:t>— End of Report —</w:t></w:r></w:p>

    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("word/document.xml", docXml);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  const buffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(filePath, buffer);
  return { success: true, path: filePath };
});

// ============================================================================
// DYNAMIC WALLPAPER MODULE
// ----------------------------------------------------------------------------
// Renders a calm, minimalist desktop wallpaper showing this week's calendar
// (with holidays/observances) plus today's and tomorrow's to-do items, then
// sets it as the OS desktop background. Runs entirely in the main process so
// the 5-minute scheduler keeps working even while the window is hidden/minimized.
//
// Data flow:
//   1. Main asks the renderer for fresh data ("wallpaper:request-data"), OR
//      the renderer asks for itself (manual "Refresh Wallpaper" button).
//   2. Renderer (wallpaper.js) collects calendar/holiday/to-do data using the
//      *existing* calendar.js helpers + cal-todo-get-all, and invokes
//      "wallpaper-generate" with the assembled JSON payload.
//   3. Main renders that payload into a hidden BrowserWindow loaded with a
//      small, self-contained HTML template (wallpaper-render.html), captures
//      it as a PNG, and applies it as the system wallpaper.
// ============================================================================

const WALLPAPER_DIR = path.join(app.getPath("userData"), "wallpaper");
// How often the main process pings the renderer to check for fresh data.
// The renderer itself only actually re-renders/re-applies the wallpaper when
// today's or tomorrow's to-do items (or the date) have changed since the
// last successful generation — see wcComputeTodoFingerprint() in wallpaper.js.
const WALLPAPER_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WALLPAPER_IMAGE_PATH = path.join(WALLPAPER_DIR, "wallpaper.png");
const WALLPAPER_HTML_PATH = path.join(
  __dirname,
  "renderer",
  "wallpaper-render.html",
);
const WALLPAPER_PRELOAD_PATH = path.join(
  __dirname,
  "renderer",
  "wallpaper-preload.js",
);

let wallpaperRefreshTimer = null;
let wallpaperGenerationInFlight = false; // guards against overlapping pipeline runs

async function ensureWallpaperDir() {
  await fs.mkdir(WALLPAPER_DIR, { recursive: true });
}

/**
 * Renders the given data payload into a hidden, screen-sized BrowserWindow
 * and captures it as a PNG saved to WALLPAPER_IMAGE_PATH.
 * @param {Object} payload - Wallpaper content assembled by the renderer.
 * @returns {Promise<string>} Path to the generated PNG.
 */
async function renderWallpaperImage(payload) {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;

  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    icon: APP_ICON_PATH,
    transparent: false,
    backgroundColor: "#eef2f0",
    webPreferences: {
      preload: WALLPAPER_PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  try {
    win.webContents.setBackgroundThrottling(false);
    await win.loadFile(WALLPAPER_HTML_PATH);

    // Wait for the template to report it has finished painting (it sends
    // 'wallpaper-render-ready' once data is applied and fonts are loaded),
    // with a safety timeout in case something in the template goes wrong.
    const renderReady = new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        ipcMain.removeListener("wallpaper-render-ready", finish);
        resolve();
      };
      ipcMain.once("wallpaper-render-ready", finish);
      setTimeout(finish, 6000);
    });

    win.webContents.send("wallpaper:data", { ...payload, width, height });
    await renderReady;

    // One extra tick so the final paint after layout/fonts has settled.
    await new Promise((resolve) => setTimeout(resolve, 150));

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();
    await ensureWallpaperDir();
    await fs.writeFile(WALLPAPER_IMAGE_PATH, pngBuffer);
    return WALLPAPER_IMAGE_PATH;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/** Sets the desktop wallpaper on Windows via SystemParametersInfo (user32.dll). */
async function setSystemWallpaperWindows(imagePath) {
  const ps1Path = path.join(os.tmpdir(), "mto_set_wallpaper.ps1");
  const psContent = `
param([string]$ImagePath)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MtoWallpaperSetter {
  [DllImport("user32.dll", CharSet=CharSet.Auto)]
  public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[MtoWallpaperSetter]::SystemParametersInfo(20, 0, $ImagePath, 3) | Out-Null
`;
  await fs.writeFile(ps1Path, psContent, "utf8");
  await new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        ps1Path,
        "-ImagePath",
        imagePath,
      ],
      (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      },
    );
  });
}

/** Sets the desktop wallpaper on macOS via Finder/AppleScript. */
async function setSystemWallpaperMac(imagePath) {
  const script = `tell application "Finder" to set desktop picture to POSIX file "${imagePath}"`;
  await new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

/** Best-effort desktop wallpaper setter for Linux (GNOME/most gsettings-based DEs). */
async function setSystemWallpaperLinux(imagePath) {
  const uri = `file://${imagePath}`;
  await new Promise((resolve, reject) => {
    execFile(
      "gsettings",
      ["set", "org.gnome.desktop.background", "picture-uri", uri],
      (err, stdout, stderr) => {
        // Dark-mode variant is best-effort; ignore failures (key may not exist).
        execFile(
          "gsettings",
          ["set", "org.gnome.desktop.background", "picture-uri-dark", uri],
          () => {},
        );
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      },
    );
  });
}

async function setSystemWallpaper(imagePath) {
  if (process.platform === "win32") return setSystemWallpaperWindows(imagePath);
  if (process.platform === "darwin") return setSystemWallpaperMac(imagePath);
  return setSystemWallpaperLinux(imagePath);
}

/**
 * Full pipeline: render the data payload to an image, set it as the system
 * wallpaper, and persist status (used by both manual and scheduled refreshes).
 */
async function runWallpaperPipeline(payload) {
  if (wallpaperGenerationInFlight) {
    return { success: false, error: "A wallpaper refresh is already in progress." };
  }
  wallpaperGenerationInFlight = true;
  try {
    const imagePath = await renderWallpaperImage(payload || {});
    await setSystemWallpaper(imagePath);
    settings.wallpaper.lastGeneratedAt = new Date().toISOString();
    settings.wallpaper.lastError = null;
    settings.wallpaper.lastImagePath = imagePath;
    await saveConfig();
    return { success: true, imagePath };
  } catch (err) {
    console.error("[Wallpaper] Pipeline failed:", err);
    settings.wallpaper.lastError = err.message;
    try {
      await saveConfig();
    } catch (_) {}
    return { success: false, error: err.message };
  } finally {
    wallpaperGenerationInFlight = false;
  }
}

/** Asks the renderer to check for fresh data and submit it for generation (renderer skips the actual re-render if today's/tomorrow's to-dos haven't changed). */
function requestWallpaperRefresh() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("wallpaper:request-data");
  }
}

/** (Re)starts the 5-minute background check timer based on current settings. Idempotent. */
function scheduleWallpaperRefresh() {
  if (wallpaperRefreshTimer) {
    clearInterval(wallpaperRefreshTimer);
    wallpaperRefreshTimer = null;
  }
  if (!settings.wallpaper || !settings.wallpaper.enabled) return;
  wallpaperRefreshTimer = setInterval(
    requestWallpaperRefresh,
    WALLPAPER_REFRESH_INTERVAL_MS,
  );
}

ipcMain.handle("wallpaper-get-state", () => ({ ...settings.wallpaper }));

ipcMain.handle("wallpaper-set-enabled", async (event, enabled) => {
  settings.wallpaper.enabled = !!enabled;
  await saveConfig();
  scheduleWallpaperRefresh();
  return { ...settings.wallpaper };
});

/** Renderer-submitted data → run the full render/set-wallpaper pipeline. */
ipcMain.handle("wallpaper-generate", async (event, payload) => {
  return await runWallpaperPipeline(payload);
});

// ============================================================================

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await loadConfig();
  await initSQLite(getDbPath());
  await initNotesStore(path.dirname(getDbPath()));
  registerNotesHandlers();
  await initWorkLogsDB();
  await migrateFromJSONIfNeeded();
  await fs.mkdir(settings.templatesDir, { recursive: true });
  await fs.mkdir(settings.outputsDir, { recursive: true });
  process.env.ELECTRON_IS_DEV = "false";
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "moshradix/mosh-forms-app",
    },
    updateInterval: "1 hour",
    logger: require("electron-log"),
  });
  registerSyncHandlers(db, wlDb);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Dynamic Wallpaper: resume the periodic scheduler if it was left enabled,
  // and do one refresh shortly after launch so the wallpaper isn't stale
  // for up to an hour after the app starts.
  scheduleWallpaperRefresh();
  if (settings.wallpaper && settings.wallpaper.enabled) {
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(requestWallpaperRefresh, 3000);
    });
  }
});

app.on("before-quit", () => {
  if (wallpaperRefreshTimer) {
    clearInterval(wallpaperRefreshTimer);
    wallpaperRefreshTimer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    if (wlDb) wlDb.close();
    closeNotesStore();
    app.quit();
  }
});
