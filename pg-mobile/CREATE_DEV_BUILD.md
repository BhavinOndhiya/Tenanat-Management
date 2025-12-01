# Create Development Build - Step by Step Guide

## Why Development Build?

Expo Go doesn't support all native modules. A development build includes your custom native code and allows you to use packages like `expo-notifications`, `expo-image-picker`, etc.

## Option 1: Quick Start (Recommended)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

If you don't have an Expo account, create one at https://expo.dev

### Step 3: Configure Your Project

```bash
cd pg-mobile
eas build:configure
```

This will create an `eas.json` file.

### Step 4: Create Development Build for iOS

```bash
eas build --profile development --platform ios
```

This will:
- Build your app in the cloud
- Take about 10-15 minutes
- Give you a download link or install link

### Step 5: Install on Your iPhone

After the build completes:
1. You'll get a link in the terminal
2. Open it on your iPhone
3. Install the app (you may need to trust the developer in Settings)

## Option 2: Local Build (Faster, but requires setup)

### Prerequisites:
- macOS (for iOS builds)
- Xcode installed
- Apple Developer account (free is fine for development)

### Steps:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build locally
eas build --profile development --platform ios --local
```

## Option 3: Use Expo Dev Client (Easiest for Testing)

Instead of building, you can use Expo's pre-built dev client:

```bash
# Install expo-dev-client
cd pg-mobile
npm install expo-dev-client

# Start with dev client
npx expo start --dev-client
```

Then scan the QR code - it will use the dev client instead of Expo Go.

## Troubleshooting

### If build fails:
1. Check your `app.json` - make sure `scheme` is set
2. Make sure you're logged in: `eas whoami`
3. Check build status: `eas build:list`

### If you get signing errors (iOS):
- You may need to add your Apple ID in `eas.json`
- Or use `--local` flag to build on your Mac

## Quick Reference

```bash
# Check if EAS is installed
eas --version

# Login
eas login

# Configure project
eas build:configure

# Build for iOS (cloud)
eas build --profile development --platform ios

# Build for iOS (local - requires Mac)
eas build --profile development --platform ios --local

# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

## After Building

Once you have the development build installed:
1. Your app will work with all native modules
2. You can still use `npx expo start` for hot reloading
3. The app will be named "pg-mobile" on your device

## Need Help?

- EAS Docs: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev/

