const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const unzipper = require('unzipper');
const { decryptFile } = require('./encryptionManager');
const { checkSidMatch } = require('./sidChecker');
const { checkIntegrity } = require('./integrityChecker');
const { killBrowserProcesses } = require('./backupManager');

const BROWSER_USER_DATA = {
  google_chrome: 'Google\\Chrome\\User Data',
  brave_browser: 'BraveSoftware\\Brave-Browser\\User Data',
  microsoft_edge: 'Microsoft\\Edge\\User Data',
  opera: 'Opera Software\\Opera Stable',
  opera_gx: 'Opera Software\\Opera GX Stable',
  vivaldi: 'Vivaldi\\User Data',
  chromium: 'Chromium\\User Data',
};

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch { /* skip locked */ }
    }
  }
}

async function extractBackup(backupFilePath, extractDir, password) {
  const ext = path.extname(backupFilePath).toLowerCase();

  if (ext === '.enc') {
    if (!password) throw new Error('Password is required to decrypt this backup.');
    const tempZip = path.join(path.dirname(extractDir), '_decrypted_temp.zip');
    await decryptFile(backupFilePath, tempZip, password);
    await extractZip(tempZip, extractDir);
    fs.unlinkSync(tempZip);
  } else if (ext === '.zip') {
    await extractZip(backupFilePath, extractDir);
  } else {
    // Assume it's an uncompressed directory
    if (fs.existsSync(backupFilePath) && fs.statSync(backupFilePath).isDirectory()) {
      return backupFilePath;
    }
    throw new Error('Unsupported backup format.');
  }

  return extractDir;
}

async function extractZip(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractDir }))
    .promise();
}

function findNextProfileName(userDataPath) {
  let idx = 1;
  while (true) {
    const name = `Profile Restored ${idx}`;
    const fullPath = path.join(userDataPath, name);
    if (!fs.existsSync(fullPath)) return name;
    idx++;
  }
}

