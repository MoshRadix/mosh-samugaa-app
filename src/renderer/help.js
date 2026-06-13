/**
 * @file help.js
 * @description Help page content and initialization for MTO Samugaa.
 */

window.initHelp = function () {
  const container = document.getElementById("help-content");
  if (!container) return;

  container.innerHTML = `

    <!-- ══ HELP HERO ════════════════════════════════════════════ -->
    <div class="help-hero">
      <div class="help-hero-icon">📄</div>
      <div class="help-hero-text">
        <h1 class="help-hero-title">MTO Samugaa</h1>
        <p class="help-hero-sub">Complete user guide — templates, batch generation, tools, placeholders, and more</p>
      </div>
      <div class="help-hero-version" id="help-hero-version"></div>
    </div>

    <!-- ══ QUICK-NAV PILLS ══════════════════════════════════════ -->
    <div class="help-quicknav">
      <span class="help-quicknav-label">Jump to:</span>
      <a href="#hn-overview"     class="help-pill">Overview</a>
      <a href="#hn-navigation"   class="help-pill">Navigation</a>
      <a href="#hn-templates"    class="help-pill">Templates</a>
      <a href="#hn-search"       class="help-pill">Search &amp; Print</a>
      <a href="#hn-fillform"     class="help-pill">Fill Form</a>
      <a href="#hn-batch"        class="help-pill">⚡ Batch Generate</a>
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
        <strong>MTO Samugaa</strong> is a desktop application for generating and printing
        filled Word (<code>.docx</code>) or Excel (<code>.xlsx</code>) documents from reusable
        templates — no manual file editing required.
      </p>
      <p>
        Templates can be <strong>fillable</strong> (contain <code>{placeholder}</code> tags that
        produce a guided form) or <strong>static</strong> (printed as-is). The app supports
        Dhivehi (Thaana) and English text, bilingual date formatting, automatic date-range population,
        weekday computation, image embedding, batch document generation, saved records, and a
        growing suite of built-in tools.
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
          <span>Generate hundreds of documents from a CSV or Excel list</span>
        </div>
        <div class="help-feature-card">
          <span class="help-feature-icon">🌐</span>
          <strong>Bilingual</strong>
          <span>Dhivehi &amp; English dates and text</span>
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
        <div class="help-feature-card">
          <span class="help-feature-icon">🌙</span>
          <strong>Moon &amp; Tides</strong>
          <span>Lunar phases &amp; Addu City tidal predictions</span>
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
            <tr><td><strong>Search &amp; Print</strong></td><td>Find any template by name, description, or category and print, fill, or batch-generate documents immediately.</td></tr>
            <tr><td><strong>Fill Form</strong></td><td>Active form for the currently selected fillable template. Only accessible after choosing a template.</td></tr>
            <tr><td><strong>Templates</strong></td><td>Full template library — upload, edit, configure fields, preview, batch-generate, or delete templates.</td></tr>
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
            <tr><td><strong>⚡ Batch</strong></td><td>Open the Batch Generator wizard to produce multiple documents from a CSV or Excel file at once.</td></tr>
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
            <tr><td><strong>Hint / Helper Text</strong></td><td>Short instructional text shown under the field in the form. Overrides the default type hint.</td></tr>
            <tr><td><strong>Paragraph mode</strong></td><td>(<code>textarea</code> only) When enabled, blank lines in the textarea create separate Word paragraphs via the loop syntax. See §&nbsp;Paragraph &amp; Multi-line Text.</td></tr>
            <tr><td><strong>Rows</strong></td><td>(<code>textarea</code> only) Controls the visible height of the textarea in the form. Defaults to 8 rows in paragraph mode, 3 otherwise.</td></tr>
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
      <p>
        Fields typed as <code>textarea</code> — including all <code>text_*</code> prefix fields —
        appear as a multi-line text area in the form.
      </p>
      <ul class="help-list">
        <li>In <strong>line-break mode</strong> (default): press <kbd>Shift</kbd>+<kbd>Enter</kbd> to add a new line. Each line break becomes a <code>&lt;w:br/&gt;</code> in the document — all text stays in one paragraph.</li>
        <li>In <strong>paragraph mode</strong>: separate blocks of text with a <strong>blank line</strong>. Each block becomes its own Word paragraph when the template uses the loop syntax <code>{#text_body_paragraphs}{paragraph}{/text_body_paragraphs}</code>.</li>
        <li>A hint below the textarea tells you which mode is active.</li>
        <li>Maximum 5 000 characters per textarea field.</li>
      </ul>

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

    <!-- ══ BATCH GENERATION ══════════════════════════════════════ -->
    <div class="help-section" id="hn-batch">
      <h2 class="help-section-title">⚡ Batch Document Generation</h2>
      <p>
        The <strong>Batch Generator</strong> lets you produce many filled documents at once from a
        spreadsheet — ideal for issuing the same form to multiple employees, generating monthly
        reports in bulk, or creating personalised letters for a list of recipients.
      </p>
      <p>
        The <strong>⚡ Batch</strong> button appears on every fillable template card — both on the
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
            Failed rows are clearly flagged so you can investigate without stopping the whole batch.</p>
            <p>
              For <code>.docx</code> templates you can optionally tick
              <strong>Combine all documents into a single PDF</strong> before generating
              (requires Microsoft Word to be installed on the machine).
            </p>
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

    <!-- ══ PLACEHOLDER REFERENCE ════════════════════════════════ -->
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
          <li>Starting with a <strong>category prefix</strong> (see table below) — this is how the app infers the field type automatically on upload.</li>
          <li>No spaces, dots, dashes, or special characters. Maximum 64 characters.</li>
          <li>Append <code>_divehi</code> to any key to make it a <strong>Thaana / RTL field</strong>.</li>
        </ul>
      </div>

      <!-- ── Category Prefix Overview ─────────────────────────── -->
      <h3 class="help-subsection-title">Category Prefixes — Auto-Detection</h3>
      <p>
        When a template is uploaded the app reads every <code>{placeholder}</code> key and
        automatically sets the correct <strong>field type</strong> based on its prefix.
        You can override this in the <strong>⚙️ Fields</strong> editor.
      </p>
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

      <!-- ── Date Formatting ─────────────────────────────────── -->
      <h3 class="help-subsection-title">Date Fields — Formatting &amp; Locale</h3>
      <p>
        Date fields are stored as <code>YYYY-MM-DD</code> internally and automatically
        formatted when the document is generated. The locale is determined by suffixes on the key:
      </p>
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
        <strong>pre-filled</strong> to the N-th day of the current or next month —
        handy for monthly recurring documents.
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

      <!-- ── Paragraph / Text_ Fields ───────────────────────── -->
      <h3 class="help-subsection-title">Paragraph &amp; Multi-line Text (<code>text_</code>)</h3>
      <p>
        Placeholders starting with <code>text_</code> render as a multi-line <strong>textarea</strong>
        in the form. They support two output modes that you set in the <strong>⚙️ Fields</strong> editor:
      </p>

      <h4 class="help-subsubsection-title">Line-break mode <em>(default)</em></h4>
      <p>
        Pressing <kbd>Shift</kbd>+<kbd>Enter</kbd> in the textarea inserts a soft line break.
        Each newline becomes a <code>&lt;w:br/&gt;</code> break inside a <strong>single paragraph</strong>
        in the generated Word document. Use for short notes, addresses, or remarks.
      </p>

      <h4 class="help-subsubsection-title">Paragraph-loop mode</h4>
      <p>
        Enable <strong>Paragraph mode</strong> in the Fields editor. Each block of text separated
        by a <strong>blank line</strong> in the textarea becomes its own proper
        <code>&lt;w:p&gt;</code> Word paragraph — ideal for multi-paragraph letters, policies,
        or legal clauses.
      </p>
      <p>In your <code>.docx</code> template, use the loop syntax instead of a plain tag:</p>
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
      <p class="help-note">
        💡 The textarea grows to <strong>8 rows</strong> in paragraph mode (instead of the default 3)
        and the hint below the field changes to remind you to separate paragraphs with a blank line.
      </p>

      <!-- ── Image Fields ────────────────────────────────────── -->
      <h3 class="help-subsection-title">Image Placeholders (<code>img_</code>)</h3>
      <p>
        Image fields accept a <strong>PNG or JPG</strong> file and embed it directly into the
        generated Word document at the position of the placeholder tag.
      </p>
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
        <li>After choosing a file, a thumbnail preview appears in the form. Click <strong>✕ Clear</strong> to remove it.</li>
        <li>Set the <strong>Width (px)</strong> input to control the rendered width in the document. The height is scaled proportionally.</li>
        <li>Image embedding is only supported in <code>.docx</code> templates, not <code>.xlsx</code>.</li>
      </ul>

      <!-- ── Auto-computed / Hidden ──────────────────────────── -->
      <h3 class="help-subsection-title">Auto-computed &amp; Hidden Fields</h3>
      <p>
        The following field categories are <strong>never shown in the form</strong> — they are
        filled automatically at document generation time:
      </p>
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
      <p>These are populated automatically the moment you click <strong>Generate</strong>:</p>
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

      <!-- ── Date Range ──────────────────────────────────────── -->
      <h3 class="help-subsection-title">Date Range Placeholders</h3>
      <p>
        Date-range templates let you print a date on every row of a multi-day schedule.
        Add a <strong>single seed date field</strong> in your template (<code>{range_start_date}</code>),
        then add as many numbered series tags as you need. All series tags are auto-computed
        and <strong>hidden from the form</strong>.
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

      <!-- ── Weekday ─────────────────────────────────────────── -->
      <h3 class="help-subsection-title">Weekday Placeholders</h3>
      <p>
        Weekday placeholders are always <strong>auto-computed and hidden</strong>. They derive
        their value from the same seed date used by date-range placeholders.
        Two styles are supported — new-style and legacy — and both work simultaneously.
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
      <p class="help-note">
        ℹ️ Spring tides (higher highs and lower lows) occur around Full Moon and New Moon.
        Neap tides occur at First Quarter and Last Quarter.
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
      <h3 class="help-subsection-title">About</h3>
      <p>
        The <strong>About</strong> section displays the app version, developer contact details,
        and repository link — useful when reporting bugs or requesting support.
      </p>
    </div>

    <!-- ══ TIPS & BEST PRACTICES ════════════════════════════════ -->
    <div class="help-section" id="hn-tips">
      <h2 class="help-section-title">💡 Tips &amp; Best Practices</h2>

      <h3 class="help-subsection-title">Naming Placeholders</h3>
      <ul class="help-list">
        <li>Always start with a <strong>category prefix</strong> — <code>person_</code>, <code>org_</code>, <code>date_</code>, <code>text_</code>, <code>num_</code>, <code>bool_</code>, <code>img_</code>, or <code>meta_</code>. This lets the app set the correct field type automatically when you upload the template.</li>
        <li>Use <strong>lowercase snake_case</strong> throughout. No spaces, dots, or mixed case — e.g. <code>{person_name}</code>, not <code>{Person Name}</code> or <code>{PersonName}</code>.</li>
        <li>Append <code>_divehi</code> to any key to make it a Thaana / RTL field — e.g. <code>{person_name_divehi}</code>, <code>{text_remarks_divehi}</code>.</li>
        <li>Older templates that use keys like <code>{Name}</code> or <code>{issue_date}</code> continue to work — backward compatibility is fully preserved.</li>
      </ul>

      <h3 class="help-subsection-title">Batch Generation</h3>
      <ul class="help-list">
        <li>Always include a <strong>header row</strong> in your CSV or Excel file — the wizard uses these column names for mapping.</li>
        <li>Format date columns as <code>YYYY-MM-DD</code> for reliable parsing. Excel date cells work too.</li>
        <li>Test your mapping with a <strong>2–3 row sample file</strong> first before running a large batch.</li>
        <li>Use a <strong>fresh empty folder</strong> for each batch run — the app overwrites files with the same name without warning.</li>
        <li>The <strong>Combine into PDF</strong> option requires Microsoft Word installed on the machine. Skip it if Word is not available.</li>
      </ul>

      <h3 class="help-subsection-title">Paragraph &amp; Multi-line Fields</h3>
      <ul class="help-list">
        <li>Use <code>text_</code> prefix for any free-text field — e.g. <code>{text_intro}</code>, <code>{text_notes}</code>. The app auto-detects them as <code>textarea</code> type.</li>
        <li>For <strong>short notes or addresses</strong> leave <em>Paragraph mode</em> off — newlines become soft line breaks inside one paragraph.</li>
        <li>For <strong>multi-paragraph letters or policy text</strong> enable <em>Paragraph mode</em> in the Fields editor. Then in your template use the loop syntax:<br>
          <code style="display:inline-block;margin-top:4px;">{#text_body_paragraphs}{paragraph}{/text_body_paragraphs}</code><br>
          Each block of text separated by a blank line in the form becomes its own Word paragraph.
        </li>
      </ul>

      <h3 class="help-subsection-title">Dates &amp; Bilingual Fields</h3>
      <ul class="help-list">
        <li>Mark date fields as <strong>RTL</strong> in the field editor for automatic Divehi formatting on generation.</li>
        <li>For a date that appears in both languages in the same document, use two placeholders: <code>{date_issue}</code> and <code>{date_issue_divehi}</code>.</li>
        <li>Use <code>_short</code> to omit the year — e.g. <code>{date_issue_divehi_short}</code> outputs <em>15 ޖޫން</em>.</li>
        <li>Use <code>_current_N</code> or <code>_next_N</code> presets for monthly documents that always reference a specific day number — the date picker opens pre-filled.</li>
        <li>You can freely mix date-range, weekday, and hidden placeholders in the same template. All are resolved automatically from a single start date.</li>
        <li>Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> inside a fill form to toggle automatic language switching.</li>
      </ul>

      <h3 class="help-subsection-title">Auto-computed Fields</h3>
      <ul class="help-list">
        <li><strong>Metadata fields</strong> (<code>meta_*</code>) are filled automatically at generation time — just add them to your template and they appear without any user input. No configuration needed.</li>
        <li><strong>Date-range series</strong> (<code>range_english_N</code>, <code>range_divehi_N</code>, etc.) only need a single user-visible seed date field (<code>{range_start_date}</code>). All numbered fields are hidden automatically.</li>
        <li>Any key ending in <code>_hidden</code> is never shown — use it for computed or reformatted copies of other date fields.</li>
      </ul>

      <h3 class="help-subsection-title">Image Fields</h3>
      <ul class="help-list">
        <li>For image placeholders in Word, use <code>{%img_photo}</code> (with a <code>%</code> prefix) — plain <code>{img_photo}</code> will not embed the image.</li>
        <li>The field key in the Fields editor is just <code>img_photo</code> (no percent sign) — the <code>%</code> is part of the template syntax only.</li>
        <li>After choosing a file, a thumbnail preview appears in the form. The <strong>Width (px)</strong> input controls the rendered size; height scales proportionally.</li>
        <li>Image embedding is only supported in <code>.docx</code> templates.</li>
      </ul>

      <h3 class="help-subsection-title">Templates &amp; Forms</h3>
      <ul class="help-list">
        <li>After editing a template file externally, click <strong>Reload Fields</strong> on its card to re-scan for new or renamed placeholders.</li>
        <li>Mark rarely-used templates as <strong>Inactive</strong> to hide them from Search without deleting them.</li>
        <li>Use <strong>Dropdown</strong> type fields to enforce consistent values (e.g. department names) and prevent typos.</li>
        <li>Click <strong>Save Record</strong> before generating to keep a log of form data you can reload later.</li>
        <li>The <strong>print count</strong> (🖨️) on each template card updates every time you open the Templates or Search page.</li>
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

  // Populate version badge in hero
  if (window.electronAPI && window.electronAPI.getAboutInfo) {
    window.electronAPI.getAboutInfo().then(info => {
      const vEl = document.getElementById('help-hero-version');
      if (vEl && info && info.version) {
        vEl.textContent = 'v' + info.version;
      }
    }).catch(() => {});
  }

  // Smooth scroll for quick-nav pills
  container.querySelectorAll('.help-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(pill.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Highlight active section on scroll
  const sections = container.querySelectorAll('.help-section[id]');
  const pills = container.querySelectorAll('.help-pill[href]');
  const scrollRoot = container.closest('.settings-container') || container.parentElement;

  function _updateActivePill() {
    let current = null;
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      const parentRect = scrollRoot.getBoundingClientRect();
      if (rect.top - parentRect.top <= 80) current = sec.id;
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
};