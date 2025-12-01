# Troubleshooting Connection Issues

## "Connection failed" Error

This error usually means the app can't reach the backend API. Here's how to fix it:

### 1. Verify Backend URL

The backend is deployed on AWS Lambda. Make sure your `.env` file has the correct deployed URL:

```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
```

**Note:** No need to run backend locally - it's already deployed and running in production.

### 2. Check Internet Connection

The app needs internet to reach the deployed backend:

- Make sure your computer has internet access
- The Android emulator uses your computer's internet connection
- Check if you can access: `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/health`

### 3. Update .env File

Edit `pg-mobile/.env`:

```env
# Deployed Backend (Production)
EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RkLNW87l37yj42
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1089518665100-m4iovkq2s3anphgnphf51sq1t62oq7t4.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=
```

### 4. Restart Expo After Changing .env

After updating `.env`, you MUST restart Expo:

```bash
# Stop the current Expo process (Ctrl+C)
# Then restart:
npm start -- --clear
```

### 5. Check Backend CORS Settings

Make sure your backend allows requests from the emulator. Check `backend/serverless.yml` - CORS should allow all origins (`"*"`).

### 6. Test Backend Connection

Test if the deployed backend is accessible:

```bash
# From your computer, test the deployed backend
curl https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/health

# Or open in browser:
# https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/health
```

Should return: `{"status":"ok"}` or similar response.

### 7. Check Firewall

Windows Firewall might be blocking the connection:

1. Open Windows Defender Firewall
2. Allow Node.js through firewall
3. Or temporarily disable firewall for testing

### 8. Use Tunnel (Alternative)

If local network doesn't work, use Expo's tunnel:

```bash
npm start -- --tunnel
```

This creates a public URL that works from anywhere.

## Quick Fix Checklist

- [ ] `.env` file exists in `pg-mobile/` directory
- [ ] `.env` has deployed backend URL (`https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`)
- [ ] Internet connection is active
- [ ] Restarted Expo after changing `.env`
- [ ] Cleared Expo cache: `npm start -- --clear`
- [ ] Tested backend URL in browser/curl (should return response)
- [ ] No VPN blocking AWS endpoints

## Common Issues

### Issue: "Network request failed"
**Solution:** 
- Check `.env` file has correct deployed URL
- Verify internet connection
- Check if VPN is blocking AWS endpoints

### Issue: "Connection timeout"
**Solution:** 
- Check internet connection
- Verify backend URL is correct: `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`
- Test backend in browser first

### Issue: "CORS error"
**Solution:** Backend CORS is configured to allow all origins. If you see this, check backend deployment.

### Issue: Works on web but not emulator
**Solution:** 
- Emulator uses your computer's internet connection
- Make sure no firewall is blocking
- Try restarting emulator

## Still Having Issues?

1. Check Expo logs for detailed error messages
2. Check backend logs for incoming requests
3. Try using tunnel mode: `npm start -- --tunnel`
4. Test with a simple API call first (like health check)

