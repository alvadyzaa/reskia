const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getCurrentSid() {
  try {
    const output = execSync('whoami /user', { encoding: 'utf-8' });
    const match = output.match(/S-\d+-\d+-\d+(-\d+)+/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

function getBackupSid(backupDir) {
  const sidPath = path.join(backupDir, 'sid.txt');
  try {
    return fs.readFileSync(sidPath, 'utf-8').trim();
  } catch {
    return null;
  }
}

function checkSidMatch(backupDir) {
  const currentSid = getCurrentSid();
  const backupSid = getBackupSid(backupDir);
  return {
    currentSid,
    backupSid,
    match: currentSid && backupSid && currentSid === backupSid,
  };
}

module.exports = { getCurrentSid, getBackupSid, checkSidMatch };
