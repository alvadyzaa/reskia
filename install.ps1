# Reskia - AIO Browser Backup Tools (PowerShell Launcher)
# Usage: iex (Get-Content ".\install.ps1" -Raw)

$ErrorActionPreference = "Stop"
$AppName = "Reskia - AIO Browser Backup Tools"
$InstallDir = Join-Path $env:LOCALAPPDATA "Reskia"
$NodeMinVer = 18

function Write-Header {
    Write-Host ""
    Write-Host "  =======================================" -ForegroundColor Cyan
    Write-Host "    Reskia - AIO Browser Backup Tools"     -ForegroundColor Cyan
    Write-Host "    Installer & Launcher v1.0"             -ForegroundColor DarkCyan
    Write-Host "  =======================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($s, $m) { Write-Host "  [$s] " -ForegroundColor Yellow -NoNewline; Write-Host $m }
function Write-OK($m) { Write-Host "    [OK] " -ForegroundColor Green -NoNewline; Write-Host $m -ForegroundColor Gray }
function Write-Fail($m) { Write-Host "    [FAIL] " -ForegroundColor Red -NoNewline; Write-Host $m -ForegroundColor Gray }
function Write-Info($m) { Write-Host "    [i] " -ForegroundColor Blue -NoNewline; Write-Host $m -ForegroundColor Gray }

Write-Header

# Step 1: Check Node.js
Write-Step "1/5" "Checking Node.js..."
$nodeOK = $false
try {
    $nv = (node -v 2>$null)
    if ($nv) {
        $nv = $nv -replace "^v", ""
        $major = [int]($nv.Split(".")[0])
        if ($major -ge $NodeMinVer) {
            Write-OK "Node.js $nv found"
            $nodeOK = $true
        }
        else {
            Write-Fail "Node.js $NodeMinVer+ required (found $nv)"
        }
    }
}
catch {}

if (-not $nodeOK) {
    Write-Fail "Node.js not found or too old"
    Write-Info "Trying winget install..."
    try {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -s winget
        Write-OK "Node.js installed. Please restart this script."
    }
    catch {
        Write-Fail "Auto-install failed. Download from: https://nodejs.org/"
    }
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Find project directory
Write-Step "2/5" "Setting up install directory..."
$ProjectDir = $null

$pkgFile = Join-Path $PWD "package.json"
if (Test-Path $pkgFile) {
    $ProjectDir = $PWD.Path
    Write-OK "Project found in current directory"
}

if (-not $ProjectDir) {
    $pkgAlt = Join-Path $InstallDir "package.json"
    if (Test-Path $pkgAlt) {
        $ProjectDir = $InstallDir
        Write-OK "Found existing installation: $ProjectDir"
    }
}

if (-not $ProjectDir) {
    Write-Fail "Project not found."
    Write-Info "Please run this script from the project directory,"
    Write-Info "or copy project files to: $InstallDir"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Install dependencies
Write-Step "3/5" "Installing dependencies..."
Push-Location $ProjectDir
$nmDir = Join-Path $ProjectDir "node_modules"
if (-not (Test-Path $nmDir)) {
    Write-Info "Running npm install..."
    npm install --loglevel=error 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install failed!"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-OK "Dependencies installed"
}
else {
    Write-OK "Dependencies already installed"
}

# Step 4: Verify Electron
Write-Step "4/5" "Verifying Electron..."
$elecExe = Join-Path $ProjectDir "node_modules" "electron" "dist" "electron.exe"
if (Test-Path $elecExe) {
    Write-OK "Electron binary found"
}
else {
    Write-Fail "Electron not found, installing..."
    npm install electron --save-dev --loglevel=error 2>&1 | Out-Null
    if (Test-Path $elecExe) {
        Write-OK "Electron installed"
    }
    else {
        Write-Fail "Could not install Electron"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Step 5: Launch
Write-Step "5/5" "Launching Reskia..."
Write-Host ""
Write-Host "  -------------------------------------------" -ForegroundColor DarkCyan
Write-Host "    Starting $AppName" -ForegroundColor Green
Write-Host "    Directory: $ProjectDir" -ForegroundColor DarkGray
Write-Host "  -------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$env:ELECTRON_RUN_AS_NODE = $null

$startJs = Join-Path $ProjectDir "start.js"
if (Test-Path $startJs) {
    node $startJs
}
else {
    & $elecExe $ProjectDir
}

Pop-Location
