/**
 * @file notes.js
 * @description Notebook-style note taking with lined paper background,
 * handwriting font, multi-note management, and Notion sync support.
 */

// ============================================================================
// STATE
// ============================================================================

let _notesInitialized = false;
let _notes = [];          // [{ id, title, content, createdAt, updatedAt, notionPageId }]
let _activeNoteId = null;
let _saveTimer = null;
let _notionToken = '';    // Integration token from settings
let _notionDbId = '';     // Target Notion database ID
let _syncStatus = 'idle'; // idle | syncing | synced | error

// ============================================================================
// INIT
// ============================================================================

window.initNotes = function () {
  if (_notesInitialized) {
    _renderNotesList();
    _loadNotionSettings();
    return;
  }
  _notesInitialized = true;

  _loadNotesFromStorage();
  _loadNotionSettings();
  _attachNoteEditorListeners();

  // If no notes yet, create a welcome note
  if (_notes.length === 0) {
    _createNote('Welcome Note', 'Start typing your notes here...\n\nThis is your personal notebook. Notes are saved automatically as you type.');
  } else {
    _activateNote(_notes[0].id);
  }
};

// ============================================================================
// STORAGE  (uses electronAPI settings IPC for persistence)
// ============================================================================

async function _loadNotesFromStorage() {
  try {
    const raw = localStorage.getItem('mto_notes');
    if (raw) {
      _notes = JSON.parse(raw);
    }
  } catch (e) {
    _notes = [];
  }
  _renderNotesList();
  if (_notes.length > 0) {
    _activateNote(_notes[0].id);
  }
}

function _saveNotesToStorage() {
  try {
    localStorage.setItem('mto_notes', JSON.stringify(_notes));
  } catch (e) {
    console.error('Notes save error:', e);
  }
}

// ============================================================================
// NOTION SETTINGS
// ============================================================================

function _loadNotionSettings() {
  _notionToken = localStorage.getItem('mto_notion_token') || '';
  _notionDbId = localStorage.getItem('mto_notion_db_id') || '';
}

// Called from settings.js
window.saveNotionSettings = function(token, dbId) {
  _notionToken = token.trim();
  _notionDbId = dbId.trim();
  localStorage.setItem('mto_notion_token', _notionToken);
  localStorage.setItem('mto_notion_db_id', _notionDbId);
};

window.getNotionSettings = function() {
  return {
    token: localStorage.getItem('mto_notion_token') || '',
    dbId: localStorage.getItem('mto_notion_db_id') || ''
  };
};

// ============================================================================
// NOTE CRUD
// ============================================================================

function _createNote(title = 'Untitled Note', content = '', language = 'en') {
  const note = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    title: title || 'Untitled Note',
    content,
    language: language || 'en',
    color: '#1c1408',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notionPageId: null,
  };
  _notes.unshift(note);
  _saveNotesToStorage();
  _renderNotesList();
  _activateNote(note.id);
  return note;
}

function _updateActiveNote(field, value) {
  const note = _notes.find(n => n.id === _activeNoteId);
  if (!note) return;
  note[field] = value;
  note.updatedAt = new Date().toISOString();
  _saveNotesToStorage();
  _renderNoteItem(note);
}

function _deleteNote(id) {
  const idx = _notes.findIndex(n => n.id === id);
  if (idx === -1) return;
  _notes.splice(idx, 1);
  _saveNotesToStorage();
  _renderNotesList();

  if (_activeNoteId === id) {
    _activeNoteId = null;
    if (_notes.length > 0) {
      _activateNote(_notes[0].id);
    } else {
      _clearEditor();
    }
  }
}

// ============================================================================
// ACTIVE NOTE
// ============================================================================

