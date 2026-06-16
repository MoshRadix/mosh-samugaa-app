// backup.js – Backup & Restore functionality for MTO Samugaa
// Called from initSettings() in settings.js when the Settings view is opened.

let _smBackupAttached    = false;
let _notesBackupAttached = false;
let _wlBackupAttached    = false;
let _docsBackupAttached  = false;
let _fullBackupAttached  = false;

// ============================================================================
// SOCIAL MEDIA TEMPLATES — BACKUP & RESTORE
// ============================================================================

function _smStatus(msg, type) {
  const el = document.getElementById("sm-backup-status");
  if (!el) return;
  el.style.display = "block";
  el.style.color = type === "error" ? "var(--danger)" : type === "success" ? "var(--success, #3a9e6e)" : "var(--text-secondary)";
  el.textContent = msg;
}

function setupSmBackup() {
  if (_smBackupAttached) return;
  _smBackupAttached = true;

  const backupBtn  = document.getElementById("sm-backup-btn");
  const restoreBtn = document.getElementById("sm-restore-btn");

  if (backupBtn) {
    backupBtn.addEventListener("click", async () => {
      backupBtn.disabled = true;
      backupBtn.textContent = "Backing up…";
      try {
        const result = await window.electronAPI.smBackup();
        if (result && result.canceled) {
          _smStatus("Backup cancelled.", "info");
        } else if (result && result.success) {
          _smStatus(`✓ Backed up ${result.count} template${result.count !== 1 ? "s" : ""} to: ${result.path}`, "success");
          if (window.showToast) window.showToast(`Backup saved — ${result.count} template${result.count !== 1 ? "s" : ""}`, "success");
        }
      } catch (err) {
        _smStatus("Backup failed: " + err.message, "error");
        if (window.showToast) window.showToast("Backup failed: " + err.message, "error");
      } finally {
        backupBtn.disabled = false;
        backupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Backup Templates`;
      }
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Restore from backup? Existing templates with the same IDs will be overwritten.",
        "Restore"
      );
      if (!confirmed) return;

      restoreBtn.disabled = true;
      restoreBtn.textContent = "Restoring…";
      try {
        const result = await window.electronAPI.smRestore();
        if (result && result.canceled) {
          _smStatus("Restore cancelled.", "info");
        } else if (result && result.success) {
          _smStatus(`✓ Restored ${result.count} template${result.count !== 1 ? "s" : ""} successfully.`, "success");
          if (window.showToast) window.showToast(`Restored ${result.count} template${result.count !== 1 ? "s" : ""}`, "success");
        }
      } catch (err) {
        _smStatus("Restore failed: " + err.message, "error");
        if (window.showToast) window.showToast("Restore failed: " + err.message, "error");
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Restore from Backup`;
      }
    });
  }
}

// ============================================================================
// NOTES — BACKUP & RESTORE
// ============================================================================

function _notesStatus(msg, type) {
  const el = document.getElementById("notes-backup-status");
  if (!el) return;
  el.style.display = "block";
  el.style.color = type === "error" ? "var(--danger)" : type === "success" ? "var(--success, #3a9e6e)" : "var(--text-secondary)";
  el.textContent = msg;
}

function setupNotesBackup() {
  if (_notesBackupAttached) return;
  _notesBackupAttached = true;

  const backupBtn  = document.getElementById("notes-backup-btn");
  const restoreBtn = document.getElementById("notes-restore-btn");

  if (backupBtn) {
    backupBtn.addEventListener("click", async () => {
      backupBtn.disabled = true;
      backupBtn.textContent = "Backing up…";
      try {
        const raw = localStorage.getItem("mto_notes") || "[]";
        const result = await window.electronAPI.notesBackup(raw);
        if (result && result.canceled) {
          _notesStatus("Backup cancelled.", "info");
        } else if (result && result.success) {
          _notesStatus(`✓ Backed up ${result.count} note${result.count !== 1 ? "s" : ""} to: ${result.path}`, "success");
          if (window.showToast) window.showToast(`Notes backed up — ${result.count} note${result.count !== 1 ? "s" : ""}`, "success");
        }
      } catch (err) {
        _notesStatus("Backup failed: " + err.message, "error");
        if (window.showToast) window.showToast("Notes backup failed: " + err.message, "error");
      } finally {
        backupBtn.disabled = false;
        backupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Backup Notes`;
      }
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Restore Notes from backup? This will replace all current notes.",
        "Restore"
      );
      if (!confirmed) return;

      restoreBtn.disabled = true;
      restoreBtn.textContent = "Restoring…";
      try {
        const result = await window.electronAPI.notesRestore();
        if (result && result.canceled) {
          _notesStatus("Restore cancelled.", "info");
        } else if (result && result.success) {
          localStorage.setItem("mto_notes", result.data);
          _notesStatus(`✓ Restored ${result.count} note${result.count !== 1 ? "s" : ""} successfully.`, "success");
          if (window.showToast) window.showToast(`Notes restored — ${result.count} note${result.count !== 1 ? "s" : ""}`, "success");
        }
      } catch (err) {
        _notesStatus("Restore failed: " + err.message, "error");
        if (window.showToast) window.showToast("Notes restore failed: " + err.message, "error");
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Restore from Backup`;
      }
    });
  }
}

