# Fix CORS Issue - Redeploy Instructions

## Problem
CORS error when accessing serverless API from localhost:8082 (React Native Web)

## Solution Applied
Updated CORS configuration in:
1. `backend/src/app.js` - Enhanced Express CORS middleware
2. `backend/serverless.yml` - Updated API Gateway CORS settings

## Steps to Fix

### 1. Redeploy Backend to Serverless

```bash
cd backend
npm run sls:deploy
```

This will update the Lambda function and API Gateway with the new CORS configuration.

### 2. Wait for Deployment
Deployment takes 30-60 seconds. You'll see output like:
```
endpoints:
  ANY - https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/{proxy+}
```

### 3. Test Again
After deployment, try logging in again from your mobile app.

## What Changed

### Express CORS (app.js)
- Added explicit CORS configuration
- Added OPTIONS handler for preflight requests
- Allows all origins, methods, and headers

### API Gateway CORS (serverless.yml)
- Added `Accept` and `Origin` headers
- Added `maxAge` for preflight caching
- OPTIONS method already included

## Alternative: Test with Local Backend

If you want to test locally while fixing serverless CORS:

1. Update `frontend-mobile-app/frontend-app/src/config/api.js`:
   ```javascript
   const USE_SERVERLESS = false;
   ```

2. Start local backend:
   ```bash
   cd backend
   npm run dev
   ```

3. Test login - should work with localhost

## Verify CORS is Working

After redeploy, check the Network tab:
- OPTIONS request should return 200 OK
- Response headers should include:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, ...`

## If Still Not Working

1. Check CloudWatch logs:
   ```bash
   npm run sls:logs
   ```

2. Verify API Gateway CORS in AWS Console:
   - Go to API Gateway → Your API → CORS
   - Ensure settings match serverless.yml

3. Try clearing browser cache and hard refresh