function _activateNote(id) {
  _activeNoteId = id;
  const note = _notes.find(n => n.id === id);
  if (!note) return;

  // Highlight sidebar item
  document.querySelectorAll('.nb-note-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Load into editor
  const titleEl = document.getElementById('nb-editor-title');
  const areaEl  = document.getElementById('nb-editor-area');
  const metaEl  = document.getElementById('nb-editor-meta');

  if (titleEl) titleEl.value = note.title;
  if (areaEl)  { areaEl.value = note.content; _autoResizeTextarea(areaEl); }
  if (metaEl)  metaEl.textContent = _formatDate(note.updatedAt);

  // Apply ink colour
  _applyNoteColor(note.color || '#1c1408');

  // Apply language mode
  _applyLanguageMode(note.language || 'en');

  _updateSyncBadge(note);
}

function _clearEditor() {
  const titleEl = document.getElementById('nb-editor-title');
  const areaEl  = document.getElementById('nb-editor-area');
  const metaEl  = document.getElementById('nb-editor-meta');
  if (titleEl) titleEl.value = '';
  if (areaEl)  areaEl.value = '';
  if (metaEl)  metaEl.textContent = '';
  _updateSyncBadgeById(null, 'idle');
}

// ============================================================================
// RENDER
// ============================================================================

function _renderNotesList() {
  const list = document.getElementById('nb-notes-list');
  if (!list) return;

  if (_notes.length === 0) {
    list.innerHTML = '<div class="nb-empty-list">No notes yet.<br>Click + to create one.</div>';
    return;
  }

  list.innerHTML = _notes.map(note => _noteItemHTML(note)).join('');

  // Attach click handlers
  list.querySelectorAll('.nb-note-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.nb-note-delete')) return;
      _activateNote(el.dataset.id);
    });
    el.querySelector('.nb-note-delete')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await showConfirm('Delete this note?', 'Delete')) {
        _deleteNote(el.dataset.id);
      }
    });
  });

  // Re-mark active
  if (_activeNoteId) {
    list.querySelector(`.nb-note-item[data-id="${_activeNoteId}"]`)?.classList.add('active');
  }
}

function _noteItemHTML(note) {
  const preview = note.content.replace(/\n/g, ' ').slice(0, 60) || 'Empty note';
  const synced = note.notionPageId
    ? '<span class="nb-note-synced" title="Synced to Notion">✦</span>'
    : '';
  const langBadge = (note.language === 'dv')
    ? '<span class="nb-note-lang-badge">ދިވެހި</span>'
    : '';
  return `
    <div class="nb-note-item" data-id="${note.id}" data-lang="${note.language || 'en'}">
      <div class="nb-note-item-header">
        <span class="nb-note-title-text">${_esc(note.title)}</span>
        ${langBadge}
        ${synced}
        <button class="nb-note-delete" title="Delete note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="nb-note-preview">${_esc(preview)}</div>
      <div class="nb-note-date">${_formatDate(note.updatedAt)}</div>
    </div>`;
}

function _renderNoteItem(note) {
  const el = document.querySelector(`.nb-note-item[data-id="${note.id}"]`);
  if (!el) { _renderNotesList(); return; }
  el.outerHTML = _noteItemHTML(note);
  // Re-attach listeners for this item
  const newEl = document.querySelector(`.nb-note-item[data-id="${note.id}"]`);
  if (!newEl) return;
  if (_activeNoteId === note.id) newEl.classList.add('active');
  newEl.addEventListener('click', (e) => {
    if (e.target.closest('.nb-note-delete')) return;
    _activateNote(newEl.dataset.id);
  });
  newEl.querySelector('.nb-note-delete')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (await showConfirm('Delete this note?', 'Delete')) {
      _deleteNote(newEl.dataset.id);
    }
  });
}

// ============================================================================
// EDITOR LISTENERS
// ============================================================================

