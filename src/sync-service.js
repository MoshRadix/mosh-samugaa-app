/**
 * @file sync-service.js  (samugaa-electron-sync/sync-service.js)
 * Sync integration for MTO Samugaa Electron app.
 *
 * INTEGRATION INSTRUCTIONS:
 *   1. Copy this file next to index.js in the Electron project.
 *   2. In index.js, add at the top:
 *        const { registerSyncHandlers } = require('./sync-service');
 *   3. After the app is ready and DB is initialised, call:
 *        registerSyncHandlers(db, worklogsDb);
 *   4. In preload.js, expose the new channels (see END OF FILE for snippet).
 *
 * Settings stored via Electron settings IPC (same as other settings):
 *   samugaa_sync_url     – Vercel backend URL
 *   samugaa_sync_token   – JWT after login
 *   samugaa_sync_device  – device UUID
 *   samugaa_last_sync    – ISO timestamp of last successful sync
 */

const { ipcMain } = require("electron");
const { v4: uuidv4 } = require("uuid");
const https = require("https");
const http = require("http");
const notesStore = require("./notes-store");

// ─── Config ────────────────────────────────────────────────────────────────

const DEFAULT_SYNC_URL = "https://moshradix-site.vercel.app";
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// ─── State ─────────────────────────────────────────────────────────────────

let _db = null;          // main SQLite (mto_forms.db — not used for notes/todos)
let _wdb = null;         // worklogs.db  (stores cal_todos)
let _syncTimer = null;
let _syncInProgress = false;
let _activeSyncPromise = null;
let _syncSettings = {
  url: DEFAULT_SYNC_URL,
  token: null,
  deviceId: null,
  lastSync: null,
};

// ─── Public ────────────────────────────────────────────────────────────────

function registerSyncHandlers(db, worklogsDb) {
  _db = db;
  _wdb = worklogsDb;

  // Auth
  ipcMain.handle("sync-register", handleRegister);
  ipcMain.handle("sync-login", handleLogin);
  ipcMain.handle("sync-resend-verification", handleResendVerification);
  ipcMain.handle("sync-logout", handleLogout);
  ipcMain.handle("sync-get-settings", handleGetSettings);

  // Sync
  ipcMain.handle("sync-now", handleSyncNow);
  ipcMain.handle("sync-get-status", handleGetStatus);

  // Load persisted settings
  _loadSettings();

  // Auto-sync every 5 minutes if authenticated
  _scheduleAutoSync();

  console.log("[Sync] Handlers registered.");
}

module.exports = { registerSyncHandlers };

// ─── Auth handlers ─────────────────────────────────────────────────────────

