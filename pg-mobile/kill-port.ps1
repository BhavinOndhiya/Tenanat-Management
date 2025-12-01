# PowerShell script to kill process on port 8081
Write-Host "Finding process on port 8081..." -ForegroundColor Yellow

$port = 8081
$processes = netstat -ano | findstr ":$port"

if ($processes) {
    $processIds = $processes | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $matches[1]
        }
    } | Select-Object -Unique

    foreach ($processId in $processIds) {
        Write-Host "Killing process with PID: $processId" -ForegroundColor Red
        try {
            Stop-Process -Id $processId -Force
            Write-Host "✅ Process $processId killed successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to kill process $processId: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No process found on port $port" -ForegroundColor Green
}

Write-Host ""
Write-Host "You can now run: npm start" -ForegroundColor Cyan

