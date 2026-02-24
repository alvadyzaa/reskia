const path = require("path");
const fs = require("fs");

const CHROMIUM_BROWSERS = [
  {
    name: "Google Chrome",
    type: "chromium",
    relPath: "Google\\Chrome\\User Data",
  },
  {
    name: "Brave Browser",
    type: "chromium",
    relPath: "BraveSoftware\\Brave-Browser\\User Data",
  },
  {
    name: "Microsoft Edge",
    type: "chromium",
    relPath: "Microsoft\\Edge\\User Data",
  },
  { name: "Opera", type: "chromium", relPath: "Opera Software\\Opera Stable" },
  {
    name: "Opera GX",
    type: "chromium",
    relPath: "Opera Software\\Opera GX Stable",
  },
  { name: "Vivaldi", type: "chromium", relPath: "Vivaldi\\User Data" },
  { name: "Chromium", type: "chromium", relPath: "Chromium\\User Data" },
];

const FIREFOX_APPDATA = path.join(
  process.env.APPDATA || "",
  "Mozilla",
  "Firefox",
);

function detectBrowsers() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const detected = [];

  for (const browser of CHROMIUM_BROWSERS) {
    const userDataPath = path.join(localAppData, browser.relPath);
    if (fs.existsSync(userDataPath)) {
      detected.push({
        name: browser.name,
        type: browser.type,
        userDataPath,
        isFirefox: false,
        key: browser.name.toLowerCase().replace(/\s+/g, "_"),
      });
    }
  }

  const profilesIni = path.join(FIREFOX_APPDATA, "profiles.ini");
  if (fs.existsSync(profilesIni)) {
    detected.push({
      name: "Mozilla Firefox",
      type: "firefox",
      userDataPath: FIREFOX_APPDATA,
      isFirefox: true,
      key: "firefox",
    });
  }

  return detected;
}

module.exports = { detectBrowsers };
