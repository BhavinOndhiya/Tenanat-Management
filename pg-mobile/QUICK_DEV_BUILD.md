# Quick Guide: Create Development Build for iOS

## Why?
Expo Go doesn't support all native modules. A development build includes your custom native code.

## Easiest Method (3 Steps):

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login & Configure
```bash
cd pg-mobile
eas login
eas build:configure
```

### Step 3: Build for iOS
```bash
eas build --profile development --platform ios
```

**That's it!** The build will take 10-15 minutes. You'll get a link to install on your iPhone.

---

## Alternative: Use Expo Dev Client (Even Easier!)

Instead of building, install `expo-dev-client`:

```bash
cd pg-mobile
npm install expo-dev-client
npx expo start --dev-client
```

Then scan the QR code - it will use dev client instead of Expo Go.

---

## What You'll Get:

✅ App works with all native modules  
✅ Hot reloading still works  
✅ Can test on real device  
✅ No more "native module doesn't exist" errors

---

## Need Help?

- Full guide: See `CREATE_DEV_BUILD.md`
- Expo docs: https://docs.expo.dev/build/introduction/

