# Fix Android SDK Errors

## Error: Android SDK Not Found

You're seeing this error because Android SDK is not installed or not in PATH.

## Solution Options

### Option 1: Install Android Studio (Recommended for Emulator)

1. **Download Android Studio:**
   - https://developer.android.com/studio
   - Install with default settings

2. **During installation, make sure to install:**
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

3. **Set Environment Variables:**

   **Windows:**
   ```powershell
   # Set ANDROID_HOME (replace with your actual SDK path)
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')
   
   # Add to PATH
   $currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
   $newPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\tools;$currentPath"
   [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
   ```

   **Or manually:**
   - Open System Properties → Environment Variables
   - Add `ANDROID_HOME` = `C:\Users\YourName\AppData\Local\Android\Sdk`
   - Add to PATH: `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\tools`

4. **Restart terminal/computer** after setting environment variables

5. **Verify:**
   ```bash
   adb version
   ```

### Option 2: Use Expo Go (No Android Studio Needed!)

You can test the app without Android Studio using Expo Go:

1. **Install Expo Go on your phone:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Start Expo:**
   ```bash
   cd pg-mobile
   npm start
   ```

3. **Scan QR code** with Expo Go app on your phone

### Option 3: Use Web Version (Quickest)

Test the app in your browser:

```bash
cd pg-mobile
npm run web
```

### Option 4: Use Expo Development Build (Advanced)

If you want to use emulator without full Android Studio setup, you can use Expo's managed workflow.

## Quick Fix Commands

### Fix Version Issue (Already Done)
```bash
cd pg-mobile
npm install react-native-screens@~4.16.0
```

### Set ANDROID_HOME for Current Session
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
```

### Test if adb works
```bash
adb version
```

## Recommended: Use Expo Go for Testing

Since you don't have Android Studio set up yet, the easiest way to test is:

```bash
cd pg-mobile
npm start
```

Then scan the QR code with Expo Go app on your phone. This works immediately without any Android SDK setup!

