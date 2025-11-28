# Accessing the Mobile App in Browser

## Current Status

The app is running on: **http://localhost:8082**

## Steps to View

1. **Open your web browser** (Chrome, Firefox, Edge, etc.)

2. **Navigate to**: `http://localhost:8082`

3. You should see the **Login screen** of the mobile app

## If You See a Blank Screen

1. **Open Browser Developer Tools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Go to the **Console** tab
   - Look for any red error messages

2. **Check the Network tab**:
   - See if API calls are failing
   - Make sure your backend is running on `http://localhost:3000`

3. **Common Issues**:
   - **Backend not running**: Start your backend server first
   - **CORS errors**: The backend needs to allow requests from `http://localhost:8082`
   - **API connection**: Check `src/utils/api.js` - API_BASE_URL should be `http://localhost:3000/api`

## Quick Test

1. Make sure backend is running: `cd backend && npm run dev`
2. Open browser to: `http://localhost:8082`
3. You should see the login form
4. Try logging in with demo credentials:
   - Email: `citizen@example.com`
   - Password: `CitizenPass123!`

## Alternative: Use Expo Go on Phone

If web version has issues, you can use Expo Go app:
1. Install **Expo Go** from Play Store (Android) or App Store (iOS)
2. Scan the QR code shown in the terminal
3. The app will load on your phone