function _attachNoteEditorListeners() {
  // New note button
  document.getElementById('nb-new-btn')?.addEventListener('click', () => {
    _createNote();
  });

  // Title input
  document.getElementById('nb-editor-title')?.addEventListener('input', (e) => {
    if (!_activeNoteId) return;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _updateActiveNote('title', e.target.value || 'Untitled Note');
    }, 400);
  });

  // Content textarea
  document.getElementById('nb-editor-area')?.addEventListener('input', (e) => {
    _autoResizeTextarea(e.target);
    if (!_activeNoteId) return;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _updateActiveNote('content', e.target.value);
    }, 400);
  });

  // Sync to Notion button
  document.getElementById('nb-sync-btn')?.addEventListener('click', () => {
    if (!_activeNoteId) return;
    _syncNoteToNotion(_activeNoteId);
  });

  // Sync all button
  document.getElementById('nb-sync-all-btn')?.addEventListener('click', () => {
    _syncAllToNotion();
  });

  // Ink colour swatches
  document.querySelectorAll('.nb-ink-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!_activeNoteId) return;
      const color = btn.dataset.color;
      _updateActiveNote('color', color);
      _applyNoteColor(color);
    });
  });

  // Language toggle
  document.querySelectorAll('.nb-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!_activeNoteId) return;
      const lang = btn.dataset.lang;
      _updateActiveNote('language', lang);
      _applyLanguageMode(lang);
    });
  });

  // Search
  document.getElementById('nb-search')?.addEventListener('input', (e) => {
    _filterNotes(e.target.value);
  });

  // Dhivehi keyboard intercept
  _attachThaanaListeners();
}

function _filterNotes(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.nb-note-item').forEach(el => {
    const note = _notes.find(n => n.id === el.dataset.id);
    if (!note) return;
    const match = !q || note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
  });
}

// ============================================================================
// NOTION SYNC
// ============================================================================

async function _syncNoteToNotion(noteId) {
  _loadNotionSettings();
  if (!_notionToken) {
    showToast('Please set your Notion Integration Token in Settings → Notion Integration.', 'warning');
    return;
  }
  if (!_notionDbId) {
    showToast('Please set your Notion Database ID in Settings → Notion Integration.', 'warning');
    return;
  }

  const note = _notes.find(n => n.id === noteId);
  if (!note) return;

  _setSyncStatus('syncing');
  _updateSyncBadge(note);

  try {
    if (note.notionPageId) {
      // Update existing page
      await _notionUpdatePage(note);
    } else {
      // Create new page
      const pageId = await _notionCreatePage(note);
      note.notionPageId = pageId;
      _saveNotesToStorage();
    }
    note.updatedAt = new Date().toISOString();
    _saveNotesToStorage();
    _setSyncStatus('synced');
    _updateSyncBadge(note);
    _renderNoteItem(note);
    showToast('Note synced to Notion ✓', 'success');
  } catch (err) {
    console.error('Notion sync error:', err);
    _setSyncStatus('error');
    _updateSyncBadgeById(noteId, 'error');
    showToast('Notion sync failed: ' + (err.message || 'Unknown error'), 'error');
  }
}

