# Fix: App Shows "Open" But Won't Open

## Common Issues & Solutions

### Issue 1: Expo Go vs Dev Client Mismatch

If you installed `expo-dev-client`, you need to use **Expo Go** app, but it might need the dev client version.

**Solution:**
1. Make sure you're using the **latest Expo Go** from App Store
2. Or uninstall expo-dev-client and use regular expo start:
   ```bash
   npm uninstall expo-dev-client
   npx expo start
   ```

---

### Issue 2: URL Format Issue

The link might be in wrong format. Try these:

**Option A: Use HTTPS URL directly**
```
https://[your-url].exp.direct
```

**Option B: Use exp:// format**
```
exp://[your-url]
```

**Option C: Full development client URL**
```
exp+pg-mobile://expo-development-client/?url=https://[your-url]
```

---

### Issue 3: Clear Cache and Restart

Sometimes cache causes issues:

```bash
cd pg-mobile
npx expo start --clear --tunnel
```

Wait for new URL, then try again.

---

### Issue 4: Use Regular Expo Start (No Dev Client)

If dev-client is causing issues, remove it:

```bash
cd pg-mobile
npm uninstall expo-dev-client
npx expo start --tunnel
```

Then use the URL it provides.

---

### Issue 5: Check What Error You See

When you tap "Open", what happens?
- Does nothing?
- Shows error message?
- Opens but crashes?
- Opens but blank screen?

**Tell me what you see** and I can help fix it!

---

## Step-by-Step Fix

### Method 1: Clean Start (Recommended)

```bash
# 1. Stop current expo (Ctrl+C)

# 2. Remove dev-client if installed
cd pg-mobile
npm uninstall expo-dev-client

# 3. Clear everything
npx expo start --clear --tunnel

# 4. Wait for URL
# 5. Copy the HTTPS URL (starts with https://)
# 6. Open in Safari on iPhone
# 7. Tap "Open in Expo Go"
```

### Method 2: Use LAN Mode (If Same WiFi)

```bash
# 1. Stop current expo
# 2. Start normally
cd pg-mobile
npx expo start

# 3. Look for: exp://192.168.x.x:8081
# 4. On iPhone Safari, type: exp://192.168.x.x:8081
# 5. Use YOUR actual IP from terminal
```

### Method 3: Use Web Version

```bash
cd pg-mobile
npx expo start --web
```

Or press `w` when expo is running.

---

## Quick Diagnostic

Run this and tell me what you see:

```bash
cd pg-mobile
npx expo start --tunnel
```

Then:
1. What URL does it show?
2. When you open it in Safari, what happens?
3. When you tap "Open in Expo Go", what happens?
4. Any error messages?

---

## Most Likely Fix

Try this - it usually works:

```bash
cd pg-mobile
npm uninstall expo-dev-client
npx expo start --clear --tunnel
```

Then:
1. Copy the **HTTPS URL** (the one starting with `https://`)
2. Open it in **Safari** on iPhone (not Chrome)
3. Safari will show "Open in Expo Go" - tap it
4. App should open!

If it still doesn't work, tell me:
- What URL you're using
- What happens when you tap "Open"
- Any error messages you see

