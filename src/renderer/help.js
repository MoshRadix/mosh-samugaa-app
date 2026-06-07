/**
 * @file help.js
 * @description Help page content and initialization for MTO Document Generator.
 */

window.initHelp = function () {
  const container = document.getElementById("help-content");
  if (!container) return;

  container.innerHTML = `

    <!-- ══ HELP HERO ════════════════════════════════════════════ -->
    <div class="help-hero">
      <div class="help-hero-icon">📄</div>
      <div class="help-hero-text">
        <h1 class="help-hero-title">MTO Document Generator</h1>
        <p class="help-hero-sub">Complete user guide — templates, tools, placeholders, and more</p>
      </div>
    </div>

    <!-- ══ QUICK-NAV PILLS ══════════════════════════════════════ -->
    <div class="help-quicknav">
      <a href="#hn-overview"     class="help-pill">Overview</a>
      <a href="#hn-navigation"   class="help-pill">Navigation</a>
      <a href="#hn-templates"    class="help-pill">Templates</a>
      <a href="#hn-search"       class="help-pill">Search &amp; Print</a>
      <a href="#hn-fillform"     class="help-pill">Fill Form</a>
      <a href="#hn-placeholders" class="help-pill">Placeholders</a>
      <a href="#hn-watermark"    class="help-pill">Watermark</a>
      <a href="#hn-worklogs"     class="help-pill">Work Logs</a>
      <a href="#hn-utilities"    class="help-pill">Utilities</a>
      <a href="#hn-settings"     class="help-pill">Settings</a>
      <a href="#hn-tips"         class="help-pill">Tips</a>
    </div>

    <!-- ══ OVERVIEW ═════════════════════════════════════════════ -->
    <div class="help-section" id="hn-overview">
      <h2 class="help-section-title">📄 Overview</h2>
      <p>
        <strong>MTO Document Generator</strong> is a desktop application for generating and printing
        filled Word (<code>.docx</code>) or Excel (<code>.xlsx</code>) documents from reusable
        templates — no manual file editing required.
      </p>
      <p>
        Templates can be <strong>fillable</strong> (contain <code>{placeholder}</code> tags that
        produce a guided form) or <strong>static</strong> (printed as-is). The app supports
        Divehi (Thaana) and English text, bilingual date formatting, automatic date-range population,
        weekday computation, image embedding, saved records, and a growing suite of built-in tools.
      </p>
      <div class="help-feature-grid">
        <div class="help-feature-card">
          <span class="help-feature-icon">📝</span>
          <strong>Template Forms</strong>
          <span>Fill placeholders through a guided UI</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🌐</span>
          <strong>Bilingual</strong>
          <span>Divehi &amp; English dates and text</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🖼️</span>
          <strong>Watermark Tool</strong>
          <span>Batch-stamp images in one click</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">📋</span>
          <strong>Work Logs</strong>
          <span>Timestamped activity journal</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🔧</span>
          <strong>Utilities</strong>
          <span>Unit converter, date calc, tides &amp; more</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">📅</span>
          <strong>Calendar</strong>
          <span>Maldives holidays &amp; Hijri dates</span>
        </div>
      </div>
    </div>

    <!-- ══ NAVIGATION ═══════════════════════════════════════════ -->
    <div class="help-section" id="hn-navigation">
      <h2 class="help-section-title">🧭 Navigation</h2>
      <p>The top navigation bar gives access to every section of the app:</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Tab</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>Search &amp; Print</strong></td><td>Find any template by name, description, or category and print or fill it immediately.</td></tr>
            <tr><td><strong>Fill Form</strong></td><td>Active form for the currently selected fillable template. Only accessible after choosing a template.</td></tr>
            <tr><td><strong>Templates</strong></td><td>Full template library — upload, edit, configure fields, preview, or delete templates.</td></tr>
            <tr><td><strong>🔧 Utilities</strong></td><td>Unit Converter, Date Calculator, Scientific Calculator, Maldives Calendar, Moon Phase, and Tide Chart — all in one place.</td></tr>
            <tr><td><strong>🖼️ Watermark</strong></td><td>Batch-apply a watermark image to multiple photos — corner placement or full-width overlay.</td></tr>
            <tr><td><strong>📋 Work Logs</strong></td><td>Record, search, filter, and export a timestamped log of tasks and work activities.</td></tr>
            <tr><td><strong>⚙️ Settings</strong></td><td>Change storage directories and view app information.</td></tr>
            <tr><td><strong>❓ Help</strong></td><td>This page.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ TEMPLATES PAGE ═══════════════════════════════════════ -->
    <div class="help-section" id="hn-templates">
      <h2 class="help-section-title">🗂️ Templates Page</h2>

      <h3 class="help-subsection-title">Uploading a Template</h3>
      <ol class="help-list">
        <li>Click <strong>+ New Template</strong>.</li>
        <li>Select a <code>.docx</code> or <code>.xlsx</code> file from disk.</li>
        <li>Enter a <strong>Name</strong>, optional <strong>Description</strong>, and <strong>Category</strong>.</li>
        <li>Click <strong>Upload</strong>. The app scans the file and extracts all <code>{placeholder}</code> tags automatically.</li>
      </ol>
      <p class="help-note">
        💡 Categories: General, Forms, Attendance Sheets, Invoices, Reports, Letters, Contracts, Other.
      </p>

      <h3 class="help-subsection-title">Template Cards</h3>
      <p>Each card shows the template name, file-type badge (<strong>DOCX</strong> / <strong>XLSX</strong>),
      a <strong>print count</strong> (🖨️), and a <em>Fillable</em> or <em>Static</em> badge.
      Inactive templates are dimmed and excluded from the Search page.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>Fill Form</strong></td><td>Open the fill form for a fillable template (shown only when the template has fields).</td></tr>
            <tr><td><strong>Print</strong></td><td>Send a static template directly to the default printer without any form.</td></tr>
            <tr><td><strong>Edit</strong></td><td>Rename, re-describe, re-categorise, or toggle Active / Inactive status.</td></tr>
            <tr><td><strong>⚙️ Fields</strong></td><td>Open the field configuration editor for each detected placeholder.</td></tr>
            <tr><td><strong>Reload Fields</strong></td><td>Re-scan the source file for new or changed placeholders after editing it externally.</td></tr>
            <tr><td><strong>Preview</strong></td><td>Open the raw template file in its default application (Word / Excel).</td></tr>
            <tr><td><strong>Delete</strong></td><td>Permanently remove the template record and its file from disk.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Field Configuration (⚙️ Fields)</h3>
      <p>For each detected placeholder you can configure:</p>
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
                <code>dropdown</code> — custom choice list<br>
                <code>textarea</code> — multi-line text block<br>
                <code>image</code> — PNG / JPG file embedded into the document
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

    <!-- ══ SEARCH & PRINT ═══════════════════════════════════════ -->
    <div class="help-section" id="hn-search">
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
        💡 Only <strong>active</strong> templates appear here. Mark a template Inactive in the
        Templates page to hide it without deleting it.
      </p>
    </div>

    <!-- ══ FILL FORM ═════════════════════════════════════════════ -->
    <div class="help-section" id="hn-fillform">
      <h2 class="help-section-title">📝 Fill Form Page</h2>
      <p>
        After selecting a fillable template, every visible placeholder is shown as a labelled input
        field. Hidden and auto-computed fields are never displayed — they are resolved automatically
        at generation time.
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
        A notification banner confirms each switch.
      </p>
      <ul class="help-list">
        <li>Click <strong>✓ Auto-switch ON / Auto-switch OFF</strong> in the form toolbar to toggle.</li>
        <li>Keyboard shortcut: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>.</li>
      </ul>

      <h3 class="help-subsection-title">Image Fields</h3>
      <p>
        Fields typed as <code>image</code> accept a <strong>PNG or JPG</strong> file and embed
        it directly into the generated Word document.
      </p>
      <ul class="help-list">
        <li>Use <code>{%field_key}</code> (with a <code>%</code> prefix) in your <code>.docx</code> template — not plain <code>{field_key}</code>.</li>
        <li>After choosing a file, a thumbnail preview appears. Click <strong>✕ Clear</strong> to remove it.</li>
        <li>Set the <strong>Width (px)</strong> field to control how wide the image appears in the document. Default is 150 px.</li>
      </ul>
      <p class="help-note">⚠️ Image embedding is only supported in <code>.docx</code> templates.</p>

      <h3 class="help-subsection-title">Saved Records</h3>
      <p>
        The <strong>Saved Records</strong> panel (right side of the form) lists all previously saved
        entries for the current template. Each record shows the save date/time and a preview of the
        first three field values.
      </p>
      <ul class="help-list">
        <li>Click any record card (or the <strong>Load</strong> button) to restore its values into the form.</li>
        <li>After loading, the form highlights how many fields were restored.</li>
        <li>Records are stored per-template and persist between sessions.</li>
      </ul>

      <h3 class="help-subsection-title">Date Fields — Smart Presets</h3>
      <p>
        Date fields whose placeholder key contains common words like <code>today</code>,
        <code>start</code>, or <code>end</code> open with a sensible default date already set,
        so you rarely need to change them manually.
      </p>
    </div>

    <!-- ══ PLACEHOLDER REFERENCE ════════════════════════════════ -->
    <div class="help-section" id="hn-placeholders">
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

      <h3 class="help-subsection-title">Standard Field Types</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Type</th><th>Example placeholder</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><code>string</code></td><td><code>{employee_name}</code></td><td>Plain text; RTL flag enables Divehi input.</td></tr>
            <tr><td><code>number</code></td><td><code>{total_days}</code></td><td>Numeric input.</td></tr>
            <tr><td><code>date</code></td><td><code>{issue_date}</code></td><td>Calendar picker; formatted automatically on generation.</td></tr>
            <tr><td><code>boolean</code></td><td><code>{is_approved}</code></td><td>Renders as Yes / No dropdown.</td></tr>
            <tr><td><code>email</code></td><td><code>{contact_email}</code></td><td>Email address input with basic validation.</td></tr>
            <tr><td><code>dropdown</code></td><td><code>{department}</code></td><td>Custom choice list configured per-template.</td></tr>
            <tr><td><code>textarea</code></td><td><code>{remarks}</code></td><td>Multi-line text block.</td></tr>
            <tr><td><code>image</code></td><td><code>{%signature}</code></td><td>PNG/JPG file embedded in the document. Must use <code>%</code> prefix in the template tag.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Date Formatting Variants</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder suffix</th><th>Output format</th><th>Language</th></tr></thead>
          <tbody>
            <tr><td>(none)</td><td>Full formatted date</td><td>Based on RTL setting</td></tr>
            <tr><td><code>_divehi</code></td><td>Full Divehi date</td><td>Divehi</td></tr>
            <tr><td><code>_english</code></td><td>Full English date</td><td>English</td></tr>
            <tr><td><code>_divehi_short</code></td><td>Divehi date without year</td><td>Divehi</td></tr>
            <tr><td><code>_english_short</code></td><td>English date without year</td><td>English</td></tr>
          </tbody>
        </table>
      </div>
      <p>Example: <code>{issue_date_divehi_short}</code> outputs the date in Divehi without the year.</p>

      <h3 class="help-subsection-title">Hidden / Computed Fields</h3>
      <p>
        Any placeholder key ending in <code>_hidden</code> is <strong>never shown to the user</strong>
        — it is resolved automatically. Use this for reformatted copies of other fields or computed values.
      </p>

      <h3 class="help-subsection-title">Date Range Placeholders</h3>
      <p>
        When a template contains sequential date placeholders, the app fills them automatically
        starting from a <strong>seed date</strong> taken from the first field whose key contains
        <strong>"start"</strong>. All date range fields are <strong>hidden from the form</strong>.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder pattern</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td><code>{date_range_divehi_1}</code> … <code>{date_range_divehi_N}</code></td><td>Divehi date, day N</td></tr>
            <tr><td><code>{date_range_english_1}</code> … <code>{date_range_english_N}</code></td><td>English date, day N</td></tr>
            <tr><td><code>{date_range_divehi_short_1}</code> … <code>{date_range_divehi_short_N}</code></td><td>Divehi date without year, day N</td></tr>
            <tr><td><code>{date_range_english_short_1}</code> … <code>{date_range_english_short_N}</code></td><td>English date without year, day N</td></tr>
            <tr><td><code>{date_range_1}</code> … <code>{date_range_N}</code></td><td>Divehi date, day N (legacy)</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 <strong>N</strong> can be any number — the app detects the highest N automatically.
        N=1 maps to the start date, N=2 to start+1 day, and so on.
      </p>

      <h3 class="help-subsection-title">Weekday Placeholders</h3>
      <p>
        Weekday placeholders are always <strong>auto-computed and hidden</strong> from the form.
        They derive their value from the same start date used by date range placeholders.
      </p>

      <h4 class="help-subsubsection-title">Pattern A — Fixed day sequence (day token in key)</h4>
      <p>The sequence always starts on the named day regardless of the chosen date.
      <code>_sun_</code> → N=1 is always Sunday, N=2 Monday, etc.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_divehi_hidden_sun_1}</code></td><td>ފުރަތަމަ ދުވަހަކީ: އާދިއްތަ</td></tr>
            <tr><td><code>{weekday_divehi_hidden_sun_2}</code></td><td>ހޯމަ</td></tr>
            <tr><td><code>{weekday_english_hidden_mon_3}</code></td><td>Wednesday</td></tr>
          </tbody>
        </table>
      </div>
      <p>Supported day tokens: <code>sun</code> · <code>mon</code> · <code>tue</code> · <code>wed</code> · <code>thu</code> · <code>fri</code> · <code>sat</code></p>

      <h4 class="help-subsubsection-title">Pattern B — Calendar sequence (no day token)</h4>
      <p>N=1 is the weekday of the chosen start date, N=2 is start+1 day, etc.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output (start = Wednesday)</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_divehi_hidden_1}</code></td><td>ބުދަ</td></tr>
            <tr><td><code>{weekday_english_hidden_1}</code></td><td>Wednesday</td></tr>
            <tr><td><code>{weekday_english_hidden_2}</code></td><td>Thursday</td></tr>
          </tbody>
        </table>
      </div>

      <h4 class="help-subsubsection-title">Short weekday names (<code>_short</code>)</h4>
      <p>Insert <code>_short</code> anywhere in the key to use abbreviated names.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_english_hidden_short_1}</code></td><td>Wed</td></tr>
            <tr><td><code>{weekday_divehi_hidden_short_1}</code></td><td>ބުދަ (short)</td></tr>
            <tr><td><code>{weekday_english_short_hidden_sun_1}</code></td><td>Sun</td></tr>
          </tbody>
        </table>
      </div>
      <div class="help-note">
        <strong>Full short name reference:</strong><br>
        English: Sun · Mon · Tue · Wed · Thu · Fri · Sat<br>
        Divehi: އާދި · ހޯމަ · އަން · ބުދަ · ބުރާ · ހުކު · ހޮނި
      </div>
    </div>

    <!-- ══ WATERMARK TOOL ════════════════════════════════════════ -->
    <div class="help-section" id="hn-watermark">
      <h2 class="help-section-title">🖼️ Watermark Tool</h2>
      <p>
        The Watermark page lets you select any number of images, choose a watermark graphic,
        configure placement, and save all processed images to a folder in one go —
        no image editing software required.
      </p>

      <h3 class="help-subsection-title">Selecting Source Images</h3>
      <ul class="help-list">
        <li>Click <strong>Add Images</strong> or drag and drop image files onto the drop zone.</li>
        <li>Supported formats: <strong>PNG, JPG, WEBP, GIF</strong>.</li>
        <li>Multiple images can be added at once — they appear as thumbnails in the grid.</li>
        <li>Hover over any thumbnail and click the <strong>✕</strong> button to remove it from the batch.</li>
        <li>Click <strong>Clear All</strong> to remove every image and start fresh.</li>
      </ul>

      <h3 class="help-subsection-title">Choosing a Watermark Image</h3>
      <ul class="help-list">
        <li>Click <strong>Choose File</strong> in the Watermark Image card and pick any PNG or JPG.</li>
        <li>A preview thumbnail appears immediately with an <strong>✓ Active</strong> badge.</li>
        <li>The last few watermarks you used appear in the <strong>Recent</strong> strip — click any to reload it without browsing again.</li>
        <li>Click the small <strong>✕</strong> on a recent entry to remove it from the list.</li>
      </ul>

      <h3 class="help-subsection-title">Placement Modes</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Mode</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Corner</strong></td>
              <td>The watermark is scaled so its height equals <strong>15% of the source image height</strong>,
              placed in the <strong>bottom-right corner</strong> with a small padding margin.
              Output image dimensions are unchanged.</td>
            </tr>
            <tr>
              <td><strong>Full Width</strong></td>
              <td>The watermark is scaled so its <strong>width exactly matches the source image width</strong>,
              overlaid flush against the <strong>bottom edge</strong>.
              Output dimensions are unchanged — the watermark overlaps the bottom portion of the photo.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Applying &amp; Saving</h3>
      <ol class="help-list">
        <li>With images and a watermark selected, click <strong>Apply Watermark</strong>.</li>
        <li>A native <strong>folder picker</strong> dialog opens — choose where the processed images are saved.</li>
        <li>The app creates a <code>watermarked\</code> subfolder and saves each image there.</li>
        <li>Output filenames match the originals with <code>_wm</code> appended before the extension (e.g. <code>photo_wm.png</code>).</li>
        <li>A progress bar tracks each file. A success notification confirms how many images were saved.</li>
      </ol>
      <p class="help-note">
        💡 The output folder is remembered for the current session. Click <strong>Clear All</strong>
        to reset it so the folder picker appears again on the next run.
      </p>

      <h3 class="help-subsection-title">Recent Watermarks</h3>
      <p>
        The app persists your last <strong>6 watermark images</strong> so you can quickly
        re-apply a logo or stamp without browsing each time. The most recently used watermark
        always appears first. Entries survive app restarts.
      </p>
    </div>

    <!-- ══ WORK LOGS ═════════════════════════════════════════════ -->
    <div class="help-section" id="hn-worklogs">
      <h2 class="help-section-title">📋 Work Logs</h2>
      <p>
        The <strong>Work Logs</strong> page provides a timestamped activity journal for staff.
        Each entry records a task description, optional notes, and an automatic date and time
        captured in <strong>Maldives Time (MVT, UTC+5)</strong>. Logs can be searched, filtered
        by date range, and exported to Excel for reporting.
      </p>

      <h3 class="help-subsection-title">Summary Stats</h3>
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
        <li>The <strong>Date</strong> and <strong>Time</strong> fields are filled automatically using the live MVT clock.</li>
        <li>Type a <strong>Task</strong> description (required).</li>
        <li>Optionally add <strong>Notes</strong> for additional context.</li>
        <li>Click <strong>Save Log</strong> — or press <kbd>Enter</kbd> in the Task field — to save immediately.</li>
      </ol>
      <p class="help-note">
        💡 Timestamps are fixed at the moment you press Save and cannot be back-dated,
        ensuring an accurate audit trail.
      </p>

      <h3 class="help-subsection-title">Searching and Filtering</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Control</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr><td><strong>Search box</strong></td><td>Filters rows in real time by any text in the Task or Notes columns.</td></tr>
            <tr><td><strong>From date</strong></td><td>Shows only logs on or after the selected date.</td></tr>
            <tr><td><strong>To date</strong></td><td>Shows only logs on or before the selected date.</td></tr>
            <tr><td><strong>Clear Filters</strong></td><td>Resets both keyword search and date range, restoring the full list.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Deleting a Log</h3>
      <p>
        Each row has a <strong>🗑 delete</strong> button. Click it and confirm the prompt to
        permanently remove that entry. Deletion cannot be undone.
      </p>

      <h3 class="help-subsection-title">Exporting to Excel</h3>
      <p>
        Click <strong>Export to Excel</strong> to save the currently visible logs as an
        <code>.xlsx</code> spreadsheet including columns for: <em>No., Date, Time, Task,</em>
        and <em>Notes</em>. A native save dialog lets you choose the output location.
      </p>
      <p class="help-note">
        💡 If a filter is active when you export, only filtered results are included.
        Clear all filters first to export every log.
      </p>
    </div>

    <!-- ══ UTILITIES ═════════════════════════════════════════════ -->
    <div class="help-section" id="hn-utilities">
      <h2 class="help-section-title">🔧 Utilities</h2>
      <p>
        The <strong>Utilities</strong> tab bundles six tools into a single tabbed workspace.
        Switch between them using the pill buttons at the top of the page.
      </p>

      <h3 class="help-subsection-title">📏 Unit Converter</h3>
      <p>
        Convert values between units across ten measurement categories. Select a category,
        enter a value in any unit, and all other units update instantly.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Category</th><th>Example units</th></tr></thead>
          <tbody>
            <tr><td><strong>Length</strong></td><td>mm, cm, m, km, in, ft, yd, mi, nautical miles</td></tr>
            <tr><td><strong>Weight / Mass</strong></td><td>mg, g, kg, metric tons, oz, lb, stone</td></tr>
            <tr><td><strong>Temperature</strong></td><td>°C, °F, Kelvin</td></tr>
            <tr><td><strong>Volume</strong></td><td>ml, L, m³, tsp, tbsp, cup, pt, qt, US gal, UK gal</td></tr>
            <tr><td><strong>Area</strong></td><td>mm², cm², m², km², ft², acres, hectares</td></tr>
            <tr><td><strong>Speed</strong></td><td>m/s, km/h, mph, knots, ft/s</td></tr>
            <tr><td><strong>Time</strong></td><td>ns, ms, s, min, h, days, weeks, months, years</td></tr>
            <tr><td><strong>Energy</strong></td><td>J, kJ, cal, kcal, Wh, kWh, BTU, eV</td></tr>
            <tr><td><strong>Digital Storage</strong></td><td>bit, byte, KB, MB, GB, TB</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 For length, you can enter feet and inches in the format <code>5'11"</code> for accurate
        conversions from imperial measurements.
      </p>

      <h3 class="help-subsection-title">📅 Date Calculator</h3>
      <p>Two modes help you work with dates quickly:</p>
      <ul class="help-list">
        <li><strong>Date Difference</strong> — Enter two dates to instantly see the gap in years, months, weeks, and days.</li>
        <li><strong>Add / Subtract</strong> — Enter a start date and a number of days, weeks, months, or years to calculate a future or past date.</li>
      </ul>
      <p>Results update live as you type — no button press needed.</p>

      <h3 class="help-subsection-title">🧮 Scientific Calculator</h3>
      <p>
        A full-featured scientific calculator with standard arithmetic, trigonometric functions
        (sin, cos, tan and their inverses), logarithms (log, ln), powers, square root, and
        constants (π, e). The display shows the current expression and result simultaneously.
        Press <kbd>Enter</kbd> or click <strong>=</strong> to evaluate.
      </p>

      <h3 class="help-subsection-title">🗓️ Maldives Calendar</h3>
      <p>
        A full calendar with Maldives public holidays, Hijri (Islamic) dates, and bilingual
        support in English and Divehi.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Feature</th><th>Details</th></tr></thead>
          <tbody>
            <tr><td><strong>Views</strong></td><td>Switch between <strong>Month</strong>, <strong>Week</strong>, and <strong>Year</strong> views using the toggle buttons.</td></tr>
            <tr><td><strong>Navigation</strong></td><td>Use ‹ / › arrows to go forward or backward; click <strong>Today</strong> to jump to the current date.</td></tr>
            <tr><td><strong>Hijri dates</strong></td><td>Each day cell shows the corresponding Hijri calendar date in a smaller label.</td></tr>
            <tr><td><strong>Public Holidays</strong></td><td>Maldives national holidays are highlighted and labelled directly on the calendar.</td></tr>
            <tr><td><strong>Language toggle</strong></td><td>Click the language button to switch all labels between English and ދިވެހި. The setting is remembered between sessions.</td></tr>
            <tr><td><strong>Weekends</strong></td><td>Friday and Saturday are highlighted as weekend days.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">🌙 Moon Phase</h3>
      <p>
        Shows the current lunar phase with an illustrated moon graphic, phase name, illumination
        percentage, age of the moon in days, and dates of the next major phases (New Moon,
        First Quarter, Full Moon, Last Quarter). The display updates automatically each day.
      </p>

      <h3 class="help-subsection-title">🌊 Tide Chart</h3>
      <p>
        Displays predicted tide heights for <strong>Addu City (Gan), Maldives</strong> using a
        harmonic tidal model tuned to local observations. Times are shown in
        <strong>Maldives Standard Time (MVT, UTC+5)</strong>.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Feature</th><th>Details</th></tr></thead>
          <tbody>
            <tr><td><strong>Daily view</strong></td><td>Smooth curve showing the full tide cycle for one day. Move the cursor over the chart to read the exact height and time at any point.</td></tr>
            <tr><td><strong>Weekly view</strong></td><td>Seven-day overview showing the tide curve across the whole week with annotated high and low tide markers.</td></tr>
            <tr><td><strong>High / Low tide list</strong></td><td>Key tide events are listed alongside the chart with their times and heights in metres.</td></tr>
            <tr><td><strong>Moon phase overlay</strong></td><td>The current lunar phase badge appears in the chart header, providing context for spring and neap tides.</td></tr>
            <tr><td><strong>Navigation</strong></td><td>Use ‹ / › arrows to move by one day (or one week in weekly view). Click <strong>Today</strong> to return to the current date.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        ℹ️ Tide predictions are generated from a mathematical harmonic model and are provided as
        guidance only. Always verify against official tide tables for navigation or safety decisions.
      </p>
    </div>

    <!-- ══ SETTINGS ══════════════════════════════════════════════ -->
    <div class="help-section" id="hn-settings">
      <h2 class="help-section-title">⚙️ Settings Page</h2>
      <p>
        The Settings page lets you change where the app stores its data and view information
        about the installed version. Each path has a <strong>Browse</strong> button for easy
        folder selection.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Setting</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><strong>Templates Directory</strong></td><td>Where uploaded template files (<code>.docx</code>, <code>.xlsx</code>) are stored on disk.</td></tr>
            <tr><td><strong>Outputs Directory</strong></td><td>Where generated documents are saved when using <em>Generate Only</em>.</td></tr>
            <tr><td><strong>Database Folder</strong></td><td>Folder containing <code>database.json</code> — the registry of all templates and saved records.</td></tr>
            <tr><td><strong>Save Settings</strong></td><td>Apply new directory paths immediately. All views reload to reflect the change.</td></tr>
            <tr><td><strong>Reset to Defaults</strong></td><td>Restore all paths to their original default locations.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        ⚠️ After changing the Database Folder, the app uses the new location immediately.
        If you move <code>database.json</code> manually, point this setting to its new folder.
      </p>
      <h3 class="help-subsection-title">About</h3>
      <p>
        The <strong>About</strong> section displays the app version, developer contact details,
        and repository link — useful when reporting bugs or requesting support.
      </p>
    </div>

    <!-- ══ TIPS & BEST PRACTICES ════════════════════════════════ -->
    <div class="help-section" id="hn-tips">
      <h2 class="help-section-title">💡 Tips &amp; Best Practices</h2>

      <h3 class="help-subsection-title">Templates &amp; Forms</h3>
      <ul class="help-list">
        <li>Use <strong>lowercase, underscore-separated</strong> keys in all placeholders, e.g. <code>{employee_name}</code>. Avoid spaces or special characters.</li>
        <li>After editing a template file externally, click <strong>Reload Fields</strong> on its card to re-scan for new or renamed placeholders.</li>
        <li>Mark rarely-used templates as <strong>Inactive</strong> to hide them from Search without deleting them.</li>
        <li>Use <strong>Dropdown</strong> type fields to enforce consistent values (e.g. department names) and prevent typos.</li>
        <li>Click <strong>Save Record</strong> before generating to keep a log of form data you can reload later.</li>
        <li>The <strong>print count</strong> (🖨️) on each template card updates every time you open the Templates or Search page.</li>
      </ul>

      <h3 class="help-subsection-title">Dates &amp; Bilingual Fields</h3>
      <ul class="help-list">
        <li>Mark date fields as <strong>RTL</strong> in the field editor for automatic Divehi formatting on generation.</li>
        <li>Any placeholder key ending in <code>_hidden</code> is never shown — use it for computed or reformatted copies of other fields.</li>
        <li>You can freely mix date range, weekday, and hidden placeholders in the same template. All are resolved automatically from a single start date.</li>
        <li>For image placeholders in Word, use <code>{%field_key}</code> with the <code>%</code> prefix — plain <code>{field_key}</code> will not embed the image.</li>
        <li>Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> inside a fill form to toggle automatic language switching.</li>
      </ul>

      <h3 class="help-subsection-title">Watermark Tool</h3>
      <ul class="help-list">
        <li>Use a <strong>PNG with a transparent background</strong> as your watermark image for the cleanest result — opaque backgrounds will cover the photo underneath.</li>
        <li>In <strong>Corner</strong> mode, a <strong>horizontally wider</strong> watermark graphic gives the best proportions.</li>
        <li>In <strong>Full Width</strong> mode, a <strong>wide, short banner</strong> graphic (high aspect ratio) works best to avoid covering too much of the photo.</li>
        <li>Click <strong>Clear All</strong> to reset the output folder so the folder picker appears again on the next batch.</li>
      </ul>

      <h3 class="help-subsection-title">Work Logs</h3>
      <ul class="help-list">
        <li>Press <kbd>Enter</kbd> in the Task field to save quickly without reaching for the mouse.</li>
        <li>Use <strong>From / To</strong> date filters to scope the view before exporting — only filtered rows are written to Excel.</li>
        <li>Work log timestamps are fixed to <strong>MVT</strong> and cannot be edited, ensuring an accurate audit trail.</li>
      </ul>

      <h3 class="help-subsection-title">Utilities</h3>
      <ul class="help-list">
        <li>The Unit Converter accepts feet-and-inches input like <code>5'11"</code> directly in the length fields.</li>
        <li>Tide predictions are mathematical estimates — always cross-check against official tables for navigation or safety.</li>
        <li>The Calendar language setting is remembered between sessions.</li>
        <li>In the Moon Phase view, spring tides (higher highs and lower lows) occur around Full Moon and New Moon.</li>
      </ul>
    </div>

  `;

  // Smooth scroll for quick-nav pills
  container.querySelectorAll('.help-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(pill.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};