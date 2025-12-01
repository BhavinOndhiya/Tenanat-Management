# Quick Start - Run App in Android Emulator

## Step 1: Create .env File

In the `pg-mobile` directory, create a file named `.env` with this content:

```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RkLNW87l37yj42
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=
```

**Note:** 
- Using deployed backend on AWS Lambda (no need to run backend locally)
- The backend is already deployed and running in production

## Step 2: Start Android Emulator

1. Open **Android Studio**
2. Go to **Tools** → **Device Manager** (or **More Actions** → **Virtual Device Manager**)
3. Click the **Play** button (▶) next to your Android device
4. Wait for emulator to boot completely

## Step 3: Start the Mobile App

In a **new terminal window**:

```bash
cd pg-mobile
npm start
```

Then press **`a`** to open in Android emulator.

Or directly:

```bash
cd pg-mobile
npm run android
```

## Troubleshooting

### "Connection failed" Error

1. **Verify .env file exists and has correct URL:**
   ```bash
   # Check .env file
   type pg-mobile\.env
   ```
   Should show: `EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`

2. **Restart Expo with cleared cache:**
   ```bash
   cd pg-mobile
   npm start -- --clear
   ```

3. **Test backend connection:**
   ```bash
   # Test if backend is accessible
   curl https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/health
   ```
   Should return a response (not connection error)

4. **Check internet connection:**
   - Make sure your computer has internet access
   - The emulator uses your computer's internet connection

### Backend Not Starting

If `serverless offline` fails:

```bash
cd backend
npm install
npx serverless offline
```

### Emulator Not Detected

```bash
# Check if emulator is running
adb devices

# If adb not found, add Android SDK to PATH or use Android Studio's terminal
```

### Port Already in Use

```bash
# Kill process on port 3000 (backend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port 8081 (Expo)
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

## Complete Command Sequence

```bash
# Start Mobile App (backend is already deployed)
cd pg-mobile
npm run android
```

## Verify Setup

1. ✅ `.env` file exists with deployed backend URL
2. ✅ Android emulator is running
3. ✅ Internet connection is active
4. ✅ Expo started and app installed on emulator

If all checked, the app should connect successfully to the deployed backend!

