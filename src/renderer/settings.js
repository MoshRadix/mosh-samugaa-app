// settings.js – with prevent double event listeners
let settingsListenersAttached = false;

async function loadSettings() {
  const settings = await window.electronAPI.getSettings();
  document.getElementById('templates-dir').value = settings.templatesDir;
  document.getElementById('outputs-dir').value = settings.outputsDir;
  // Extract folder containing database.json
  const dbFolder = settings.dbPath.substring(0, settings.dbPath.lastIndexOf('/') !== -1
    ? settings.dbPath.lastIndexOf('/')
    : settings.dbPath.lastIndexOf('\\'));
  document.getElementById('db-folder').value = dbFolder;
}

function setupSettings() {
  // Prevent multiple attachments
  if (settingsListenersAttached) return;
  settingsListenersAttached = true;

  // Browse buttons
  const btnTemplates = document.getElementById('choose-templates-dir');
  const btnOutputs = document.getElementById('choose-outputs-dir');
  const btnDbFolder = document.getElementById('choose-db-folder');

  if (btnTemplates) {
    btnTemplates.addEventListener('click', async () => {
      const dir = await window.electronAPI.openDirectoryDialog();
      if (dir) document.getElementById('templates-dir').value = dir;
    });
  }
  if (btnOutputs) {
    btnOutputs.addEventListener('click', async () => {
      const dir = await window.electronAPI.openDirectoryDialog();
      if (dir) document.getElementById('outputs-dir').value = dir;
    });
  }
  if (btnDbFolder) {
    btnDbFolder.addEventListener('click', async () => {
      const dir = await window.electronAPI.openDirectoryDialog();
      if (dir) document.getElementById('db-folder').value = dir;
    });
  }

  // Save settings
  const saveBtn = document.getElementById('save-settings');
  if (saveBtn) {
    // Remove any existing listener to be safe (though flag prevents duplicates)
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    const newSaveBtn = document.getElementById('save-settings');
    newSaveBtn.addEventListener('click', async () => {
      const templatesDir = document.getElementById('templates-dir').value.trim();
      const outputsDir = document.getElementById('outputs-dir').value.trim();
      const dbFolder = document.getElementById('db-folder').value.trim();

      if (!templatesDir || !outputsDir || !dbFolder) {
        if (window.showToast) window.showToast('All paths are required', 'warning');
        else alert('All paths are required');
        return;
      }

      try {
        await window.electronAPI.updateSettings({ templatesDir, outputsDir, dbFolder });
        if (window.showToast) window.showToast('Settings saved. The app will now use the new locations.', 'success');
        else alert('Settings saved');

        // Reload views to reflect moved data
        if (typeof loadTemplates === 'function') await loadTemplates();
        if (typeof loadSearchResults === 'function') await loadSearchResults();
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error saving settings: ' + err.message, 'error');
        else alert('Error: ' + err.message);
      }
    });
  }

  // Reset settings
  const resetBtn = document.getElementById('reset-settings');
  if (resetBtn) {
    resetBtn.replaceWith(resetBtn.cloneNode(true));
    const newResetBtn = document.getElementById('reset-settings');
    newResetBtn.addEventListener('click', async () => {
      if (await showConfirm('Reset all settings to defaults? This will move data directories back to the default location.', 'Reset')) {
        await window.electronAPI.resetSettings();
        await loadSettings();
        if (window.showToast) window.showToast('Settings reset to defaults. Please restart the app for full effect.', 'info');
        else alert('Settings reset');
        if (typeof loadTemplates === 'function') await loadTemplates();
        if (typeof loadSearchResults === 'function') await loadSearchResults();
      }
    });
  }
}
async function loadAboutInfo() {
  const aboutContainer = document.getElementById('about-content');
  if (!aboutContainer) return;
  
  try {
    const info = await window.electronAPI.getAppInfo();
    aboutContainer.innerHTML = `
      <p><strong>📦 App Name:</strong> ${escapeHtml(info.name)}</p>
      <p><strong>🔢 Version:</strong> ${escapeHtml(info.version)}</p>
      <p><strong>👨‍💻 Developer:</strong> ${escapeHtml(info.author)}</p>
      <p><strong>📧 Email:</strong> <a href="mailto:${escapeHtml(info.email)}">${escapeHtml(info.email)}</a></p>
      <p><strong>📞 Phone:</strong> <a href="tel:${escapeHtml(info.phone)}">${escapeHtml(info.phone)}</a></p>
      <p><strong>🔗 Repository:</strong> <a href="${escapeHtml(info.repo)}" target="_blank">${escapeHtml(info.repo)}</a></p>
      <p><strong>🖥️ Platform:</strong> ${escapeHtml(info.platform)} (${escapeHtml(info.arch)})</p>
      <div class="about-quote">“${escapeHtml(info.quote)}”</div>
    `;
  } catch (error) {
    console.error("Failed to load about info:", error);
    aboutContainer.innerHTML = '<p class="error">Unable to load application information.</p>';
  }
}

// Called when Settings view becomes active
window.initSettings = () => {
  loadSettings();
  setupSettings();
   loadAboutInfo();   // ← add this line
};