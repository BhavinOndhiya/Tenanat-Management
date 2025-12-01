# PowerShell script to set up Android SDK environment variables
# Run this as Administrator for system-wide changes, or as User for user-specific

Write-Host "=== Android SDK Setup ===" -ForegroundColor Green
Write-Host ""

# Check if Android SDK exists in common locations
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "$env:ProgramFiles\Android\Sdk"
)

$sdkPath = $null
foreach ($path in $sdkPaths) {
    if (Test-Path $path) {
        $sdkPath = $path
        Write-Host "✅ Found Android SDK at: $path" -ForegroundColor Green
        break
    }
}

if (-not $sdkPath) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Android Studio first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "2. Install with default settings" -ForegroundColor White
    Write-Host "3. Open Android Studio and complete setup wizard" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use Expo Go on your phone (no Android Studio needed)!" -ForegroundColor Cyan
    exit 1
}

# Set ANDROID_HOME
Write-Host "Setting ANDROID_HOME..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')

# Add to PATH
Write-Host "Adding Android SDK to PATH..." -ForegroundColor Yellow
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$pathsToAdd = @(
    "$sdkPath\platform-tools",
    "$sdkPath\tools",
    "$sdkPath\tools\bin"
)

$newPath = $currentPath
foreach ($path in $pathsToAdd) {
    if ($newPath -notlike "*$path*") {
        $newPath = "$path;$newPath"
        Write-Host "  Added: $path" -ForegroundColor Gray
    }
}

[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')

# Set for current session
$env:ANDROID_HOME = $sdkPath
$env:PATH = "$sdkPath\platform-tools;$sdkPath\tools;$sdkPath\tools\bin;$env:PATH"

Write-Host ""
Write-Host "✅ Android SDK configured!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Restart your terminal/PowerShell for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify, restart terminal and run:" -ForegroundColor Cyan
Write-Host "  adb version" -ForegroundColor White
Write-Host ""


