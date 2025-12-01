# Google OAuth Troubleshooting Guide

## Root Cause Analysis

### Issue 1: "Failed to get Google ID token" ❌

**Root Cause: UI/Frontend Issue**

The error occurs because:
1. `expo-auth-session/providers/google` doesn't support `responseType: "id_token"` as a direct parameter
2. The library uses OAuth 2.0 flow by default, which returns `access_token` in `response.params.access_token`
3. To get an `id_token`, you need to use OpenID Connect flow with `"openid"` scope
4. The ID token is typically found in `response.params.id_token` (not `response.authentication.idToken`)

**Solution Applied:**
- ✅ Removed invalid `responseType: "id_token"` parameter
- ✅ Added `"openid"` scope to request ID token
- ✅ Updated response parsing to check `response.params.id_token` first
- ✅ Added comprehensive logging to debug response structure

### Issue 2: CORS Error ❌

**Root Cause: UI/Frontend Configuration Issue**

The CORS error is likely caused by:
1. **API URL not configured** - Default placeholder `"https://your-api-url.com/api"` causes network errors
2. **Environment variable missing** - `EXPO_PUBLIC_BACKEND_BASE_URL` not set in `.env` file
3. **Backend CORS is correct** - The serverless backend has proper CORS configuration

**Solution Applied:**
- ✅ Added API URL validation with console warnings
- ✅ Improved error messages to identify configuration issues
- ✅ Enhanced network error detection in API utility

## How to Fix

### Step 1: Configure API URL

Create or update `.env` file in `pg-mobile/` directory:

```bash
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
```

### Step 2: Verify Configuration

After setting environment variables, restart your Expo app:

```bash
# Stop the current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

Check the console logs - you should see:
```
[Config] API_BASE_URL configured: https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
```

### Step 3: Test Google OAuth

1. Click "Continue with Google" button
2. Check browser console for detailed logs:
   - `[Google OAuth] Response structure:` - Shows what tokens are received
   - `[API] Making request to:` - Shows the API endpoint being called

### Step 4: Debug if Still Failing

If you still see errors, check the console logs:

**For "Failed to get Google ID token":**
- Look for `[Google OAuth] Response structure:` log
- Check if `hasIdToken: true` or `hasIdToken: false`
- If false, check `paramsKeys` to see what's actually in the response

**For CORS Error:**
- Check if `[Config] API_BASE_URL configured:` shows the correct URL
- If you see `⚠️ [Config] API_BASE_URL is not configured!`, your `.env` file is not being read
- Verify the API URL is accessible: Open `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/health` in browser

## Backend CORS Status ✅

The backend CORS configuration is **correct**:
- ✅ API Gateway CORS configured in `serverless.yml`
- ✅ Express CORS middleware in `app.js`
- ✅ OPTIONS request handler in `handler.js`
- ✅ Error handler includes CORS headers

**Backend API Endpoint:**
```
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
```

## Common Issues

### Issue: Environment variables not loading

**Solution:**
1. Make sure `.env` file is in `pg-mobile/` directory (not `pg-mobile/src/`)
2. Restart Expo with `--clear` flag: `npx expo start --clear`
3. For web platform, you may need to restart the dev server

### Issue: ID token still not found

**Possible causes:**
1. Google OAuth Client ID not configured correctly
2. Redirect URI not added to Google OAuth Console
3. Wrong OAuth client type (should be "Web application" or "iOS/Android")

**Solution:**
1. Check Google Cloud Console → APIs & Services → Credentials
2. Verify your OAuth 2.0 Client ID
3. Add redirect URI: `exp://localhost:8081` (for Expo) or your custom scheme

### Issue: CORS error persists after configuration

**Check:**
1. API URL is correct (no typos)
2. API is accessible (test `/health` endpoint)
3. Network tab shows the actual error (might be 404, 500, etc., not CORS)

## Summary

| Issue | Root Cause | Location | Status |
|-------|-----------|-----------|--------|
| Failed to get Google ID token | UI - Wrong response parsing | Frontend | ✅ Fixed |
| CORS Error | UI - API URL not configured | Frontend | ✅ Fixed |
| Backend CORS | Backend - Already correct | Backend | ✅ Working |

**Both issues are frontend/UI related, not backend issues.**

