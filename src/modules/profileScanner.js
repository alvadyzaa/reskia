const path = require('path');
const fs = require('fs');
const ini = require('./iniParser');

const PROFILE_DIR_PATTERN = /^(Default|Profile \d+|Guest Profile)$/;

/**
 * Read Local State to get the info_cache which has real profile names
 */
function readLocalStateInfoCache(userDataPath) {
  const localStatePath = path.join(userDataPath, 'Local State');
  try {
    const raw = fs.readFileSync(localStatePath, 'utf-8');
    const data = JSON.parse(raw);
    return data?.profile?.info_cache || {};
  } catch {
    return {};
  }
}

/**
 * Try to extract email from gaia_cookie base64 protobuf
 */
function extractEmailFromGaiaCookie(prefs) {
  try {
    const b64 = prefs?.gaia_cookie?.last_list_accounts_binary_data;
    if (!b64) return null;
    const buf = Buffer.from(b64, 'base64');
    const text = buf.toString('utf-8');
    // Look for email pattern in the decoded protobuf
    const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    return emailMatch ? emailMatch[0] : null;
  } catch {
    return null;
  }
}

function scanChromiumProfiles(browser) {
  const profiles = [];
  const userDataPath = browser.userDataPath;

  // Read Local State info_cache for real profile names
  const infoCache = readLocalStateInfoCache(userDataPath);

  let entries;
  try {
    entries = fs.readdirSync(userDataPath, { withFileTypes: true });
  } catch {
    return profiles;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!PROFILE_DIR_PATTERN.test(entry.name)) continue;

    const profileDir = path.join(userDataPath, entry.name);
    const prefsPath = path.join(profileDir, 'Preferences');

    // Priority: Local State info_cache > Preferences > folder name
    const cacheEntry = infoCache[entry.name];
    let profileName = cacheEntry?.shortcut_name || cacheEntry?.name || entry.name;
    let gaiaName = cacheEntry?.gaia_name || '';
    let userName = cacheEntry?.user_name || '';
    let avatarIndex = cacheEntry?.avatar_index ?? -1;
    let accountInfo = [];
    let lastUsed = null;
    let email = userName || '';

    // Read Preferences for additional data
    try {
      const prefsRaw = fs.readFileSync(prefsPath, 'utf-8');
      const prefs = JSON.parse(prefsRaw);

      // Fallback name from Preferences if Local State didn't have it
      if (profileName === entry.name && prefs?.profile?.name) {
        profileName = prefs.profile.name;
      }

      // Gaia fields from Preferences
      if (!gaiaName && prefs?.profile?.gaia_name) gaiaName = prefs.profile.gaia_name;
      if (!userName && prefs?.profile?.user_name) userName = prefs.profile.user_name;
      if (avatarIndex === -1 && prefs?.profile?.avatar_index !== undefined) {
        avatarIndex = prefs.profile.avatar_index;
      }

      // account_info array
      if (Array.isArray(prefs?.account_info) && prefs.account_info.length > 0) {
        accountInfo = prefs.account_info;
        if (!email) {
          const firstEmail = accountInfo.find(a => a.email);
          if (firstEmail) email = firstEmail.email;
        }
      }

      // Try gaia_cookie for email
      if (!email) {
        const cookieEmail = extractEmailFromGaiaCookie(prefs);
        if (cookieEmail) email = cookieEmail;
      }

      // signin.allowed status
      if (!email && prefs?.signin?.allowed && prefs?.account_info?.[0]?.email) {
        email = prefs.account_info[0].email;
      }
    } catch { /* ignore */ }

    // Last used from History or Cookies
    for (const file of ['History', 'Cookies', 'Login Data']) {
      try {
        const stat = fs.statSync(path.join(profileDir, file));
        if (!lastUsed || stat.mtimeMs > lastUsed) lastUsed = stat.mtimeMs;
      } catch { /* ignore */ }
    }

    profiles.push({
      profileName,
      gaiaName,
      email,
      folderName: entry.name,
      lastUsed: lastUsed ? new Date(lastUsed).toISOString() : null,
      avatarIndex,
      accountInfo: accountInfo.map(a => a.email || a.full_name || '').filter(Boolean),
      browserType: browser.type,
      browserName: browser.name,
      browserKey: browser.key,
      path: profileDir,
      userDataPath,
    });
  }

  return profiles;
}

function scanFirefoxProfiles(browser) {
  const profiles = [];
  const profilesIniPath = path.join(browser.userDataPath, 'profiles.ini');

  let iniContent;
  try {
    iniContent = fs.readFileSync(profilesIniPath, 'utf-8');
  } catch {
    return profiles;
  }

  const parsed = ini.parse(iniContent);

  for (const [section, data] of Object.entries(parsed)) {
    if (!section.startsWith('Profile')) continue;
    if (!data.Path) continue;

    const isRelative = data.IsRelative === '1';
    const profilePath = isRelative
      ? path.join(browser.userDataPath, data.Path.replace(/\//g, '\\'))
      : data.Path;

    let lastUsed = null;
    try {
      const stat = fs.statSync(profilePath);
      lastUsed = stat.mtimeMs;
    } catch { /* ignore */ }

    profiles.push({
      profileName: data.Name || data.Path,
      gaiaName: '',
      email: '',
      folderName: path.basename(profilePath),
      lastUsed: lastUsed ? new Date(lastUsed).toISOString() : null,
      avatarIndex: -1,
      accountInfo: [],
      browserType: 'firefox',
      browserName: 'Mozilla Firefox',
      browserKey: 'firefox',
      path: profilePath,
      userDataPath: browser.userDataPath,
    });
  }

  return profiles;
}

function scanProfiles(browsers) {
  const allProfiles = [];
  for (const browser of browsers) {
    if (browser.isFirefox) {
      allProfiles.push(...scanFirefoxProfiles(browser));
    } else {
      allProfiles.push(...scanChromiumProfiles(browser));
    }
  }
  return allProfiles;
}

module.exports = { scanProfiles, scanChromiumProfiles, scanFirefoxProfiles };
