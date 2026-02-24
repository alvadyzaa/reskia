const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const archiver = require('archiver');
const { getCurrentSid } = require('./sidChecker');
const { encryptFile } = require('./encryptionManager');

const BROWSER_PROCESSES = {
  google_chrome: 'chrome.exe',
  brave_browser: 'brave.exe',
  microsoft_edge: 'msedge.exe',
  opera: 'opera.exe',
  opera_gx: 'opera.exe',
  vivaldi: 'vivaldi.exe',
  chromium: 'chrome.exe',
  firefox: 'firefox.exe',
};

function killBrowserProcesses(browserKeys) {
  const killed = new Set();
  for (const key of browserKeys) {
    const proc = BROWSER_PROCESSES[key];
    if (proc && !killed.has(proc)) {
      killed.add(proc);
      try {
        execSync(`taskkill /F /IM ${proc} 2>nul`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch { /* process may not be running */ }
    }
  }
}

function copyDirSync(src, dest, cb, label) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  let copied = 0;
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
        copied++;
        // Log every 50 files to show progress
        if (cb && label && copied % 50 === 0) {
          cb({ step: 'copy', message: `  ${label}: ${copied} files copied...` });
        }
      } catch { /* skip locked files */ }
    }
  }
  if (cb && label && copied > 0) {
    cb({ step: 'copy', message: `  ${label}: ${copied} files done` });
  }
}

