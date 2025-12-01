# iOS Quick Start - 3 Easy Ways to Run Your App

## ⚡ Method 1: Web Browser (EASIEST - Works Right Now!)

### Steps:
1. Make sure `expo start` is running in your terminal
2. **Press `w` key** in the terminal
3. App opens in your browser automatically! ✅

**This works immediately** - no native module issues, no QR code needed!

---

## 📱 Method 2: Expo Go App (Manual URL Entry)

### Steps:
1. **Install Expo Go** from App Store (if not already installed)
2. **Open Expo Go** app on your iPhone
3. Look at your terminal - you'll see something like:
   ```
   › Metro waiting on exp://192.168.1.14:8081
   ```
4. In Expo Go app, **tap "Enter URL manually"** (or the + button)
5. **Type the URL** from terminal: `exp://192.168.1.14:8081`
6. Tap "Connect"

---

## 🌐 Method 3: Tunnel Mode (Works from Anywhere)

### Steps:
1. Stop your current `expo start` (Ctrl+C)
2. Start with tunnel:
   ```bash
   cd pg-mobile
   npx expo start --tunnel
   ```
3. Wait for it to generate a tunnel URL (looks like `exp://xxx.xxx.xxx.xxx:8081`)
4. Open **Expo Go** app
5. Tap "Enter URL manually"
6. Enter the tunnel URL

---

## 🎯 Recommended: Use Web Browser First!

Since you're having native module issues with Expo Go, **use the web version**:

1. In terminal where `expo start` is running
2. **Just press `w`**
3. App opens in browser - works perfectly!

You can test all features except camera/file picker (which need native modules).

---

## Quick Commands Reference

```bash
# Start normally
npx expo start

# Start with web (press 'w' after starting)
# OR start directly in web:
npx expo start --web

# Start with tunnel (for remote access)
npx expo start --tunnel

# Clear cache and start
npx expo start --clear
```

---

## Why Web Browser is Best Right Now:

✅ No native module errors  
✅ Works immediately  
✅ Hot reloading works  
✅ Can test most features  
✅ No QR code needed  
✅ No Expo Go needed  

The only things that won't work in web:
- Camera (use web browser's file picker instead)
- Push notifications
- Some native device features

But for testing login, navigation, API calls - **web works perfectly!**