// ============================================================================
// WORK LOGS — BACKUP & RESTORE
// ============================================================================

function _wlStatus(msg, type) {
  const el = document.getElementById("wl-backup-status");
  if (!el) return;
  el.style.display = "block";
  el.style.color = type === "error" ? "var(--danger)" : type === "success" ? "var(--success, #3a9e6e)" : "var(--text-secondary)";
  el.textContent = msg;
}

function setupWlBackup() {
  if (_wlBackupAttached) return;
  _wlBackupAttached = true;

  const backupBtn  = document.getElementById("wl-backup-btn");
  const restoreBtn = document.getElementById("wl-restore-btn");

  if (backupBtn) {
    backupBtn.addEventListener("click", async () => {
      backupBtn.disabled = true;
      backupBtn.textContent = "Backing up…";
      try {
        const result = await window.electronAPI.wlBackup();
        if (result && result.canceled) {
          _wlStatus("Backup cancelled.", "info");
        } else if (result && result.success) {
          const photoNote = result.photos > 0 ? ` + ${result.photos} photo${result.photos !== 1 ? "s" : ""}` : "";
          _wlStatus(`✓ Work Logs backed up${photoNote} to: ${result.path}`, "success");
          if (window.showToast) window.showToast(`Work Logs backed up${photoNote}`, "success");
        }
      } catch (err) {
        _wlStatus("Backup failed: " + err.message, "error");
        if (window.showToast) window.showToast("Work Logs backup failed: " + err.message, "error");
      } finally {
        backupBtn.disabled = false;
        backupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Backup Work Logs`;
      }
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Restore Work Logs from backup? This will replace all current work log data and photos.",
        "Restore"
      );
      if (!confirmed) return;

      restoreBtn.disabled = true;
      restoreBtn.textContent = "Restoring…";
      try {
        const result = await window.electronAPI.wlRestore();
        if (result && result.canceled) {
          _wlStatus("Restore cancelled.", "info");
        } else if (result && result.success) {
          const photoNote = result.photos > 0 ? ` and ${result.photos} photo${result.photos !== 1 ? "s" : ""}` : "";
          _wlStatus(`✓ Work Logs restored${photoNote} successfully.`, "success");
          if (window.showToast) window.showToast(`Work Logs restored${photoNote}`, "success");
        }
      } catch (err) {
        _wlStatus("Restore failed: " + err.message, "error");
        if (window.showToast) window.showToast("Work Logs restore failed: " + err.message, "error");
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Restore from Backup`;
      }
    });
  }
}

// ============================================================================
// DOCUMENT TEMPLATES — BACKUP & RESTORE
// ============================================================================

function _docsStatus(msg, type) {
  const el = document.getElementById("docs-backup-status");
  if (!el) return;
  el.style.display = "block";
  el.style.color = type === "error" ? "var(--danger)" : type === "success" ? "var(--success, #3a9e6e)" : "var(--text-secondary)";
  el.textContent = msg;
}

