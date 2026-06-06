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
        <strong>MTO Document Generator</strong> lets you upload Word (<code>.docx</code>) or
        Excel (<code>.xlsx</code>) templates that contain placeholder tags, fill them in
        through a guided form, and instantly generate and print completed
        documents — no manual file editing required.
      </p>
      <p>
        Templates can be <strong>fillable</strong> (contain <code>{placeholder}</code> tags that produce
        a form) or <strong>static</strong> (printed as-is). The app supports Divehi (Thaana) and
        English text, bilingual date formatting, automatic date-range population, weekday
        computation, image embedding, saved records, and more.
      </p>
    </div>

    <!-- ── NAVIGATION ───────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🧭 Navigation</h2>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Tab</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>Search &amp; Print</strong></td><td>Find any template by name, description, or category and print or fill it immediately.</td></tr>
            <tr><td><strong>Fill Form</strong></td><td>Active form view for the currently selected fillable template. Only accessible after choosing a template.</td></tr>
            <tr><td><strong>Templates</strong></td><td>Full library — upload, edit, configure fields, preview, or delete templates.</td></tr>
            <tr><td><strong>🖼️ Watermark</strong></td><td>Batch-apply a watermark image to multiple photos or images — corner placement or full-width overlay.</td></tr>
            <tr><td><strong>📋 Work Logs</strong></td><td>Record, search, filter, and export a timestamped log of tasks and work activities for your team.</td></tr>
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
        <li>Click <strong>Upload</strong>. The app scans the file and extracts all <code>{placeholder}</code> tags automatically.</li>
      </ol>
      <p class="help-note">
        💡 Categories include: General, Forms, Attendance Sheets, Invoices, Reports, Letters, Contracts, Other.
      </p>

      <h3 class="help-subsection-title">Template Cards</h3>
      <p>Each card shows the template name, file-type badge (<strong>DOCX</strong> / <strong>XLSX</strong>),
      a <strong>print count</strong> (🖨️), and a <em>Fillable</em> or <em>Static</em> badge.
      Inactive templates are dimmed and excluded from the Search page.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>Fill Form</strong></td><td>Open the fill form for a fillable template (only shown when the template has fields).</td></tr>
            <tr><td><strong>Print</strong></td><td>Send a static template directly to the default printer without any form.</td></tr>
            <tr><td><strong>Edit</strong></td><td>Rename, re-describe, re-categorise, or toggle Active / Inactive status.</td></tr>
            <tr><td><strong>⚙️ Fields</strong></td><td>Open the field configuration editor for each detected placeholder.</td></tr>
            <tr><td><strong>Reload Fields</strong></td><td>Re-scan the source file for any new or changed placeholders after editing it externally.</td></tr>
            <tr><td><strong>Preview</strong></td><td>Open the raw template file in its default application (Word / Excel).</td></tr>
            <tr><td><strong>Delete</strong></td><td>Permanently remove the template record and its file from disk.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Field Configuration (⚙️ Fields)</h3>
      <p>For each detected placeholder you can set:</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Setting</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td><strong>Label</strong></td><td>Friendly name shown on the fill form.</td></tr>
            <tr>
              <td><strong>Type</strong></td>
              <td>
                <code>string</code> — plain text input<br>
                <code>number</code> — numeric input<br>
                <code>date</code> — calendar date picker (auto-formatted on generation)<br>
                <code>boolean</code> — Yes / No dropdown<br>
                <code>email</code> — email address input<br>
                <code>dropdown</code> — custom choice list (configure choices below)<br>
                <code>textarea</code> — multi-line text block<br>
                <code>image</code> — PNG / JPG file upload embedded into the document
              </td>
            </tr>
            <tr><td><strong>RTL (Right-to-Left)</strong></td><td>Enables Divehi / Thaana keyboard and formats date fields in Divehi script.</td></tr>
            <tr><td><strong>Required</strong></td><td>Prevents document generation if the field is left empty.</td></tr>
            <tr><td><strong>Dropdown choices</strong></td><td>Enter one option per line (only visible when Type = <code>dropdown</code>).</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 You can also <strong>add</strong> or <strong>remove</strong> fields manually from the field editor —
        useful for placeholders that were not auto-detected or for cleanup.
      </p>
    </div>

    <!-- ── SEARCH & PRINT ────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🔍 Search &amp; Print Page</h2>
      <p>
        Type in the search bar to filter templates by name, description, or category in real time.
        Use the <strong>Type</strong> dropdown (DOCX / XLSX) and the <strong>Fillable</strong>
        dropdown (All / Fillable / Static) to narrow results further.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>Fill Form</strong></td><td>Open the fill form for a fillable template.</td></tr>
            <tr><td><strong>Print</strong></td><td>Send a static template directly to the default printer.</td></tr>
            <tr><td><strong>Preview</strong></td><td>Open the source file for a quick look without printing.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 Only <strong>active</strong> templates appear in Search &amp; Print. Mark a template Inactive in the
        Templates page to hide it here without deleting it.
      </p>
    </div>

    <!-- ── FILL FORM ─────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">📝 Fill Form Page</h2>
      <p>
        After selecting a fillable template, every visible placeholder is shown as a labelled input field.
        Hidden and auto-computed fields are never displayed — they are resolved automatically at generation time.
      </p>

      <h3 class="help-subsection-title">Form Actions</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>Generate &amp; Print</strong></td><td>Fill all placeholders, create the document, and send it directly to the default printer.</td></tr>
            <tr><td><strong>Generate Only (Save)</strong></td><td>Create the document and save it to the Outputs directory without printing.</td></tr>
            <tr><td><strong>Save Record</strong></td><td>Store the current form data as a saved record for this template (visible in the Saved Records panel).</td></tr>
            <tr><td><strong>Clear</strong></td><td>Reset all form inputs to blank.</td></tr>
            <tr><td><strong>← Cancel</strong></td><td>Return to the Search page without generating.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Auto Language Switching</h3>
      <p>
        When you move between form fields, the app automatically switches the keyboard language:
        <strong>Divehi (Thaana)</strong> for RTL fields and <strong>English</strong> for LTR fields.
        A notification banner appears briefly to confirm each switch.
      </p>
      <ul class="help-list">
        <li>Click <strong>✓ Auto-switch ON / Auto-switch OFF</strong> in the form toolbar to toggle this behaviour.</li>
        <li>Keyboard shortcut: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>.</li>
      </ul>

      <h3 class="help-subsection-title">Image Fields</h3>
      <p>
        Fields typed as <code>image</code> accept a <strong>PNG or JPG</strong> file and embed it
        directly into the generated Word document.
      </p>
      <ul class="help-list">
        <li>Use <code>{%field_key}</code> (with a <code>%</code> prefix) in your <code>.docx</code> template — not plain <code>{field_key}</code>.</li>
        <li>After choosing a file, a thumbnail preview appears. Click <strong>✕ Clear</strong> to remove it.</li>
        <li>Set the <strong>Width (px)</strong> field to control how wide the image appears in the document. The default is 150 px.</li>
      </ul>
      <p class="help-note">⚠️ Image embedding is only supported in <code>.docx</code> templates.</p>

      <h3 class="help-subsection-title">Saved Records</h3>
      <p>
        The <strong>Saved Records</strong> panel (right side of the fill form) lists all previously saved
        form entries for the current template. Each record shows the save date/time and a preview of
        the first three field values.
      </p>
      <ul class="help-list">
        <li>Click any record card (or the <strong>Load</strong> button) to restore its values into the form.</li>
        <li>After loading, the form highlights how many fields were restored.</li>
        <li>Records are stored per-template and persist between sessions.</li>
      </ul>

      <h3 class="help-subsection-title">Date Fields — Smart Presets</h3>
      <p>
        Date fields whose placeholder key contains common words like <code>today</code>,
        <code>start</code>, or <code>end</code> open with a sensible default date already set —
        so you rarely need to manually change them.
      </p>
    </div>

    <!-- ── PLACEHOLDER REFERENCE ─────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">🏷️ Placeholder Reference</h2>
      <p>
        Placeholders are written inside curly braces in your Word or Excel template, e.g.
        <code>{employee_name}</code>. The app replaces every placeholder with the value you enter.
        Several special naming conventions trigger <strong>automatic computation</strong> — no user input needed.
      </p>
      <p class="help-note">
        💡 Use <strong>lowercase, underscore-separated</strong> keys, e.g. <code>{employee_name}</code>,
        <code>{start_date}</code>. Avoid spaces or special characters in placeholder keys.
      </p>

      <!-- Standard Field Types -->
      <h3 class="help-subsection-title">Standard Field Types</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Type</th><th>Placeholder example</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><code>string</code></td><td><code>{employee_name}</code></td><td>Plain text; RTL flag enables Divehi input.</td></tr>
            <tr><td><code>number</code></td><td><code>{total_days}</code></td><td>Numeric input.</td></tr>
            <tr><td><code>date</code></td><td><code>{issue_date}</code></td><td>Calendar picker; output formatted by RTL flag (see below).</td></tr>
            <tr><td><code>boolean</code></td><td><code>{is_approved}</code></td><td>Renders as Yes / No in the document.</td></tr>
            <tr><td><code>email</code></td><td><code>{contact_email}</code></td><td>Email address input.</td></tr>
            <tr><td><code>dropdown</code></td><td><code>{department}</code></td><td>Select from choices defined in the field editor.</td></tr>
            <tr><td><code>textarea</code></td><td><code>{remarks}</code></td><td>Multi-line text area.</td></tr>
            <tr><td><code>image</code></td><td><code>{%signature}</code></td><td>PNG/JPG embedded in .docx. Note the <code>%</code> prefix in the template.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Date Formatting -->
      <h3 class="help-subsection-title">Date Formatting</h3>
      <p>
        For any <code>date</code> field, the output format is determined by the field's <strong>RTL</strong> flag
        in the field editor:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>RTL setting</th><th>Format</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>RTL = ON</td><td>Divehi (Thaana script)</td><td>12 މެއި 2026</td></tr>
            <tr><td>RTL = OFF</td><td>English</td><td>12 May 2026</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Add <code>_short</code> anywhere in the placeholder key to omit the year:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>RTL</th><th>Example output</th></tr></thead>
          <tbody>
            <tr><td><code>{issue_date}</code></td><td>OFF</td><td>12 May 2026</td></tr>
            <tr><td><code>{issue_date_short}</code></td><td>OFF</td><td>12 May</td></tr>
            <tr><td><code>{issue_date}</code></td><td>ON</td><td>12 މެއި 2026</td></tr>
            <tr><td><code>{issue_date_short}</code></td><td>ON</td><td>12 މެއި</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Hidden Date Fields -->
      <h3 class="help-subsection-title">Auto-Computed Hidden Date Fields (<code>_hidden</code>)</h3>
      <p>
        Any placeholder whose key ends with <code>_hidden</code> is <strong>computed automatically</strong>
        and never shown in the form. The app derives its value by stripping <code>_hidden</code> from the key
        and looking for the corresponding source field. If no direct match is found it falls back to
        <code>date_range_start</code>. Format follows the field's <strong>RTL</strong> flag.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Source</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td><code>{start_date_hidden}</code></td><td>Value of <code>{start_date}</code></td><td>Formatted copy of start_date, never shown in form.</td></tr>
            <tr><td><code>{end_date_hidden}</code></td><td>Value of <code>{end_date}</code></td><td>Formatted copy of end_date, never shown in form.</td></tr>
            <tr><td><code>{any_key_hidden}</code></td><td>Value of <code>{any_key}</code> or <code>{date_range_start}</code></td><td>Formatted by RTL flag.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 Use <code>_hidden</code> fields to include a formatted copy of a date without displaying a
        redundant input to the user — e.g. show a Divehi version alongside the English input.
      </p>

      <!-- Date Range -->
      <h3 class="help-subsection-title">Date Range Placeholders</h3>
      <p>
        When a template contains sequential date placeholders, the app fills them automatically starting
        from a <strong>seed date</strong>. The seed is taken from the first field whose key contains
        <strong>"start"</strong> (e.g. <code>{date_range_start}</code>, <code>{start_date}</code>).
        All date range fields are <strong>hidden from the form</strong> — they are never shown as inputs.
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
        💡 <strong>N</strong> can be any number. The app detects the highest N present in the template
        automatically — you do not need to configure a count. N=1 maps to the start date, N=2 to start+1 day, and so on.
      </p>

      <!-- Weekday -->
      <h3 class="help-subsection-title">Weekday Placeholders</h3>
      <p>
        Weekday placeholders are always <strong>auto-computed and hidden</strong> from the form.
        They derive their value from the same start date used by date range placeholders.
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

    <!-- ── WATERMARK TOOL ────────────────────────────────────── -->\n    <div class=\"help-section\">\n      <h2 class=\"help-section-title\">🖼️ Watermark Tool</h2>\n      <p>\n        The Watermark page lets you select any number of images, choose a watermark graphic,\n        configure how it is placed, and save all the processed images to a folder in one go.\n        No image editing software required.\n      </p>\n\n      <h3 class=\"help-subsection-title\">Selecting Source Images</h3>\n      <ul class=\"help-list\">\n        <li>Click <strong>Add Images</strong> or drag and drop image files onto the drop zone.</li>\n        <li>Supported formats: <strong>PNG, JPG, WEBP, GIF</strong>.</li>\n        <li>Multiple images can be added at once — they appear as thumbnails in the grid.</li>\n        <li>Hover over any thumbnail and click the <strong>✕</strong> button to remove that image from the batch.</li>\n        <li>Click <strong>Clear All</strong> to remove every image and start fresh.</li>\n      </ul>\n\n      <h3 class=\"help-subsection-title\">Choosing a Watermark Image</h3>\n      <ul class=\"help-list\">\n        <li>Click <strong>Choose File</strong> in the Watermark Image card and pick any PNG or JPG.</li>\n        <li>A preview thumbnail appears immediately. An <strong>✓ Active</strong> badge confirms it is loaded.</li>\n        <li>The last few watermarks you used appear in the <strong>Recent</strong> strip below — click any to reload it instantly without browsing again.</li>\n        <li>Click the small <strong>✕</strong> on a recent entry to remove it from the list.</li>\n      </ul>\n\n      <h3 class=\"help-subsection-title\">Placement Mode</h3>\n      <div class=\"help-table-wrapper\">\n        <table class=\"help-table\">\n          <thead><tr><th>Mode</th><th>Behaviour</th></tr></thead>\n          <tbody>\n            <tr>\n              <td><strong>Corner</strong></td>\n              <td>\n                The watermark is scaled so its height equals <strong>15% of the source image height</strong>,\n                with width proportional to the watermark's own aspect ratio.\n                It is placed in the <strong>bottom-right corner</strong> with a small padding margin.\n                The output image is the same dimensions as the original.\n              </td>\n            </tr>\n            <tr>\n              <td><strong>Full Width</strong></td>\n              <td>\n                The watermark is scaled so its <strong>width exactly matches the source image width</strong>,\n                with height scaled proportionally.\n                It is overlaid flush against the <strong>bottom edge</strong> of the image.\n                The output image is the same dimensions as the original — the watermark overlaps the bottom portion of the photo.\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n\n      <h3 class=\"help-subsection-title\">Applying the Watermark</h3>\n      <ol class=\"help-list\">\n        <li>With images and a watermark selected, click <strong>Apply Watermark</strong>.</li>\n        <li>A native <strong>folder picker</strong> dialog opens — choose where the processed images should be saved.</li>\n        <li>The app creates a <code>watermarked\\</code> subfolder inside the chosen location and saves each image there.</li>\n        <li>Output filenames match the originals with <code>_wm</code> appended before the extension (e.g. <code>photo_wm.png</code>).</li>\n        <li>A progress bar tracks each file. A success notification confirms how many images were saved and where.</li>\n      </ol>\n      <p class=\"help-note\">\n        💡 The output folder is remembered for the current session. To save to a different location, click\n        <strong>Clear All</strong> first — this resets the folder so the picker appears again on the next run.\n      </p>\n\n      <h3 class=\"help-subsection-title\">Recent Watermarks</h3>\n      <p>\n        The app persists your last <strong>6 watermark images</strong> in browser storage so you\n        can quickly re-apply a logo or stamp without browsing for the file each time.\n        The most recently used watermark always appears first. Entries survive app restarts.\n      </p>\n    </div>\n\n    <!-- ── WORK LOGS ────────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">📋 Work Logs</h2>
      <p>
        The <strong>Work Logs</strong> page provides a timestamped activity journal for staff.
        Each entry records a task description, optional notes, and an automatic date and time
        captured in <strong>Maldives Time (MVT, UTC+5)</strong>. Logs can be searched, filtered
        by date range, and exported to Excel for reporting.
      </p>

      <h3 class="help-subsection-title">Summary Stats</h3>
      <p>
        Three counters at the top of the page give a quick overview at a glance:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Counter</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><strong>This Month</strong></td><td>Number of logs recorded in the current calendar month.</td></tr>
            <tr><td><strong>This Year</strong></td><td>Number of logs recorded in the current calendar year.</td></tr>
            <tr><td><strong>Total</strong></td><td>Grand total of all logs ever saved.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Adding a Log Entry</h3>
      <ol class="help-list">
        <li>The <strong>Date</strong> and <strong>Time</strong> fields are filled automatically using the live MVT clock — no manual entry needed.</li>
        <li>Type a <strong>Task</strong> description (required). This is the main activity or work item being recorded.</li>
        <li>Optionally add <strong>Notes</strong> for additional context, instructions, or remarks.</li>
        <li>Click <strong>Save Log</strong> (or press <kbd>Enter</kbd> in the Task field) to save the entry immediately.</li>
      </ol>
      <p class="help-note">
        💡 The Task field is required — a log cannot be saved without it. The date and time are stamped
        automatically at the moment you press Save; you cannot back-date an entry.
      </p>

      <h3 class="help-subsection-title">Searching and Filtering Logs</h3>
      <p>
        The log table supports live keyword search and a date-range filter simultaneously:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Control</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr><td><strong>Search box</strong></td><td>Filters rows in real time by any text in the Task or Notes columns.</td></tr>
            <tr><td><strong>From date</strong></td><td>Shows only logs on or after the selected date.</td></tr>
            <tr><td><strong>To date</strong></td><td>Shows only logs on or before the selected date.</td></tr>
            <tr><td><strong>Clear Filters</strong></td><td>Resets both the keyword search and date range, restoring the full list.</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The results count beneath the filters updates automatically to show how many logs match.
      </p>

      <h3 class="help-subsection-title">Deleting a Log</h3>
      <p>
        Each row in the table has a <strong>🗑 delete</strong> button on the right. Click it and
        confirm the prompt to permanently remove that entry. Deletion cannot be undone.
      </p>

      <h3 class="help-subsection-title">Exporting to Excel</h3>
      <p>
        Click <strong>Export to Excel</strong> to save the currently visible logs (respecting any
        active search or date filter) as an <code>.xlsx</code> spreadsheet. The exported file
        includes columns for: <em>No., Date, Time, Task,</em> and <em>Notes</em>.
        A native save dialog lets you choose where the file is written.
      </p>
      <p class="help-note">
        💡 If a search or date filter is active when you export, only the filtered results are
        included. Clear all filters first to export every log.
      </p>
    </div>

    <!-- ── SETTINGS ───────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">⚙️ Settings Page</h2>
      <p>
        The Settings page lets you change where the app stores its data and view information about the
        installed version. Each path has a <strong>Browse</strong> button so you can pick a folder without typing.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Setting</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><strong>Templates Directory</strong></td><td>Where uploaded template files (<code>.docx</code>, <code>.xlsx</code>) are stored on disk.</td></tr>
            <tr><td><strong>Outputs Directory</strong></td><td>Where generated (filled) documents are saved when using <em>Generate Only</em>.</td></tr>
            <tr><td><strong>Database Folder</strong></td><td>Folder containing <code>database.json</code> — the registry of all templates and saved records.</td></tr>
            <tr><td><strong>Save Settings</strong></td><td>Apply new directory paths immediately. All views reload automatically to reflect the change.</td></tr>
            <tr><td><strong>Reset to Defaults</strong></td><td>Restore all paths to their original default locations.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        ⚠️ After changing the Database Folder, the app uses the new location immediately.
        If you move the <code>database.json</code> file manually, make sure to point this setting to its new folder.
      </p>
      <h3 class="help-subsection-title">About</h3>
      <p>
        The <strong>About</strong> section at the bottom of Settings displays the app version, developer contact
        details, and repository link. This information is useful when reporting bugs or requesting support.
      </p>
    </div>

    <!-- ── TIPS ──────────────────────────────────────────────── -->
    <div class="help-section">
      <h2 class="help-section-title">💡 Tips &amp; Best Practices</h2>
      <ul class="help-list">
        <li>Use <strong>lowercase, underscore-separated</strong> keys in all placeholders, e.g. <code>{employee_name}</code>. Avoid spaces or special characters.</li>
        <li>After editing a template file externally, click <strong>Reload Fields</strong> on its card to re-scan for new or renamed placeholders.</li>
        <li>Mark date fields as <strong>RTL</strong> in the field editor for automatic Divehi formatting on generation.</li>
        <li>Any placeholder key ending in <code>_hidden</code> is never shown to the user — use this for computed or reformatted copies of other fields.</li>
        <li>You can freely mix date range, weekday, and hidden placeholders in the same template. All are resolved automatically from a single start date.</li>
        <li>For image placeholders in Word, use the <code>{%field_key}</code> syntax (with a <code>%</code>) — plain <code>{field_key}</code> will not embed the image.</li>
        <li>Use <strong>Dropdown</strong> type fields to enforce consistent values (e.g. department names, approval statuses) and prevent typos.</li>
        <li>Click <strong>Save Record</strong> before generating to keep a log of form data — you can reload it later without re-entering everything.</li>
        <li>The <strong>print count</strong> (🖨️) on each card updates every time you open the Templates or Search page.</li>
        <li>Mark rarely-used templates as <strong>Inactive</strong> to hide them from Search without deleting them.</li>
        <li>Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> inside a fill form to toggle automatic language switching on or off.</li>
        <li>For the <strong>Watermark</strong> tool, use a <strong>PNG with a transparent background</strong> as your watermark image for the cleanest result — opaque backgrounds will cover the photo underneath.</li>
        <li>In <strong>Corner</strong> mode the watermark scales to 15% of the image height — use a <strong>horizontally wider</strong> watermark graphic for the best proportions in this mode.</li>
        <li>In <strong>Full Width</strong> mode the watermark spans the entire image width — a <strong>wide, short banner</strong> graphic (high aspect ratio) works best to avoid covering too much of the photo.</li>
        <li>The <strong>output folder</strong> for watermarked images is chosen once per session. Click <strong>Clear All</strong> to reset it so you can choose a different folder on the next batch.</li>
        <li>In <strong>Work Logs</strong>, press <kbd>Enter</kbd> in the Task field to save quickly without reaching for the mouse.</li>
        <li>Use the <strong>From / To</strong> date filters in Work Logs to scope the view before exporting — only filtered rows are written to the Excel file.</li>
        <li>Work log timestamps are fixed to <strong>Maldives Time (MVT)</strong> and cannot be manually edited, ensuring an accurate audit trail.</li>
      </ul>
    </div>

  `;
};