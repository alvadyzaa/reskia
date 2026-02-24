const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  detectBrowsers: () => ipcRenderer.invoke('detect-browsers'),
  scanProfiles: (browsers) => ipcRenderer.invoke('scan-profiles', browsers),
  getSid: () => ipcRenderer.invoke('get-sid'),
  checkSidMatch: (dir) => ipcRenderer.invoke('check-sid-match', dir),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  browseFile: (filters) => ipcRenderer.invoke('browse-file', filters),
  startBackup: (options) => ipcRenderer.invoke('start-backup', options),
  startRestore: (options) => ipcRenderer.invoke('start-restore', options),
  scanBackupProfiles: (dir) => ipcRenderer.invoke('scan-backup-profiles', dir),
  checkIntegrity: (dir) => ipcRenderer.invoke('check-integrity', dir),
  extractEncryptedBackup: (opts) => ipcRenderer.invoke('extract-encrypted-backup', opts),
  cleanupExtract: (dir) => ipcRenderer.invoke('cleanup-extract', dir),

  onBackupProgress: (cb) => ipcRenderer.on('backup-progress', (_, data) => cb(data)),
  onRestoreProgress: (cb) => ipcRenderer.on('restore-progress', (_, data) => cb(data)),
});
