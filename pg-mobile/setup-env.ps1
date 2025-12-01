# PowerShell script to create .env file for mobile app
# Run this from the pg-mobile directory

$envContent = @"
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RkLNW87l37yj42
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=
"@

$envFile = ".env"

if (Test-Path $envFile) {
    Write-Host ".env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit
    }
}

$envContent | Out-File -FilePath $envFile -Encoding utf8
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Contents:" -ForegroundColor Cyan
Get-Content $envFile
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure Android emulator is running" -ForegroundColor White
Write-Host "2. Run: npm run android" -ForegroundColor White


