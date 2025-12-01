# Google OAuth Fix - ID Token Issue

## Problem Identified

The error "Failed to get Google ID token" occurs because:

1. **On Web Platform**: `expo-auth-session/providers/google` uses OAuth 2.0 authorization code flow, which returns `access_token` but **not** `id_token` in the response object.

2. **Root Cause**: The `expo-auth-session` library doesn't properly extract `id_token` from the OAuth response URL fragment, even though it might be present in the URL.

3. **Solution**: Use **Google Identity Services** for web platform (which directly returns ID tokens) and keep `expo-auth-session` for native platforms.

## Changes Made

### 1. Platform-Specific OAuth Implementation

- **Web**: Now uses Google Identity Services (`window.google.accounts.id`) - same as the web app
- **Native (iOS/Android)**: Uses `expo-auth-session` with improved ID token extraction

### 2. Enhanced ID Token Extraction

Added multiple fallback methods to extract ID token:
- Check `response.authentication.idToken`
- Check `response.params.id_token`
- Parse URL fragment manually
- Parse `rawResponse` if available

### 3. Better Error Logging

Added detailed logging to help debug:
- Response structure
- Available keys
- Token presence/absence
- Platform-specific information

## Testing

### For Web Platform:
1. Click "Continue with Google"
2. Should see Google Sign-In popup (Google Identity Services)
3. After authentication, ID token should be received directly
4. Check console for: `[Google OAuth] ID token found, proceeding with login`

### For Native Platform:
1. Click "Continue with Google"
2. Should open Google OAuth in browser/WebView
3. After authentication, ID token should be extracted from response
4. Check console logs for response structure

## If Still Not Working

### Check 1: Google OAuth Client Configuration
In Google Cloud Console, ensure your OAuth 2.0 Client:
- Has the correct redirect URIs:
  - Web: `http://localhost:8081/auth/callback/google` (for development)
  - Native: Your app's custom scheme (e.g., `pgmobile://auth/callback/google`)

### Check 2: Environment Variables
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
```

### Check 3: Console Logs
Look for these logs:
- `[Google OAuth] Response structure:` - Shows what tokens are received
- `[Google OAuth] ID token found` - Success
- `[Google OAuth] ID token not found` - Failure (check the detailed response)

### Check 4: CORS Error
If you still see CORS errors:
1. Verify `EXPO_PUBLIC_BACKEND_BASE_URL` is set correctly
2. Check that the API endpoint is accessible
3. Test the API directly: `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/health`

## Expected Behavior

### Web:
- Uses Google Identity Services
- Gets ID token directly from `googleResponse.credential`
- No need to parse URL fragments

### Native:
- Uses expo-auth-session
- Extracts ID token from response (multiple fallback methods)
- Works on iOS and Android

## Notes

- The `Cross-Origin-Opener-Policy` warnings are harmless - they're related to popup window security
- The `props.pointerEvents` deprecation warning is from a dependency, not our code
- Both can be ignored for now


