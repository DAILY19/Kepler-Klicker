# ============================================================
# Castastrophe! - Quick start (run from project root)
# Usage: .\start.ps1
#        .\start.ps1 -Port 3000
#        .\start.ps1 -NoBrowser
# Share the Network URL with phones on the same WiFi.
# ============================================================
param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Continue'
$rootDir = $PSScriptRoot

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

}

# ---- Dependency checks ---------------------------------------------

if (-not (Test-Command 'node')) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}


# ---- Install dependencies if missing -------------------------------

if (-not (Test-Path (Join-Path $rootDir 'node_modules'))) {
    Write-Host "Installing dependencies..." -ForegroundColor DarkGray
    & npm install --prefix $rootDir
}

# ---- Free up ports -------------------------------------------------

Write-Host "Clearing ports..." -ForegroundColor DarkGray
Clear-DevPorts -Ports @($Port)
Start-Sleep -Milliseconds 500

# ---- Get network IP ------------------------------------------------

$localIP = Get-LocalIP
if (-not $localIP) { $localIP = 'localhost' }

# ---- Start HTTP server as a detached process -----------------------

$httpServerCmd = Join-Path $rootDir 'node_modules\.bin\http-server.cmd'
if (-not (Test-Path $httpServerCmd)) {
    Write-Host "ERROR: http-server not found. Run: npm install" -ForegroundColor Red
    exit 1
}

$logFile = Join-Path $env:TEMP 'castastrophe-http.log'
$errFile = Join-Path $env:TEMP 'castastrophe-http-err.log'
$httpProcess = Start-Process -FilePath $httpServerCmd `
    -ArgumentList ".", "-p", $Port, "-a", "0.0.0.0", "-c-1", "--cors" `
    -WorkingDirectory $rootDir `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $errFile `
    -PassThru -NoNewWindow

# ---- Wait until port is actually open ------------------------------

Write-Host "Waiting for server..." -ForegroundColor DarkGray
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', $Port)
        $tcp.Close()
        $ready = $true
        break
    } catch {}
}

if (-not $ready) {
    Write-Host ""
    Write-Host "ERROR: HTTP server failed to start. Output:" -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile | Write-Host }
    if (Test-Path $errFile) { Get-Content $errFile | Write-Host }
    if ($httpProcess -and -not $httpProcess.HasExited) {
        Stop-Process -Id $httpProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

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

# ---- Keep running until Ctrl+C -------------------------------------

try {
    Write-Host "  Using live Firebase (no emulator)." -ForegroundColor DarkGray
    Write-Host ""
    # Block until user presses Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 3600
    }
}
finally {
    Write-Host ""
    Write-Host "Shutting down..." -ForegroundColor DarkGray
    if ($httpProcess -and -not $httpProcess.HasExited) {
        Stop-Process -Id $httpProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Done." -ForegroundColor DarkGray
}