function setupDocsBackup() {
  if (_docsBackupAttached) return;
  _docsBackupAttached = true;

  const backupBtn  = document.getElementById("docs-backup-btn");
  const restoreBtn = document.getElementById("docs-restore-btn");

  if (backupBtn) {
    backupBtn.addEventListener("click", async () => {
      backupBtn.disabled = true;
      backupBtn.textContent = "Backing up…";
      try {
        const result = await window.electronAPI.docsBackup();
        if (result && result.canceled) {
          _docsStatus("Backup cancelled.", "info");
        } else if (result && result.success) {
          _docsStatus(`✓ Backed up ${result.count} template file${result.count !== 1 ? "s" : ""} to: ${result.path}`, "success");
          if (window.showToast) window.showToast(`Document Templates backed up — ${result.count} file${result.count !== 1 ? "s" : ""}`, "success");
        }
      } catch (err) {
        _docsStatus("Backup failed: " + err.message, "error");
        if (window.showToast) window.showToast("Backup failed: " + err.message, "error");
      } finally {
        backupBtn.disabled = false;
        backupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Backup Templates`;
      }
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Restore Document Templates from backup? This will replace all current templates and their metadata.",
        "Restore"
      );
      if (!confirmed) return;

      restoreBtn.disabled = true;
      restoreBtn.textContent = "Restoring…";
      try {
        const result = await window.electronAPI.docsRestore();
        if (result && result.canceled) {
          _docsStatus("Restore cancelled.", "info");
        } else if (result && result.success) {
          _docsStatus(`✓ Restored ${result.count} template file${result.count !== 1 ? "s" : ""} successfully.`, "success");
          if (window.showToast) window.showToast(`Document Templates restored — ${result.count} file${result.count !== 1 ? "s" : ""}`, "success");
          if (typeof loadTemplates === "function") await loadTemplates();
        }
      } catch (err) {
        _docsStatus("Restore failed: " + err.message, "error");
        if (window.showToast) window.showToast("Restore failed: " + err.message, "error");
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Restore from Backup`;
      }
    });
  }
}

// ============================================================================
// FULL BACKUP & RESTORE
// ============================================================================

function _fullStatus(msg, type) {
  const el = document.getElementById("full-backup-status");
  if (!el) return;
  el.style.display = "block";
  el.style.color = type === "error" ? "var(--danger)" : type === "success" ? "var(--success, #3a9e6e)" : "var(--text-secondary)";
  el.textContent = msg;
}

function setupFullBackup() {
  if (_fullBackupAttached) return;
  _fullBackupAttached = true;

  const backupBtn  = document.getElementById("full-backup-btn");
  const restoreBtn = document.getElementById("full-restore-btn");

  if (backupBtn) {
    backupBtn.addEventListener("click", async () => {
      backupBtn.disabled = true;
      backupBtn.textContent = "Backing up…";
      try {
        const notesJson = localStorage.getItem("mto_notes") || "[]";
        const result = await window.electronAPI.fullBackup(notesJson);
        if (result && result.canceled) {
          _fullStatus("Backup cancelled.", "info");
        } else if (result && result.success) {
          _fullStatus(`✓ Full backup saved to: ${result.path}`, "success");
          if (window.showToast) window.showToast("Full backup complete", "success");
        }
      } catch (err) {
        _fullStatus("Backup failed: " + err.message, "error");
        if (window.showToast) window.showToast("Full backup failed: " + err.message, "error");
      } finally {
        backupBtn.disabled = false;
        backupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Backup Everything`;
      }
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Restore everything from a full backup? This will replace ALL current data — Document Templates, Social Media Templates, Work Logs, and Notes.",
        "Restore Everything"
      );
      if (!confirmed) return;

      restoreBtn.disabled = true;
      restoreBtn.textContent = "Restoring…";
      try {
        const result = await window.electronAPI.fullRestore();
        if (result && result.canceled) {
          _fullStatus("Restore cancelled.", "info");
        } else if (result && result.success) {
          if (result.notes) {
            try {
              const parsed = JSON.parse(result.notes);
              if (Array.isArray(parsed)) localStorage.setItem("mto_notes", result.notes);
            } catch (_) {}
          }
          _fullStatus("✓ Full restore complete. Reloading templates…", "success");
          if (window.showToast) window.showToast("Full restore complete", "success");
          if (typeof loadTemplates === "function") await loadTemplates();
        }
      } catch (err) {
        _fullStatus("Restore failed: " + err.message, "error");
        if (window.showToast) window.showToast("Full restore failed: " + err.message, "error");
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Restore Everything`;
      }
    });
  }
}

// ============================================================================
// PUBLIC INIT — called by initSettings()
// ============================================================================

window.initBackup = function () {
  setupSmBackup();
  setupNotesBackup();
  setupWlBackup();
  setupDocsBackup();
  setupFullBackup();
};