async function createZip(sourceDir, zipPath, cb) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 3 } }); // level 3 = fast compression

    let lastReported = 0;
    archive.on('progress', (progress) => {
      const entries = progress.entries.processed;
      if (entries - lastReported >= 100) {
        lastReported = entries;
        if (cb) cb({ step: 'zip', message: `  Compressing: ${entries} entries processed...` });
      }
    });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
      if (cb) cb({ step: 'zip', message: `  ZIP complete: ${sizeMB} MB` });
      resolve(zipPath);
    });
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function startBackup(options, progressCallback) {
  const {
    selectedProfiles,
    backupDir,
    enableEncryption,
    encryptionPassword,
  } = options;

  const cb = progressCallback || (() => {});
  const tempDir = path.join(backupDir, '_temp_backup');

  try {
    // Step 1: Kill browser processes
    const browserKeys = [...new Set(selectedProfiles.map(p => p.browserKey))];
    cb({ step: 'kill', message: '🔄 Killing browser processes...' });
    killBrowserProcesses(browserKeys);
    cb({ step: 'kill', message: '✅ Browser processes terminated' });

    // Step 2: Create temp backup directory
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    // Step 3: Backup selected profiles
    const totalProfiles = selectedProfiles.length;
    for (let i = 0; i < totalProfiles; i++) {
      const profile = selectedProfiles[i];
      const pctBase = Math.round((i / totalProfiles) * 50);
      cb({
        step: 'profile',
        message: `📦 [${i + 1}/${totalProfiles}] Copying ${profile.browserName} → ${profile.profileName}...`,
        progress: pctBase,
      });

      // Use "BrowserName - ProfileName" folder format for easy identification
      const safeName = `${profile.browserName} - ${profile.profileName}`.replace(/[<>:"/\\|?*]/g, '_');
      const destDir = path.join(tempDir, profile.browserKey, safeName);
      copyDirSync(profile.path, destDir, cb, profile.profileName);

      // Save mapping file so restore knows the original folder name
      const mappingFile = path.join(destDir, '.profile_mapping.json');
      fs.writeFileSync(mappingFile, JSON.stringify({
        browserKey: profile.browserKey,
        browserName: profile.browserName,
        profileName: profile.profileName,
        folderName: profile.folderName,
        originalPath: profile.path,
      }, null, 2));

      cb({
        step: 'profile',
        message: `✅ [${i + 1}/${totalProfiles}] Done: ${profile.browserName} → ${profile.profileName}`,
        progress: Math.round(((i + 1) / totalProfiles) * 50),
      });
    }

    // Step 4: Backup Local State for each browser
    cb({ step: 'localstate', message: '📄 Backing up Local State files...', progress: 55 });
    const backedUpUserDataPaths = new Set();
    for (const profile of selectedProfiles) {
      if (backedUpUserDataPaths.has(profile.userDataPath)) continue;
      backedUpUserDataPaths.add(profile.userDataPath);

      const localStateSrc = path.join(profile.userDataPath, 'Local State');
      if (fs.existsSync(localStateSrc)) {
        const localStateDest = path.join(tempDir, profile.browserKey, 'Local State');
        try {
          fs.copyFileSync(localStateSrc, localStateDest);
          cb({ step: 'localstate', message: `  ✅ ${profile.browserName}: Local State copied` });
        } catch { /* skip if locked */ }
      }
    }

    // Step 5: Backup DPAPI Protect folder
    cb({ step: 'dpapi', message: '🔑 Backing up DPAPI Protect keys...', progress: 65 });
    const protectSrc = path.join(process.env.APPDATA || '', 'Microsoft', 'Protect');
    const protectDest = path.join(tempDir, 'protect');
    if (fs.existsSync(protectSrc)) {
      copyDirSync(protectSrc, protectDest);
      cb({ step: 'dpapi', message: '  ✅ DPAPI keys copied' });
    }

    // Step 6: Export HKCU registry (ONLY relevant keys, not entire HKCU)
    cb({ step: 'registry', message: '📋 Exporting relevant registry keys...', progress: 75 });
    const regPath = path.join(tempDir, 'registry.reg');
    const regKeys = [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
      'HKCU\\Software\\Google\\Chrome',
      'HKCU\\Software\\BraveSoftware',
      'HKCU\\Software\\Microsoft\\Edge',
    ];
    let regExported = false;
    for (const key of regKeys) {
      try {
        const tempReg = path.join(tempDir, `_reg_${Date.now()}.reg`);
        execSync(`reg export "${key}" "${tempReg}" /y 2>nul`, { encoding: 'utf-8', stdio: 'pipe', timeout: 10000 });
        // Append to main reg file
        if (fs.existsSync(tempReg)) {
          const content = fs.readFileSync(tempReg, 'utf-8');
          fs.appendFileSync(regPath, content + '\n');
          fs.unlinkSync(tempReg);
          regExported = true;
        }
      } catch { /* skip if key fails or times out */ }
    }
    cb({ step: 'registry', message: regExported ? '  ✅ Registry keys exported' : '  ⚠️ Registry export skipped' });

    // Step 7: Save SID
    cb({ step: 'sid', message: '🔒 Saving SID...', progress: 80 });
    const sid = getCurrentSid();
    fs.writeFileSync(path.join(tempDir, 'sid.txt'), sid || 'UNKNOWN');
    cb({ step: 'sid', message: `  ✅ SID: ${sid}` });

    // Step 8: Write info.json
    cb({ step: 'info', message: '📝 Writing backup info...', progress: 85 });
    const info = {
      timestamp: new Date().toISOString(),
      sid,
      profiles: selectedProfiles.map(p => ({
        browserKey: p.browserKey,
        browserName: p.browserName,
        profileName: p.profileName,
        folderName: p.folderName,
      })),
      encrypted: enableEncryption || false,
    };
    fs.writeFileSync(path.join(tempDir, 'info.json'), JSON.stringify(info, null, 2));

    // Step 9: Create ZIP
    cb({ step: 'zip', message: '📦 Compressing backup to ZIP (this may take a moment)...', progress: 88 });
    const now = new Date();
    const dateStr = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '_'
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0');

    const zipName = `backup_${dateStr}.zip`;
    const zipPath = path.join(backupDir, zipName);
    await createZip(tempDir, zipPath, cb);

    // Step 10: Encrypt if enabled
    let finalPath = zipPath;
    if (enableEncryption && encryptionPassword) {
      cb({ step: 'encrypt', message: '🔐 Encrypting backup...', progress: 93 });
      const encPath = path.join(backupDir, `backup_${dateStr}.enc`);
      await encryptFile(zipPath, encPath, encryptionPassword);
      fs.unlinkSync(zipPath);
      finalPath = encPath;
      cb({ step: 'encrypt', message: '  ✅ Encryption complete' });
    }

    // Step 11: Cleanup temp directory
    cb({ step: 'cleanup', message: '🧹 Cleaning up temp files...', progress: 97 });
    fs.rmSync(tempDir, { recursive: true, force: true });

    cb({ step: 'done', message: `✅ Backup complete: ${path.basename(finalPath)}`, progress: 100 });
    return { success: true, path: finalPath, info };

  } catch (err) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    cb({ step: 'error', message: `❌ Backup failed: ${err.message}`, progress: 0 });
    return { success: false, error: err.message };
  }
}

module.exports = { startBackup, killBrowserProcesses };
