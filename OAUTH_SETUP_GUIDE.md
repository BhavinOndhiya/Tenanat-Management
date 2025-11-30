# OAuth Setup Guide (Google & Facebook)

This guide will help you set up Google and Facebook OAuth login for your application.

## Prerequisites

- Backend server running
- Frontend application running
- Access to Google Cloud Console
- Access to Facebook Developers Console

## Step 1: Google OAuth Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and click "Enable"

### 1.2 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen (if not done):
   - User Type: External
   - App name: Your App Name
   - User support email: Your email
   - Developer contact: Your email
4. Create OAuth client:
   - Application type: **Web application**
   - Name: Your App Name
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
5. Copy the **Client ID** and **Client Secret**

### 1.3 Add to Environment Variables

**Backend** (`backend/.env`):
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Frontend** (`frontend/.env` or `frontend/.env.local`):
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Step 2: Facebook OAuth Setup

### 2.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" > "Create App"
3. Choose "Consumer" as app type
4. Fill in app details:
   - App Name: Your App Name
   - App Contact Email: Your email
5. Click "Create App"

### 2.2 Configure Facebook Login

1. In your app dashboard, go to "Products" > "Facebook Login" > "Set Up"
2. Choose "Web" platform
3. Configure settings:
   - Site URL: `http://localhost:5173` (for development)
   - Valid OAuth Redirect URIs:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
4. Go to "Settings" > "Basic":
   - Copy **App ID** and **App Secret**

### 2.3 Add to Environment Variables

**Backend** (`backend/.env`):
```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

**Frontend** (`frontend/.env` or `frontend/.env.local`):
```env
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

## Step 3: Install Dependencies (Optional)

The current implementation uses direct OAuth API calls, so no additional packages are needed. However, if you want to use Passport.js instead, you can install:

```bash
cd backend
npm install passport passport-google-oauth20 passport-facebook
```

## Step 4: Test OAuth Login

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to the login page
4. Click "Continue with Google" or "Continue with Facebook"
5. Authorize the application
6. You should be redirected back and logged in

## Troubleshooting

### Google OAuth Issues

- **"Invalid client"**: Check that your Client ID is correct
- **"Redirect URI mismatch"**: Ensure the redirect URI in Google Console matches your frontend URL
- **"Access blocked"**: Make sure OAuth consent screen is configured and published

### Facebook OAuth Issues

- **"Invalid App ID"**: Verify your App ID in environment variables
- **"Redirect URI mismatch"**: Check Valid OAuth Redirect URIs in Facebook App settings
- **"App not live"**: For testing, add test users in Facebook App settings > Roles > Test Users

### General Issues

- **SDK not loading**: Check browser console for script loading errors
- **CORS errors**: Ensure backend CORS is configured to allow your frontend origin
- **Token verification fails**: Check that environment variables are set correctly

## Production Deployment

1. Update OAuth redirect URIs to your production domain
2. Update environment variables in your hosting platform
3. Ensure HTTPS is enabled (required for OAuth)
4. Test OAuth flow in production

## Security Notes

- Never commit `.env` files to version control
- Use environment variables for all OAuth credentials
- Enable HTTPS in production
- Regularly rotate OAuth secrets
- Monitor OAuth usage for suspicious activity

