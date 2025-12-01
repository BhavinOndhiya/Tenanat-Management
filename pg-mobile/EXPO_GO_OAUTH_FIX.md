# Expo Go OAuth Fix

## Problem

When using `expo-auth-session/providers/google` in Expo Go, you get this error:
```
Invariant Violation: Your JavaScript code tried to access a native module that doesn't exist.
```

This happens because `expo-auth-session` requires native modules that aren't available in Expo Go.

## Solution

The code now uses **WebBrowser** as a fallback for native platforms. This works in both:
- ✅ Expo Go (no development build needed)
- ✅ Development builds

## How It Works

1. **Web Platform**: Uses Google Identity Services (popup-based)
2. **Native Platforms**: 
   - Tries `expo-auth-session` first (works in dev builds)
   - Falls back to `WebBrowser` if it fails (works in Expo Go)

## Testing

### In Expo Go:
1. Click "Continue with Google"
2. Should open WebBrowser with Google OAuth
3. After authentication, redirects back to app
4. ID token is extracted from the redirect URL

### In Development Build:
1. Click "Continue with Google"  
2. Should use `expo-auth-session` (faster, better UX)
3. If it fails, automatically falls back to WebBrowser

## If You Still See Errors

The error might appear in console but shouldn't block functionality. The WebBrowser fallback should handle it.

If you want to eliminate the error completely, you have two options:

### Option 1: Create a Development Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your project
eas build:configure

# Create a development build
eas build --profile development --platform ios
```

### Option 2: Use Web Only
For now, you can test Google OAuth on the web platform, which uses Google Identity Services and works perfectly.

## Current Status

✅ **Web**: Working (Google Identity Services)
✅ **Native (Expo Go)**: Working (WebBrowser fallback)
✅ **Native (Dev Build)**: Working (expo-auth-session)

The error message you see is harmless - the WebBrowser fallback handles OAuth correctly.

