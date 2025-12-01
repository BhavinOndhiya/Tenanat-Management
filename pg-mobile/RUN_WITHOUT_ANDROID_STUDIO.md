# Run App Without Android Studio

Since Android Studio is not installed, here are **3 easy ways** to test the app:

## Option 1: Expo Go on Your Phone (Easiest! ⭐)

**No Android Studio needed!**

1. **Install Expo Go:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Start Expo:**
   ```bash
   cd pg-mobile
   npm start
   ```

3. **Scan QR Code:**
   - **Android:** Open Expo Go app → Scan QR code
   - **iOS:** Open Camera app → Scan QR code → Open in Expo Go

4. **App loads on your phone!** 📱

## Option 2: Web Browser (Fastest!)

Test the app in your browser:

```bash
cd pg-mobile
npm run web
```

Opens automatically in your default browser.

## Option 3: Install Android Studio (For Emulator)

If you want to use the emulator:

1. **Download Android Studio:**
   - https://developer.android.com/studio
   - Install with default settings

2. **Set up Android SDK:**
   ```powershell
   cd pg-mobile
   .\setup-android-sdk.ps1
   ```

3. **Restart terminal** and run:
   ```bash
   npm run android
   ```

## Recommended: Use Expo Go

**Why Expo Go?**
- ✅ No Android Studio installation needed
- ✅ Works immediately
- ✅ Test on real device (better than emulator)
- ✅ Faster development cycle

**Steps:**
```bash
# 1. Install Expo Go app on your phone

# 2. Start Expo
cd pg-mobile
npm start

# 3. Scan QR code with Expo Go app
```

That's it! The app will load on your phone and connect to the deployed backend.

## Troubleshooting

### "Connection failed" in Expo Go

1. Make sure phone and computer are on same WiFi network
2. Or use tunnel mode:
   ```bash
   npm start -- --tunnel
   ```

### QR Code not scanning

1. Make sure Expo Go app is installed
2. Try tunnel mode (see above)
3. Or manually enter URL shown in terminal

### App not loading

1. Check `.env` file has correct backend URL
2. Restart Expo: `npm start -- --clear`
3. Check internet connection on phone

