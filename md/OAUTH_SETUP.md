# OAuth Integration Setup Guide

## Overview
This document explains what's needed to implement OAuth (Google, GitHub) authentication in the complaint management system.

## Current Status
- ✅ Frontend UI is ready with OAuth buttons
- ⏳ Backend OAuth endpoints need to be implemented
- ⏳ OAuth provider credentials need to be configured

## What You Need to Provide

### 1. Google OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback` (for dev)
   - For production: `https://yourdomain.com/api/auth/google/callback`
5. **Copy the credentials**:
   - Client ID
   - Client Secret

### 2. GitHub OAuth Credentials

1. **Go to GitHub Settings**: https://github.com/settings/developers
2. **Click "New OAuth App"**
3. **Fill in the details**:
   - Application name: "Complaint Management System"
   - Homepage URL: `http://localhost:5173` (for dev)
   - Authorization callback URL: `http://localhost:3000/api/auth/github/callback` (for dev)
   - For production: Use your production URLs
4. **Copy the credentials**:
   - Client ID
   - Client Secret

## Backend Implementation Required

### 1. Install OAuth Packages

```bash
cd backend
npm install passport passport-google-oauth20 passport-github2
```

### 2. Environment Variables

Add to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
```

### 3. Backend Routes Needed

Create `backend/src/routes/oauth.js`:

```javascript
// GET /api/auth/google - Initiate Google OAuth
// GET /api/auth/google/callback - Google OAuth callback
// GET /api/auth/github - Initiate GitHub OAuth
// GET /api/auth/github/callback - GitHub OAuth callback
```

### 4. User Model Update

The User model should support OAuth users (users without passwordHash):

```javascript
passwordHash: {
  type: String,
  required: function() {
    return !this.oauthProvider; // Only required if not OAuth user
  }
},
oauthProvider: {
  type: String,
  enum: ['GOOGLE', 'GITHUB']
},
oauthId: String
```

## Frontend Integration

Once backend is ready, update `frontend/src/components/ui/OAuthButton.jsx`:

```javascript
const handleClick = () => {
  // Redirect to backend OAuth endpoint
  window.location.href = `/api/auth/${provider.toLowerCase()}`;
};
```

## Testing

1. Click OAuth button
2. User is redirected to provider (Google/GitHub)
3. User authorizes the app
4. Provider redirects back to callback URL
5. Backend creates/updates user and generates JWT
6. User is logged in and redirected to dashboard

## Security Considerations

- Always use HTTPS in production
- Store OAuth secrets securely (never commit to git)
- Validate OAuth tokens on backend
- Use secure session management
- Implement CSRF protection

## Next Steps

1. Provide OAuth credentials (Client ID and Secret for Google and GitHub)
2. Backend routes will be implemented
3. Frontend will be updated to connect to real OAuth endpoints
4. Test the complete flow


