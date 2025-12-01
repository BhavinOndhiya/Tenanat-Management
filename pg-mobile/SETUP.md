# PG Mobile App - Setup & Run Commands

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Expo CLI** (will be installed globally or via npx)
4. **Expo Go app** on your mobile device (for testing) OR iOS Simulator / Android Emulator

## Installation Steps

### 1. Navigate to the mobile app directory

```bash
cd pg-mobile
```

### 2. Install dependencies

```bash
npm install
```

Or if you prefer yarn:

```bash
yarn install
```

### 3. Set up environment variables

Create a `.env` file in the `pg-mobile` directory:

```bash
# Windows (PowerShell)
New-Item -Path .env -ItemType File

# Windows (CMD)
type nul > .env

# Mac/Linux
touch .env
```

Add the following environment variables to `.env`:

```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RkLNW87l37yj42
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=
```

**Note:** The backend is already deployed on AWS Lambda. No need to run it locally.

### 4. Start the development server

```bash
npm start
```

Or:

```bash
npx expo start
```

This will:
- Start the Metro bundler
- Display a QR code in the terminal
- Open Expo DevTools in your browser

## Running the App

### Option 1: Using Expo Go (Recommended for Testing)

1. **Install Expo Go** on your mobile device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code**:
   - **iOS**: Open Camera app and scan the QR code
   - **Android**: Open Expo Go app and scan the QR code

3. The app will load on your device

### Option 2: Using iOS Simulator (Mac only)

```bash
npm run ios
```

Or:

```bash
npx expo start --ios
```

### Option 3: Using Android Emulator

```bash
npm run android
```

Or:

```bash
npx expo start --android
```

**Note:** Make sure you have Android Studio installed and an emulator running.

### Option 4: Using Web Browser

```bash
npm run web
```

Or:

```bash
npx expo start --web
```

## Development Commands

### Clear cache and restart

```bash
npm start -- --clear
```

### Run on specific platform

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### Build for production

#### Android APK

```bash
npx expo build:android
```

#### iOS IPA

```bash
npx expo build:ios
```

#### EAS Build (Recommended)

First, install EAS CLI:

```bash
npm install -g eas-cli
```

Login to Expo:

```bash
eas login
```

Configure the project:

```bash
eas build:configure
```

Build:

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios

# Both
eas build --platform all
```

## Troubleshooting

### Clear all caches

```bash
# Clear npm cache
npm cache clean --force

# Clear Expo cache
npx expo start --clear

# Clear watchman (if installed)
watchman watch-del-all

# Reset Metro bundler
rm -rf node_modules
npm install
```

### Fix dependency issues

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with yarn
rm -rf node_modules yarn.lock
yarn install
```

### Port already in use

If port 8081 is already in use:

```bash
# Kill the process using port 8081
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8081 | xargs kill -9

# Or use a different port
npx expo start --port 8082
```

## Quick Start Summary

```bash
# 1. Navigate to project
cd pg-mobile

# 2. Install dependencies
npm install

# 3. Create .env file and add your environment variables
# (See ENV_SETUP.md for details)

# 4. Start the app
npm start

# 5. Scan QR code with Expo Go app on your phone
# OR press 'i' for iOS simulator, 'a' for Android emulator
```

## Environment Variables Reference

See `ENV_SETUP.md` for detailed environment variable setup instructions.

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Go App](https://expo.dev/client)

