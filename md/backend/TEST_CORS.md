# Test CORS Configuration

## Quick Test

Test if CORS is working by making a direct OPTIONS request:

```bash
curl -X OPTIONS https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api/auth/login \
  -H "Origin: http://localhost:8082" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

Expected response should include:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- Status: 200 OK

## Test Login Endpoint

```bash
curl -X POST https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8082" \
  -d '{"email":"admin@example.com","password":"AdminPass123!"}' \
  -v
```

## If CORS Still Fails

The API Gateway URL is correct: `https://4rig7aawdl.execute-api.us-east-1.amazonaws.com`

If CORS still fails after redeploy, try:

1. **Clear browser cache** - CORS preflight responses are cached
2. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Check CloudWatch logs** for OPTIONS request errors
4. **Verify in AWS Console** that CORS is enabled on the API Gateway

