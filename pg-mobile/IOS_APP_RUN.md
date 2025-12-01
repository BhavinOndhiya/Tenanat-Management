# Run App on iOS Device - Step by Step

## Method 1: Use iOS Camera App (Easiest!)

### Steps:
1. **Make sure Expo Go is installed** on your iPhone (from App Store)
2. In your terminal, make sure `expo start` is running
3. **On your iPhone, open the Camera app** (regular iOS Camera)
4. **Point camera at the QR code** in your terminal
5. A **notification will appear** at the top saying "Open in Expo Go"
6. **Tap the notification** - app opens in Expo Go! ✅

**Note**: The QR code must be visible on your computer screen. If it's too small, make your terminal font bigger.

---

## Method 2: Tunnel Mode (Best - Works from Anywhere!)

### Steps:
1. **Stop your current expo start** (press Ctrl+C)
2. **Start with tunnel**:
   ```bash
   cd pg-mobile
   npx expo start --tunnel
   ```
3. Wait for it to generate a tunnel URL (takes 30 seconds)
4. You'll see something like:
   ```
   › Metro waiting on exp://u.expo.dev/xxx-xxx-xxx
   ```
5. **On your iPhone**:
   - Open **Safari browser**
   - Type or paste the URL: `exp://u.expo.dev/xxx-xxx-xxx`
   - Safari will ask "Open in Expo Go?" - tap **Open**
   - App loads! ✅

---

## Method 3: Share Link via Email/Message

### Steps:
1. Start with tunnel: `npx expo start --tunnel`
2. Copy the `exp://` URL from terminal
3. **Send it to yourself** via:
   - Email
   - iMessage
   - Notes app
   - Any way to get it on your iPhone
4. **On iPhone, tap the link** - opens in Expo Go!

---

## Method 4: Create Development Build (Permanent Solution)

This creates an actual app you install on your iPhone:

### Steps:
```bash
# 1. Install expo-dev-client
cd pg-mobile
npm install expo-dev-client

# 2. Build for iOS
eas build --profile development --platform ios
```

After build completes:
- You'll get a link
- Open link on iPhone
- Install the app
- App appears on home screen like a real app!

---

## Troubleshooting

### Camera doesn't recognize QR code:
- Make sure Expo Go is installed
- Try making terminal/QR code bigger
- Use tunnel mode instead

### "No usable data found":
- This means regular Camera app can't read it
- Use tunnel mode (Method 2) instead

### Can't connect:
- Make sure phone and computer on same WiFi (for lan mode)
- Use tunnel mode (works from anywhere)

---

## Recommended: Use Tunnel Mode!

Tunnel mode is the most reliable:
1. Works from anywhere (not just same WiFi)
2. Gives you a clickable link
3. No QR code needed
4. Works every time

Just run: `npx expo start --tunnel`

