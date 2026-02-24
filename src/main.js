const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { detectBrowsers } = require('./modules/browserDetector');
const { scanProfiles } = require('./modules/profileScanner');
const { getCurrentSid, checkSidMatch } = require('./modules/sidChecker');
const { startBackup } = require('./modules/backupManager');
const { startRestore, scanBackupProfiles, extractBackup } = require('./modules/restoreManager');
const { checkIntegrity } = require('./modules/integrityChecker');
const { decryptFile } = require('./modules/encryptionManager');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Reskia - AIO Browser Backup Tools',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d1117',
    frame: true,
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ─── IPC HANDLERS ─────────────────────────────────

ipcMain.handle('detect-browsers', async () => {
  return detectBrowsers();
});

ipcMain.handle('scan-profiles', async (_, browsers) => {
  return scanProfiles(browsers);
});

ipcMain.handle('get-sid', async () => {
  return getCurrentSid();
});

ipcMain.handle('check-sid-match', async (_, backupDir) => {
  return checkSidMatch(backupDir);
});

ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('browse-file', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Backup Files', extensions: ['zip', 'enc'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('start-backup', async (_, options) => {
  return await startBackup(options, (progress) => {
    mainWindow.webContents.send('backup-progress', progress);
  });
});

ipcMain.handle('start-restore', async (_, options) => {
  return await startRestore(options, (progress) => {
    mainWindow.webContents.send('restore-progress', progress);
  });
});

ipcMain.handle('scan-backup-profiles', async (_, backupDir) => {
  return scanBackupProfiles(backupDir);
});

ipcMain.handle('check-integrity', async (_, backupDir) => {
  return checkIntegrity(backupDir);
});

ipcMain.handle('extract-encrypted-backup', async (_, { filePath, password }) => {
  const extractDir = path.join(path.dirname(filePath), '_restore_preview');
  try {
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });

    const ext = path.extname(filePath).toLowerCase();
    let zipToExtract = filePath;

    if (ext === '.enc') {
      const tempZip = path.join(path.dirname(filePath), '_decrypted_temp.zip');
      await decryptFile(filePath, tempZip, password);
      zipToExtract = tempZip;
    }

    if (ext === '.enc' || ext === '.zip') {
      // Use Windows built-in tar.exe for fast, async extraction without freezing UI
      const util = require('util');
      const execFile = util.promisify(require('child_process').execFile);
      
      try {
        await execFile('tar.exe', ['-xf', zipToExtract, '-C', extractDir], { 
          windowsHide: true,
          timeout: 300000 // 5 min timeout
        });
      } catch (tarErr) {
        // Fallback to PowerShell if tar is somehow missing/fails (older Windows)
        const psScript = `Expand-Archive -LiteralPath '${zipToExtract.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`;
        const { execSync } = require('child_process');
        execSync(`powershell -NoProfile -Command "${psScript}"`, {
          windowsHide: true,
          timeout: 300000 
        });
      }

      // Clean up temp zip if it was decrypted
      if (ext === '.enc') {
        try { fs.unlinkSync(zipToExtract); } catch { /* ignore */ }
      }
    }

    return { success: true, extractDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cleanup-extract', async (_, extractDir) => {
  try {
    if (extractDir && fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
  } catch { /* ignore */ }
});
