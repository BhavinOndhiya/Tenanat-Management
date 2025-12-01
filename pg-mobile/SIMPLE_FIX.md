# Simple Fix: App Won't Open

## The Problem

You have `expo-dev-client` installed, which requires a development build. Since you don't have a build, it shows "Open" but won't actually open.

## The Solution

Remove expo-dev-client and use regular Expo:

```bash
cd pg-mobile
npm uninstall expo-dev-client
npx expo start --clear --tunnel
```

Then:
1. Copy the **HTTPS URL** from terminal (starts with `https://`)
2. Open it in **Safari** on your iPhone
3. Tap "Open in Expo Go" when Safari asks
4. App should open!

---

## Why This Happens

- `expo-dev-client` = needs a build (requires paid Apple account)
- Regular `expo start` = works with Expo Go (free!)

For now, use regular Expo Go - it works for most features!

---

## After Removing Dev Client

Your app will work with:
- ✅ Login/Authentication
- ✅ Navigation
- ✅ API calls
- ✅ Most UI features
- ⚠️ Some native modules might not work (but most will)

If you need all native modules later, you can create a build then.

---

## Quick Commands

```bash
# Remove dev-client
npm uninstall expo-dev-client

# Start fresh
npx expo start --clear --tunnel

# Use the HTTPS URL in Safari
```

That's it! Should work now.

