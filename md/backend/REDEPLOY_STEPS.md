# Step-by-Step Redeploy Guide

## Why Redeploy?
We fixed the bcrypt error by replacing it with bcryptjs. Now we need to upload the changes to AWS Lambda.

## Quick Deploy (3 Steps)

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Deploy to AWS Lambda
```bash
npm run sls:deploy
```

**What happens:**
- Packages your code and dependencies
- Uploads to AWS Lambda
- Updates the function
- Takes 30-60 seconds

**You'll see output like:**
```
Deploying complaint-management-api to stage dev (us-east-1)
...
endpoints:
  ANY - https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/{proxy+}
  ANY - https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/
```

### Step 3: Test the API
```bash
curl -X POST https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"AdminPass123!\"}"
```

**Expected response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Society Admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

## Troubleshooting

### If deployment fails:
1. Check AWS credentials: `aws configure list`
2. Verify you're in the `backend` directory
3. Check for errors in the deployment output

### If API still returns errors:
1. Check CloudWatch logs: `npm run sls:logs`
2. Verify MongoDB Atlas is accessible (0.0.0.0/0 whitelisted)
3. Verify DATABASE_URL is correct in `.env` file

## What Changed in This Deployment

✅ Replaced `bcrypt` with `bcryptjs` (fixes Linux compatibility)
✅ Updated CORS configuration (fixes browser CORS errors)
✅ Enhanced OPTIONS handler (fixes preflight requests)

## After Successful Deployment

1. ✅ API should work from mobile app
2. ✅ Login should work
3. ✅ No more "invalid ELF header" errors
4. ✅ No more CORS errors

## Need Help?

If deployment fails, check:
- `backend/FIX_BCRYPT_ERROR.md` - bcrypt fix details
- `backend/FIX_MONGODB_ATLAS.md` - Database connection help
- CloudWatch logs for specific errors

