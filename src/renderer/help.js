/**
 * @file help.js
 * @description Help page content and initialization for MTO Samugaa.
 */

window.initHelp = function () {
  const container = document.getElementById("help-content");
  if (!container) return;

  container.innerHTML = `

    <!-- ══ HELP HERO ═══════════════════════════════════════════════════ -->
    <div class="help-hero">
      <div class="help-hero-icon">🧭</div>
      <div class="help-hero-text">
        <h1 class="help-hero-title">MTO Samugaa — User Guide</h1>
        <p class="help-hero-sub">Complete reference for templates, batch generation, social media graphics, notes, tools, prayer times, placeholders, and more</p>
      </div>
      <div class="help-hero-version" id="help-hero-version"></div>
    </div>

    <!-- ══ SEARCH BAR ═══════════════════════════════════════════════════ -->
    <div class="help-search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="help-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="help-search-input" class="help-search-input" placeholder="Search help…" autocomplete="off" />
      <button class="help-search-clear" id="help-search-clear" title="Clear search" style="display:none">✕</button>
    </div>
    <div id="help-search-results" class="help-search-results" style="display:none"></div>

    <!-- ══ QUICK-NAV PILLS ════════════════════════════════════════════ -->
    <div class="help-quicknav" id="help-quicknav">
      <span class="help-quicknav-label">Jump to:</span>
      <a href="#hn-overview"      class="help-pill">Overview</a>
      <a href="#hn-navigation"    class="help-pill">Navigation</a>
      <a href="#hn-templates"     class="help-pill">Templates</a>
      <a href="#hn-search"        class="help-pill">Search &amp; Print</a>
      <a href="#hn-fillform"      class="help-pill">Fill Form</a>
      <a href="#hn-batch"         class="help-pill">⚡ Batch</a>
      <a href="#hn-placeholders"  class="help-pill">Placeholders</a>
      <a href="#hn-socialmedia"   class="help-pill">🖼 Social Media</a>
      <a href="#hn-notes"         class="help-pill">📓 Notes</a>
      <a href="#hn-watermark"     class="help-pill">Watermark</a>
      <a href="#hn-worklogs"      class="help-pill">Work Logs</a>
      <a href="#hn-utilities"     class="help-pill">Utilities</a>
      <a href="#hn-prayertimes"   class="help-pill">🕌 Prayer Times</a>
      <a href="#hn-randompicker"  class="help-pill">🎲 Random Picker</a>
      <a href="#hn-calendar"      class="help-pill">📅 Calendar</a>
      <a href="#hn-backup"        class="help-pill">Backup</a>
      <a href="#hn-settings"      class="help-pill">Settings</a>
      <a href="#hn-tips"          class="help-pill">💡 Tips</a>
    </div>

    <!-- ══ OVERVIEW ══════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-overview">
      <h2 class="help-section-title">📄 Overview</h2>
      <p>
        <strong>MTO Samugaa</strong> is a desktop productivity suite for Addu City Council staff.
        It generates filled Word (<code>.docx</code>) and Excel (<code>.xlsx</code>) documents from
        reusable templates, creates branded social media graphics, maintains a personal notebook,
        logs daily work activities, and bundles a growing set of built-in tools — all without
        leaving the app.
      </p>
      <p>
        Templates can be <strong>fillable</strong> (contain <code>{placeholder}</code> tags that
        produce a guided form) or <strong>static</strong> (printed as-is). The app supports
        Dhivehi (Thaana) and English text, bilingual date formatting, Hijri dates, image embedding,
        batch document generation, and Notion sync for notes.
      </p>
      <div class="help-feature-grid">
        <div class="help-feature-card">
          <span class="help-feature-icon">📝</span>
          <strong>Template Forms</strong>
          <span>Fill placeholders through a guided UI</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">⚡</span>
          <strong>Batch Generate</strong>
          <span>Generate hundreds of documents from CSV / Excel</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🖼️</span>
          <strong>Social Media</strong>
          <span>Canvas-based image editor with text overlays &amp; PNG export</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🌐</span>
          <strong>Bilingual</strong>
          <span>Dhivehi &amp; English dates, Thaana script, Hijri calendar</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">📓</span>
          <strong>Notes</strong>
          <span>Personal notebook with optional Notion sync</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🖼️</span>
          <strong>Watermark</strong>
          <span>Batch-stamp images in one click</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">📋</span>
          <strong>Work Logs</strong>
          <span>Timestamped activity journal with Excel export</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🔧</span>
          <strong>Utilities</strong>
          <span>Unit converter, date calc, tides &amp; more</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🕌</span>
          <strong>Prayer Times</strong>
          <span>Daily schedule, Qibla, countdown &amp; Hijri date</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🎲</span>
          <strong>Random Picker</strong>
          <span>Fair, animated shuffled assignment</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">📅</span>
          <strong>Calendar</strong>
          <span>Maldives holidays, Hijri dates, bilingual</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">💾</span>
          <strong>Backup &amp; Restore</strong>
          <span>Export and import all your data safely</span>
        </div>
      </div>
    </div>

    <!-- ══ NAVIGATION ════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-navigation">
      <h2 class="help-section-title">🧭 Navigation</h2>
      <p>The header bar has two dropdown groups (<strong>Documents</strong> and <strong>Tools</strong>) plus direct-link buttons for Calendar, Work Logs, Notes, and Help.</p>

      <h3 class="help-subsection-title">Documents Group</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Item</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>Search &amp; Print</strong></td><td>Find any template by name, description, or category and print, fill, or batch-generate immediately.</td></tr>
            <tr><td><strong>Fill Form</strong></td><td>Active form for the currently selected fillable template. Only accessible after choosing a template.</td></tr>
            <tr><td><strong>Templates</strong></td><td>Full template library — upload, edit, configure fields, preview, batch-generate, or delete templates.</td></tr>
            <tr><td><strong>Social Media</strong></td><td>Canvas-based image editor for creating branded social media graphics with bilingual text overlays.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Tools Group</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Item</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>Utilities</strong></td><td>Unit Converter, Date Calculator, Scientific Calculator, Moon Phase, and Tide Chart — all in one tabbed workspace.</td></tr>
            <tr><td><strong>Watermark</strong></td><td>Batch-apply a watermark image to multiple photos — corner or full-width overlay.</td></tr>
            <tr><td><strong>Random Picker</strong></td><td>Randomly assign choices to a list of names — animated countdown, grouped or list view, copy-to-clipboard.</td></tr>
            <tr><td><strong>Prayer Times</strong></td><td>Daily prayer schedule for Addu City (Gan), live countdown, Qibla compass, and Hijri date.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Direct Links</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>📅 Calendar</strong></td><td>Maldives public holidays, Hijri dates, month / week / year views.</td></tr>
            <tr><td><strong>📋 Work Logs</strong></td><td>Timestamped activity journal — add, search, filter, and export to Excel.</td></tr>
            <tr><td><strong>📓 Notes</strong></td><td>Personal notebook with English / Dhivehi support and optional Notion sync.</td></tr>
            <tr><td><strong>⚙️ Settings</strong></td><td>Storage directories, Notion integration, app info, and Backup &amp; Restore.</td></tr>
            <tr><td><strong>❓ Help</strong></td><td>This page.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ TEMPLATES PAGE ════════════════════════════════════════════ -->
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
            <tr><td><strong>Fill Form</strong></td><td>Open the fill form (shown only when the template has fields).</td></tr>
            <tr><td><strong>⚡ Batch</strong></td><td>Open the Batch Generator wizard — produce multiple documents from a CSV or Excel file.</td></tr>
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
                <code>textarea</code> — multi-line text block (line-break or paragraph mode)<br>
                <code>image</code> — PNG / JPG file embedded into the document
              </td>
            </tr>
            <tr><td><strong>Hint / Helper Text</strong></td><td>Short instructional text shown under the field in the form.</td></tr>
            <tr><td><strong>Paragraph mode</strong></td><td>(<code>textarea</code> only) Blank lines in the textarea create separate Word paragraphs via the loop syntax.</td></tr>
            <tr><td><strong>Rows</strong></td><td>(<code>textarea</code> only) Controls the visible height of the textarea. Defaults to 8 rows in paragraph mode, 3 otherwise.</td></tr>
            <tr><td><strong>Dropdown choices</strong></td><td>(<code>dropdown</code> only) Enter one option per line.</td></tr>
            <tr><td><strong>RTL (Right-to-Left)</strong></td><td>Enables Dhivehi / Thaana keyboard and formats date fields in Dhivehi script.</td></tr>
            <tr><td><strong>Required</strong></td><td>Prevents document generation if the field is left empty.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 You can also <strong>add</strong> or <strong>remove</strong> fields manually from the field editor —
        useful for placeholders that were not auto-detected or for cleanup.
        The field key badge (<code>{key}</code>) is shown next to each field header so you can
        confirm it matches the placeholder in your template exactly.
      </p>
    </div>

    <!-- ══ SEARCH & PRINT ════════════════════════════════════════════ -->
    <div class="help-section" id="hn-search">
      <h2 class="help-section-title">🔍 Search &amp; Print</h2>
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
            <tr><td><strong>⚡ Batch</strong></td><td>Open the Batch Generator wizard — available on all fillable templates.</td></tr>
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

    <!-- ══ FILL FORM ═════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-fillform">
      <h2 class="help-section-title">📝 Fill Form</h2>
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
        <strong>Dhivehi (Thaana)</strong> for RTL fields and <strong>English</strong> for LTR fields.
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
        <li>Use <code>{%img_photo}</code> (with a <code>%</code> prefix) in your <code>.docx</code> template — not plain <code>{img_photo}</code>.</li>
        <li>After choosing a file, a thumbnail preview appears. Click <strong>✕ Clear</strong> to remove it.</li>
        <li>Set the <strong>Width (px)</strong> field to control how wide the image appears in the document. Default is 150 px.</li>
      </ul>
      <p class="help-note">⚠️ Image embedding is only supported in <code>.docx</code> templates.</p>

      <h3 class="help-subsection-title">Text &amp; Paragraph Fields</h3>
      <ul class="help-list">
        <li>In <strong>line-break mode</strong> (default): press <kbd>Shift</kbd>+<kbd>Enter</kbd> to add a new line. Each line break becomes a <code>&lt;w:br/&gt;</code> — all text stays in one paragraph.</li>
        <li>In <strong>paragraph mode</strong>: separate blocks of text with a <strong>blank line</strong>. Each block becomes its own Word paragraph when the template uses the loop syntax <code>{#text_body_paragraphs}{paragraph}{/text_body_paragraphs}</code>.</li>
        <li>A hint below the textarea tells you which mode is active.</li>
      </ul>

      <h3 class="help-subsection-title">Saved Records</h3>
      <p>
        The <strong>Saved Records</strong> panel (right side of the form) lists all previously saved
        entries for the current template. Click any record card to restore its values into the form.
        Records are stored per-template and persist between sessions.
      </p>

      <h3 class="help-subsection-title">Date Fields — Smart Presets</h3>
      <p>
        Date fields whose placeholder key contains common words like <code>today</code>,
        <code>start</code>, or <code>end</code> open with a sensible default date already set.
      </p>
    </div>

    <!-- ══ BATCH GENERATION ══════════════════════════════════════════ -->
    <div class="help-section" id="hn-batch">
      <h2 class="help-section-title">⚡ Batch Document Generation</h2>
      <p>
        The <strong>Batch Generator</strong> lets you produce many filled documents at once from a
        spreadsheet — ideal for issuing the same form to multiple employees, generating monthly
        reports in bulk, or creating personalised letters for a list of recipients.
      </p>
      <p>
        The <strong>⚡ Batch</strong> button appears on every fillable template card — on both the
        <strong>Templates</strong> page and the <strong>Search &amp; Print</strong> page.
        Clicking it opens a four-step wizard:
      </p>

      <div class="help-steps">
        <div class="help-step">
          <div class="help-step-num">1</div>
          <div class="help-step-body">
            <strong>Upload Data File</strong>
            <p>Drag-and-drop or browse to a <code>.csv</code>, <code>.xlsx</code>, or <code>.xls</code> file.
            Each row will become one generated document. The first row must be a header row with column names.</p>
          </div>
        </div>
        <div class="help-step">
          <div class="help-step-num">2</div>
          <div class="help-step-body">
            <strong>Map Columns to Fields</strong>
            <p>A mapping table appears with every template field on the left.
            Use the dropdown on the right to pick which column from your file supplies each field's value.
            Columns can be left unmapped — those fields will be blank in the output.</p>
          </div>
        </div>
        <div class="help-step">
          <div class="help-step-num">3</div>
          <div class="help-step-body">
            <strong>Generate</strong>
            <p>Click <strong>Generate</strong>. A native folder picker lets you choose the output directory.
            A live progress log appears, showing each document as it is created.
            Failed rows are clearly flagged without stopping the whole batch.</p>
            <p>For <code>.docx</code> templates you can optionally tick
            <strong>Combine all documents into a single PDF</strong> before generating
            (requires Microsoft Word to be installed on the machine).</p>
          </div>
        </div>
        <div class="help-step">
          <div class="help-step-num">4</div>
          <div class="help-step-body">
            <strong>Review Results</strong>
            <p>A summary shows how many documents succeeded and how many failed.
            The output folder is opened automatically when the batch completes.</p>
          </div>
        </div>
      </div>

      <h3 class="help-subsection-title">Preparing Your Data File</h3>
      <ul class="help-list">
        <li>The <strong>first row must be column headers</strong> — these become the names you pick in the mapping step.</li>
        <li>Each subsequent row is one document. Empty rows are skipped automatically.</li>
        <li>Date columns should be formatted as <code>YYYY-MM-DD</code> (e.g. <code>2026-06-10</code>) for reliable parsing. Excel date cells are also read correctly.</li>
        <li>Keep column names short and descriptive — e.g. <em>Name</em>, <em>ID</em>, <em>StartDate</em>.</li>
        <li>For boolean fields use <code>Yes</code> / <code>No</code> (or <code>True</code> / <code>False</code>) in the column.</li>
      </ul>

      <h3 class="help-subsection-title">Output Files</h3>
      <ul class="help-list">
        <li>Each document is saved as <code>{TemplateName}_{row number}.docx</code> (or <code>.xlsx</code>) in the folder you chose.</li>
        <li>If the <strong>Combine into PDF</strong> option was enabled, an additional merged <code>.pdf</code> file is created in the same folder once all individual documents are done.</li>
        <li>Existing files with the same name are overwritten without warning — use a fresh folder per batch to avoid conflicts.</li>
      </ul>
      <p class="help-note">
        ℹ️ The Combine into PDF option requires Microsoft Word to be installed and accessible on the machine.
        If Word is not found, individual <code>.docx</code> files are still saved successfully.
      </p>
    </div>

    <!-- ══ PLACEHOLDER REFERENCE ═════════════════════════════════════ -->
    <div class="help-section" id="hn-placeholders">
      <h2 class="help-section-title">🏷️ Placeholder Reference</h2>
      <p>
        Placeholders are written inside curly braces in your Word or Excel template —
        e.g. <code>{person_name}</code>. The app replaces every placeholder with the value you enter
        in the form. Several special naming patterns trigger <strong>automatic computation</strong>,
        so no user input is needed at all for those fields.
      </p>

      <div class="help-note" style="margin-bottom:1.25rem;">
        <strong>Naming rules</strong> — All placeholder keys must be:
        <ul class="help-list" style="margin-top:0.4rem;margin-bottom:0;">
          <li>Fully <strong>lowercase</strong> with <strong>underscores</strong> as separators (snake_case).</li>
          <li>Starting with a <strong>category prefix</strong> — this is how the app infers the field type automatically on upload.</li>
          <li>No spaces, dots, dashes, or special characters. Maximum 64 characters.</li>
          <li>Append <code>_divehi</code> to any key to make it a <strong>Thaana / RTL field</strong>.</li>
        </ul>
      </div>

      <!-- ── Category Prefix Overview ──────────────────────────── -->
      <h3 class="help-subsection-title">Category Prefixes — Auto-Detection</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Prefix</th><th>Auto-detected type</th><th>Example key</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><code>person_</code></td><td>string</td><td><code>{person_name}</code></td><td>Names, IDs, designations. Append <code>_divehi</code> for Thaana.</td></tr>
            <tr><td><code>org_</code></td><td>string</td><td><code>{org_office}</code></td><td>Office, department, reference number, address.</td></tr>
            <tr><td><code>date_</code></td><td>date</td><td><code>{date_issue}</code></td><td>Calendar picker. Formatted at generation time.</td></tr>
            <tr><td><code>range_</code></td><td>auto-computed</td><td><code>{range_divehi_1}</code></td><td>Date-range series — filled automatically. See §&nbsp;Date Range.</td></tr>
            <tr><td><code>text_</code></td><td>textarea</td><td><code>{text_notes}</code></td><td>Multi-line / paragraph content. Append <code>_divehi</code> for Thaana.</td></tr>
            <tr><td><code>num_</code></td><td>number</td><td><code>{num_days}</code></td><td>Numeric input. <code>num_serial</code> stays as string.</td></tr>
            <tr><td><code>bool_</code></td><td>boolean</td><td><code>{bool_approved}</code></td><td>Yes / No dropdown.</td></tr>
            <tr><td><code>img_</code></td><td>image</td><td><code>{%img_photo}</code></td><td>PNG/JPG embed. Use <code>%</code> prefix in the template tag (see §&nbsp;Images).</td></tr>
            <tr><td><code>meta_</code></td><td>auto-computed</td><td><code>{meta_generated_date}</code></td><td>Filled automatically at generation time. Never shown in the form.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 Keys without a recognised prefix still work — they are inferred as <code>string</code>
        fields and marked Divehi only if the word <em>divehi</em> appears in the key.
        This keeps all older templates fully compatible.
      </p>

      <!-- ── Field Types ──────────────────────────────────────── -->
      <h3 class="help-subsection-title">Field Types</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Type</th><th>Form control</th><th>Validation</th></tr></thead>
          <tbody>
            <tr><td><code>string</code></td><td>Text input</td><td>—</td></tr>
            <tr><td><code>number</code></td><td>Numeric input</td><td>Must be a valid number</td></tr>
            <tr><td><code>date</code></td><td>Calendar date picker</td><td>Must be a valid date</td></tr>
            <tr><td><code>boolean</code></td><td>Yes / No dropdown</td><td>—</td></tr>
            <tr><td><code>email</code></td><td>Email input</td><td>Must match name@domain.ext</td></tr>
            <tr><td><code>dropdown</code></td><td>Choice list (per-template)</td><td>—</td></tr>
            <tr><td><code>textarea</code></td><td>Multi-line text area</td><td>Max 5 000 characters</td></tr>
            <tr><td><code>image</code></td><td>File picker (PNG / JPG)</td><td>Must use <code>{%key}</code> syntax in template</td></tr>
          </tbody>
        </table>
      </div>

      <!-- ── Date Formatting ────────────────────────────────── -->
      <h3 class="help-subsection-title">Date Fields — Formatting &amp; Locale</h3>
      <p>Date fields are stored as <code>YYYY-MM-DD</code> internally and automatically formatted when the document is generated. The locale is determined by suffixes on the key:</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Key pattern</th><th>Output example</th></tr></thead>
          <tbody>
            <tr><td><code>{date_issue}</code></td><td>15 June 2026 <em>(English; RTL flag controls locale)</em></td></tr>
            <tr><td><code>{date_issue_divehi}</code></td><td>15 ޖޫން 2026</td></tr>
            <tr><td><code>{date_issue_english}</code></td><td>15 June 2026</td></tr>
            <tr><td><code>{date_issue_short}</code></td><td>15 June <em>(year omitted)</em></td></tr>
            <tr><td><code>{date_issue_divehi_short}</code></td><td>15 ޖޫން</td></tr>
            <tr><td><code>{date_issue_english_short}</code></td><td>15 June</td></tr>
          </tbody>
        </table>
      </div>

      <h4 class="help-subsubsection-title">Preset date placeholders</h4>
      <p>
        Keys with <code>_current_N</code> or <code>_next_N</code> open the date picker
        <strong>pre-filled</strong> to the N-th day of the current or next month.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Pre-filled to</th></tr></thead>
          <tbody>
            <tr><td><code>{date_issue_current_25}</code></td><td>25th of the current month</td></tr>
            <tr><td><code>{date_issue_next_1}</code></td><td>1st of next month</td></tr>
          </tbody>
        </table>
      </div>

      <!-- ── Paragraph / Text_ Fields ──────────────────────── -->
      <h3 class="help-subsection-title">Paragraph &amp; Multi-line Text (<code>text_</code>)</h3>
      <p>Two output modes, set in the <strong>⚙️ Fields</strong> editor:</p>

      <h4 class="help-subsubsection-title">Line-break mode <em>(default)</em></h4>
      <p>
        Pressing <kbd>Shift</kbd>+<kbd>Enter</kbd> inserts a soft line break.
        Each newline becomes a <code>&lt;w:br/&gt;</code> inside a <strong>single paragraph</strong>
        in the generated Word document. Use for short notes, addresses, or remarks.
      </p>

      <h4 class="help-subsubsection-title">Paragraph-loop mode</h4>
      <p>
        Enable <strong>Paragraph mode</strong> in the Fields editor. Each block of text separated
        by a <strong>blank line</strong> becomes its own proper <code>&lt;w:p&gt;</code> Word paragraph.
        In your <code>.docx</code> template, use the loop syntax:
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Template syntax</th><th>What it produces</th></tr></thead>
          <tbody>
            <tr>
              <td style="font-family:monospace;white-space:pre;">{#text_body_paragraphs}
{paragraph}
{/text_body_paragraphs}</td>
              <td>One properly-formatted Word paragraph per block in the textarea</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Image Fields ─────────────────────────────────── -->
      <h3 class="help-subsection-title">Image Placeholders (<code>img_</code>)</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Field key</th><th>Template tag</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><code>img_photo</code></td><td><code>{%img_photo}</code></td><td>Portrait / ID photo</td></tr>
            <tr><td><code>img_signature</code></td><td><code>{%img_signature}</code></td><td>Signature</td></tr>
            <tr><td><code>img_stamp</code></td><td><code>{%img_stamp}</code></td><td>Official stamp</td></tr>
            <tr><td><code>img_logo</code></td><td><code>{%img_logo}</code></td><td>Organisation logo</td></tr>
          </tbody>
        </table>
      </div>
      <ul class="help-list">
        <li>Always write the template tag with a <code>%</code> prefix: <code>{%img_photo}</code>. A plain <code>{img_photo}</code> will <em>not</em> embed the image.</li>
        <li>Set the <strong>Width (px)</strong> input to control the rendered width. Height scales proportionally.</li>
        <li>Image embedding is only supported in <code>.docx</code> templates.</li>
      </ul>

      <!-- ── Auto-computed / Hidden ─────────────────────────── -->
      <h3 class="help-subsection-title">Auto-computed &amp; Hidden Fields</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Category / Pattern</th><th>Filled from</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><code>meta_*</code></td><td>System clock (MVT) &amp; template metadata</td><td><code>{meta_generated_date}</code></td></tr>
            <tr><td><code>range_*</code> (except seed)</td><td>Seed date + offset</td><td><code>{range_divehi_3}</code></td></tr>
            <tr><td>Any key ending in <code>_hidden</code></td><td>Sibling date field, reformatted</td><td><code>{start_date_hidden}</code></td></tr>
            <tr><td>Weekday fields (legacy)</td><td>Seed date weekday calculation</td><td><code>{weekday_divehi_hidden_1}</code></td></tr>
          </tbody>
        </table>
      </div>

      <h4 class="help-subsubsection-title">Metadata placeholders (<code>meta_</code>)</h4>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Value inserted</th></tr></thead>
          <tbody>
            <tr><td><code>{meta_generated_date}</code></td><td>Today's date in English — e.g. <em>8 June 2026</em></td></tr>
            <tr><td><code>{meta_generated_date_divehi}</code></td><td>Today's date in Divehi — e.g. <em>8 ޖޫން 2026</em></td></tr>
            <tr><td><code>{meta_generated_time}</code></td><td>Current time in MVT — e.g. <em>14:35</em></td></tr>
            <tr><td><code>{meta_template_name}</code></td><td>The name of the template as shown in the app</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 All <code>meta_</code> times use <strong>Maldives Time (MVT, UTC+5)</strong>.
        No user input is needed — just include the tag in your template.
      </p>

      <!-- ── Date Range ─────────────────────────────────────── -->
      <h3 class="help-subsection-title">Date Range Placeholders</h3>
      <p>
        Add a <strong>single seed date field</strong> in your template (<code>{range_start_date}</code>),
        then add as many numbered series tags as you need. All series tags are auto-computed and hidden from the form.
      </p>

      <h4 class="help-subsubsection-title">New-style keys (recommended)</h4>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Seed field (user enters)</th><th>Series placeholders (auto-computed)</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td rowspan="4"><code>{range_start_date}</code></td><td><code>{range_english_1}</code> … <code>{range_english_N}</code></td><td>Day N, English full date</td></tr>
            <tr><td><code>{range_divehi_1}</code> … <code>{range_divehi_N}</code></td><td>Day N, Divehi full date</td></tr>
            <tr><td><code>{range_english_short_1}</code> … <code>{range_english_short_N}</code></td><td>Day N, English, no year</td></tr>
            <tr><td><code>{range_divehi_short_1}</code> … <code>{range_divehi_short_N}</code></td><td>Day N, Divehi, no year</td></tr>
          </tbody>
        </table>
      </div>

      <h4 class="help-subsubsection-title">Legacy keys (still fully supported)</h4>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Seed field</th><th>Series placeholders</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td rowspan="5"><code>{date_range_start}</code></td><td><code>{date_range_divehi_1}</code> … <code>{date_range_divehi_N}</code></td><td>Day N, Divehi full date</td></tr>
            <tr><td><code>{date_range_english_1}</code> … <code>{date_range_english_N}</code></td><td>Day N, English full date</td></tr>
            <tr><td><code>{date_range_divehi_short_1}</code> … <code>{date_range_divehi_short_N}</code></td><td>Day N, Divehi, no year</td></tr>
            <tr><td><code>{date_range_english_short_1}</code> … <code>{date_range_english_short_N}</code></td><td>Day N, English, no year</td></tr>
            <tr><td><code>{date_range_1}</code> … <code>{date_range_N}</code></td><td>Day N, Divehi (oldest format)</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 <strong>N</strong> is detected automatically — the app finds the highest N in the template.
        N=1 is always the start date, N=2 is start+1 day, and so on.
      </p>

      <!-- ── Weekday ──────────────────────────────────────────── -->
      <h3 class="help-subsection-title">Weekday Placeholders</h3>
      <p>
        Weekday placeholders are always <strong>auto-computed and hidden</strong>. Two styles are supported:
      </p>

      <h4 class="help-subsubsection-title">New-style: <code>range_weekday_</code></h4>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder pattern</th><th>Output (start = Wednesday)</th></tr></thead>
          <tbody>
            <tr><td><code>{range_weekday_english_1}</code></td><td>Wednesday</td></tr>
            <tr><td><code>{range_weekday_divehi_1}</code></td><td>ބުދަ</td></tr>
            <tr><td><code>{range_weekday_english_short_1}</code></td><td>Wed</td></tr>
            <tr><td><code>{range_weekday_divehi_short_1}</code></td><td>ބުދަ <em>(short)</em></td></tr>
            <tr><td><code>{range_weekday_english_mon_1}</code></td><td>Monday <em>(fixed start: Mon)</em></td></tr>
            <tr><td><code>{range_weekday_divehi_sun_1}</code></td><td>އާދިއްތަ <em>(fixed start: Sun)</em></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Append a three-letter day token (<code>sun</code> · <code>mon</code> · <code>tue</code> ·
        <code>wed</code> · <code>thu</code> · <code>fri</code> · <code>sat</code>) before the index
        to fix the sequence to that start day regardless of the chosen date.
      </p>

      <h4 class="help-subsubsection-title">Legacy-style: <code>weekday_*_hidden_</code></h4>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Placeholder</th><th>Output (start = Wednesday)</th></tr></thead>
          <tbody>
            <tr><td><code>{weekday_divehi_hidden_1}</code></td><td>ބުދަ</td></tr>
            <tr><td><code>{weekday_english_hidden_1}</code></td><td>Wednesday</td></tr>
            <tr><td><code>{weekday_english_hidden_short_1}</code></td><td>Wed</td></tr>
            <tr><td><code>{weekday_divehi_hidden_sun_1}</code></td><td>އާދިއްތަ <em>(fixed Sun start)</em></td></tr>
            <tr><td><code>{weekday_english_hidden_mon_3}</code></td><td>Wednesday <em>(Mon+2)</em></td></tr>
          </tbody>
        </table>
      </div>
      <div class="help-note">
        <strong>Short weekday name reference</strong><br>
        English: Sun · Mon · Tue · Wed · Thu · Fri · Sat<br>
        Divehi: &nbsp;އާދި · ހޯމަ · އަން · ބުދަ · ބުރާ · ހުކު · ހޮނި
      </div>

      <!-- ── Full quick-ref ──────────────────────────────────── -->
      <h3 class="help-subsection-title">Complete Placeholder Quick Reference</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Category</th><th>Example placeholder</th><th>User enters?</th><th>Output</th></tr></thead>
          <tbody>
            <tr><td>Person</td><td><code>{person_name}</code></td><td>✅ Yes</td><td>Plain text</td></tr>
            <tr><td>Person (Divehi)</td><td><code>{person_name_divehi}</code></td><td>✅ Yes</td><td>Thaana text</td></tr>
            <tr><td>Organisation</td><td><code>{org_office}</code></td><td>✅ Yes</td><td>Plain text</td></tr>
            <tr><td>Date (English)</td><td><code>{date_issue}</code></td><td>✅ Date picker</td><td>15 June 2026</td></tr>
            <tr><td>Date (Divehi)</td><td><code>{date_issue_divehi}</code></td><td>✅ Date picker</td><td>15 ޖޫން 2026</td></tr>
            <tr><td>Date short</td><td><code>{date_issue_short}</code></td><td>✅ Date picker</td><td>15 June</td></tr>
            <tr><td>Date preset</td><td><code>{date_current_25}</code></td><td>✅ Pre-filled</td><td>25th this month</td></tr>
            <tr><td>Text / notes</td><td><code>{text_remarks}</code></td><td>✅ Textarea</td><td>Multi-line text</td></tr>
            <tr><td>Paragraph</td><td><code>{#text_body_paragraphs}…</code></td><td>✅ Textarea</td><td>Separate Word paragraphs</td></tr>
            <tr><td>Number</td><td><code>{num_days}</code></td><td>✅ Number</td><td>Numeric value</td></tr>
            <tr><td>Boolean</td><td><code>{bool_approved}</code></td><td>✅ Dropdown</td><td>Yes / No</td></tr>
            <tr><td>Image</td><td><code>{%img_photo}</code></td><td>✅ File picker</td><td>Embedded PNG/JPG</td></tr>
            <tr><td>Range seed</td><td><code>{range_start_date}</code></td><td>✅ Date picker</td><td>Seed for series</td></tr>
            <tr><td>Range series</td><td><code>{range_divehi_1}</code></td><td>❌ Auto</td><td>Day 1 Divehi date</td></tr>
            <tr><td>Weekday</td><td><code>{range_weekday_english_1}</code></td><td>❌ Auto</td><td>Monday…</td></tr>
            <tr><td>Metadata</td><td><code>{meta_generated_date}</code></td><td>❌ Auto</td><td>Today's date (MVT)</td></tr>
            <tr><td>Hidden</td><td><code>{start_date_hidden}</code></td><td>❌ Auto</td><td>Reformatted sibling</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ SOCIAL MEDIA TEMPLATES ════════════════════════════════════ -->
    <div class="help-section" id="hn-socialmedia">
      <h2 class="help-section-title">🖼️ Social Media Templates</h2>
      <p>
        The <strong>Social Media</strong> page is a canvas-based image editor for creating branded
        announcement graphics and social posts. You design reusable templates — each with a
        background image and any number of text fields — and then generate finished PNG images
        by filling in the fields without touching the layout again.
      </p>

      <h3 class="help-subsection-title">Creating a Template</h3>
      <ol class="help-list">
        <li>Click <strong>New Template</strong> in the template list.</li>
        <li>Give the template a <strong>Name</strong>.</li>
        <li>Click <strong>Upload Background</strong> and choose the image that forms the base of your graphic.</li>
        <li>Use <strong>Add Text Field</strong> to place text overlays on the canvas. Each field appears as a moveable, resizable box.</li>
        <li>Click <strong>Save Template</strong> to persist the layout.</li>
      </ol>

      <h3 class="help-subsection-title">Canvas Editor</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Action</th><th>How</th></tr></thead>
          <tbody>
            <tr><td><strong>Select a field</strong></td><td>Click on it on the canvas. A selection border appears.</td></tr>
            <tr><td><strong>Move a field</strong></td><td>Drag it to any position on the canvas.</td></tr>
            <tr><td><strong>Resize a field</strong></td><td>Drag the small resize handle in the bottom-right corner of the selected field.</td></tr>
            <tr><td><strong>Edit properties</strong></td><td>With a field selected, use the <strong>Field Properties</strong> panel on the right to change the label, font size, colour, alignment, and language (LTR / RTL for Dhivehi).</td></tr>
            <tr><td><strong>Delete a field</strong></td><td>Select it and click <strong>Delete Field</strong> in the properties panel.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Text Field Properties</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Property</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><strong>Label</strong></td><td>Name shown in the generate form (e.g. "Event Title", "Date").</td></tr>
            <tr><td><strong>Font Size</strong></td><td>Text size in pixels on the canvas.</td></tr>
            <tr><td><strong>Colour</strong></td><td>Text colour — use the colour picker or enter a hex code.</td></tr>
            <tr><td><strong>Alignment</strong></td><td>Left, Centre, or Right text alignment within the field box.</td></tr>
            <tr><td><strong>RTL</strong></td><td>Enables Dhivehi / Thaana right-to-left text direction and sets the MV Faruma font automatically.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 For Dhivehi text fields, enable <strong>RTL</strong> — this applies the correct font and text direction automatically.
      </p>

      <h3 class="help-subsection-title">Generating an Image</h3>
      <ol class="help-list">
        <li>Click <strong>Generate Image</strong> on a template card in the list.</li>
        <li>A <strong>Generate</strong> panel opens with a form containing one input per text field.</li>
        <li>Type the content for each field. A <strong>live preview</strong> on the right updates as you type.</li>
        <li>Previously entered values for each field are remembered — click the history icon next to a field to re-use a recent value.</li>
        <li>Click <strong>Export PNG</strong> to save the finished image to your chosen folder.</li>
      </ol>

      <h3 class="help-subsection-title">Field Input History</h3>
      <p>
        The last <strong>3 values</strong> you typed into each field are remembered per template.
        Click the history dropdown beside a field to quickly re-use a recent entry without retyping.
        History is stored locally and persists between sessions.
      </p>

      <h3 class="help-subsection-title">Managing Templates</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Control</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>Search bar</strong></td><td>Filter the template list by name in real time.</td></tr>
            <tr><td><strong>Edit (pencil icon)</strong></td><td>Reopen the canvas editor to change layout, fields, or background image.</td></tr>
            <tr><td><strong>Delete (bin icon)</strong></td><td>Permanently remove the template and its background image. Cannot be undone.</td></tr>
            <tr><td><strong>Unsaved dot</strong></td><td>A dot indicator on the Save button shows when you have unsaved changes in the editor.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 Social Media templates are stored in the <code>social-media/</code> subfolder inside your Templates directory.
        Back them up via <strong>Settings → Backup</strong> like any other app data.
      </p>
    </div>

    <!-- ══ NOTES ══════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-notes">
      <h2 class="help-section-title">📓 Notes</h2>
      <p>
        The <strong>Notes</strong> page is a personal notebook built into the app.
        Notes support both <strong>English</strong> and <strong>Dhivehi (Thaana)</strong> text,
        are saved locally to the device, and can optionally be synced to a
        <strong>Notion</strong> database.
      </p>

      <h3 class="help-subsection-title">Creating &amp; Editing Notes</h3>
      <ol class="help-list">
        <li>Click <strong>+ New Note</strong> in the left sidebar to create a blank note.</li>
        <li>Click the note title at the top of the editor to rename it.</li>
        <li>Type your content in the editor area. Changes are saved automatically as you type.</li>
        <li>Use the language toggle in the editor toolbar to switch between <strong>English (LTR)</strong> and <strong>Dhivehi (RTL)</strong> typing modes.</li>
      </ol>

      <h3 class="help-subsection-title">Sidebar</h3>
      <ul class="help-list">
        <li>All your notes are listed in the left sidebar, sorted by most recently modified.</li>
        <li>Use the <strong>Search notes…</strong> box to filter by title or content in real time.</li>
        <li>The sidebar shows each note's title and a short preview of its content.</li>
        <li>Click any note in the list to open it in the editor. The active note is highlighted.</li>
      </ul>

      <h3 class="help-subsection-title">Deleting Notes</h3>
      <p>
        Hover over a note in the sidebar to reveal the <strong>🗑 delete</strong> button.
        Click it and confirm the prompt to permanently remove the note. Deletion cannot be undone.
      </p>

      <h3 class="help-subsection-title">📓 → Notion Sync <span class="help-notion-badge">N</span></h3>
      <p>
        Notes can be synchronised to a <strong>Notion database</strong>, keeping a backup in
        your workspace and making them accessible from any device. To enable sync:
      </p>
      <ol class="help-list">
        <li>Go to <strong>⚙️ Settings</strong> and open the <strong>Notion Integration</strong> section.</li>
        <li>Paste your <strong>Notion Internal Integration Token</strong> (starts with <code>secret_…</code>).</li>
        <li>Paste the <strong>Database ID</strong> of the Notion database where notes should be written.</li>
        <li>Click <strong>Save Notion Settings</strong>.</li>
      </ol>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Button</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>⇅ Sync</strong> (per note)</td><td>Push the currently open note to Notion. Creates a new page if it hasn't been synced before, or updates the existing page.</td></tr>
            <tr><td><strong>⇅ Sync All</strong></td><td>Push every note in the sidebar to Notion in one operation.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note-info">
        ℹ️ Notion sync is one-way — changes made in Notion are not pulled back into the app.
        Your integration token is stored locally and never transmitted to any server other than Notion's own API.
      </p>

      <h3 class="help-subsection-title">Setting Up a Notion Integration</h3>
      <ol class="help-list">
        <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank">notion.so/my-integrations</a> and click <strong>+ New integration</strong>.</li>
        <li>Give it a name (e.g. <em>MTO Samugaa</em>), select your workspace, and click <strong>Submit</strong>.</li>
        <li>Copy the <strong>Internal Integration Token</strong> shown on the integration page.</li>
        <li>In Notion, open or create a database you want notes pushed to. Click <strong>⋯ Share</strong> → <strong>Invite</strong> → select your integration.</li>
        <li>Copy the Database ID from the database URL: <code>notion.so/&lt;workspace&gt;/<strong>DATABASE_ID</strong>?…</code></li>
        <li>Paste both values into <strong>Settings → Notion Integration</strong> in the app.</li>
      </ol>
    </div>

    <!-- ══ WATERMARK TOOL ════════════════════════════════════════════ -->
    <div class="help-section" id="hn-watermark">
      <h2 class="help-section-title">🖼️ Watermark Tool</h2>
      <p>
        Batch-stamp any number of images with a watermark graphic in one click —
        no image editing software required.
      </p>

      <h3 class="help-subsection-title">Workflow</h3>
      <ol class="help-list">
        <li>Click <strong>Add Images</strong> or drag and drop files onto the drop zone. Supported: <strong>PNG, JPG, WEBP, GIF</strong>.</li>
        <li>Click <strong>Choose File</strong> in the Watermark Image card and pick your PNG/JPG watermark. A preview appears with an <strong>✓ Active</strong> badge.</li>
        <li>Choose a <strong>Placement Mode</strong> (Corner or Full Width).</li>
        <li>Click <strong>Apply Watermark</strong>. A native folder picker opens — choose your output directory.</li>
        <li>The app saves each image into a <code>watermarked\</code> subfolder with <code>_wm</code> appended to the filename (e.g. <code>photo_wm.png</code>).</li>
      </ol>

      <h3 class="help-subsection-title">Placement Modes</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Mode</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Corner</strong></td>
              <td>Watermark height = 15% of source image height, placed in the <strong>bottom-right corner</strong> with padding margin. Output dimensions unchanged.</td>
            </tr>
            <tr>
              <td><strong>Full Width</strong></td>
              <td>Watermark width = source image width, overlaid flush against the <strong>bottom edge</strong>. Output dimensions unchanged — the watermark overlaps the bottom portion of the photo.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">Recent Watermarks</h3>
      <p>
        Your last <strong>6 watermark images</strong> are remembered for quick reuse. The most recently used always appears first. Click the small <strong>✕</strong> on a recent entry to remove it from the list.
      </p>
      <p class="help-note">
        💡 Use a <strong>PNG with a transparent background</strong> for the cleanest result. The output folder is remembered for the current session — click <strong>Clear All</strong> to reset it so the folder picker reappears.
      </p>
    </div>

    <!-- ══ WORK LOGS ════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-worklogs">
      <h2 class="help-section-title">📋 Work Logs</h2>
      <p>
        The <strong>Work Logs</strong> page is a timestamped activity journal for staff.
        Each entry records a task description, optional notes, and an automatic date and time
        captured in <strong>Maldives Time (MVT, UTC+5)</strong>. Logs can be searched, filtered
        by date range, and exported to Excel.
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
      <p>Each row has a <strong>🗑 delete</strong> button. Click it and confirm to permanently remove that entry. Deletion cannot be undone.</p>

      <h3 class="help-subsection-title">Exporting to Excel</h3>
      <p>
        Click <strong>Export to Excel</strong> to save the currently visible logs as an
        <code>.xlsx</code> spreadsheet including: <em>No., Date, Time, Task,</em> and <em>Notes</em>.
      </p>
      <p class="help-note">
        💡 If a filter is active when you export, only filtered results are included.
        Clear all filters first to export every log.
      </p>
    </div>

    <!-- ══ UTILITIES ════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-utilities">
      <h2 class="help-section-title">🔧 Utilities</h2>
      <p>The <strong>Utilities</strong> tab bundles five tools into a single tabbed workspace. Switch between them using the pill buttons at the top.</p>

      <h3 class="help-subsection-title">📏 Unit Converter</h3>
      <p>Convert values between units across ten measurement categories. Enter a value in any unit and all others update instantly.</p>
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
      <p class="help-note">💡 For length, you can enter feet and inches in the format <code>5'11"</code> for accurate conversions.</p>

      <h3 class="help-subsection-title">📅 Date Calculator</h3>
      <ul class="help-list">
        <li><strong>Date Difference</strong> — Enter two dates to instantly see the gap in years, months, weeks, and days.</li>
        <li><strong>Add / Subtract</strong> — Enter a start date and a number of days, weeks, months, or years to calculate a future or past date.</li>
      </ul>
      <p>Results update live as you type — no button press needed.</p>

      <h3 class="help-subsection-title">🧮 Scientific Calculator</h3>
      <p>Full-featured with arithmetic, trigonometric functions (sin, cos, tan), logarithms, powers, square root, and constants (π, e).</p>
      <ul class="help-list">
        <li>Click <strong>SCI</strong> to toggle the scientific function panel.</li>
        <li>Every result is added to the <strong>History</strong> panel — hover to reveal Copy and Delete buttons.</li>
        <li>Click any history result to paste it back into the display.</li>
        <li>Press <kbd>Escape</kbd> or click <strong>AC</strong> to clear the current expression.</li>
      </ul>

      <h3 class="help-subsection-title">🌙 Moon Phase</h3>
      <p>
        Shows the current lunar phase with a rendered moon graphic, phase name, illumination percentage,
        and the moon's age in days and hours. Next major phases — New Moon, First Quarter, Full Moon,
        and Last Quarter — are listed below. The age counter ticks live every second.
      </p>
      <p class="help-note">ℹ️ Spring tides occur around Full Moon and New Moon. Neap tides occur at First Quarter and Last Quarter.</p>

      <h3 class="help-subsection-title">🌊 Tide Chart</h3>
      <p>Predicted tide heights for <strong>Addu City (Gan), Maldives</strong> using a harmonic tidal model. Times are in <strong>MVT (UTC+5)</strong>.</p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Feature</th><th>Details</th></tr></thead>
          <tbody>
            <tr><td><strong>Daily view</strong></td><td>Smooth curve for one day. Move the cursor to read exact height and time at any point.</td></tr>
            <tr><td><strong>Weekly view</strong></td><td>Seven-day overview with annotated high and low tide markers.</td></tr>
            <tr><td><strong>High / Low tide list</strong></td><td>Key tide events listed with times and heights in metres.</td></tr>
            <tr><td><strong>Moon phase overlay</strong></td><td>Current lunar phase badge appears in the chart header.</td></tr>
            <tr><td><strong>Navigation</strong></td><td>Use ‹ / › arrows to move by one day (or one week). Click <strong>Today</strong> to return to the current date.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note-warn">
        ⚠️ Tide predictions are estimates from a mathematical harmonic model — always verify against official tables for navigation or safety decisions.
      </p>
    </div>

    <!-- ══ PRAYER TIMES ══════════════════════════════════════════════ -->
    <div class="help-section" id="hn-prayertimes">
      <h2 class="help-section-title">🕌 Prayer Times</h2>
      <p>
        Shows the daily prayer schedule for <strong>Addu City (Gan), Maldives</strong> using the
        pre-computed Namaadhu app database. All times are in <strong>MVT (UTC+5)</strong>.
      </p>

      <h3 class="help-subsection-title">Prayer Cards</h3>
      <p>
        Six time cards — Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha — each displaying
        12-hour and 24-hour formats. The <strong>current prayer</strong> (in progress) and
        the <strong>next prayer</strong> are highlighted with colour badges.
      </p>

      <h3 class="help-subsection-title">Countdown Card</h3>
      <p>
        A live countdown panel shows the name, icon, and Arabic label of the upcoming
        prayer along with a seconds-accurate timer. A progress ring and bar visualise
        how far through the interval you currently are.
      </p>

      <h3 class="help-subsection-title">Sun Information</h3>
      <p>A sun-info strip shows Sunrise, Solar Noon (Dhuhr), Sunset (Maghrib), and the total day length.</p>

      <h3 class="help-subsection-title">Qibla Compass</h3>
      <p>
        A graphical compass needle points toward Makkah from Addu City coordinates,
        together with the bearing in degrees and the nearest compass direction (e.g. <em>337.2° NNW</em>).
      </p>

      <h3 class="help-subsection-title">Date Navigation</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Control</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr><td><strong>‹ / ›</strong> arrows</td><td>Move one day backward or forward to look up prayer times for any date.</td></tr>
            <tr><td><strong>Today</strong></td><td>Jump back to the current date immediately.</td></tr>
            <tr><td><strong>Hijri date</strong></td><td>Shown next to the Gregorian date in the header and in the countdown card.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        ℹ️ Times are fixed to Gan coordinates (0.629°N, 73.099°E) — they are not affected by GPS or device location.
        The Hijri date is a calculated approximation; local moon-sighting announcements take precedence for religious purposes.
      </p>
    </div>

    <!-- ══ RANDOM PICKER ════════════════════════════════════════════ -->
    <div class="help-section" id="hn-randompicker">
      <h2 class="help-section-title">🎲 Random Picker</h2>
      <p>
        Randomly assigns a shuffled list of <em>choices</em> to a list of <em>names</em> — useful
        for duty rosters, task allocation, team formation, or any situation requiring a fair, impartial draw.
      </p>

      <h3 class="help-subsection-title">How to Use</h3>
      <ol class="help-list">
        <li>Enter your <strong>names</strong> in the left panel — one per line, or comma-separated.</li>
        <li>Enter your <strong>choices</strong> in the right panel. Use the quick-preset buttons — <em>Months, Days, Colours, Teams, Quarters</em> — to populate the choices field instantly.</li>
        <li>Click <strong>Shuffle &amp; Assign</strong>. A 5-second animated countdown plays before results appear (you can skip it at any time).</li>
        <li>Results appear as coloured cards grouped by choice, or as a flat name → choice list.</li>
      </ol>

      <h3 class="help-subsection-title">Assignment Modes</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Situation</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr><td><strong>More choices than names</strong></td><td>A random subset of choices is selected and paired one-to-one with the names.</td></tr>
            <tr><td><strong>Equal choices and names</strong></td><td>Each choice is assigned to exactly one name — a perfect 1-to-1 shuffle.</td></tr>
            <tr><td><strong>More names than choices</strong></td><td>Multi-slot mode activates automatically. Each choice is distributed across multiple names as evenly as possible (e.g. 12 names, 3 choices → 4 names per choice). A hint banner confirms this mode.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">View Modes &amp; Copy</h3>
      <ul class="help-list">
        <li><strong>Grouped</strong> — One card per choice, with all assigned names listed inside it.</li>
        <li><strong>List</strong> — One row per name: <em>Name → Choice</em>.</li>
        <li>Click <strong>📋 Copy Results</strong> to copy the full assignment table to the clipboard as plain text.</li>
        <li>Click <strong>Clear All</strong> to reset both input fields and hide the results panel.</li>
      </ul>
      <p class="help-note">
        💡 Each shuffle is completely random — re-clicking with the same inputs produces a different distribution every time.
      </p>
    </div>

    <!-- ══ CALENDAR ══════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-calendar">
      <h2 class="help-section-title">📅 Maldives Calendar</h2>
      <p>
        A full calendar with Maldives public holidays, Hijri (Islamic) dates, international observance
        days, and bilingual support in English and Divehi.
      </p>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Feature</th><th>Details</th></tr></thead>
          <tbody>
            <tr><td><strong>Views</strong></td><td>Switch between <strong>Month</strong>, <strong>Week</strong>, and <strong>Year</strong> views using the toggle buttons.</td></tr>
            <tr><td><strong>Navigation</strong></td><td>Use ‹ / › arrows to go forward or backward; click <strong>Today</strong> to jump to the current date.</td></tr>
            <tr><td><strong>Hijri dates</strong></td><td>Each day cell shows the corresponding Hijri calendar date in a smaller label.</td></tr>
            <tr><td><strong>Public Holidays</strong></td><td>Maldives national holidays are highlighted and labelled directly on the calendar (blue styling with gazette references).</td></tr>
            <tr><td><strong>International Days</strong></td><td>~75 UN and international observance days are marked with a subtle green dot.</td></tr>
            <tr><td><strong>Language toggle</strong></td><td>Switch all labels between English and ދިވެހި. The setting is remembered between sessions.</td></tr>
            <tr><td><strong>Weekends</strong></td><td>Friday and Saturday are highlighted as Maldivian weekend days.</td></tr>
            <tr><td><strong>Past dates</strong></td><td>Days before today are shown with a faint diagonal strikethrough to help you orient quickly.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        💡 Holiday data is loaded from a remote JSON feed (GitHub) and cached locally for 24 hours.
        The calendar works offline using the cached data.
      </p>
    </div>

    <!-- ══ BACKUP & RESTORE ══════════════════════════════════════════ -->
    <div class="help-section" id="hn-backup">
      <h2 class="help-section-title">💾 Backup &amp; Restore</h2>
      <p>
        The <strong>Backup</strong> page (found under <strong>Settings → Backup</strong>) lets you
        export all your app data to a safe location and restore it later — useful when moving to
        a new machine, recovering from accidental deletion, or creating periodic safety copies.
      </p>

      <h3 class="help-subsection-title">What Can Be Backed Up</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Data set</th><th>Includes</th></tr></thead>
          <tbody>
            <tr><td><strong>Social Media Templates</strong></td><td>All canvas layouts, field configurations, and background images.</td></tr>
            <tr><td><strong>Notes</strong></td><td>All notes with their titles, content, and Notion page IDs.</td></tr>
            <tr><td><strong>Work Logs</strong></td><td>All timestamped log entries and attached notes.</td></tr>
            <tr><td><strong>Document Templates</strong></td><td>The template database (<code>mto_forms.db</code>) and all associated <code>.docx</code> / <code>.xlsx</code> source files.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="help-subsection-title">How to Backup</h3>
      <ol class="help-list">
        <li>Go to <strong>Settings → Backup</strong>.</li>
        <li>Find the section for the data you want to back up (e.g. <em>Social Media Templates</em>, <em>Notes</em>).</li>
        <li>Click <strong>Backup</strong>. A native folder picker opens — choose a safe destination (e.g. a USB drive or network share).</li>
        <li>A confirmation message shows how many items were backed up and the full path.</li>
      </ol>

      <h3 class="help-subsection-title">How to Restore</h3>
      <ol class="help-list">
        <li>Click <strong>Restore from Backup</strong> next to the relevant section.</li>
        <li>Confirm the prompt — existing items with the same IDs will be overwritten.</li>
        <li>Browse to the backup file or folder created during the Backup step.</li>
        <li>A confirmation message shows how many items were restored.</li>
      </ol>

      <p class="help-note-warn">
        ⚠️ Restoring overwrites existing data with the same IDs. Always create a fresh backup of the current state before restoring an older one.
      </p>

      <h3 class="help-subsection-title">Best Practice</h3>
      <ul class="help-list">
        <li>Run a <strong>full backup</strong> (all sections) before any major change — new OS, app update, or restructuring templates.</li>
        <li>Store backups on a <strong>separate drive or cloud folder</strong>, not the same disk as the app data.</li>
        <li>Label backup folders with the date (e.g. <code>MTO_Backup_2026-06-17</code>) so you can identify them later.</li>
      </ul>
    </div>

    <!-- ══ SETTINGS ═════════════════════════════════════════════════ -->
    <div class="help-section" id="hn-settings">
      <h2 class="help-section-title">⚙️ Settings</h2>
      <p>The Settings page lets you change where the app stores its data and configure integrations.</p>

      <h3 class="help-subsection-title">Storage Directories</h3>
      <div class="help-table-wrapper">
        <table class="help-table">
          <thead><tr><th>Setting</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><strong>Templates Directory</strong></td><td>Where uploaded template files (<code>.docx</code>, <code>.xlsx</code>) are stored on disk.</td></tr>
            <tr><td><strong>Outputs Directory</strong></td><td>Where generated documents are saved when using <em>Generate Only</em>.</td></tr>
            <tr><td><strong>Database Folder</strong></td><td>Folder containing <code>mto_forms.db</code> — the registry of all templates, saved records, and field definitions.</td></tr>
            <tr><td><strong>Save Settings</strong></td><td>Apply new directory paths immediately. All views reload to reflect the change.</td></tr>
            <tr><td><strong>Reset to Defaults</strong></td><td>Restore all paths to their original default locations.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="help-note">
        ⚠️ After changing the Database Folder, the app uses the new location immediately.
        If you move <code>mto_forms.db</code> manually, point this setting to its new folder.
      </p>

      <h3 class="help-subsection-title">Notion Integration</h3>
      <p>Enter your <strong>Notion Integration Token</strong> and <strong>Database ID</strong> here to enable Notes → Notion sync. See the <a href="#hn-notes" class="help-inline-link">Notes section</a> for setup instructions.</p>

      <h3 class="help-subsection-title">About</h3>
      <p>Displays the app version, developer contact details, and repository link — useful when reporting bugs or requesting support.</p>
    </div>

    <!-- ══ TIPS & BEST PRACTICES ═════════════════════════════════════ -->
    <div class="help-section" id="hn-tips">
      <h2 class="help-section-title">💡 Tips &amp; Best Practices</h2>

      <h3 class="help-subsection-title">Naming Placeholders</h3>
      <ul class="help-list">
        <li>Always start with a <strong>category prefix</strong> — <code>person_</code>, <code>org_</code>, <code>date_</code>, <code>text_</code>, <code>num_</code>, <code>bool_</code>, <code>img_</code>, or <code>meta_</code>. This lets the app set the correct field type automatically when you upload the template.</li>
        <li>Use <strong>lowercase snake_case</strong> throughout — e.g. <code>{person_name}</code>, not <code>{Person Name}</code> or <code>{PersonName}</code>.</li>
        <li>Append <code>_divehi</code> to any key to make it a Thaana / RTL field — e.g. <code>{person_name_divehi}</code>.</li>
        <li>Older templates that use keys like <code>{Name}</code> or <code>{issue_date}</code> continue to work — backward compatibility is fully preserved.</li>
      </ul>

      <h3 class="help-subsection-title">Batch Generation</h3>
      <ul class="help-list">
        <li>Always include a <strong>header row</strong> in your CSV or Excel file — the wizard uses these column names for mapping.</li>
        <li>Format date columns as <code>YYYY-MM-DD</code> for reliable parsing. Excel date cells work too.</li>
        <li>Test your mapping with a <strong>2–3 row sample file</strong> first before running a large batch.</li>
        <li>Use a <strong>fresh empty folder</strong> for each batch run — the app overwrites files with the same name without warning.</li>
        <li>The <strong>Combine into PDF</strong> option requires Microsoft Word installed on the machine.</li>
      </ul>

      <h3 class="help-subsection-title">Paragraph &amp; Multi-line Fields</h3>
      <ul class="help-list">
        <li>For <strong>short notes or addresses</strong> leave <em>Paragraph mode</em> off — newlines become soft line breaks inside one paragraph.</li>
        <li>For <strong>multi-paragraph letters or policy text</strong> enable <em>Paragraph mode</em> and use the loop syntax in your template.</li>
      </ul>

      <h3 class="help-subsection-title">Dates &amp; Bilingual Fields</h3>
      <ul class="help-list">
        <li>For a date that appears in both languages in the same document, use two placeholders: <code>{date_issue}</code> and <code>{date_issue_divehi}</code>.</li>
        <li>Use <code>_short</code> to omit the year — e.g. <code>{date_issue_divehi_short}</code> outputs <em>15 ޖޫން</em>.</li>
        <li>Use <code>_current_N</code> or <code>_next_N</code> presets for monthly documents that always reference a specific day number.</li>
      </ul>

      <h3 class="help-subsection-title">Social Media Templates</h3>
      <ul class="help-list">
        <li>Design your background image at the exact pixel dimensions you need — the canvas output matches the source image size.</li>
        <li>Use <strong>RTL</strong> fields for any Dhivehi text — this sets the correct font and direction automatically.</li>
        <li>Field input history saves you time — previously typed values appear as suggestions when you open the generate panel.</li>
        <li>Back up your Social Media templates regularly via <strong>Settings → Backup</strong> since they include both the layout and the background image file.</li>
      </ul>

      <h3 class="help-subsection-title">Notes &amp; Notion Sync</h3>
      <ul class="help-list">
        <li>Notes are auto-saved as you type — there is no save button to press.</li>
        <li>Switch the editor to <strong>Dhivehi mode</strong> before typing Thaana to get correct RTL layout and cursor behaviour.</li>
        <li>Before running <strong>Sync All</strong>, make sure your Notion database has a <strong>Name</strong> (title) property and a <strong>Content</strong> text property.</li>
        <li>If sync fails, check that your Notion integration has been <strong>shared</strong> with the target database (Notion → Share → Invite).</li>
      </ul>

      <h3 class="help-subsection-title">Watermark Tool</h3>
      <ul class="help-list">
        <li>Use a <strong>PNG with a transparent background</strong> for the cleanest result.</li>
        <li>In <strong>Corner</strong> mode, a <strong>horizontally wider</strong> watermark graphic gives the best proportions.</li>
        <li>In <strong>Full Width</strong> mode, a <strong>wide, short banner</strong> graphic works best to avoid covering too much of the photo.</li>
      </ul>

      <h3 class="help-subsection-title">Work Logs</h3>
      <ul class="help-list">
        <li>Press <kbd>Enter</kbd> in the Task field to save quickly without reaching for the mouse.</li>
        <li>Use <strong>From / To</strong> date filters to scope the view before exporting — only filtered rows are written to Excel.</li>
        <li>Work log timestamps are fixed to <strong>MVT</strong> and cannot be edited, ensuring an accurate audit trail.</li>
      </ul>

      <h3 class="help-subsection-title">Prayer Times</h3>
      <ul class="help-list">
        <li>Times are fixed to <strong>Addu City (Gan) coordinates</strong> — they are not affected by GPS or device location.</li>
        <li>Use the ‹ / › arrows to look up prayer times for any past or future date without leaving the page.</li>
        <li>The Hijri date displayed is a calculated approximation; local moon-sighting announcements take precedence for religious purposes.</li>
      </ul>

      <h3 class="help-subsection-title">Utilities</h3>
      <ul class="help-list">
        <li>The Unit Converter accepts feet-and-inches input like <code>5'11"</code> directly in the length fields.</li>
        <li>Tide predictions are mathematical estimates — always cross-check against official tables for navigation or safety.</li>
        <li>In the Moon Phase view, spring tides occur around Full Moon and New Moon.</li>
      </ul>
    </div>

  `;

  // ── Populate version badge in hero ────────────────────────────────
  if (window.electronAPI && window.electronAPI.getAboutInfo) {
    window.electronAPI.getAboutInfo().then(info => {
      const vEl = document.getElementById('help-hero-version');
      if (vEl && info && info.version) {
        vEl.textContent = 'v' + info.version;
      }
    }).catch(() => {});
  }

  // ── Smooth scroll for quick-nav pills ────────────────────────────
  container.querySelectorAll('.help-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(pill.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ── Inline anchor links (e.g. "See Notes section") ───────────────
  container.querySelectorAll('.help-inline-link[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ── Active pill highlight on scroll ──────────────────────────────
  const sections  = container.querySelectorAll('.help-section[id]');
  const pills     = container.querySelectorAll('.help-pill[href]');
  const scrollRoot = container.closest('.settings-container') || container.parentElement;

  function _updateActivePill() {
    let current = null;
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      const parentRect = scrollRoot.getBoundingClientRect();
      if (rect.top - parentRect.top <= 100) current = sec.id;
    });
    pills.forEach(pill => {
      const isActive = pill.getAttribute('href') === '#' + current;
      pill.classList.toggle('help-pill-active', isActive);
    });
  }

  if (scrollRoot) {
    scrollRoot.addEventListener('scroll', _updateActivePill, { passive: true });
    _updateActivePill();
  }

  // ── Help search ───────────────────────────────────────────────────
  const searchInput   = document.getElementById('help-search-input');
  const searchClear   = document.getElementById('help-search-clear');
  const searchResults = document.getElementById('help-search-results');
  const quicknav      = document.getElementById('help-quicknav');

  // Index: collect all text from sections for search
  function _buildSearchIndex() {
    const idx = [];
    sections.forEach(sec => {
      const title    = sec.querySelector('.help-section-title');
      const subheads = sec.querySelectorAll('.help-subsection-title, .help-subsubsection-title');
      const paras    = sec.querySelectorAll('p, li, td, th');
      let body = '';
      paras.forEach(el => { body += ' ' + el.textContent; });
      idx.push({
        id:      sec.id,
        title:   title ? title.textContent.trim() : sec.id,
        body:    body.toLowerCase(),
        subheads:[...subheads].map(s => s.textContent.trim())
      });
    });
    return idx;
  }

  const _searchIndex = _buildSearchIndex();

  function _runSearch(q) {
    if (!q || q.length < 2) {
      searchResults.style.display = 'none';
      quicknav.style.display = '';
      searchClear.style.display = 'none';
      return;
    }
    searchClear.style.display = '';
    quicknav.style.display = 'none';

    const ql = q.toLowerCase();
    const hits = _searchIndex.filter(item =>
      item.title.toLowerCase().includes(ql) || item.body.includes(ql)
    );

    if (hits.length === 0) {
      searchResults.innerHTML = `<p class="help-search-noresult">No results for "<strong>${q}</strong>"</p>`;
    } else {
      searchResults.innerHTML = hits.map(h => {
        // Extract a short snippet around the match
        const idx2 = h.body.indexOf(ql);
        let snippet = '';
        if (idx2 !== -1) {
          const start = Math.max(0, idx2 - 60);
          const end   = Math.min(h.body.length, idx2 + q.length + 80);
          snippet = '…' + h.body.slice(start, end).replace(
            new RegExp(ql, 'gi'),
            m => `<mark>${m}</mark>`
          ) + '…';
        }
        return `
          <a href="#${h.id}" class="help-search-hit">
            <span class="help-search-hit-title">${h.title}</span>
            ${snippet ? `<span class="help-search-hit-snippet">${snippet}</span>` : ''}
          </a>`;
      }).join('');
    }
    searchResults.style.display = 'block';

    // Click on a result: smooth scroll + close
    searchResults.querySelectorAll('.help-search-hit').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          searchInput.value = '';
          searchResults.style.display = 'none';
          quicknav.style.display = '';
          searchClear.style.display = 'none';
        }
      });
    });
  }

  let _searchDebounce = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(() => _runSearch(searchInput.value.trim()), 160);
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchResults.style.display = 'none';
      quicknav.style.display = '';
      searchClear.style.display = 'none';
      searchInput.focus();
    });
  }
};