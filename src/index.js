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
// Safe optional require — app works normally even if package not yet installed
let ImageModule = null;
try {
  ImageModule = require("docxtemplater-image-module-free");
} catch (_) {}
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

// Work Logs — always stored in a fixed, separate database (not user-configurable)
let wlDb = null;
const WL_DB_PATH = path.join(app.getPath("userData"), "worklogs.db");

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
  `);

  // Schema migrations for existing databases
  const wlCols = wlDb.exec("PRAGMA table_info(work_logs)");
  const wlColNames = wlCols.length ? wlCols[0].values.map(r => r[1]) : [];
  if (!wlColNames.includes("tags")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN tags TEXT DEFAULT '[]'");
    console.log("[WorkLogs DB] Added 'tags' column");
  }
  if (!wlColNames.includes("photoPath")) {
    wlDb.exec("ALTER TABLE work_logs ADD COLUMN photoPath TEXT");
    console.log("[WorkLogs DB] Added 'photoPath' column");
  }

  // Ensure photos directory exists
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");
  try { await fs.mkdir(photosDir, { recursive: true }); } catch (_) {}

  await saveWorkLogsDB();
  console.log("[WorkLogs DB] Initialized at:", WL_DB_PATH);
}

async function saveWorkLogsDB() {
  const data = wlDb.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(WL_DB_PATH, buffer);
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

// ========== Database Operations ==========
function getTemplates() {
  const rows = db.exec(`
    SELECT t.*, 
           (SELECT COUNT(*) FROM data_records WHERE templateId = t.id AND printed = 1) as recordCount 
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
    recordCount: row[14] || 0,
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
    return { type: "image", isRTL: false, autoComputed: false, paragraphMode: false };
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
    return { type: "number", isRTL: false, autoComputed: false, paragraphMode: false };
  }

  // ── Boolean: bool_ prefix ────────────────────────────────────────────────
  if (k.startsWith("bool_")) {
    return { type: "boolean", isRTL: false, autoComputed: false, paragraphMode: false };
  }

  // ── Dates: date_ prefix exactly ──────────────────────────────────────────
  if (k.startsWith("date_")) {
    const isRTL = k.endsWith("_divehi") || k.includes("_divehi_");
    return { type: "date", isRTL, autoComputed: false, paragraphMode: false };
  }

  // ── Ranges: range_ prefix ────────────────────────────────────────────────
  if (k === "range_start_date") {
    return { type: "date", isRTL: false, autoComputed: false, paragraphMode: false };
  }
  if (k.startsWith("range_")) {
    return { type: "string", isRTL: false, autoComputed: true, paragraphMode: false };
  }

  // ── Metadata: meta_ prefix — always auto-computed ────────────────────────
  if (k.startsWith("meta_")) {
    return { type: "string", isRTL: false, autoComputed: true, paragraphMode: false };
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
  const isLegacyDate = /^date[_.]/.test(k) || /[_.]date$/.test(k) || /[_.]date[_.]/.test(k);
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
    "person_", "org_", "date_", "range_", "text_", "num_", "bool_", "img_", "meta_",
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
    isRTL: existingField.isRTL !== undefined ? existingField.isRTL : inferred.isRTL,
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
  const newRangeWeekdayPattern = /^range_weekday_(?:english|divehi)(?:_short)?(?:_[a-z]{3})?_(\d+)$/i;

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
    await fs.access(template.filePath);
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
        "ޖެނުއަރީ","ފެބްރުއަރީ","މާރޗް","އެޕްރީލް","މެއި","ޖޫން",
        "ޖުލައި","އޯގަސްޓް","ސެޕްޓެމްބަރ","އޮކްޓޯބަރ","ނޮވެމްބަރ","ޑިސެމްބަރ",
      ];
      const ENGLISH_MONTHS_META = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December",
      ];
      const [yr, mo, dy] = mvtDateStr.split("-").map(Number);
      const metaEn = `${dy} ${ENGLISH_MONTHS_META[mo - 1]} ${yr}`;
      const metaDv = `${dy} ${DIVEHI_MONTHS_META[mo - 1]} ${yr}`;

      formData["meta_generated_date"]        = formData["meta_generated_date"]        || metaEn;
      formData["meta_generated_date_divehi"] = formData["meta_generated_date_divehi"] || metaDv;
      formData["meta_generated_time"]        = formData["meta_generated_time"]        || `${pad(mvtNow.getHours())}:${pad(mvtNow.getMinutes())}`;
      formData["meta_template_name"]         = formData["meta_template_name"]         || template.name || "";
    } catch (_metaErr) {
      // Non-critical — generation continues without meta fields
      console.warn("[meta] Failed to populate meta_ fields:", _metaErr.message);
    }

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
  phone: "+960 999-0166",
  repo: "https://github.com/MoshRadix/mosh-forms-app",
  quote: "Simplify document generation, one form at a time.",
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
    filters: [
      { name: "CSV / Excel files", extensions: ["csv", "xlsx"] },
    ],
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
      else if (typeof v === "object" && v.text) v = v.text; // rich text
      else if (typeof v === "object" && v.result !== undefined) v = v.result; // formula
      else v = String(v);
      vals.push(v);
    });
    rawRows.push(vals);
  });

  if (rawRows.length < 2) return { columns: [], rows: [] };

  const maxCols = Math.max(...rawRows.map((r) => r.length));
  const columns = rawRows[0].map((h, i) => (h !== "" ? String(h) : `Column${i + 1}`));
  const rows = rawRows.slice(1).map((vals) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = i < vals.length ? String(vals[i] || "") : ""; });
    return obj;
  });

  return { columns, rows };
});

