/**
 * Minimal INI parser for Firefox profiles.ini
 */
function parse(content) {
  const result = {};
  let currentSection = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = {};
      continue;
    }

    const kvMatch = line.match(/^([^=]+)=(.*)$/);
    if (kvMatch && currentSection) {
      result[currentSection][kvMatch[1].trim()] = kvMatch[2].trim();
    }
  }

  return result;
}

module.exports = { parse };
