# ============================================================
# Castastrophe! - Start server for local multiplayer
# Usage: .\start.ps1
#        .\start.ps1 -Port 3000
#        .\start.ps1 -NoBrowser
# Share the Network URL with players on the same WiFi.
# ============================================================
param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Continue'
$rootDir = Split-Path $PSScriptRoot -Parent

function Test-Command([string]$cmd) {
    return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Get-LocalIP {
    return (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -First 1).IPAddress
}

function Clear-DevPorts {
    param([int[]]$Ports)
    # netstat -ano shows all PIDs reliably, including Java processes
    $netstat = netstat -ano 2>$null
    foreach ($p in $Ports) {
        $matches_ = $netstat | Select-String "[:.]$p\s"
        foreach ($line in $matches_) {
            if ($line -match '\s+(\d+)\s*$') {
                $pid_ = $Matches[1]
                if ($pid_ -and $pid_ -ne '0') {
                    taskkill /F /PID $pid_ *>$null
                }
            }
        }
    }
    # Explicitly kill any lingering Firebase emulator Java processes
    Get-Process -Name 'java' -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
}

# ---- Dependency checks ---------------------------------------------

if (-not (Test-Command 'node')) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
if (-not (Test-Command 'firebase')) {
    Write-Host "ERROR: Firebase CLI not found. Run: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# ---- Free up ports -------------------------------------------------

Write-Host "Clearing ports..." -ForegroundColor DarkGray
Clear-DevPorts -Ports @($Port, 9000, 4000, 4400, 4500)
Start-Sleep -Milliseconds 1000

# ---- Get network IP ------------------------------------------------

$localIP = Get-LocalIP
if (-not $localIP) { $localIP = 'localhost' }

# ---- Start HTTP server (bound to all interfaces) -------------------

$httpJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    & npx http-server . -p $port -a 0.0.0.0 -c-1 --cors --silent
} -ArgumentList $rootDir, $Port

Start-Sleep -Milliseconds 800

# ---- Display -------------------------------------------------------

Write-Host ""
Write-Host "  Castastrophe! is running" -ForegroundColor Green
Write-Host ""
Write-Host "  Local   : http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Network : http://${localIP}:$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Give players the Network URL to join on their phones." -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

if (-not $NoBrowser) {
    Start-Process "http://localhost:$Port"
}

# ---- Cleanup on exit -----------------------------------------------

try {
    Set-Location $rootDir
    firebase emulators:start
}
finally {
    Write-Host ""
    Write-Host "Shutting down..." -ForegroundColor DarkGray
    Stop-Job  $httpJob -ErrorAction SilentlyContinue
    Remove-Job $httpJob -Force -ErrorAction SilentlyContinue
    Write-Host "  Done." -ForegroundColor DarkGray
}