// ── Batch generation: generate one document per row ──────────────────────────
ipcMain.handle(
  "batch-generate-documents",
  async (event, { templateId, rows, outputFormat = "docx" }) => {
    const template = getTemplateById(templateId);
    if (!template) throw new Error("Template not found");
    await fs.access(template.filePath);

    const DIVEHI_MONTHS_BATCH = [
      "ޖެނުއަރީ","ފެބްރުއަރީ","މާރޗް","އެޕްރީލް","މެއި","ޖޫން",
      "ޖުލައި","އޯގަސްޓް","ސެޕްޓެމްބަރ","އޮކްޓޯބަރ","ނޮވެމްބަރ","ޑިސެމްބަރ",
    ];
    const ENGLISH_MONTHS_BATCH = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
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
          formData["meta_generated_date"]        = formData["meta_generated_date"]        || metaEn;
          formData["meta_generated_date_divehi"] = formData["meta_generated_date_divehi"] || metaDv;
          formData["meta_generated_time"]        = formData["meta_generated_time"]        || `${pad(mvtNow.getHours())}:${pad(mvtNow.getMinutes())}`;
          formData["meta_template_name"]         = formData["meta_template_name"]         || template.name || "";
        } catch (_) {}

        // ── Output path ────────────────────────────────────────────────
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rowLabel = String(i + 1).padStart(4, "0");
        const outputFileName = `${template.name}_batch_${rowLabel}_${timestamp}.${outputFormat}`;
        const outputPath = path.join(getOutputsDir(), outputFileName);

        if (template.type === "word") {
          await generateWordDocument(template.filePath, outputPath, formData);
        } else if (template.type === "excel") {
          await generateExcelDocument(template.filePath, outputPath, formData);
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

// ========== Watermark Tool ==========
ipcMain.handle("choose-output-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose folder to save watermarked images",
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("save-watermarked-image", async (event, { outputDirectory, outputFileName, base64Data }) => {
  if (!outputDirectory || !outputFileName || !base64Data) {
    throw new Error("save-watermarked-image: missing required fields");
  }
  const outputDir = path.join(outputDirectory, "watermarked");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFileName);
  const buffer = Buffer.from(base64Data, "base64");
  await fs.writeFile(outputPath, buffer);
  return { success: true, outputPath };
});

// ========== Work Logs IPC Handlers ==========

ipcMain.handle("add-work-log", async (event, { task, notes, createdAt, tags, photoPath }) => {
  const id = uuidv4();
  wlDb.run(
    "INSERT INTO work_logs (id, task, notes, createdAt, tags, photoPath) VALUES (?, ?, ?, ?, ?, ?)",
    [id, task || "", notes || "", createdAt || new Date().toISOString(), tags || "[]", photoPath || null]
  );
  await saveWorkLogsDB();
  const rows = wlDb.exec(
    "SELECT id, task, notes, createdAt, tags, photoPath FROM work_logs WHERE id = ?",
    [id]
  );
  if (!rows.length || !rows[0].values.length) return { id, task, notes, createdAt, tags, photoPath };
  const [rid, rtask, rnotes, rca, rtags, rphoto] = rows[0].values[0];
  return { id: rid, task: rtask, notes: rnotes, createdAt: rca, tags: rtags, photoPath: rphoto };
});

ipcMain.handle("get-work-logs", async () => {
  const rows = wlDb.exec(
    "SELECT id, task, notes, createdAt, tags, photoPath FROM work_logs ORDER BY createdAt DESC"
  );
  if (!rows.length) return [];
  return rows[0].values.map(([id, task, notes, createdAt, tags, photoPath]) => ({
    id, task, notes, createdAt, tags: tags || "[]", photoPath: photoPath || null,
  }));
});

ipcMain.handle("delete-work-log", async (event, id) => {
  wlDb.run("DELETE FROM work_logs WHERE id = ?", [id]);
  await saveWorkLogsDB();
  return true;
});

ipcMain.handle("export-work-logs-excel", async (event, { rows }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export Work Logs to Excel",
    defaultPath: path.join(
      app.getPath("documents"),
      `WorkLogs_${new Date().toISOString().slice(0, 10)}.xlsx`
    ),
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });
  if (canceled || !filePath) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MTO Document Generator";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Work Logs");
  sheet.columns = [
    { header: "No.",              key: "no",    width: 6  },
    { header: "Date",             key: "date",  width: 14 },
    { header: "Time (MVT)",       key: "time",  width: 14 },
    { header: "Task Description", key: "task",  width: 50 },
    { header: "Tags",             key: "tags",  width: 24 },
    { header: "Notes",            key: "notes", width: 40 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A6B5A" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB0C8BC" } } };
  });
  headerRow.height = 22;

  rows.forEach((r, idx) => {
    const row = sheet.addRow(r);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F2" } };
      }
    });
    row.height = 18;
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  await workbook.xlsx.writeFile(filePath);
  return { success: true, path: filePath };
});