async function handleRegister(_event, { email, password, name }) {
  try {
    const res = await apiPost("/api/auth", {
      action: "register",
      email,
      password,
      name,
      deviceName: "MTO Samugaa Desktop",
      platform: "electron",
    });
    if (res.token) {
      _syncSettings.token = res.token;
      _syncSettings.deviceId = res.deviceId;
      _persistSettings();
      return { success: true, user: res.user };
    }
    if (res.requiresVerification) {
      return {
        success: true,
        requiresVerification: true,
        message: res.message || "Check your email to verify your account before signing in.",
        user: res.user,
      };
    }
    return { success: false, error: res.error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleLogin(_event, { email, password }) {
  try {
    const deviceId = _syncSettings.deviceId ?? uuidv4();
    const res = await loginWithDevice(email, password, deviceId);
    if (res.token) {
      _syncSettings.token = res.token;
      _syncSettings.deviceId = res.deviceId ?? deviceId;
      _persistSettings();
      return { success: true, user: res.user };
    }
    return { success: false, error: res.error };
  } catch (err) {
    if (_syncSettings.deviceId && _isRetryableDeviceLoginError(err)) {
      try {
        const freshDeviceId = uuidv4();
        const retry = await loginWithDevice(email, password, freshDeviceId);
        if (retry.token) {
          _syncSettings.token = retry.token;
          _syncSettings.deviceId = retry.deviceId ?? freshDeviceId;
          _persistSettings();
          return { success: true, user: retry.user };
        }
        return { success: false, error: retry.error };
      } catch (retryErr) {
        return { success: false, error: retryErr.message };
      }
    }
    return { success: false, error: err.message };
  }
}

function loginWithDevice(email, password, deviceId) {
  return apiPost("/api/auth", {
      action: "login",
      email,
      password,
      deviceId,
      deviceName: "MTO Samugaa Desktop",
      platform: "electron",
  });
}

function _isRetryableDeviceLoginError(err) {
  const message = String(err?.message || "").toLowerCase();
  return message.includes("http 500") || message.includes("duplicate key") || message.includes("device");
}

async function handleResendVerification(_event, { email }) {
  try {
    const res = await apiPost("/api/auth", {
      action: "resendVerification",
      email,
    });
    return {
      success: true,
      message: res.message || "Verification email sent. The link expires in 1 hour.",
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function handleLogout() {
  _syncSettings.token = null;
  _persistSettings();
  return { success: true };
}

function handleGetSettings() {
  return {
    url: _syncSettings.url,
    deviceId: _syncSettings.deviceId,
    lastSync: _syncSettings.lastSync,
    isAuthenticated: !!_syncSettings.token,
  };
}

// ─── Sync handler ──────────────────────────────────────────────────────────

async function handleSyncNow(_event, rendererState = {}) {
  if (!_syncSettings.token) {
    return { success: false, error: "Not authenticated" };
  }

  return _runSync({ rendererState });
}

async function _runSync({ rendererState = {}, silent = false } = {}) {
  if (_activeSyncPromise) {
    return silent
      ? { success: false, skipped: true, error: "Sync already in progress" }
      : _activeSyncPromise;
  }

  _syncInProgress = true;
  _activeSyncPromise = _performSync(rendererState)
    .finally(() => {
      _syncInProgress = false;
      _activeSyncPromise = null;
    });

  return _activeSyncPromise;
}

async function _performSync(rendererState = {}) {
  try {
    // ── 1. Collect local notes ─────────────────────────────────────────
    const localNotes = await _getLocalNotes(rendererState.notes);
    const localTodos = _getLocalTodos();
    const localWorkLogs = _getLocalWorkLogs();

    // ── 2. POST /api/sync ──────────────────────────────────────────────
    const payload = {
      since: _syncSettings.lastSync ?? undefined,
      notes: localNotes.map(_noteToSyncPayload).filter(Boolean),
      todos: localTodos.map(_todoToSyncPayload).filter(Boolean),
      workLogs: localWorkLogs.map(_workLogToSyncPayload).filter(Boolean),
    };

    let result = await apiPost("/api/sync", payload);
    result = await _withFullServerPull(result);

    // ── 3. Apply server note changes ───────────────────────────────────
    if (result.notes?.serverChanges?.length) {
      _applyServerNotes(result.notes.serverChanges);
    }

    // ── 4. Apply server todo changes ───────────────────────────────────
    if (result.todos?.serverChanges?.length) {
      _applyServerTodos(result.todos.serverChanges);
    }

    if (result.workLogs?.serverChanges?.length) {
      _applyServerWorkLogs(result.workLogs.serverChanges);
    }

    // ── 5. Update last sync timestamp ──────────────────────────────────
    _syncSettings.lastSync = result.syncedAt;
    _persistSettings();
    await notesStore.markNotesSynced(result, payload.notes);
    _normalizeLocalTodoDates();
    _markLocalTodosSynced(result.todos, payload.todos);
    _markLocalWorkLogsSynced(result.workLogs);

    return {
      success: true,
      syncedAt: result.syncedAt,
      notes: {
        sent: payload.notes.length,
        created: result.notes?.created?.length ?? 0,
        updated: result.notes?.updated?.length ?? 0,
        conflicts: result.notes?.conflicts?.length ?? 0,
        received: result.notes?.serverChanges?.length ?? 0,
      },
      todos: {
        sent: payload.todos.length,
        created: result.todos?.created?.length ?? 0,
        updated: result.todos?.updated?.length ?? 0,
        conflicts: result.todos?.conflicts?.length ?? 0,
        received: result.todos?.serverChanges?.length ?? 0,
      },
      workLogs: {
        sent: payload.workLogs.length,
        created: result.workLogs?.created?.length ?? 0,
        updated: result.workLogs?.updated?.length ?? 0,
        conflicts: result.workLogs?.conflicts?.length ?? 0,
        received: result.workLogs?.serverChanges?.length ?? 0,
      },
    };
  } catch (err) {
    console.error("[Sync] Error:", err);
    notesStore.markPendingNotesFailed();
    return { success: false, error: err.message };
  }
}

function handleGetStatus() {
  return {
    isAuthenticated: !!_syncSettings.token,
    lastSync: _syncSettings.lastSync,
    deviceId: _syncSettings.deviceId,
  };
}

// ─── Local DB helpers ──────────────────────────────────────────────────────

async function _withFullServerPull(syncResult = {}) {
  const fullPull = await apiPost("/api/sync", {
    notes: [],
    todos: [],
    workLogs: [],
  });

  return {
    ...syncResult,
    syncedAt: fullPull.syncedAt || syncResult.syncedAt,
    notes: {
      ...syncResult.notes,
      serverChanges: _mergeServerChanges(
        syncResult.notes?.serverChanges,
        fullPull.notes?.serverChanges
      ),
    },
    todos: {
      ...syncResult.todos,
      serverChanges: _mergeServerChanges(
        syncResult.todos?.serverChanges,
        fullPull.todos?.serverChanges
      ),
    },
    workLogs: {
      ...syncResult.workLogs,
      serverChanges: _mergeServerChanges(
        syncResult.workLogs?.serverChanges,
        fullPull.workLogs?.serverChanges
      ),
      error: syncResult.workLogs?.error || fullPull.workLogs?.error,
    },
  };
}

function _mergeServerChanges(primary = [], secondary = []) {
  const merged = [];
  const seen = new Set();

  for (const item of [...(primary || []), ...(secondary || [])]) {
    if (!item) continue;
    const key = String(item.id || item.remoteId || item.clientId || JSON.stringify(item));
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

async function _getLocalNotes(notes) {
  if (Array.isArray(notes)) return notesStore.getNotesForSync(notes);

  return notesStore.getNotesForSync(await _getRendererNotesForSync());
  // Notes are stored in localStorage on the renderer side.
  // We read them via a shared IPC – here we use a helper that the main
  // process exposes when notes-backup IPC is registered.
  // Returns an empty array if the DB bridge isn't available yet.
}

async function _getRendererNotesForSync() {
  try {
    const { BrowserWindow } = require("electron");
    const win = BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
    if (!win) return [];

    const notes = await win.webContents.executeJavaScript(
      `(() => {
        try {
          const raw = localStorage.getItem("mto_notes") || "[]";
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()`,
      true
    );

    return Array.isArray(notes) ? notes : [];
  } catch (err) {
    console.warn("[Sync] Unable to read renderer notes for scheduled sync:", err.message);
    return [];
  }
}

function _getLocalTodos() {
  if (!_wdb) return [];
  try {
    const columns = _getTableColumns("cal_todos");
    const has = (name) => columns.includes(name);
    const select = [
      "id",
      "text",
      "done",
      "date",
      has("priority") ? "priority" : "'medium' AS priority",
      has("tags") ? "tags" : "'[]' AS tags",
      has("remote_id") ? "remote_id" : "NULL AS remote_id",
      has("client_id") ? "client_id" : "id AS client_id",
      has("is_deleted") ? "is_deleted" : "0 AS is_deleted",
      has("updated_at") ? "updated_at" : "NULL AS updated_at",
    ];
    const where = has("synced") && has("remote_id")
      ? "WHERE synced = 0 OR remote_id IS NULL"
      : "";
    const rows = _wdb.exec(`SELECT ${select.join(", ")} FROM cal_todos ${where}`);
    if (!rows.length) return [];

    return rows[0].values.map(([
      id,
      text,
      done,
      date,
      priority,
      tags,
      remoteId,
      clientId,
      isDeleted,
      updatedAt,
    ]) => ({
      id,
      text,
      done,
      date,
      priority,
      tags,
      remoteId,
      clientId,
      isDeleted,
      updatedAt,
    }));
  } catch {
    return [];
  }
}

function _getLocalWorkLogs() {
  if (!_wdb) return [];
  try {
    const columns = _getTableColumns("work_logs");
    const has = (name) => columns.includes(name);
    const select = [
      "id",
      "task",
      "notes",
      "createdAt",
      has("tags") ? "tags" : "'[]' AS tags",
      has("photoPath") ? "photoPath" : "NULL AS photoPath",
      has("linkedTodoId") ? "linkedTodoId" : "NULL AS linkedTodoId",
      has("todoStatusHistory") ? "todoStatusHistory" : "'[]' AS todoStatusHistory",
      has("enrichNote") ? "enrichNote" : "NULL AS enrichNote",
      has("remote_id") ? "remote_id" : "NULL AS remote_id",
      has("client_id") ? "client_id" : "id AS client_id",
      has("is_deleted") ? "is_deleted" : "0 AS is_deleted",
      has("updated_at") ? "updated_at" : "NULL AS updated_at",
    ];
    const where = has("synced") && has("remote_id")
      ? "WHERE synced = 0 OR remote_id IS NULL"
      : "";
    const rows = _wdb.exec(`SELECT ${select.join(", ")} FROM work_logs ${where}`);
    if (!rows.length) return [];

    return rows[0].values.map(([
      id,
      task,
      notes,
      createdAt,
      tags,
      photoPath,
      linkedTodoId,
      todoStatusHistory,
      enrichNote,
      remoteId,
      clientId,
      isDeleted,
      updatedAt,
    ]) => ({
      id,
      task,
      notes,
      createdAt,
      tags,
      photoPath,
      linkedTodoId,
      todoStatusHistory,
      enrichNote,
      remoteId,
      clientId,
      isDeleted,
      updatedAt,
    }));
  } catch {
    return [];
  }
}

function _getTableColumns(tableName) {
  try {
    const rows = _wdb.exec(`PRAGMA table_info(${tableName})`);
    return rows.length ? rows[0].values.map((row) => row[1]) : [];
  } catch {
    return [];
  }
}

function _noteToSyncPayload(note) {
  const clientId = String(note.clientId || note.id || "").trim();
  if (!clientId) return null;

  const remoteId = note.remoteId;
  return {
    clientId,
    id: remoteId || undefined,
    title: String(note.title || "Untitled"),
    content: String(note.content || ""),
    language: note.language || "en",
    isDeleted: !!note.isDeleted,
    clientUpdatedAt: _toIso(note.updatedAt || note.createdAt),
  };
}

function _todoToSyncPayload(todo) {
  const clientId = String(todo.clientId || todo.id || "").trim();
  if (!clientId) return null;

  const remoteId = todo.remoteId;
  return {
    clientId,
    id: remoteId || undefined,
    text: String(todo.text || ""),
    done: !!todo.done,
    dueDate: _toDateOnly(todo.date || todo.dueDate),
    priority: _normalizePriority(todo.priority),
    tags: _parseTags(todo.tags),
    isDeleted: !!todo.isDeleted,
    clientUpdatedAt: _toIso(todo.updatedAt || todo.createdAt),
    subtasks: [],
  };
}

function _workLogToSyncPayload(log) {
  const clientId = String(log.clientId || log.id || "").trim();
  if (!clientId) return null;

  return {
    clientId,
    id: log.remoteId || undefined,
    task: String(log.task || ""),
    notes: String(log.notes || ""),
    createdAt: _toIso(log.createdAt || log.created_at),
    tags: _parseTags(log.tags),
    photoPath: log.photoPath || null,
    linkedTodoId: log.linkedTodoId || null,
    todoStatusHistory: _parseJsonArray(log.todoStatusHistory),
    enrichNote: log.enrichNote || null,
    isDeleted: !!log.isDeleted,
    clientUpdatedAt: _toIso(log.updatedAt || log.createdAt),
  };
}

function _normalizePriority(priority) {
  return ["low", "medium", "high"].includes(priority) ? priority : "medium";
}

function _parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(String);
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function _parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function _toIso(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function _toDateOnly(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function _applyServerNotes(serverNotes) {
  const mergedNotes = notesStore.applyServerNotes(serverNotes);
  const { BrowserWindow } = require("electron");
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("sync:notes-update", mergedNotes);
  }
}

function _applyServerTodos(serverTodos) {
  if (!_wdb) return;

  for (const todo of serverTodos) {
    if (!todo.clientId && !todo.id) continue;

    const tagsJson = JSON.stringify(todo.tags ?? []);
    const dueDate = _todoDateForLocalStorage(todo);
    const existingRows = _wdb.exec(
      `SELECT id, updated_at FROM cal_todos WHERE id = ? OR client_id = ? OR remote_id = ? LIMIT 1`,
      [todo.clientId, todo.clientId, todo.id]
    );
    const existing = existingRows.length && existingRows[0].values.length
      ? existingRows[0].values[0]
      : null;
    const existingId = existing ? existing[0] : null;
    const existingUpdatedAt = existing ? existing[1] : null;

    if (existingId) {
      const localTime = new Date(existingUpdatedAt || 0).getTime();
      const serverTime = new Date(todo.updatedAt || todo.clientUpdatedAt || 0).getTime();
      if (localTime > serverTime && !todo.isDeleted) continue;

      _wdb.run(
        `UPDATE cal_todos
         SET text = ?, done = ?, date = ?, priority = ?, tags = ?,
             remote_id = ?, client_id = ?, is_deleted = ?, synced = 1,
             updated_at = ?
         WHERE id = ?`,
        [
          todo.text,
          todo.done ? 1 : 0,
          dueDate,
          todo.priority,
          tagsJson,
          todo.id,
          todo.clientId,
          todo.isDeleted ? 1 : 0,
          _toIso(todo.updatedAt || todo.clientUpdatedAt),
          existingId,
        ]
      );
    } else if (!todo.isDeleted) {
      _wdb.run(
        `INSERT INTO cal_todos
           (id, text, done, date, priority, tags, remote_id, client_id, synced, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          todo.clientId || todo.id,
          todo.text,
          todo.done ? 1 : 0,
          dueDate,
          todo.priority,
          tagsJson,
          todo.id,
          todo.clientId,
        ]
      );
    }
  }

  _normalizeLocalTodoDates();
  _persistWorklogsDb();

  // Notify renderer of updated todos
  const { BrowserWindow } = require("electron");
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("sync:todos-update");
  }
}

function _normalizeLocalTodoDates() {
  if (!_wdb) return;

  try {
    const rows = _wdb.exec("SELECT id, date FROM cal_todos WHERE date IS NOT NULL");
    if (!rows.length) return;

    let changed = false;
    for (const [id, date] of rows[0].values) {
      const normalized = _toDateOnly(date);
      if (normalized && normalized !== date) {
        _wdb.run("UPDATE cal_todos SET date = ? WHERE id = ?", [normalized, id]);
        changed = true;
      }
    }
    if (changed) _persistWorklogsDb();
  } catch (err) {
    console.warn("[Sync] Failed to normalize todo dates:", err.message);
  }
}

function _todoDateForLocalStorage(todo = {}) {
  return (
    _toDateOnly(todo.dueDate) ||
    _toDateOnly(todo.createdAt) ||
    _toDateOnly(todo.updatedAt) ||
    _toDateOnly(todo.clientUpdatedAt) ||
    new Date().toISOString().slice(0, 10)
  );
}

function _applyServerWorkLogs(serverWorkLogs) {
  if (!_wdb) return;

  for (const log of serverWorkLogs) {
    if (!log.clientId && !log.id) continue;

    const tagsJson = JSON.stringify(Array.isArray(log.tags) ? log.tags : _parseTags(log.tags));
    const historyJson = JSON.stringify(_parseJsonArray(log.todoStatusHistory));
    const existingRows = _wdb.exec(
      `SELECT id, updated_at FROM work_logs WHERE id = ? OR client_id = ? OR remote_id = ? LIMIT 1`,
      [log.clientId, log.clientId, log.id]
    );
    const existing = existingRows.length && existingRows[0].values.length
      ? existingRows[0].values[0]
      : null;
    const existingId = existing ? existing[0] : null;
    const existingUpdatedAt = existing ? existing[1] : null;

    if (existingId) {
      const localTime = new Date(existingUpdatedAt || 0).getTime();
      const serverTime = new Date(log.updatedAt || log.clientUpdatedAt || 0).getTime();
      if (localTime > serverTime && !log.isDeleted) continue;

      _wdb.run(
        `UPDATE work_logs
         SET task = ?, notes = ?, createdAt = ?, tags = ?, photoPath = ?,
             linkedTodoId = ?, todoStatusHistory = ?, enrichNote = ?,
             remote_id = ?, client_id = ?, is_deleted = ?, synced = 1,
             updated_at = ?
         WHERE id = ?`,
        [
          log.task || "",
          log.notes || "",
          _toIso(log.createdAt || log.clientUpdatedAt),
          tagsJson,
          log.photoPath || null,
          log.linkedTodoId || null,
          historyJson,
          log.enrichNote || null,
          log.id || log.remoteId || null,
          log.clientId || existingId,
          log.isDeleted ? 1 : 0,
          _toIso(log.updatedAt || log.clientUpdatedAt),
          existingId,
        ]
      );
    } else if (!log.isDeleted) {
      const id = log.clientId || log.id;
      _wdb.run(
        `INSERT INTO work_logs
           (id, task, notes, createdAt, tags, photoPath, linkedTodoId,
            todoStatusHistory, enrichNote, remote_id, client_id, is_deleted,
            synced, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        [
          id,
          log.task || "",
          log.notes || "",
          _toIso(log.createdAt || log.clientUpdatedAt),
          tagsJson,
          log.photoPath || null,
          log.linkedTodoId || null,
          historyJson,
          log.enrichNote || null,
          log.id || log.remoteId || null,
          log.clientId || id,
          _toIso(log.createdAt || log.clientUpdatedAt),
          _toIso(log.updatedAt || log.clientUpdatedAt),
        ]
      );
    }
  }

  _persistWorklogsDb();

  const { BrowserWindow } = require("electron");
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send("sync:worklogs-update");
  }
}

function _markLocalTodosSynced(todosResult = {}, sentTodos = []) {
  if (!_wdb || !todosResult) return;

  const serverChanges = Array.isArray(todosResult.serverChanges)
    ? todosResult.serverChanges
    : [];
  const serverByRemoteId = new Map();
  for (const todo of serverChanges) {
    const remoteId = todo?.id || todo?.remoteId || todo?.remote_id;
    if (remoteId) serverByRemoteId.set(String(remoteId), todo);
  }
  const sentByRemoteId = new Map();
  const unsavedSentTodos = [];
  for (const todo of Array.isArray(sentTodos) ? sentTodos : []) {
    if (todo?.id) sentByRemoteId.set(String(todo.id), todo);
    else if (todo?.clientId) unsavedSentTodos.push(todo);
  }

  const markAcknowledged = (ack, isCreated) => {
    if (!ack) return;
    const remoteId = typeof ack === "string"
      ? ack
      : ack.id || ack.remoteId || ack.remote_id || null;
    const matchedServerTodo = remoteId ? serverByRemoteId.get(String(remoteId)) : null;
    const matchedSentTodo = remoteId ? sentByRemoteId.get(String(remoteId)) : null;
    const fallbackCreatedTodo = isCreated && typeof ack === "string" ? unsavedSentTodos.shift() : null;
    const clientId = typeof ack === "string"
      ? matchedServerTodo?.clientId || matchedSentTodo?.clientId || fallbackCreatedTodo?.clientId
      : ack.clientId || ack.client_id || matchedServerTodo?.clientId || matchedSentTodo?.clientId;

    if (!clientId && !remoteId) return;

    _wdb.run(
      `UPDATE cal_todos
       SET synced = 1, remote_id = COALESCE(?, remote_id), client_id = COALESCE(client_id, id)
       WHERE client_id = ? OR id = ? OR remote_id = ?`,
      [remoteId, clientId, clientId, remoteId]
    );
  };

  for (const ack of todosResult.created || []) markAcknowledged(ack, true);
  for (const ack of todosResult.updated || []) markAcknowledged(ack, false);

  _persistWorklogsDb();
}

function _markLocalWorkLogsSynced(workLogsResult = {}) {
  if (!_wdb || !workLogsResult) return;

  const acknowledgements = [
    ...(workLogsResult.created || []),
    ...(workLogsResult.updated || []),
  ];
  if (!acknowledgements.length) {
    _wdb.run("UPDATE work_logs SET synced = 1 WHERE synced = 0 AND remote_id IS NOT NULL");
    _persistWorklogsDb();
    return;
  }

  for (const ack of acknowledgements) {
    if (!ack) continue;
    const clientId = ack.clientId || ack.client_id;
    const remoteId = ack.id || ack.remoteId || ack.remote_id || null;
    if (!clientId && !remoteId) continue;
    _wdb.run(
      `UPDATE work_logs
       SET synced = 1, remote_id = COALESCE(?, remote_id), client_id = COALESCE(client_id, id)
       WHERE client_id = ? OR id = ? OR remote_id = ?`,
      [remoteId, clientId, clientId, remoteId]
    );
  }

  _persistWorklogsDb();
}

function _persistWorklogsDb() {
  try {
    const { app } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const dbPath = path.join(app.getPath("userData"), "worklogs.db");
    fs.writeFileSync(dbPath, Buffer.from(_wdb.export()));
  } catch (err) {
    console.error("[Sync] Failed to persist worklogs DB:", err);
  }
}

// ─── Settings persistence ──────────────────────────────────────────────────
// Stored in the same config file used by the rest of the Electron app.

function _loadSettings() {
  try {
    const { app } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const cfgPath = path.join(app.getPath("userData"), "samugaa-sync.json");
    if (fs.existsSync(cfgPath)) {
      const data = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      _syncSettings = { ..._syncSettings, ...data };
    }
  } catch {
    // ignore
  }
}

function _persistSettings() {
  try {
    const { app } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const cfgPath = path.join(app.getPath("userData"), "samugaa-sync.json");
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({
        url: _syncSettings.url,
        token: _syncSettings.token,
        deviceId: _syncSettings.deviceId,
        lastSync: _syncSettings.lastSync,
      }),
      "utf8"
    );
  } catch {
    // ignore
  }
}

function _scheduleAutoSync() {
  if (_syncTimer) {
    clearInterval(_syncTimer);
    _syncTimer = null;
  }

  _syncTimer = setInterval(() => {
    if (!_syncSettings.token || _syncInProgress) return;

    void _runSync({ silent: true }).catch((err) => {
      console.error("[Sync] Scheduled sync failed:", err);
    });
  }, AUTO_SYNC_INTERVAL_MS); // every 5 minutes: push queued local changes and pull remote changes
}

function _hasQueuedTodoChanges() {
  if (!_wdb) return false;
  try {
    const columns = _getTableColumns("cal_todos");
    const has = (name) => columns.includes(name);
    if (!has("synced") && !has("remote_id")) return false;

    const conditions = [];
    if (has("synced")) conditions.push("synced = 0");
    if (has("remote_id")) conditions.push("remote_id IS NULL");
    const rows = _wdb.exec(`SELECT COUNT(*) FROM cal_todos WHERE ${conditions.join(" OR ")}`);
    return !!(rows.length && rows[0].values[0][0] > 0);
  } catch {
    return false;
  }
}

// ─── HTTP helper ───────────────────────────────────────────────────────────

function apiPost(path, body) {
  const url = new URL(`${_syncSettings.url}${path}`);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;

  const jsonBody = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(jsonBody),
        ...((_syncSettings.token && {
          Authorization: `Bearer ${_syncSettings.token}`,
        }) || {}),
        ...(_syncSettings.deviceId
          ? { "X-Device-ID": _syncSettings.deviceId }
          : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const parsedBody = _parseApiBody(data);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(_formatApiError(parsedBody, res.statusCode)));
          return;
        }

        try {
          resolve(parsedBody);
        } catch {
          resolve({ raw: data });
        }
      });
    });

    req.on("error", reject);
    req.write(jsonBody);
    req.end();
  });
}

function _parseApiBody(data) {
  try {
    return JSON.parse(data);
  } catch {
    return { raw: data };
  }
}

function _formatApiError(body, statusCode) {
  if (typeof body?.error === "string") return body.error;
  if (body?.error?.fieldErrors) {
    const fieldMessages = Object.entries(body.error.fieldErrors)
      .flatMap(([field, messages]) => (messages || []).map((message) => `${field}: ${message}`));
    if (fieldMessages.length) return `Sync API ${statusCode}: ${fieldMessages.join("; ")}`;
  }
  if (body?.raw) return `Sync API ${statusCode}: ${body.raw}`;
  return `Sync API request failed with HTTP ${statusCode}`;
}
