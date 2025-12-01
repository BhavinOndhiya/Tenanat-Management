# Run Mobile App in Android Emulator

## Quick Setup (3 Steps)

### Step 1: Create .env File

Create a file named `.env` in the `pg-mobile` directory with:

```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RkLNW87l37yj42
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=
```

**Or use the PowerShell script:**
```powershell
cd pg-mobile
.\setup-env.ps1
```

### Step 2: Start Android Emulator

1. Open **Android Studio**
2. Go to **Tools** → **Device Manager**
3. Click **Play** button (▶) next to your Android device
4. Wait for emulator to boot

### Step 3: Run the App

```bash
cd pg-mobile
npm run android
```

The app will:
- Start Expo Metro bundler
- Automatically detect the running emulator
- Install and launch the app

## Alternative: Manual Start

```bash
# Start Expo
cd pg-mobile
npm start

# Then press 'a' to open in Android emulator
```

## Verify Backend Connection

The backend is deployed at:
**https://awy56hfhbi.execute-api.us-east-1.amazonaws.com**

Test it:
```bash
curl https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/health
```

Should return: `{"status":"ok"}`

## Troubleshooting

### "Connection failed" Error

1. **Check .env file:**
   ```bash
   type pg-mobile\.env
   ```
   Should show: `EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`

2. **Restart with cleared cache:**
   ```bash
   cd pg-mobile
   npm start -- --clear
   ```

3. **Check internet connection:**
   - Make sure you have internet access
   - The emulator uses your computer's internet

4. **Test backend directly:**
   ```bash
   curl https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/health
   ```

### Emulator Not Detected

```bash
# Check if emulator is running
adb devices

# If no devices, start emulator from Android Studio first
```

### Port Issues

```bash
# Kill process on port 8081 (Expo)
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

## Complete Command Sequence

```bash
# 1. Navigate to mobile app
cd pg-mobile

# 2. Create .env file (if not exists)
# Edit .env and add the backend URL

# 3. Start Android emulator from Android Studio

# 4. Run the app
npm run android
```

That's it! The app should connect to the deployed backend automatically.


