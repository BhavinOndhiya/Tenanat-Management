# Install Android Studio for Emulator

## Quick Installation Guide

### Step 1: Download Android Studio

1. Go to: https://developer.android.com/studio
2. Click **Download Android Studio**
3. Run the installer

### Step 2: Installation Wizard

1. **Choose Standard Installation** (recommended)
2. **Select Components:**
   - ✅ Android SDK
   - ✅ Android SDK Platform
   - ✅ Android Virtual Device (AVD)
   - ✅ Performance (Intel HAXM) - if available

3. **Accept licenses** when prompted
4. **Wait for download** (may take 10-20 minutes)

### Step 3: First Launch Setup

1. **Open Android Studio**
2. **Complete Setup Wizard:**
   - Choose Standard setup
   - Accept SDK component licenses
   - Wait for components to download

### Step 4: Create Virtual Device

1. Click **More Actions** → **Virtual Device Manager**
2. Click **Create Device**
3. Select **Pixel 5** or **Pixel 6**
4. Click **Next**
5. Select system image:
   - **API 33 (Android 13)** or **API 34 (Android 14)**
   - Click **Download** if needed
6. Click **Next** → **Finish**

### Step 5: Configure Environment Variables

Run the setup script:

```powershell
cd pg-mobile
.\setup-android-sdk.ps1
```

**Or manually:**

1. Open **System Properties** → **Environment Variables**
2. Add **User Variable:**
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\YourName\AppData\Local\Android\Sdk`
3. Edit **Path** variable, add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

### Step 6: Restart Terminal

Close and reopen your terminal/PowerShell for changes to take effect.

### Step 7: Verify Installation

```bash
adb version
```

Should show: `Android Debug Bridge version ...`

### Step 8: Start Emulator

1. Open **Android Studio**
2. **Tools** → **Device Manager**
3. Click **Play** button (▶) next to your device

### Step 9: Run App

```bash
cd pg-mobile
npm run android
```

## Alternative: Use Expo Go (Faster!)

If you don't want to install Android Studio:

1. Install **Expo Go** app on your phone
2. Run: `npm start`
3. Scan QR code

See `RUN_WITHOUT_ANDROID_STUDIO.md` for details.

## Troubleshooting

### "SDK not found" after installation

1. Check SDK location: Usually `C:\Users\YourName\AppData\Local\Android\Sdk`
2. Run setup script: `.\setup-android-sdk.ps1`
3. Restart terminal

### Emulator is slow

1. Enable **Hardware Acceleration** in Android Studio
2. Allocate more RAM (Settings → System → Advanced → Memory)
3. Use lower API level (API 30 or 31)

### Installation takes too long

- Use **Expo Go** instead (no installation needed!)
- Or use **Web version**: `npm run web`

