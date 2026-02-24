const fs = require('fs');
const path = require('path');

const REQUIRED_ITEMS = ['sid.txt', 'registry.reg', 'protect'];

function checkIntegrity(backupDir) {
  const results = {
    valid: true,
    missing: [],
    found: [],
    profiles: [],
    hasInfoJson: false,
  };

  // Check required items
  for (const item of REQUIRED_ITEMS) {
    const itemPath = path.join(backupDir, item);
    if (fs.existsSync(itemPath)) {
      results.found.push(item);
    } else {
      results.missing.push(item);
      results.valid = false;
    }
  }

  // Check info.json
  const infoPath = path.join(backupDir, 'info.json');
  if (fs.existsSync(infoPath)) {
    results.hasInfoJson = true;
    try {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      results.info = info;
    } catch {
      results.hasInfoJson = false;
    }
  }

  // Scan for browser profile folders
  const browserDirs = ['chrome', 'google_chrome', 'brave_browser', 'microsoft_edge',
    'opera', 'opera_gx', 'vivaldi', 'chromium', 'firefox'];

  for (const browserDir of browserDirs) {
    const browserPath = path.join(backupDir, browserDir);
    if (!fs.existsSync(browserPath)) continue;

    try {
      const profileDirs = fs.readdirSync(browserPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => ({
          browserKey: browserDir,
          folderName: d.name,
          path: path.join(browserPath, d.name),
        }));
      results.profiles.push(...profileDirs);
    } catch { /* ignore */ }
  }

  return results;
}

module.exports = { checkIntegrity };
