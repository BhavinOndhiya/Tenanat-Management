# Mobile App Configuration Guide

After deploying your backend to serverless, update your mobile app to use the new API endpoint.

## Step 1: Deploy Backend

First, deploy your backend using the serverless deployment guide. After deployment, you'll receive an API URL like:

```
https://abc123xyz.execute-api.us-east-1.amazonaws.com
```

## Step 2: Update Mobile App API Configuration

### For React Native Mobile App

Edit `frontend-mobile-app/frontend-app/src/utils/api.js`:

**Before:**
```javascript
const API_BASE_URL = __DEV__
  ? "http://localhost:3000/api"
  : "https://your-production-api.com/api";
```

**After (Replace with your actual serverless URL):**
```javascript
const API_BASE_URL = __DEV__
  ? "http://localhost:3000/api"  // Local development
  : "https://abc123xyz.execute-api.us-east-1.amazonaws.com/api";  // Serverless production
```

### Environment-Based Configuration (Recommended)

For better management, use environment variables:

1. Create `frontend-mobile-app/frontend-app/.env`:
```env
API_BASE_URL_DEV=http://localhost:3000/api
API_BASE_URL_PROD=https://abc123xyz.execute-api.us-east-1.amazonaws.com/api
```

2. Install `react-native-dotenv`:
```bash
cd frontend-mobile-app/frontend-app
npm install react-native-dotenv
```

3. Update `babel.config.js`:
```javascript
module.exports = {
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }],
  ],
};
```

4. Update `src/utils/api.js`:
```javascript
import { API_BASE_URL_DEV, API_BASE_URL_PROD } from '@env';

const API_BASE_URL = __DEV__ ? API_BASE_URL_DEV : API_BASE_URL_PROD;
```

## Step 3: Test the Connection

### Test Health Endpoint

```javascript
// In your mobile app
const testConnection = async () => {
  try {
    const response = await fetch('https://your-api-url.execute-api.us-east-1.amazonaws.com/health');
    const data = await response.json();
    console.log('API Health:', data); // Should return { status: "ok" }
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

### Test Authentication

```javascript
// Test login
const testLogin = async () => {
  try {
    const response = await api.login('test@example.com', 'password');
    console.log('Login successful:', response);
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

## Step 4: Handle CORS (Already Configured)

CORS is already configured in `serverless.yml` to allow requests from any origin. If you encounter CORS issues:

1. Check that your API URL is correct
2. Verify the request headers include `Content-Type: application/json`
3. For authentication, ensure `Authorization: Bearer <token>` header is included

## Step 5: Update Webhook URLs (If Applicable)

If you're using Razorpay webhooks, update the webhook URL in Razorpay dashboard:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Update webhook URL to:
   ```
   https://your-api-url.execute-api.us-east-1.amazonaws.com/api/webhooks/razorpay
   ```

## Troubleshooting

### Issue: "Network request failed"

**Solutions:**
- Verify the API URL is correct (no trailing slash except after `/api`)
- Check internet connection
- Ensure the serverless deployment is active
- Check AWS CloudWatch logs for errors

### Issue: "401 Unauthorized"

**Solutions:**
- Verify JWT token is being sent in Authorization header
- Check token expiration
- Ensure JWT_SECRET matches between backend and token generation

### Issue: "502 Bad Gateway"

**Solutions:**
- Check Lambda function logs in CloudWatch
- Verify database connection (MongoDB Atlas)
- Check environment variables are set correctly
- Increase Lambda timeout if requests are slow

### Issue: Slow Response Times

**Solutions:**
- First request after idle period may be slow (cold start)
- Subsequent requests should be faster
- Consider using provisioned concurrency (adds cost)
- Optimize database queries

## Testing Checklist

- [ ] Health endpoint returns `{ status: "ok" }`
- [ ] User registration works
- [ ] User login works
- [ ] JWT token is received and stored
- [ ] Authenticated requests work (e.g., get profile)
- [ ] All API endpoints function correctly
- [ ] Error handling works (401, 404, 500)
- [ ] Webhooks work (if applicable)

## Production Checklist

- [ ] API URL is hardcoded or from environment variable
- [ ] No localhost URLs in production build
- [ ] Error handling is implemented
- [ ] Loading states are shown during API calls
- [ ] Network errors are handled gracefully
- [ ] Token refresh logic is implemented (if needed)

## Support

For issues:
1. Check CloudWatch logs: `npm run sls:logs` in backend directory
2. Test API directly with curl or Postman
3. Verify mobile app is using correct API URL
4. Check network tab in React Native debugger

