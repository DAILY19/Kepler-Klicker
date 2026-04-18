# ============================================================
# Kepler Klicker - Refresh / update / clear cache
# Stops the server, wipes temp logs, reinstalls deps if needed,
# then restarts and reopens the browser with a cache-bust param.
# Usage: .\refresh.ps1
#        .\refresh.ps1 -Port 3000
#        .\refresh.ps1 -ReinstallDeps   # wipe & reinstall node_modules
# ============================================================
param(
    [int]$Port = 8080,
    [switch]$ReinstallDeps
)

$rootDir   = $PSScriptRoot
$PidFile   = Join-Path $rootDir '.kepler-klicker.pid'
$logFile   = Join-Path $env:TEMP 'kepler-klicker-http.log'
$errFile   = Join-Path $env:TEMP 'kepler-klicker-http-err.log'

# ---- Helper: stop any running server ------------------------------

function Stop-Server {
    if (Test-Path $PidFile) {
        $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($savedPid -match '^\d+$') {
            Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
    # Belt-and-suspenders: also clear by port
    $netstat = netstat -ano 2>$null
    $matched = $netstat | Select-String "[:.]$Port\s"
    foreach ($line in $matched) {
        if ($line -match '\s+(\d+)\s*$') {
            $pid_ = $Matches[1]
            if ($pid_ -and $pid_ -ne '0') { taskkill /F /PID $pid_ *>$null }
        }
    }
}

# ---- Helper: local IP ---------------------------------------------

function Get-LocalIP {
    return (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -First 1).IPAddress
}

# ===================================================================

Write-Host ""
Write-Host "  Kepler Klicker Refresh" -ForegroundColor Cyan
Write-Host ""

# 1. Stop existing server
Write-Host "  [1/4] Stopping server..." -ForegroundColor DarkGray
Stop-Server
Start-Sleep -Milliseconds 400

# 2. Clear temp log files
Write-Host "  [2/4] Clearing temp logs..." -ForegroundColor DarkGray
Remove-Item $logFile -Force -ErrorAction SilentlyContinue
Remove-Item $errFile -Force -ErrorAction SilentlyContinue

# 3. Optionally wipe & reinstall node_modules
if ($ReinstallDeps) {
    Write-Host "  [3/4] Reinstalling dependencies..." -ForegroundColor DarkGray
    $nm = Join-Path $rootDir 'node_modules'
    if (Test-Path $nm) { Remove-Item $nm -Recurse -Force }
    & npm install --prefix $rootDir
} else {
    Write-Host "  [3/4] Checking dependencies..." -ForegroundColor DarkGray
    if (-not (Test-Path (Join-Path $rootDir 'node_modules'))) {
        & npm install --prefix $rootDir
    } else {
        Write-Host "        node_modules OK (use -ReinstallDeps to force reinstall)" -ForegroundColor DarkGray
    }
}

# 4. Restart server
Write-Host "  [4/4] Starting server..." -ForegroundColor DarkGray
$httpServerCmd = Join-Path $rootDir 'node_modules\.bin\http-server.cmd'
if (-not (Test-Path $httpServerCmd)) {
    Write-Host "ERROR: http-server not found. Run: npm install" -ForegroundColor Red
    exit 1
}

$httpProcess = Start-Process -FilePath $httpServerCmd `
    -ArgumentList ".", "-p", $Port, "-a", "0.0.0.0", "-c-1", "--cors" `
    -WorkingDirectory $rootDir `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError  $errFile `
    -PassThru -NoNewWindow

$httpProcess.Id | Set-Content -Path $PidFile

# Wait for port to open
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 400
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', $Port)
        $tcp.Close()
        $ready = $true
        break
    } catch {}
}

if (-not $ready) {
    Write-Host "ERROR: Server failed to start." -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile | Write-Host }
    if (Test-Path $errFile) { Get-Content $errFile | Write-Host }
    exit 1
}

# Open browser with cache-bust query param so Chrome/Edge forces a fresh load
$localIP  = Get-LocalIP
$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$url = "http://localhost:$Port/?v=$cacheBust"
Start-Process $url

Write-Host ""
Write-Host "  Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  Local   : http://localhost:$Port" -ForegroundColor Cyan
if ($localIP) {
    Write-Host "  Network : http://${localIP}:$Port" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Browser opened with cache-bust param (?v=$cacheBust)." -ForegroundColor DarkGray
Write-Host "  Run .\stop.ps1 to shut down." -ForegroundColor DarkGray
Write-Host ""
