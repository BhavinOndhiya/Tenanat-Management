# How to Run Your App - Different Methods

## Method 1: Expo Go App (Easiest - But Has Native Module Limitations)

### Steps:
1. **Install Expo Go** from App Store (iOS) or Play Store (Android)
2. **Open Expo Go** app on your phone
3. **Tap "Scan QR code"** button in Expo Go
4. **Scan the QR code** from your terminal
5. App will load in Expo Go

⚠️ **Note**: Expo Go doesn't support all native modules, which is why you're getting errors.

---

## Method 2: Web Browser (Works Right Now!)

### Steps:
1. In your terminal where `expo start` is running
2. **Press `w`** key (for web)
3. Or open the URL shown in terminal (usually `http://localhost:8081`)
4. App opens in your browser

✅ **This works immediately** - no native module issues!

---

## Method 3: Development Build (Best for Full Features)

### Steps:
1. Install Expo Dev Client:
   ```bash
   cd pg-mobile
   npm install expo-dev-client
   npx expo start --dev-client
   ```

2. Scan QR code with **Expo Go** app (it will use dev client)

OR

3. Create a full development build (see `QUICK_DEV_BUILD.md`)

---

## Method 4: Direct URL (If on Same Network)

### Steps:
1. Look at your terminal - you'll see:
   ```
   › Metro waiting on exp://192.168.x.x:8081
   ```

2. Open **Expo Go** app
3. Tap "Enter URL manually"
4. Enter: `exp://192.168.x.x:8081` (use the IP from your terminal)

---

## Method 5: Tunnel (Works from Anywhere)

### Steps:
1. Start with tunnel:
   ```bash
   npx expo start --tunnel
   ```

2. Scan the QR code with **Expo Go**

---

## Quick Comparison

| Method | Native Modules | Setup Time | Best For |
|--------|---------------|------------|---------|
| Expo Go | ❌ Limited | ⚡ Instant | Quick testing |
| Web Browser | ✅ Full | ⚡ Instant | Development |
| Dev Client | ✅ Full | 🕐 5 min | Full features |
| Dev Build | ✅ Full | 🕐 15 min | Production-like |

---

## Recommended: Start with Web Browser

Since you're having native module issues, **use the web version** for now:

1. Make sure `expo start` is running
2. Press `w` in the terminal
3. App opens in browser - works perfectly!

Then later, create a development build for full mobile features.

---

## Troubleshooting

### "No usable data found" when scanning with camera:
- ✅ Use **Expo Go app**, not regular camera
- ✅ Make sure QR code is fully visible
- ✅ Try tunnel mode: `npx expo start --tunnel`

### App not loading:
- Check if phone and computer are on same WiFi
- Try tunnel mode
- Check firewall settings


