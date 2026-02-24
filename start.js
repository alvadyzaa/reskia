const { spawn } = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const appDir = __dirname;

// Remove ELECTRON_RUN_AS_NODE so Electron runs as a proper Electron app
// (VS Code and other tools set this to make Electron behave as plain Node.js)
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronExe, [appDir], {
  stdio: 'inherit',
  env,
  windowsHide: false,
  detached: false,
});

child.on('close', (code) => {
  process.exit(code || 0);
});
