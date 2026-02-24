<div align="center">

# 🛡️ Reskia

**AIO Browser Backup & Restore Tools**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D_18-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-31A8FF.svg)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg?logo=windows&logoColor=white)](https://microsoft.com/windows)

_A powerful, cross-browser profile backup utility with deep DPAPI integration and a beautiful dark-glass UI._

[Features](#-features) • [Installation](#-quick-start) • [Supported Browsers](#-supported-browsers) • [Security](#-security-encryption) • [Migration Mode](#-migration-mode)

</div>

---

## ⚡ Why Reskia?

Most browser backup tools simply copy the `User Data` folder. This is practically useless for modern browsers because your passwords, cookies, and extensions are deeply encrypted by Windows DPAPI tied uniquely to your machine's **Security Identifier (SID)**.

**Reskia** fixes this by extracting your exact profile data, exporting the matching `HKCU` registry entries, preserving the DPAPI `Protect` keys, and packaging everything into a highly compressed `.zip` archive. When restoring to a new PC, Reskia's **Migration Mode** intelligently handles SID mismatches to ensure your sessions stay logged in.

## 🔥 Features

- 🕵️ **Smart Detection**: Instantly scans your system for all installed Chromium and Firefox-based browsers, isolating individual profiles from the noise.
- 🎯 **Surgical Precision**: Select exactly _which_ profiles to backup. No more backing up 5GB of useless cache when you only need one Google account.
- 🔐 **Military-Grade Encryption**: Optional AES-256 encryption (`.enc`) for your backup archives, keeping your sensitive cookies and logins safe in the cloud.
- 💨 **Blazing Fast**: Uses built-in Windows `tar.exe` for near-instant, non-blocking asynchronous `.zip` extraction.
- 🎨 **Aesthetic UI**: A stunning, modern dark-mode interface built on Electron with glassmorphism, fluid animations, and live-search filtering.
- 🛡️ **Integrity Checks**: Validates backups before restoring to prevent corruption or incomplete profile states.
- 🕶️ **Privacy Mode**: Built-in toggle to blur sensitive emails, paths, and SIDs—perfect for screenshots and demos.

## 🌐 Supported Browsers

Reskia currently supports deep-cloning for:

- Google Chrome & Chromium
- Brave Browser
- Microsoft Edge
- Opera & Opera GX
- Vivaldi
- Mozilla Firefox

More browser coming soon!

---

## 🚀 Quick Start

### Option 1: One-Line Installer (Recommended)

You can install and launch Reskia automatically using PowerShell. Open PowerShell and paste:

```powershell
irm https://raw.githubusercontent.com/alvadyzaa/reskia/main/install.ps1 | iex
```

_This script will auto-detect Node.js, clone the repository to your local AppData, install NPM dependencies, and launch the app._

### Option 2: Manual Installation

Requires **Node.js 18+** installed on your system.

```bash
# 1. Clone the repository
git clone https://github.com/alvadyzaa/reskia.git

# 2. Navigate into the directory
cd reskia

# 3. Install dependencies
npm install

# 4. Start the app
npm start
```
---

## 🔒 Security & Encryption

Reskia handles highly sensitive data.

- **Local Only:** The app is 100% offline. No data ever leaves your machine unless you explicitly move the generated `.zip` or `.enc` file.
- **AES-256:** If you toggle encryption during backup, the entire ZIP archive is encrypted using `crypto` AES-256-CBC with a secure initialization vector. It is computationally impossible to open the `.enc` file without the password.

## 🔄 Migration Mode (Moving to a New PC)

When restoring a backup on a **different Windows user account** or a **brand new PC**, your Windows SID will change.

1. Go to the **Restore** tab.
2. Load your backup file.
3. Reskia will automatically detect a **🔴 SID Mismatch**.
4. Select **Different Windows User (Migration Mode)**.

_Note: While Reskia attempts to migrate DPAPI keys, some deeply encrypted tokens tied to the TPM or specific Windows installations may still require re-authentication. However, all history, bookmarks, extensions, and local storage will be preserved perfectly._

---

## 🛠️ Built With

- **[Electron](https://www.electronjs.org/)**: Desktop wrapper and IPC bridge
- **[Node.js](https://nodejs.org/)**: Core backend operations (`fs`, `child_process`, `crypto`)
- **[Archiver](https://www.npmjs.com/package/archiver)**: Fast ZIP compression
- **Vanilla JS & CSS**: No bloated frontend frameworks, ensuring maximum performance.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>Built with ❤️ by <a href="https://github.com/alvadyzaa">Alvadyza</a></b>
</div>