async function startRestore(options, progressCallback) {
  const {
    backupSource,
    password,
    selectedProfiles,
    migrationMode,
    overwriteMode, // 'replace' | 'new' per profile, or global setting
  } = options;

  const cb = progressCallback || (() => {});
  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';
  let extractDir = null;
  let needsCleanup = false;

  try {
    // Determine backup directory
    cb({ step: 'extract', message: 'Preparing backup...', progress: 5 });

    if (fs.statSync(backupSource).isDirectory()) {
      extractDir = backupSource;
    } else {
      extractDir = path.join(path.dirname(backupSource), '_restore_temp');
      await extractBackup(backupSource, extractDir, password);
      needsCleanup = true;
    }

    // Integrity check
    cb({ step: 'integrity', message: 'Checking backup integrity...', progress: 10 });
    const integrity = checkIntegrity(extractDir);

    // SID check
    cb({ step: 'sid_check', message: 'Checking SID match...', progress: 15 });
    const sidResult = checkSidMatch(extractDir);

    // Step 1: Kill browser processes
    cb({ step: 'kill', message: 'Killing browser processes...', progress: 20 });
    const browserKeys = [...new Set(selectedProfiles.map(p => p.browserKey))];
    killBrowserProcesses(browserKeys);

    // LOGIN SESSION SAFE RESTORE ORDER:
    // 1. DPAPI Protect → 2. Registry → 3. Local State → 4. Profile Folder

    // Step 2: Restore DPAPI Protect (if migration mode or same user)
    cb({ step: 'dpapi', message: 'Restoring DPAPI Protect keys...', progress: 30 });
    const protectSrc = path.join(extractDir, 'protect');
    if (fs.existsSync(protectSrc) && migrationMode) {
      const protectDest = path.join(appData, 'Microsoft', 'Protect');
      copyDirSync(protectSrc, protectDest);
    }

    // Step 3: Import HKCU registry (if migration mode)
    if (migrationMode) {
      cb({ step: 'registry', message: 'Importing HKCU registry...', progress: 40 });
      const regPath = path.join(extractDir, 'registry.reg');
      if (fs.existsSync(regPath)) {
        try {
          execSync(`reg import "${regPath}"`, { encoding: 'utf-8', stdio: 'pipe' });
        } catch { /* may require elevation */ }
      }
    }

    // Step 4: Restore Local State for each browser
    cb({ step: 'localstate', message: 'Restoring Local State files...', progress: 50 });
    const restoredBrowsers = new Set();
    for (const profile of selectedProfiles) {
      if (restoredBrowsers.has(profile.browserKey)) continue;
      restoredBrowsers.add(profile.browserKey);

      if (profile.browserKey === 'firefox') continue; // Firefox doesn't have Local State

      const localStateSrc = path.join(extractDir, profile.browserKey, 'Local State');
      const userDataRel = BROWSER_USER_DATA[profile.browserKey];
      if (!userDataRel) continue;

      const userDataPath = path.join(localAppData, userDataRel);
      if (fs.existsSync(localStateSrc)) {
        fs.mkdirSync(userDataPath, { recursive: true });
        try {
          fs.copyFileSync(localStateSrc, path.join(userDataPath, 'Local State'));
        } catch { /* skip if locked */ }
      }
    }

    // Step 5: Restore profile folders
    const totalProfiles = selectedProfiles.length;
    for (let i = 0; i < totalProfiles; i++) {
      const profile = selectedProfiles[i];
      cb({
        step: 'profile',
        message: `Restoring ${profile.browserName || profile.browserKey} → ${profile.folderName}`,
        progress: 55 + Math.round(((i + 1) / totalProfiles) * 40),
      });

      const profileSrc = path.join(extractDir, profile.browserKey, profile.folderName);
      if (!fs.existsSync(profileSrc)) continue;

      let destFolderName = profile.folderName;
      let userDataPath;

      if (profile.browserKey === 'firefox') {
        userDataPath = path.join(appData, 'Mozilla', 'Firefox', 'Profiles');
      } else {
        const userDataRel = BROWSER_USER_DATA[profile.browserKey];
        if (!userDataRel) continue;
        userDataPath = path.join(localAppData, userDataRel);
      }

      const destPath = path.join(userDataPath, destFolderName);

      // Anti-overwrite logic
      if (fs.existsSync(destPath)) {
        const mode = profile.overwriteMode || overwriteMode || 'replace';
        if (mode === 'new') {
          destFolderName = findNextProfileName(userDataPath);
        } else if (mode === 'cancel') {
          continue;
        }
        // 'replace' falls through — overwrite
      }

      const finalDest = path.join(userDataPath, destFolderName);
      copyDirSync(profileSrc, finalDest);
    }

    // Cleanup
    if (needsCleanup && extractDir) {
      cb({ step: 'cleanup', message: 'Cleaning up...', progress: 97 });
      fs.rmSync(extractDir, { recursive: true, force: true });
    }

    cb({ step: 'done', message: 'Restore complete!', progress: 100 });
    return {
      success: true,
      sidMatch: sidResult,
      integrity,
    };

  } catch (err) {
    if (needsCleanup && extractDir) {
      try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    cb({ step: 'error', message: `Restore failed: ${err.message}`, progress: 0 });
    return { success: false, error: err.message };
  }
}

function scanBackupProfiles(backupDir) {
  const profiles = [];
  const browserDirs = ['google_chrome', 'brave_browser', 'microsoft_edge',
    'opera', 'opera_gx', 'vivaldi', 'chromium', 'firefox'];

  const BROWSER_NAMES = {
    google_chrome: 'Google Chrome',
    brave_browser: 'Brave Browser',
    microsoft_edge: 'Microsoft Edge',
    opera: 'Opera',
    opera_gx: 'Opera GX',
    vivaldi: 'Vivaldi',
    chromium: 'Chromium',
    firefox: 'Mozilla Firefox',
  };

  for (const browserKey of browserDirs) {
    const browserPath = path.join(backupDir, browserKey);
    if (!fs.existsSync(browserPath)) continue;

    try {
      const entries = fs.readdirSync(browserPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'Local State') continue;

        const profileDir = path.join(browserPath, entry.name);
        let profileName = entry.name;
        let folderName = entry.name;

        // Read profile mapping if available (new format)
        const mappingPath = path.join(profileDir, '.profile_mapping.json');
        if (fs.existsSync(mappingPath)) {
          try {
            const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
            profileName = mapping.profileName || entry.name;
            folderName = mapping.folderName || entry.name;
          } catch { /* ignore */ }
        }

        profiles.push({
          browserKey,
          browserName: BROWSER_NAMES[browserKey] || browserKey,
          folderName,
          profileName,
          backupFolderName: entry.name,
          path: profileDir,
        });
      }
    } catch { /* ignore */ }
  }

  return profiles;
}

module.exports = { startRestore, scanBackupProfiles, extractBackup };
