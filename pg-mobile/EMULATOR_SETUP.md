# Android Emulator Setup Guide

## Step 1: Install Android Studio

1. Download Android Studio from: https://developer.android.com/studio
2. Install it with default settings
3. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

## Step 2: Set up Android Emulator

### Open Android Studio

1. Launch Android Studio
2. Click **More Actions** → **Virtual Device Manager** (or Tools → Device Manager)

### Create a Virtual Device

1. Click **Create Device**
2. Select a device (recommended: **Pixel 5** or **Pixel 6**)
3. Click **Next**
4. Select a system image:
   - Recommended: **API 33 (Android 13)** or **API 34 (Android 14)**
   - Click **Download** if not installed
   - Wait for download to complete
5. Click **Next**
6. Review configuration and click **Finish**

### Start the Emulator

1. In Virtual Device Manager, click the **Play** button (▶) next to your device
2. Wait for the emulator to boot (first time may take a few minutes)

## Step 3: Verify Emulator is Running

The Android emulator window should open and show the Android home screen.

## Step 4: Run the App

Once the emulator is running, in your terminal:

```bash
cd pg-mobile
npm run android
```

Or:

```bash
npx expo start --android
```

The app will automatically detect the running emulator and install/launch the app.

## Alternative: Using Expo Go in Emulator

If you want to use Expo Go:

1. In the emulator, open **Play Store**
2. Search for **"Expo Go"**
3. Install Expo Go
4. Run `npm start` in your terminal
5. Scan the QR code shown in terminal (or press `a` to open in Android emulator)

## Troubleshooting

### Emulator not detected

```bash
# Check if emulator is running
adb devices

# If no devices shown, restart adb
adb kill-server
adb start-server
```

### Port issues

```bash
# Kill process on port 8081
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Clear cache

```bash
cd pg-mobile
npm start -- --clear
```

### Emulator is slow

1. Enable **Hardware Acceleration** in Android Studio
2. Allocate more RAM to the emulator (Settings → System → Advanced → Memory)
3. Use a lower API level (API 30 or 31)

## Quick Commands

```bash
# 1. Start emulator from Android Studio first
# 2. Then run:
cd pg-mobile
npm run android

# Or if emulator is already running:
npm start
# Then press 'a' in the terminal
```