// ── Save a work log photo ──────────────────────────────────────────────────
ipcMain.handle("save-work-log-photo", async (event, { dataUrl, fileName, mimeType }) => {
  const photosDir = path.join(app.getPath("userData"), "worklog_photos");
  try { await fs.mkdir(photosDir, { recursive: true }); } catch (_) {}
  const ext = fileName ? path.extname(fileName) : ".jpg";
  const outName = `${uuidv4()}${ext}`;
  const outPath = path.join(photosDir, outName);
  // dataUrl: "data:image/jpeg;base64,..."
  const base64 = dataUrl.split(",")[1];
  await fs.writeFile(outPath, Buffer.from(base64, "base64"));
  return { path: outPath };
});

// ── Read a work log photo as data URL ────────────────────────────────────
ipcMain.handle("get-work-log-photo", async (event, photoPath) => {
  if (!photoPath) return null;
  try {
    const buf = await fs.readFile(photoPath);
    const ext = path.extname(photoPath).toLowerCase().replace(".", "");
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (_) { return null; }
});

// ── Monthly Word export ───────────────────────────────────────────────────
ipcMain.handle("export-work-logs-word", async (event, { rows, month, officer }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save Monthly Report",
    defaultPath: path.join(
      app.getPath("documents"),
      `WorkLog_Report_${month.replace(/\s/g, "_")}.docx`
    ),
    filters: [{ name: "Word Document", extensions: ["docx"] }],
  });
  if (canceled || !filePath) return null;

  // Build a clean OOXML docx from scratch
  const tableRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? "F6F8F7" : "FFFFFF";
    return `
    <w:tr>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${r.no}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${r.date}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="1200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${r.time}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${(r.task || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${(r.tags || "").replace(/&/g,"&amp;").replace(/</g,"&lt;")}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${(r.notes || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</w:t></w:r></w:p></w:tc>
    </w:tr>`;
  }).join("");

  const headerCells = ["#","Date","Time (MVT)","Task Description","Tags","Notes"].map(h =>
    `<w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="4A6B5A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t>${h}</w:t></w:r></w:p></w:tc>`
  ).join("");

  const officerLine = officer
    ? `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">Officer: ${officer.replace(/&/g,"&amp;")}</w:t></w:r></w:p>`
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
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>${month.replace(/&/g,"&amp;")}</w:t></w:r>
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

// ── Monthly styled Excel export ───────────────────────────────────────────
ipcMain.handle("export-work-logs-monthly-excel", async (event, { rows, month, officer }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save Monthly Excel Report",
    defaultPath: path.join(
      app.getPath("documents"),
      `WorkLog_Report_${month.replace(/\s/g, "_")}.xlsx`
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
  sheet.getRow(dataStartRow).values = ["No.", "Date", "Time (MVT)", "Task Description", "Tags", "Notes"];
  sheet.getRow(dataStartRow).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A6B5A" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  sheet.getRow(dataStartRow).height = 22;

  sheet.columns = [
    { key: "no",    width: 6  },
    { key: "date",  width: 14 },
    { key: "time",  width: 14 },
    { key: "task",  width: 52 },
    { key: "tags",  width: 22 },
    { key: "notes", width: 40 },
  ];

  rows.forEach((r, idx) => {
    const rowIdx = dataStartRow + 1 + idx;
    const row = sheet.getRow(rowIdx);
    row.values = [r.no, r.date, r.time, r.task, r.tags, r.notes];
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F2" } };
      }
    });
    row.height = 18;
  });

  sheet.views = [{ state: "frozen", ySplit: dataStartRow }];

  // Summary row
  const sumRow = sheet.getRow(dataStartRow + rows.length + 2);
  sumRow.getCell(1).value = `Total: ${rows.length} entries`;
  sumRow.getCell(1).font = { bold: true, italic: true, color: { argb: "FF6B7C73" }, size: 10 };

  await workbook.xlsx.writeFile(filePath);
  return { success: true, path: filePath };
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
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    if (wlDb) wlDb.close();
    app.quit();
  }
});