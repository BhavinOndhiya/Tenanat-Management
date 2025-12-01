# 🚀 Start Here - Run Mobile App in Android Emulator

## ✅ Prerequisites Check

- [x] Dependencies installed (`npm install` completed)
- [x] .env file created with deployed backend URL
- [ ] Android emulator running
- [ ] Internet connection active

## 🎯 Quick Start (3 Commands)

### 1. Start Android Emulator
- Open **Android Studio**
- **Tools** → **Device Manager**
- Click **Play** button (▶) next to your device
- Wait for emulator to boot

### 2. Run the App

```bash
cd pg-mobile
npm run android
```

That's it! The app will automatically:
- Start Expo Metro bundler
- Detect the running emulator
- Install and launch the app
- Connect to deployed backend

## 📋 Complete Command Reference

### Install Dependencies (if not done)
```bash
cd pg-mobile
npm install
```

### Create/Update .env File
```bash
# Windows PowerShell
cd pg-mobile
.\setup-env.ps1

# Or manually create .env with:
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RkLNW87l37yj42
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=
```

### Start App
```bash
# Option 1: Direct Android launch
npm run android

# Option 2: Start Expo, then press 'a'
npm start
# Then press 'a' in terminal
```

### Clear Cache and Restart
```bash
npm start -- --clear
```

## 🔧 Troubleshooting

### "Connection failed" Error

**Quick Fix:**
1. Verify .env file:
   ```bash
   type .env
   ```
   Should show: `EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`

2. Test backend:
   ```bash
   curl https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/health
   ```
   Should return: `{"status":"ok"}`

3. Restart with cleared cache:
   ```bash
   npm start -- --clear
   ```

### Emulator Not Detected

```bash
# Check if emulator is running
adb devices

# If empty, start emulator from Android Studio first
```

### Port Already in Use

```bash
# Kill Expo (port 8081)
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

## 📱 Backend Information

- **Deployed URL:** `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com`
- **API Base:** `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`
- **Status:** ✅ Deployed and running
- **No local backend needed!**

## 🎉 Success Indicators

When everything works:
- ✅ Expo Metro bundler starts
- ✅ App installs on emulator
- ✅ App opens automatically
- ✅ Login screen appears
- ✅ Can connect to backend (no "Connection failed" error)

## 📚 Additional Resources

- `QUICK_START.md` - Detailed setup guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `SETUP.md` - Complete installation guide
- `EMULATOR_SETUP.md` - Android emulator setup

---

**Ready? Run: `npm run android`** 🚀

