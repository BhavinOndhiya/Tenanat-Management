# Troubleshooting: Link Not Working

## Quick Fixes to Try:

### 1. Make Sure Expo is Running
- Check your terminal - is `expo start` still running?
- If not, restart it: `npx expo start --tunnel`

### 2. Try Different URL Format

**Option A: Use the HTTPS URL directly**
```
https://arlmlwa-anonymous-8081.exp.direct
```

**Option B: Use exp:// format**
```
exp://arlmlwa-anonymous-8081.exp.direct
```

**Option C: Full URL with scheme**
```
exp+pg-mobile://expo-development-client/?url=https://arlmlwa-anonymous-8081.exp.direct
```

### 3. Restart with Fresh Tunnel

Stop current expo (Ctrl+C) and restart:

```bash
cd pg-mobile
npx expo start --tunnel --clear
```

Wait for new URL, then try that.

---

## Alternative: Use Regular Expo Start (LAN Mode)

If tunnel isn't working, try LAN mode:

### Steps:
1. **Make sure iPhone and computer are on same WiFi**
2. Stop current expo (Ctrl+C)
3. Start normally:
   ```bash
   cd pg-mobile
   npx expo start
   ```
4. Look for the URL like: `exp://192.168.x.x:8081`
5. **On iPhone**:
   - Open **Safari**
   - Type: `exp://192.168.x.x:8081` (use the IP from terminal)
   - Tap "Open in Expo Go"

---

## Alternative: Install expo-dev-client (Recommended!)

This is the most reliable method:

### Steps:
```bash
cd pg-mobile

# Install dev client
npm install expo-dev-client

# Start with dev client
npx expo start --dev-client
```

Then:
1. Look for the QR code or URL in terminal
2. **On iPhone, open Expo Go app**
3. **Tap "Scan QR code"** (if available)
4. OR use the URL it provides

---

## Alternative: Use iOS Simulator (If You Have Mac)

If you're on a Mac with Xcode:

```bash
cd pg-mobile
npx expo start --ios
```

This opens in iOS Simulator - no phone needed!

---

## Check These:

1. ✅ Is Expo Go installed on your iPhone?
2. ✅ Is `expo start` running in terminal?
3. ✅ Are you using Safari (not Chrome) on iPhone?
4. ✅ Did you try tapping "Open in Expo Go" when Safari asks?

---

## Still Not Working?

Try this step-by-step:

1. **Stop everything** (Ctrl+C)
2. **Clear cache and restart**:
   ```bash
   cd pg-mobile
   npx expo start --clear --tunnel
   ```
3. **Wait for new URL** (takes 30-60 seconds)
4. **Copy the NEW URL** from terminal
5. **On iPhone Safari, paste and go**
6. **Tap "Open in Expo Go"** when prompted

If still not working, the issue might be:
- Network/firewall blocking tunnel
- Expo Go not properly installed
- Need to use development build instead

Let me know what error you see!

