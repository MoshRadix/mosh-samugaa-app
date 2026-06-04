/**
 * @file help.js
 * @description Help page content and initialization for MTO Document Generator.
 */

window.initHelp = function () {
  const container = document.getElementById("help-content");
  if (!container) return;

  container.innerHTML = `

    <!-- ── OVERVIEW ─────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">📄 Overview</h2>
      <p>
        <strong>MTO Document Generator</strong> lets you upload Word (.docx) or
        Excel (.xlsx) templates that contain placeholder tags, fill them in
        through a guided form, and instantly generate and print completed
        documents. No manual editing of files is ever required.
      </p>
    </div>

    <!-- ── NAVIGATION ───────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🧭 Navigation</h2>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Tab</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>Search &amp; Print</strong></td><td>Find any template and print or fill it immediately.</td></tr>
            <tr><td><strong>Fill Form</strong></td><td>Active form view for a selected fillable template.</td></tr>
            <tr><td><strong>Templates</strong></td><td>Full library — upload, edit, configure fields, preview or delete templates.</td></tr>
            <tr><td><strong>Settings</strong></td><td>Change storage directories and view app information.</td></tr>
            <tr><td><strong>Help</strong></td><td>This page.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TEMPLATES PAGE ───────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🗂️ Templates Page</h2>

      <h3 class="help-subsection-title">Uploading a Template</h3>
      <ol class="help-list">
        <li>Click <strong>+ New Template</strong>.</li>
        <li>Select a <code>.docx</code> or <code>.xlsx</code> file from disk.</li>
        <li>Enter a <strong>Name</strong>, optional <strong>Description</strong>, and <strong>Category</strong>.</li>
        <li>Click <strong>Upload</strong>. The app parses all <code>{placeholder}</code> tags automatically.</li>
      </ol>

      <h3 class="help-subsection-title">Template Cards</h3>
      <p>Each card shows the template name, file type badge, a <strong>print count</strong> (🖨️), and a <em>Fillable / Static</em> badge.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Fill Form</td><td>Open the form to fill and generate a document.</td></tr>
            <tr><td>Print</td><td>Send a static (no-form) template directly to the printer.</td></tr>
            <tr><td>Edit</td><td>Rename, re-describe, re-categorise, or toggle Active/Inactive.</td></tr>
            <tr><td>⚙️ Fields</td><td>Configure each placeholder — type, label, RTL, required, dropdown choices.</td></tr>
            <tr><td>Reload Fields</td><td>Re-scan the file for new placeholders after editing the source file.</td></tr>
            <tr><td>Preview</td><td>Open the raw template file in its default application.</td></tr>
            <tr><td>Delete</td><td>Permanently remove the template and its file.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Field Configuration (⚙️ Fields)</h3>
      <p>For each detected placeholder you can set:</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Setting</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td>Label</td><td>Friendly name shown in the fill form.</td></tr>
            <tr><td>Type</td><td>string · number · date · boolean · email · dropdown · textarea</td></tr>
            <tr><td>RTL (Right-to-Left)</td><td>Enables Divehi / Thaana keyboard input and formats date fields in Divehi.</td></tr>
            <tr><td>Required</td><td>Prevents generation if the field is left empty.</td></tr>
            <tr><td>Dropdown choices</td><td>One option per line (visible when Type = dropdown).</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── SEARCH & PRINT ────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🔍 Search &amp; Print Page</h2>
      <p>
        Type in the search bar to filter by name, description, or category.
        Use the <strong>Type</strong> and <strong>Fillable</strong> dropdowns to narrow results further.
      </p>
      <ul class="help-list">
        <li><strong>Fill Form</strong> — opens the form for fillable templates.</li>
        <li><strong>Print</strong> — sends static templates directly to the default printer.</li>
        <li><strong>Preview</strong> — opens the source file for a quick look.</li>
      </ul>
    </div>

    <!-- ── FILL FORM ─────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">📝 Fill Form Page</h2>
      <p>After selecting a fillable template, every visible placeholder is shown as a labelled input field.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Generate &amp; Print</td><td>Fill all placeholders, create the document, and send it to the printer.</td></tr>
            <tr><td>Generate Only (Save)</td><td>Create the document and save it to the Outputs directory without printing.</td></tr>
            <tr><td>Save Record</td><td>Store the form data in the history log for this template.</td></tr>
            <tr><td>Clear</td><td>Reset all inputs.</td></tr>
            <tr><td>← Cancel</td><td>Return to the Templates page.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 Date fields automatically switch the keyboard to Divehi or English depending on the field's RTL setting.
      </p>
    </div>

    <!-- ── PLACEHOLDER REFERENCE ─────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🏷️ Placeholder Reference</h2>
      <p>
        Placeholders are written inside curly braces in your Word or Excel template, for example
        <code>{employee_name}</code>. The app replaces them with the values you enter in the form.
        Several special naming conventions trigger automatic computation — no user input needed.
      </p>

      <!-- Date Formatting -->
      <h3 class="help-subsection-title">Date Formatting</h3>
      <p>
        For any date field, the output format is controlled by the field's <strong>RTL</strong> flag in the field editor:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>RTL setting</th><th>Format</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>RTL = ON</td><td>Divehi</td><td>12 މެއި 2026</td></tr>
            <tr><td>RTL = OFF</td><td>English</td><td>12 May 2026</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Adding <code>_short</code> anywhere in the placeholder key omits the year:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Example output</th></tr></thead>
          <tbody>
            <tr><td><code>{start_date_divehi}</code> (RTL=ON)</td><td>12 މެއި 2026</td></tr>
            <tr><td><code>{start_date_short_divehi}</code> (RTL=ON)</td><td>12 މެއި</td></tr>
            <tr><td><code>{start_date_english}</code> (RTL=OFF)</td><td>12 May 2026</td></tr>
            <tr><td><code>{start_date_short_english}</code> (RTL=OFF)</td><td>12 May</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Hidden Date Fields -->
      <h3 class="help-subsection-title">Auto-Computed Hidden Date Fields (<code>_hidden</code>)</h3>
      <p>
        Any placeholder whose key ends with <code>_hidden</code> is computed automatically and never shown in the form.
        The app derives its value by stripping <code>_hidden</code> from the key and looking for the corresponding source field.
        If no direct match is found it falls back to <code>date_range_start</code>.
        Format follows the field's <strong>RTL</strong> flag.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Source</th></tr></thead>
          <tbody>
            <tr><td><code>{start_date_hidden}</code></td><td>Value of <code>{start_date}</code>, formatted by RTL flag</td></tr>
            <tr><td><code>{end_date_hidden}</code></td><td>Value of <code>{end_date}</code>, formatted by RTL flag</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Date Range -->
      <h3 class="help-subsection-title">Date Range Placeholders</h3>
      <p>
        When a template contains sequential date placeholders, the app fills them automatically starting from
        a seed date. The seed is taken from the first field whose key contains <strong>"start"</strong>
        (e.g. <code>{date_range_start}</code>, <code>{start_date_divehi}</code>, <code>{start_date}</code>).
        All date range fields are hidden from the form — they are never shown as inputs.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder pattern</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td><code>{date_range_1}</code> … <code>{date_range_N}</code></td><td>Divehi date, day N (legacy)</td></tr>
            <tr><td><code>{date_range_divehi_1}</code> … <code>{date_range_divehi_N}</code></td><td>Divehi date, day N</td></tr>
            <tr><td><code>{date_range_english_1}</code> … <code>{date_range_english_N}</code></td><td>English date, day N</td></tr>
            <tr><td><code>{date_range_divehi_short_1}</code> … <code>{date_range_divehi_short_N}</code></td><td>Divehi date without year, day N</td></tr>
            <tr><td><code>{date_range_english_short_1}</code> … <code>{date_range_english_short_N}</code></td><td>English date without year, day N</td></tr>
            <tr><td><code>{date_range_short_divehi_1}</code> … <code>{date_range_short_divehi_N}</code></td><td>Divehi date without year, day N (alt order)</td></tr>
            <tr><td><code>{date_range_short_english_1}</code> … <code>{date_range_short_english_N}</code></td><td>English date without year, day N (alt order)</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 N can be any number. The app detects the highest N present in the template automatically — you do not need to configure a count.
      </p>

      <!-- Weekday -->
      <h3 class="help-subsection-title">Weekday Placeholders</h3>
      <p>
        Weekday placeholders are always <strong>auto-computed and hidden</strong> from the form.
        Two patterns are supported:
      </p>

      <h4 class="help-subsubsection-title">Pattern A — Fixed day sequence (day token in key)</h4>
      <p>
        The sequence always starts on the named day regardless of the chosen date.
        <code>_sun_</code> → N=1 is always Sunday, N=2 Monday, N=3 Tuesday, etc.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_divehi_hidden_sun_1}</code></td><td>ފުރަތަމަ ދުވަހަކީ: އާދިއްތަ</td></tr>
            <tr><td><code>{weekday_divehi_hidden_sun_2}</code></td><td>ހޯމަ</td></tr>
            <tr><td><code>{weekday_divehi_hidden_mon_1}</code></td><td>ހޯމަ (starts Monday)</td></tr>
            <tr><td><code>{weekday_english_hidden_sun_1}</code></td><td>Sunday</td></tr>
            <tr><td><code>{weekday_english_hidden_mon_3}</code></td><td>Wednesday</td></tr>
          </tbody>
        </table>
      </div>
      <p>Supported day tokens: <code>sun</code> · <code>mon</code> · <code>tue</code> · <code>wed</code> · <code>thu</code> · <code>fri</code> · <code>sat</code></p>

      <h4 class="help-subsubsection-title">Pattern B — Calendar sequence (no day token)</h4>
      <p>
        N=1 is the weekday of the chosen start date, N=2 is start+1 day, etc.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output (start date = Wednesday)</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_divehi_hidden_1}</code></td><td>ބުދަ</td></tr>
            <tr><td><code>{weekday_divehi_hidden_2}</code></td><td>ބުރާސްފަތި</td></tr>
            <tr><td><code>{weekday_english_hidden_1}</code></td><td>Wednesday</td></tr>
            <tr><td><code>{weekday_english_hidden_2}</code></td><td>Thursday</td></tr>
          </tbody>
        </table>
      </div>

      <h4 class="help-subsubsection-title">Short weekday names (<code>_short</code>)</h4>
      <p>
        Insert <code>_short</code> anywhere in the key to use abbreviated names.
        <code>_short</code> can appear before or after <code>hidden</code>.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_english_hidden_short_1}</code></td><td>Wed</td></tr>
            <tr><td><code>{weekday_divehi_hidden_short_1}</code></td><td>ބުދަ (short)</td></tr>
            <tr><td><code>{weekday_english_short_hidden_sun_1}</code></td><td>Sun</td></tr>
            <tr><td><code>{weekday_divehi_short_hidden_mon_2}</code></td><td>Tue (short Divehi)</td></tr>
          </tbody>
        </table>
      </div>

      <div class="help-note">
        <strong>Full short name reference:</strong><br>
        English: Sun · Mon · Tue · Wed · Thu · Fri · Sat<br>
        Divehi: އާދި · ހޯމަ · އަން · ބުދަ · ބުރާ · ހުކު · ހޮނި
      </div>
    </div>

    <!-- ── SETTINGS ───────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">⚙️ Settings Page</h2>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Setting</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Templates Directory</td><td>Where uploaded template files are stored on disk.</td></tr>
            <tr><td>Outputs Directory</td><td>Where generated documents are saved.</td></tr>
            <tr><td>Database Folder</td><td>Folder containing <code>database.json</code> (template registry and records).</td></tr>
            <tr><td>Save Settings</td><td>Apply new directory paths immediately.</td></tr>
            <tr><td>Reset to Defaults</td><td>Restore all paths to their original default locations.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TIPS ──────────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">💡 Tips &amp; Best Practices</h2>
      <ul class="help-list">
        <li>Use <strong>lowercase, underscore-separated</strong> keys in placeholders, e.g. <code>{employee_name}</code>.</li>
        <li>After editing a template file, use <strong>Reload Fields</strong> on the template card to re-scan for new placeholders.</li>
        <li>Mark date fields as <strong>RTL</strong> in the field editor for automatic Divehi formatting.</li>
        <li>Any placeholder key ending in <code>_hidden</code> is never shown to the user — use this for computed or derived values.</li>
        <li>You can mix date range and weekday placeholders in the same template freely — the app resolves all of them from a single start date.</li>
        <li>The <strong>print count</strong> (🖨️) on each card updates every time you open the Templates or Search page.</li>
        <li>Use <strong>Save Record</strong> to keep a log of generated documents for a template — visible in the Saved Records panel on the fill form.</li>
      </ul>
    </div>

  `;
};
