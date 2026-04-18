# ============================================================
# Kepler Klicker - Stop the dev server
# Usage: .\stop.ps1
#        .\stop.ps1 -Port 3000
# ============================================================
param([int]$Port = 8080)

$PidFile = Join-Path $PSScriptRoot '.kepler-klicker.pid'

function Stop-ServerByPid {
    if (Test-Path $PidFile) {
        $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($savedPid -match '^\d+$') {
            $proc = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  Stopped process $savedPid ($($proc.Name))" -ForegroundColor DarkGray
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
}

function Stop-ServerByPort {
    param([int]$p)
    $netstat = netstat -ano 2>$null
    $matched = $netstat | Select-String "[:.]$p\s"
    foreach ($line in $matched) {
        if ($line -match '\s+(\d+)\s*$') {
            $pid_ = $Matches[1]
            if ($pid_ -and $pid_ -ne '0') {
                taskkill /F /PID $pid_ *>$null
                Write-Host "  Killed PID $pid_ on port $p" -ForegroundColor DarkGray
            }
        }
    }
}

Write-Host ""
Write-Host "Stopping Kepler Klicker server..." -ForegroundColor Yellow
Stop-ServerByPid
Stop-ServerByPort -p $Port
Write-Host "  Done." -ForegroundColor Green
Write-Host ""
