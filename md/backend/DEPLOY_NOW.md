# Deploy with Updated DATABASE_URL

## Your MongoDB Atlas Connection String
✅ `mongodb+srv://bhavinondhiya0:demo12345@cluster0.iv7kyld.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0`

## Step-by-Step Deployment

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Deploy to AWS Lambda
```bash
npm run sls:deploy
```

**What happens:**
- Serverless Framework reads your `.env` file
- Updates Lambda environment variables with your MongoDB Atlas URL
- Packages and uploads your code
- Takes 30-60 seconds

**You'll see output like:**
```
Deploying complaint-management-api to stage dev (us-east-1)
...
endpoints:
  ANY - https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/{proxy+}
```

### Step 3: Wait for Deployment
Wait until you see "Service deployed" or the endpoint URLs.

### Step 4: Test the API
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

### Step 5: Test from Mobile App
After successful deployment, try logging in from your mobile app!

## Verify Deployment

Check CloudWatch logs to see if database connected:
```bash
cd backend
npm run sls:logs
```

Look for:
- ✅ `MongoDB Connected: cluster0.iv7kyld.mongodb.net`
- ❌ No more `ECONNREFUSED 127.0.0.1:27017` errors

## If Deployment Fails

1. **Check AWS credentials:**
   ```bash
   aws configure list
   ```

2. **Verify you're in the backend directory:**
   ```bash
   pwd
   # Should show: .../first-project/backend
   ```

3. **Check for errors in deployment output**

## After Successful Deployment

✅ Lambda will use MongoDB Atlas (not localhost)
✅ Login should work
✅ All API endpoints should work
✅ Mobile app can connect successfully