async function _syncAllToNotion() {
  _loadNotionSettings();
  if (!_notionToken || !_notionDbId) {
    showToast('Please configure Notion settings first.', 'warning');
    return;
  }

  const btn = document.getElementById('nb-sync-all-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }

  let succeeded = 0, failed = 0;
  for (const note of _notes) {
    try {
      if (note.notionPageId) {
        await _notionUpdatePage(note);
      } else {
        const pageId = await _notionCreatePage(note);
        note.notionPageId = pageId;
      }
      note.updatedAt = new Date().toISOString();
      succeeded++;
    } catch (e) {
      failed++;
    }
  }

  _saveNotesToStorage();
  _renderNotesList();
  if (_activeNoteId) _activateNote(_activeNoteId);

  if (btn) { btn.disabled = false; btn.textContent = '⇅ Sync All'; }
  showToast(`Synced ${succeeded} note(s) to Notion${failed ? ` (${failed} failed)` : ''}.`, failed ? 'warning' : 'success');
}

async function _notionCreatePage(note) {
  const body = {
    parent: { database_id: _notionDbId },
    properties: {
      title: {
        title: [{ text: { content: note.title } }]
      }
    },
    children: _contentToNotionBlocks(note.content)
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + _notionToken,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.id;
}

async function _notionUpdatePage(note) {
  // Update title
  const propsRes = await fetch(`https://api.notion.com/v1/pages/${note.notionPageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + _notionToken,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      properties: {
        title: { title: [{ text: { content: note.title } }] }
      }
    })
  });

  if (!propsRes.ok) {
    const err = await propsRes.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${propsRes.status}`);
  }

  // Get existing blocks to delete them
  const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${note.notionPageId}/children`, {
    headers: {
      'Authorization': 'Bearer ' + _notionToken,
      'Notion-Version': '2022-06-28'
    }
  });

  if (blocksRes.ok) {
    const blocksData = await blocksRes.json();
    // Delete each existing block
    for (const block of (blocksData.results || [])) {
      await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + _notionToken,
          'Notion-Version': '2022-06-28'
        }
      }).catch(() => {});
    }
  }

  // Append new content
  const appendRes = await fetch(`https://api.notion.com/v1/blocks/${note.notionPageId}/children`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + _notionToken,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ children: _contentToNotionBlocks(note.content) })
  });

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${appendRes.status}`);
  }
}

function _contentToNotionBlocks(content) {
  const lines = (content || '').split('\n');
  const blocks = [];

  for (const line of lines) {
    if (line.trim() === '') {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
    } else {
      // Chunk lines > 2000 chars (Notion limit)
      const chunks = _chunkString(line, 2000);
      for (const chunk of chunks) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] }
        });
      }
    }
  }

  // Notion allows max 100 blocks per request
  return blocks.slice(0, 100);
}

function _chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks.length ? chunks : [''];
}

// ============================================================================
// SYNC STATUS UI
// ============================================================================

function _setSyncStatus(status) {
  _syncStatus = status;
}

function _updateSyncBadge(note) {
  _updateSyncBadgeById(note?.id, note?.notionPageId ? 'synced' : 'idle');
}

function _updateSyncBadgeById(id, status) {
  const badge = document.getElementById('nb-sync-badge');
  if (!badge) return;

  const labels = {
    idle: { text: '', cls: '' },
    syncing: { text: '⟳ Syncing…', cls: 'nb-badge-syncing' },
    synced: { text: '✦ In Notion', cls: 'nb-badge-synced' },
    error: { text: '✕ Sync failed', cls: 'nb-badge-error' },
  };

  // Determine status from note state if not provided
  if (!status && id) {
    const note = _notes.find(n => n.id === id);
    status = note?.notionPageId ? 'synced' : 'idle';
  }

  const { text, cls } = labels[status] || labels.idle;
  badge.textContent = text;
  badge.className = 'nb-sync-badge ' + cls;
}

// ============================================================================
// HELPERS
// ============================================================================

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-MV', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function _autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function _applyNoteColor(color) {
  const areaEl = document.getElementById('nb-editor-area');
  if (areaEl) areaEl.style.color = color;

  // Update active swatch indicator
  document.querySelectorAll('.nb-ink-swatch').forEach(btn => {
    btn.classList.toggle('nb-ink-swatch--active', btn.dataset.color === color);
  });
}

// ============================================================================
// DHIVEHI (THAANA) KEYBOARD INPUT
// ============================================================================

// Standard Maldivian Dhivehi keyboard layout mapping (Latin key → Thaana character)
// Based on the official Dhivehi keyboard layout used in the Maldives.
const _thaanaKeymap = {
  // Row 1 (number row special chars handled separately)
  'q': 'ް',  // Sukun
  'w': 'އ',  // Alef
  'e': 'ެ',  // Ehbeey (fili)
  'r': 'ރ',  // Raa
  't': 'ތ',  // Thaa
  'y': 'ޔ',  // Yaa
  'u': 'ު',  // Oo (fili)
  'i': 'ި',  // Ibifili
  'o': 'ޮ',  // Omeego (fili)
  'p': 'ޕ',  // Paviyani
  'a': 'ަ',  // Abafili
  's': 'ސ',  // Seenu
  'd': 'ދ',  // Daal
  'f': 'ފ',  // Faa
  'g': 'ގ',  // Gaafu
  'h': 'ހ',  // Haa
  'j': 'ޖ',  // Jeem
  'k': 'ކ',  // Kaafu
  'l': 'ލ',  // Laam
  'z': 'ޒ',  // Zain
  'x': 'ް',  // Sukun (alt)
  'c': 'ޗ',  // Chaviyani
  'v': 'ވ',  // Vaviyani
  'b': 'ބ',  // Baa
  'n': 'ނ',  // Noon
  'm': 'މ',  // Miim
  // Shifted variants
  'Q': 'ޤ',  // Qaafu
  'W': 'ޢ',  // Ain
  'E': 'ޭ',  // Ey (fili)
  'R': 'ޜ',  // Rra
  'T': 'ޓ',  // To
  'Y': 'ޠ',  // Ttaa
  'U': 'ޫ',  // Oo-long (fili)
  'I': 'ީ',  // Ee (fili)
  'O': 'ޯ',  // Oo (fili long)
  'P': 'ޞ',  // Saadhu
  'A': 'ާ',  // Aa (fili)
  'S': 'ށ',  // Shaviyani
  'D': 'ޑ',  // Dho
  'F': 'ﷲ', // Allah
  'G': 'ޣ',  // Ghayn
  'H': 'ޙ',  // Hha
  'J': 'ޛ',  // Zhain
  'K': 'ޚ',  // Khaa
  'L': 'ޅ',  // Lhaviyani
  'Z': 'ޡ',  // Zho
  'X': 'ޘ',  // Thaana letter
  'C': 'ޝ',  // Sheenu
  'V': 'ޥ',  // Vaa
  'B': 'ޞ',  // Saadhu (alt)
  'N': 'ޱ',  // Noo
  'M': 'ޟ',  // Dho (alt)
};

// Number-row punctuation passthrough — digits and common punctuation pass as-is.
// Only called when the active note is in Dhivehi mode.
function _interceptThaanaInput(e) {
  // Allow browser/OS shortcuts, function keys, navigation, etc.
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return; // Non-printable (arrows, backspace, enter…)

  // Pass digits and punctuation through unchanged
  if (/^[0-9!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~ ]$/.test(e.key)) return;

  const thaana = _thaanaKeymap[e.key];
  if (!thaana) return; // Unmapped character — let it through

  e.preventDefault();

  const el = e.target;
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  const val   = el.value;

  el.value = val.slice(0, start) + thaana + val.slice(end);
  el.selectionStart = el.selectionEnd = start + thaana.length;

  // Trigger save debounce
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

let _thaanaListenersAttached = false;

function _attachThaanaListeners() {
  if (_thaanaListenersAttached) return;
  _thaanaListenersAttached = true;

  const fields = [
    document.getElementById('nb-editor-area'),
    document.getElementById('nb-editor-title'),
  ];

  fields.forEach(el => {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      const note = _notes.find(n => n.id === _activeNoteId);
      if (note?.language === 'dv') _interceptThaanaInput(e);
    });
  });
}

function _applyLanguageMode(lang) {
  const panel = document.querySelector('.nb-editor-panel');
  const titleEl = document.getElementById('nb-editor-title');

  if (lang === 'dv') {
    panel?.classList.add('dv-mode');
    if (titleEl) {
      titleEl.setAttribute('dir', 'rtl');
      titleEl.placeholder = 'ނޯޓްގެ ނަން…';
    }
    const areaEl = document.getElementById('nb-editor-area');
    if (areaEl) areaEl.setAttribute('dir', 'rtl');
  } else {
    panel?.classList.remove('dv-mode');
    if (titleEl) {
      titleEl.setAttribute('dir', 'ltr');
      titleEl.placeholder = 'Note title…';
    }
    const areaEl = document.getElementById('nb-editor-area');
    if (areaEl) areaEl.setAttribute('dir', 'ltr');
  }

  // Update toggle button active state
  document.querySelectorAll('.nb-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}