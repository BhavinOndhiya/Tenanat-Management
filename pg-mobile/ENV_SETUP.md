# Environment Variables Setup

This document lists all environment variables used in the mobile app, matching the web frontend.

## Environment Variables

All environment variables from the web frontend are integrated. Create a `.env` file in the `pg-mobile/` directory with the following:

```bash
# Backend API Base URL (required)
# Mirrors: VITE_BACKEND_BASE_URL from web frontend
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-api-url.com/api

# Razorpay Key ID (required for payments)
# Mirrors: VITE_RAZORPAY_KEY_ID from web frontend
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

# Google OAuth Client ID (optional, for Google Sign-In)
# Mirrors: VITE_GOOGLE_CLIENT_ID from web frontend
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Facebook App ID (optional, for Facebook Sign-In)
# Mirrors: VITE_FACEBOOK_APP_ID from web frontend
EXPO_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
```

## Usage in Code

All environment variables are accessed through the config file:

```javascript
import { config } from '../utils/config';

// Use in your code
const apiUrl = config.API_BASE_URL;
const razorpayKey = config.RAZORPAY_KEY_ID;
const googleClientId = config.GOOGLE_CLIENT_ID;
const facebookAppId = config.FACEBOOK_APP_ID;
```

## Web Frontend Mapping

| Web Frontend (Vite) | Mobile App (Expo) | Purpose |
|---------------------|-------------------|---------|
| `VITE_BACKEND_BASE_URL` | `EXPO_PUBLIC_BACKEND_BASE_URL` | Backend API URL |
| `VITE_RAZORPAY_KEY_ID` | `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay payment key |
| `VITE_GOOGLE_CLIENT_ID` | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth |
| `VITE_FACEBOOK_APP_ID` | `EXPO_PUBLIC_FACEBOOK_APP_ID` | Facebook OAuth |

## Notes

- Expo requires the `EXPO_PUBLIC_` prefix (similar to Vite's `VITE_` prefix)
- All variables are accessible via `process.env.EXPO_PUBLIC_*` or through `src/utils/config.js`
- The config file provides a centralized way to access all environment variables
- Default values are provided where appropriate (e.g., empty string for optional OAuth variables)

