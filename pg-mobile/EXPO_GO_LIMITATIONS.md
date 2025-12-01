# Expo Go Limitations

## The Issue

You're seeing this error:
```
Invariant Violation: Your JavaScript code tried to access a native module that doesn't exist.
```

This happens because **Expo Go has limited support for some native modules**. Some features require a **development build** instead of Expo Go.

## Solutions

### Option 1: Use Web Version (Easiest)
The web version works perfectly and doesn't have these limitations:
```bash
npm run web
# or
npx expo start --web
```

### Option 2: Create a Development Build (Recommended for iOS)
A development build includes all native modules and works on iOS without a paid Apple Developer account:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS (free, but requires Expo account)
eas build --profile development --platform ios

# Or build for Android
eas build --profile development --platform android
```

**Note**: Development builds are free but require an Expo account. They work on physical devices without a paid Apple Developer account.

### Option 3: Continue with Limited Features
The app will work in Expo Go with these limitations:
- ✅ Login & Authentication
- ✅ Navigation
- ✅ API Calls
- ✅ Most UI Features
- ⚠️ Camera/File Picker (limited)
- ⚠️ Push Notifications (not available)
- ⚠️ File Downloads (limited)

## Why This Happens

Expo Go is a pre-built app that includes a limited set of native modules. When your code tries to use modules not included in Expo Go, you get this error.

Development builds include ALL native modules your app needs, so they work without limitations.

## Quick Fix for Testing

If you just want to test the app quickly:
1. Use the **web version** (`npm run web`)
2. Or use **Android** (Android Expo Go has better module support)
3. For full iOS testing, create a development build

## Need Help?

- [Expo Go vs Development Builds](https://docs.expo.dev/development/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)


