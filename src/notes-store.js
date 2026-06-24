/**
 * @file notes-store.js
 * SQLite-backed notes storage with localStorage migration, write-through cache,
 * background flushing, and cloud-sync helpers.
 */

const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const initSqlJs = require("sql.js");
const { v4: uuidv4 } = require("uuid");

const NOTES_DB_FILE = "Notes.db";
const FLUSH_DELAY_MS = 1200;

let SQL = null;
let notesDb = null;
let notesDbPath = null;
let flushTimer = null;
let handlersRegistered = false;

const notesCache = new Map();
const dirtyIds = new Set();
const deletedIds = new Set();
let dbAvailable = false;

async function initNotesStore(dbFolder) {
  const folder = dbFolder || process.cwd();
  await fs.mkdir(folder, { recursive: true });
  notesDbPath = path.join(folder, NOTES_DB_FILE);

  SQL = SQL || await initSqlJs();
  if (notesDb) notesDb.close();

  let fileData = null;
  try {
    fileData = await fs.readFile(notesDbPath);
  } catch (_) {}

  notesDb = new SQL.Database(fileData);
  dbAvailable = true;
  ensureSchema();
  loadCacheFromDb();
  await persistNotesDb();

  console.log("[Notes DB] Initialized at:", notesDbPath);
}

function registerNotesHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  ipcMain.handle("notes-init", async (_event, legacyNotes = []) => {
    await migrateLegacyNotes(legacyNotes);
    return getNotes();
  });
  ipcMain.handle("notes-sync-legacy", async (_event, legacyNotes = []) => {
    return migrateLegacyNotes(legacyNotes);
  });
  ipcMain.handle("notes-add", async (_event, note) => addNote(note));
  ipcMain.handle("notes-update", async (_event, note) => updateNote(note));
  ipcMain.handle("notes-delete", async (_event, id) => deleteNote(id));
  ipcMain.handle("notes-get", async () => getNotes());
  ipcMain.handle("notes-flush", async () => flushNotesCache());
  ipcMain.handle("notes-sync", async () => syncNotes());
}

