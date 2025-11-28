# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd frontend-mobile-app/frontend-app
npm install
```

## Step 2: Configure API URL

Edit `src/utils/api.js` and update the `API_BASE_URL`:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:3000/api'  // For physical device testing
  : 'https://your-production-api.com/api';
```

**Important Notes:**
- **Android Emulator**: Use `http://10.0.2.2:3000/api`
- **iOS Simulator**: Use `http://localhost:3000/api`
- **Physical Device**: Use your computer's local IP (e.g., `http://192.168.1.100:3000/api`)

To find your local IP:
- **Windows**: Run `ipconfig` and look for IPv4 Address
- **Mac/Linux**: Run `ifconfig` or `ip addr` and look for inet address

## Step 3: Start Development Server

```bash
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

## Step 4: Test the App

Use the demo accounts:
- Admin: `admin@example.com` / `AdminPass123!`
- Officer: `officer@example.com` / `OfficerPass123!`
- Citizen: `citizen@example.com` / `CitizenPass123!`

## Building for Production

### Android

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build: `eas build --platform android --profile production`
5. Submit: `eas submit --platform android`

### iOS

1. Build: `eas build --platform ios --profile production`
2. Submit: `eas submit --platform ios`

**Note**: iOS requires an Apple Developer account ($99/year).

## Troubleshooting

### Can't connect to API

- Make sure your backend is running
- Check the API URL is correct for your device type
- For physical devices, ensure phone and computer are on the same network
- Check firewall settings

### Build errors

- Clear cache: `expo start -c`
- Delete node_modules: `rm -rf node_modules && npm install`
- Check Expo documentation: https://docs.expo.dev

