<div align="center">

<!-- Compass SVG badge -->
<img src="assets/icons/app.ico" alt="MTO Samugaa icon" width="96" height="96" />

# MTO Samugaa · ސަމުގާ

**The all-in-one desktop productivity suite for Addu City Council staff**

[![Version](https://img.shields.io/badge/version-1.1.1-6c8b7a?style=flat-square)](https://github.com/moshradix/mosh-forms-app/releases)
[![Electron](https://img.shields.io/badge/Electron-42-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)](https://github.com/moshradix/mosh-forms-app/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## What is MTO Samugaa?

**MTO Samugaa** ("MTO's Compass") is a bilingual — English & Dhivehi (Thaana script) — offline-first desktop application purpose-built for the Municipal Technical Office of Addu City Council, Maldives. It consolidates document generation, task management, staff logging, and island-specific utilities into a single, fast, cross-platform app that works entirely without an internet connection.

> *ސަމުގާ* (samugaa) means **compass** in Dhivehi — a tool that always shows you where to go.

---

## ✨ Features

### 📄 Documents
| Feature | Description |
|---|---|
| **Templates Library** | Create and manage reusable `.docx` / `.xlsx` form templates with custom field definitions |
| **Fill Form** | Populate templates with staff data and generate ready-to-print documents instantly |
| **Search & Print** | Find previously generated documents and send them directly to a printer |
| **Social Media** | Generate branded announcement images and watermarked content for council channels |

### 🛠️ Tools
| Feature | Description |
|---|---|
| **Utilities** | Unit converter, scientific calculator, date/time tools, and more |
| **Watermark** | Apply council watermarks to images in bulk |
| **Random Picker** | Fair randomised selection from a list of names or items |
| **Prayer Times** | Accurate Maldivian prayer timetables for Addu (Hithadhoo, island #82) using an offline lookup database — no internet required |

### 🗓️ Productivity
| Feature | Description |
|---|---|
| **Calendar** | Full monthly calendar with Maldivian public holidays, Islamic lunar events, Friday–Saturday weekends, and 14-day weather forecasts (Open-Meteo) |
| **To-Do** | Todoist-style task manager with priorities, subtasks, assignees, reminders, drag-and-drop reorder, project grouping, and Notion two-way sync |
| **Work Logs** | Time-stamped work journal with photo attachments, linked automatically to completed To-Do tasks |
| **Notes** | Freeform rich notepad synced with Notion |

### ⚙️ App Management
| Feature | Description |
|---|---|
| **Settings** | Language toggle (English ↔ Dhivehi), theme, Notion integration tokens |
| **Backup** | One-click export and import of all app data |
| **Help** | Built-in usage guide |

---

## 🌍 Addu-specific Details

- **Timezone**: UTC+5 (Maldives Time, MVT) — `Asia/Colombo` offset
- **Location**: Gan Station, Addu City — `0.629°N, 73.099°E`
- **Work week**: Sunday → Thursday (Friday–Saturday weekend)
- **Prayer times**: Pre-computed offline DB (366-entry 1972 leap-year baseline), island #82
- **Holidays**: Maldivian fixed Gregorian holidays + Islamic lunar dates
- **Language**: Full UI in English and Dhivehi (RTL Thaana, MV Faruma font, phonetic keyboard input)

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| Runtime | [Electron](https://www.electronjs.org/) v42 |
| Database | SQLite via `better-sqlite3` (offline, embedded) |
| Documents | [Docxtemplater](https://docxtemplater.com/), [ExcelJS](https://github.com/exceljs/exceljs) (`@protobi/exceljs`), PizZip |
| Fonts | MV Faruma (Thaana), Oswald, Yellowtail, Caveat |
| Weather | [Open-Meteo](https://open-meteo.com/) (free, no API key required) |
| Sync | Notion API (optional; Internal Integration Token) |
| Packaging | Electron Forge — Squirrel (Windows), ZIP (macOS), DEB/RPM (Linux) |

---

## 📥 Installation (Pre-built Binaries)

The easiest way to get started is to download a pre-built release — no Node.js or build tools required.

1. Go to the [**Releases**](https://github.com/moshradix/mosh-forms-app/releases) page.
2. Download the installer for your operating system:

| OS | File to download |
|---|---|
| **Windows** | `mosh-samugaa-app-Setup-X.X.X.exe` |
| **macOS** | `mosh-samugaa-app-X.X.X-arm64.zip` or `-x64.zip` |
| **Linux (Debian/Ubuntu)** | `mosh-samugaa-app_X.X.X_amd64.deb` |
| **Linux (Fedora/RHEL)** | `mosh-samugaa-app-X.X.X.x86_64.rpm` |

3. Run the installer and follow the on-screen steps.

> **macOS note:** Because the app is not notarised with an Apple Developer ID, Gatekeeper may block it on first launch. To open it anyway: right-click the app → **Open** → **Open** in the dialog.
>
> **Linux note:** After installing the `.deb` package you may need to mark the AppImage executable: `chmod +x mosh-samugaa-app*.AppImage`

---

## 🔧 Building from Source

### Prerequisites

| Tool | Minimum version | Download |
|---|---|---|
| Node.js | 18 LTS | [nodejs.org](https://nodejs.org/) |
| npm | 9 | Included with Node.js |
| Git | any | [git-scm.com](https://git-scm.com/) |
| **Windows only** — Windows Build Tools | — | `npm install -g windows-build-tools` (run as Administrator) or install Visual Studio Build Tools with the "Desktop development with C++" workload |
| **Linux only** — `rpmbuild` (for RPM) | — | `sudo apt install rpm` / `sudo dnf install rpm-build` |

`better-sqlite3` is a native Node addon and is compiled automatically via `@electron/rebuild` during `npm install`. This is why C++ build tools are needed on Windows.

---

### 1 — Clone the repository

```bash
git clone https://github.com/moshradix/mosh-forms-app.git
cd mosh-forms-app
```

### 2 — Install dependencies

```bash
npm install
```

This also runs `electron-rebuild` automatically to recompile any native modules (like `better-sqlite3`) against your installed Electron version.

### 3 — Start in development mode

```bash
npm start
```

The app window opens immediately. Hot changes to renderer files are reflected on next navigation; changes to `index.js` (main process) require a restart.

---

## 📦 Building a Distributable

### Windows — `.exe` Squirrel installer

```bash
npm run make -- --platform=win32 --arch=x64
```

Output: `out/make/squirrel.windows/x64/`

> Cross-compiling Windows installers from macOS/Linux is **not** supported by Electron Forge's Squirrel maker. Build on a Windows machine or use a Windows CI runner (e.g., GitHub Actions `windows-latest`).

---

### macOS — `.zip` app bundle

```bash
npm run make -- --platform=darwin --arch=arm64   # Apple Silicon
npm run make -- --platform=darwin --arch=x64     # Intel
```

Output: `out/make/zip/darwin/`

> Must be run on macOS. Code-signing requires an Apple Developer certificate; without one the zip still works but Gatekeeper will warn on first launch (see note above).

---

### Linux — `.deb` and `.rpm`

```bash
npm run make -- --platform=linux --arch=x64
```

Output: `out/make/deb/x64/` and `out/make/rpm/x64/`

---

### All platforms at once (on the current OS)

```bash
npm run make
```

---

## 🗂️ Project Structure

```
mosh-forms-app/
├── src/
│   ├── index.js          # Electron main process — window, IPC handlers, SQLite
│   ├── preload.js        # Context bridge — exposes safe IPC methods to renderer
│   ├── app.js            # Renderer controller — view routing, global state
│   ├── styles.css        # Global design system (CSS custom properties)
│   ├── notes_styles.css  # Notes view styles
│   ├── index.html        # App shell & navigation
│   │
│   ├── templates.js      # Templates library module
│   ├── form.js           # Fill Form module
│   ├── search.js         # Search & Print module
│   ├── worklogs.js       # Work Logs module
│   ├── todo.js           # To-Do module
│   ├── notes.js          # Notes module
│   ├── calendar.js       # Calendar module
│   ├── prayertimes.js    # Prayer Times module
│   ├── utilities.js      # Utilities (calculator, converter, etc.)
│   ├── watermark.js      # Watermark tool
│   ├── randompicker.js   # Random Picker
│   ├── socialmedia.js    # Social Media image generator
│   ├── settings.js       # Settings & preferences
│   ├── backup.js         # Backup & restore
│   ├── tidechart.js      # Tidal chart (Gan station)
│   ├── help.js           # In-app help
│   └── fields.js         # Template field definitions
│
├── assets/
│   └── icons/            # app.ico (Windows), app.icns (macOS), app.png (Linux)
│
├── forge.config.js       # Electron Forge build & packaging config
├── package.json
└── README.md
```

---

## 🗄️ Data & Storage

| Store | Location | Contents |
|---|---|---|
| `worklogs.db` | `userData/` | Work logs, To-Do tasks, audit trail, prayer time cache |
| `mto_forms.db` | `userData/` | Generated document metadata |
| `worklog_photos/` | `userData/worklog_photos/` | Photo attachments for Work Log entries |
| `localStorage` | Electron renderer | Notion tokens, user preferences, calculator history |

`userData` resolves to:
- **Windows**: `%APPDATA%\mosh-samugaa-app`
- **macOS**: `~/Library/Application Support/mosh-samugaa-app`
- **Linux**: `~/.config/mosh-samugaa-app`

---

## 🔒 Security

The production build applies several Electron Fuse hardening flags:

- `RunAsNode` — **disabled** (prevents binary hijack via `--inspect` flags)
- `EnableCookieEncryption` — **enabled**
- `EnableNodeOptionsEnvironmentVariable` — **disabled**
- `EnableNodeCliInspectArguments` — **disabled**
- `EnableEmbeddedAsarIntegrityValidation` — **enabled** (detects tampered ASAR archives)
- ASAR packaging — **enabled** (faster load, harder to inspect)

---

## 🤝 Contributing

This project is maintained for internal use at Addu City Council. External contributions are welcome for bug fixes and accessibility improvements. Please open an issue first to discuss any significant changes.

---

## 📄 License

[MIT](LICENSE) © 2024 Mohamed Shamil
