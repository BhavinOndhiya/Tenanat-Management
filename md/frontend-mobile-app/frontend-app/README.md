# Society Management Mobile App

A React Native mobile application built with Expo for managing society complaints, events, billing, and more. Ready for deployment to both Android Play Store and iOS App Store.

## Features

- **Authentication**: Login and registration with role-based access
- **Citizen Features**:
  - Dashboard with flat information, announcements, and events
  - Create and track complaints
  - View billing invoices and payment history
  - Manage tenants (for flat owners)
  - RSVP to events

- **Officer Features**:
  - Dashboard with complaint summary
  - Assign complaints to self
  - Update complaint status (New → In Progress → Resolved)

- **Admin Features**:
  - Comprehensive dashboard with statistics
  - User management
  - Flat management and assignments
  - Announcements management
  - Events management
  - Billing overview and invoice management
  - Complaint management and analytics

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS development: macOS with Xcode
- For Android development: Android Studio

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend-mobile-app/frontend-app
npm install
```

### 2. Configure API Base URL

Update the API base URL in `src/utils/api.js`:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:3000/api'  // Replace with your local IP for development
  : 'https://your-production-api.com/api';  // Replace with your production API URL
```

**Important**: For Android emulator, use `http://10.0.2.2:3000/api`. For iOS simulator, use `http://localhost:3000/api`. For physical devices, use your computer's local IP address (e.g., `http://192.168.1.100:3000/api`).

### 3. Start the Development Server

```bash
npm start
```

This will start the Expo development server. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on your physical device

## Building for Production

### Android

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   eas build:configure
   ```

4. **Update app.json**:
   - Set your `package` name (Android) and `bundleIdentifier` (iOS)
   - Update `projectId` in `extra.eas.projectId` after running `eas build:configure`

5. **Build APK/AAB**:
   ```bash
   # For testing (APK)
   eas build --platform android --profile preview
   
   # For Play Store (AAB)
   eas build --platform android --profile production
   ```

6. **Submit to Play Store**:
   ```bash
   eas submit --platform android
   ```

### iOS

1. **Build for App Store**:
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

**Note**: iOS builds require an Apple Developer account ($99/year).

## Project Structure

```
frontend-app/
├── App.js                 # Root component with navigation
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── src/
│   ├── context/          # React contexts (Auth)
│   ├── navigation/       # Navigation setup
│   ├── screens/          # All screen components
│   │   ├── auth/         # Login, Register
│   │   ├── citizen/      # Citizen screens
│   │   ├── officer/      # Officer screens
│   │   ├── admin/        # Admin screens
│   │   └── ...           # Shared screens
│   └── utils/            # API utilities
└── assets/               # App icons and images
```

## Environment Configuration

For production builds, you may want to use environment variables:

1. Install `expo-constants` and `expo-env`:
   ```bash
   npm install expo-constants
   ```

2. Create `.env` file (not committed to git):
   ```
   API_BASE_URL=https://your-api.com/api
   ```

3. Update `app.json` to include environment variables in `extra` section.

## Testing

### On Physical Devices

1. Install Expo Go app from Play Store (Android) or App Store (iOS)
2. Start the development server: `npm start`
3. Scan the QR code with Expo Go app

### On Emulators/Simulators

- **Android**: Start Android Studio emulator, then run `npm run android`
- **iOS**: Start iOS Simulator, then run `npm run ios`

## Troubleshooting

### API Connection Issues

- **Android Emulator**: Use `http://10.0.2.2:3000/api` instead of `localhost`
- **iOS Simulator**: Use `http://localhost:3000/api`
- **Physical Device**: Use your computer's local IP (e.g., `http://192.168.1.100:3000/api`)
- Ensure your backend server is running and accessible
- Check firewall settings

### Build Issues

- Clear cache: `expo start -c`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- For EAS builds, check the build logs on expo.dev

## Deployment Checklist

### Android Play Store

- [ ] Update `app.json` with correct package name
- [ ] Set version code in `app.json` (android.versionCode)
- [ ] Create app icon (1024x1024) and place in `assets/icon.png`
- [ ] Create adaptive icon (1024x1024) and place in `assets/adaptive-icon.png`
- [ ] Build production AAB: `eas build --platform android --profile production`
- [ ] Test the AAB on a physical device
- [ ] Create Play Store listing
- [ ] Submit: `eas submit --platform android`

### iOS App Store

- [ ] Update `app.json` with correct bundle identifier
- [ ] Set build number in `app.json` (ios.buildNumber)
- [ ] Create app icon (1024x1024) and place in `assets/icon.png`
- [ ] Configure App Store Connect
- [ ] Build production IPA: `eas build --platform ios --profile production`
- [ ] Test the IPA on a physical device
- [ ] Submit: `eas submit --platform ios`

## Demo Accounts

Use the same demo accounts as the web application:

- **Admin**: `admin@example.com` / `AdminPass123!`
- **Officer**: `officer@example.com` / `OfficerPass123!`
- **Citizen**: `citizen@example.com` / `CitizenPass123!`

## Support

For issues or questions, please refer to the main project README or create an issue in the repository.

## License

Same as the main project.