function ensureSchema() {
  if (!notesDb) return;

  notesDb.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      client_id TEXT,
      remote_id TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      color TEXT NOT NULL DEFAULT '#1c1408',
      notion_page_id TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_sync_status ON notes(sync_status);
  `);

  const cols = tableColumns("notes");
  const migrations = [
    ["sync_status", "ALTER TABLE notes ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'"],
    ["client_id", "ALTER TABLE notes ADD COLUMN client_id TEXT"],
    ["remote_id", "ALTER TABLE notes ADD COLUMN remote_id TEXT"],
    ["language", "ALTER TABLE notes ADD COLUMN language TEXT NOT NULL DEFAULT 'en'"],
    ["color", "ALTER TABLE notes ADD COLUMN color TEXT NOT NULL DEFAULT '#1c1408'"],
    ["notion_page_id", "ALTER TABLE notes ADD COLUMN notion_page_id TEXT"],
    ["is_deleted", "ALTER TABLE notes ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0"],
  ];

  for (const [column, sql] of migrations) {
    if (!cols.includes(column)) notesDb.exec(sql);
  }
}

function tableColumns(tableName) {
  try {
    const rows = notesDb.exec(`PRAGMA table_info(${tableName})`);
    return rows.length ? rows[0].values.map((row) => row[1]) : [];
  } catch (_) {
    return [];
  }
}

function loadCacheFromDb() {
  notesCache.clear();
  for (const row of allRows("SELECT * FROM notes ORDER BY updated_at DESC")) {
    const note = dbRowToNote(row);
    notesCache.set(note.id, note);
    if (note.isDeleted) deletedIds.add(note.id);
  }
}

async function migrateLegacyNotes(legacyNotes = []) {
  const notes = Array.isArray(legacyNotes) ? legacyNotes.map(normalizeNote) : [];
  if (!notes.length) return { success: true, imported: 0, total: notesCache.size };

  let imported = 0;
  for (const incoming of notes) {
    const existing = findCachedNote(incoming);
    if (!existing) {
      notesCache.set(incoming.id, { ...incoming, syncStatus: incoming.syncStatus || "pending" });
      dirtyIds.add(incoming.id);
      imported += 1;
      continue;
    }

    const existingTime = Date.parse(existing.updatedAt || existing.createdAt || 0) || 0;
    const incomingTime = Date.parse(incoming.updatedAt || incoming.createdAt || 0) || 0;
    if (incomingTime > existingTime) {
      notesCache.set(existing.id, {
        ...existing,
        ...incoming,
        id: existing.id,
        clientId: existing.clientId || incoming.clientId || incoming.id,
        syncStatus: existing.syncStatus === "synced" ? "pending" : existing.syncStatus || "pending",
      });
      dirtyIds.add(existing.id);
      imported += 1;
    }
  }

  await flushNotesCache();
  return { success: true, imported, total: notesCache.size };
}

function addNote(note = {}) {
  const normalized = normalizeNote(note);
  normalized.syncStatus = normalized.syncStatus || "pending";
  normalized.isDeleted = false;
  notesCache.set(normalized.id, normalized);
  dirtyIds.add(normalized.id);
  deletedIds.delete(normalized.id);
  scheduleFlush();
  return normalized;
}

function updateNote(note = {}) {
  const id = String(note.id || "").trim();
  if (!id) return addNote(note);

  const existing = notesCache.get(id) || normalizeNote({ id });
  const updated = normalizeNote({
    ...existing,
    ...note,
    id,
    clientId: existing.clientId || note.clientId || id,
    createdAt: existing.createdAt || note.createdAt,
    updatedAt: note.updatedAt || new Date().toISOString(),
    syncStatus: note.syncStatus || (existing.syncStatus === "synced" ? "pending" : existing.syncStatus || "pending"),
  });
  notesCache.set(id, updated);
  dirtyIds.add(id);
  scheduleFlush();
  return updated;
}

function deleteNote(id) {
  const key = String(id || "").trim();
  if (!key) return { success: false };
  const existing = notesCache.get(key);
  if (!existing) return { success: true };

  const deleted = normalizeNote({
    ...existing,
    isDeleted: true,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });
  notesCache.set(key, deleted);
  dirtyIds.add(key);
  deletedIds.add(key);
  scheduleFlush();
  return { success: true };
}

function getNotes({ includeDeleted = false } = {}) {
  const notes = Array.from(notesCache.values())
    .filter((note) => includeDeleted || !note.isDeleted)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return notes.map(noteToRenderer);
}

function getNotesForSync(rendererNotes) {
  if (Array.isArray(rendererNotes) && rendererNotes.length) {
    void migrateLegacyNotes(rendererNotes).catch((err) => {
      console.warn("[Notes DB] Legacy sync merge failed:", err.message);
    });
  }

  return Array.from(notesCache.values())
    .filter((note) => note.syncStatus !== "synced" || note.remoteId == null || note.isDeleted)
    .map(noteToRenderer);
}

function applyServerNotes(serverNotes = []) {
  let changed = 0;
  for (const serverNote of serverNotes) {
    if (!serverNote) continue;

    const incoming = serverToLocalNote(serverNote);
    const existing = findCachedNote(incoming);

    if (serverNote.isDeleted) {
      if (existing) {
        notesCache.set(existing.id, {
          ...existing,
          remoteId: serverNote.id || existing.remoteId,
          isDeleted: true,
          syncStatus: "synced",
          updatedAt: incoming.updatedAt,
        });
        dirtyIds.add(existing.id);
        deletedIds.add(existing.id);
        changed += 1;
      }
      continue;
    }

    if (!existing) {
      notesCache.set(incoming.id, { ...incoming, syncStatus: "synced" });
      dirtyIds.add(incoming.id);
      changed += 1;
      continue;
    }

    const existingTime = Date.parse(existing.updatedAt || existing.createdAt || 0) || 0;
    const incomingTime = Date.parse(incoming.updatedAt || incoming.createdAt || 0) || 0;
    if (incomingTime >= existingTime) {
      notesCache.set(existing.id, {
        ...existing,
        ...incoming,
        id: existing.id,
        clientId: existing.clientId || incoming.clientId || existing.id,
        remoteId: incoming.remoteId || existing.remoteId,
        language: serverNote.language === "dv" ? "dv" : existing.language || incoming.language || "en",
        syncStatus: "synced",
      });
      dirtyIds.add(existing.id);
      changed += 1;
    }
  }

  if (changed) scheduleFlush(0);
  return getNotes();
}

function markNotesSynced(syncResult = {}) {
  const acknowledgements = [
    ...(syncResult.notes?.created || []),
    ...(syncResult.notes?.updated || []),
  ];
  const byClientId = new Map();
  const syncedRemoteIds = new Set();

  for (const ack of acknowledgements) {
    if (!ack) continue;
    if (ack.clientId) byClientId.set(String(ack.clientId), ack);
    if (ack.id || ack.remoteId) syncedRemoteIds.add(ack.id || ack.remoteId);
  }

  for (const note of notesCache.values()) {
    const ack = byClientId.get(String(note.clientId || note.id));
    if (
      note.syncStatus !== "pending" &&
      note.syncStatus !== "failed" &&
      !syncedRemoteIds.has(note.remoteId) &&
      !ack
    ) {
      continue;
    }

    const updated = {
      ...note,
      syncStatus: "synced",
      remoteId: ack?.id || ack?.remoteId || note.remoteId,
    };
    notesCache.set(note.id, updated);
    dirtyIds.add(note.id);
  }

  scheduleFlush(0);
}

function markPendingNotesFailed() {
  for (const note of notesCache.values()) {
    if (note.syncStatus === "pending") {
      notesCache.set(note.id, { ...note, syncStatus: "failed" });
      dirtyIds.add(note.id);
    }
  }
  scheduleFlush();
}

async function syncNotes() {
  await flushNotesCache();
  return { success: true, notes: getNotesForSync() };
}

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushNotesCache().catch((err) => {
      dbAvailable = false;
      console.error("[Notes DB] Background flush failed:", err);
    });
  }, delay);
}

async function flushNotesCache() {
  if (!notesDb || !dbAvailable || !dirtyIds.size) {
    return { success: dbAvailable, saved: 0, fallback: !dbAvailable };
  }

  const ids = Array.from(dirtyIds);
  notesDb.exec("BEGIN TRANSACTION");
  try {
    for (const id of ids) {
      const note = notesCache.get(id);
      if (!note) continue;
      notesDb.run(
        `INSERT INTO notes (
          id, title, content, created_at, updated_at, sync_status,
          client_id, remote_id, language, color, notion_page_id, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          sync_status = excluded.sync_status,
          client_id = excluded.client_id,
          remote_id = excluded.remote_id,
          language = excluded.language,
          color = excluded.color,
          notion_page_id = excluded.notion_page_id,
          is_deleted = excluded.is_deleted`,
        [
          note.id,
          note.title,
          note.content,
          note.createdAt,
          note.updatedAt,
          note.syncStatus || "pending",
          note.clientId || note.id,
          note.remoteId || null,
          note.language || "en",
          note.color || "#1c1408",
          note.notionPageId || null,
          note.isDeleted ? 1 : 0,
        ]
      );
    }
    notesDb.exec("COMMIT");
    await persistNotesDb();
    for (const id of ids) dirtyIds.delete(id);
    return { success: true, saved: ids.length, path: notesDbPath };
  } catch (err) {
    try { notesDb.exec("ROLLBACK"); } catch (_) {}
    dbAvailable = false;
    throw err;
  }
}

async function persistNotesDb() {
  if (!notesDb || !notesDbPath) return;
  const data = notesDb.export();
  await fs.writeFile(notesDbPath, Buffer.from(data));
}

function allRows(sql, params = []) {
  if (!notesDb) return [];
  const stmt = notesDb.prepare(sql);
  try {
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function findCachedNote(note = {}) {
  const ids = [note.id, note.clientId, note.remoteId].filter(Boolean).map(String);
  for (const existing of notesCache.values()) {
    const existingIds = [existing.id, existing.clientId, existing.remoteId].filter(Boolean).map(String);
    if (ids.some((id) => existingIds.includes(id))) return existing;
  }
  return null;
}

function dbRowToNote(row = {}) {
  return normalizeNote({
    id: row.id,
    clientId: row.client_id || row.id,
    remoteId: row.remote_id || null,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status || "pending",
    language: row.language || "en",
    color: row.color || "#1c1408",
    notionPageId: row.notion_page_id || null,
    isDeleted: !!row.is_deleted,
  });
}

function serverToLocalNote(serverNote = {}) {
  const clientId = String(serverNote.clientId || serverNote.id || uuidv4());
  return normalizeNote({
    id: clientId,
    clientId,
    remoteId: serverNote.id || serverNote.remoteId || null,
    title: serverNote.title || "Untitled Note",
    content: serverNote.content || "",
    language: serverNote.language,
    color: serverNote.color || "#1c1408",
    createdAt: serverNote.createdAt || serverNote.clientUpdatedAt || new Date().toISOString(),
    updatedAt: serverNote.updatedAt || serverNote.clientUpdatedAt || new Date().toISOString(),
    notionPageId: serverNote.notionPageId || null,
    isDeleted: !!serverNote.isDeleted,
    syncStatus: "synced",
  });
}

function normalizeNote(note = {}) {
  const id = String(note.id || note.clientId || uuidv4()).trim();
  const now = new Date().toISOString();
  return {
    ...note,
    id,
    clientId: String(note.clientId || id).trim(),
    remoteId: note.remoteId || null,
    title: String(note.title || "Untitled Note"),
    content: String(note.content || ""),
    language: note.language || "en",
    color: note.color || "#1c1408",
    createdAt: note.createdAt || note.created_at || now,
    updatedAt: note.updatedAt || note.updated_at || note.createdAt || now,
    syncStatus: note.syncStatus || note.sync_status || (note.synced ? "synced" : "pending"),
    notionPageId: note.notionPageId || note.notion_page_id || null,
    isDeleted: !!(note.isDeleted || note.is_deleted),
  };
}

function noteToRenderer(note = {}) {
  return {
    id: note.id,
    clientId: note.clientId || note.id,
    remoteId: note.remoteId || null,
    title: note.title || "Untitled Note",
    content: note.content || "",
    language: note.language || "en",
    color: note.color || "#1c1408",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    syncStatus: note.syncStatus || "pending",
    synced: note.syncStatus === "synced",
    notionPageId: note.notionPageId || null,
    isDeleted: !!note.isDeleted,
  };
}

function getNotesDbPath() {
  return notesDbPath;
}

function closeNotesStore() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (notesDb) {
    notesDb.close();
    notesDb = null;
  }
  dbAvailable = false;
}

module.exports = {
  initNotesStore,
  registerNotesHandlers,
  migrateLegacyNotes,
  addNote,
  updateNote,
  deleteNote,
  getNotes,
  getNotesForSync,
  applyServerNotes,
  markNotesSynced,
  markPendingNotesFailed,
  flushNotesCache,
  syncNotes,
  getNotesDbPath,
  closeNotesStore,
};
