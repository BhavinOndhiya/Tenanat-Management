# Fix DATABASE_URL in Lambda

## Problem
Error: `connect ECONNREFUSED 127.0.0.1:27017`

This means Lambda is trying to connect to **localhost MongoDB** instead of **MongoDB Atlas**.

## Root Cause
The `DATABASE_URL` environment variable in Lambda is set to the default localhost value from `serverless.yml`.

## Solution

### Option 1: Update .env and Redeploy (Recommended)

1. **Check your `.env` file** in the `backend/` directory:
   ```env
   DATABASE_URL=mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
   ```

2. **Make sure it's a MongoDB Atlas connection string**, not localhost:
   - ✅ Correct: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
   - ❌ Wrong: `mongodb://localhost:27017/first-project`

3. **Redeploy:**
   ```bash
   cd backend
   npm run sls:deploy
   ```

### Option 2: Update Lambda Environment Variable Directly

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Find your function: `complaint-management-api-dev-api`
3. Go to **Configuration** → **Environment variables**
4. Find `DATABASE_URL`
5. Update it to your MongoDB Atlas connection string:
   ```
   mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
   ```
6. Click **Save**

### Option 3: Set Environment Variable via Serverless

If you don't want to use `.env` file, you can set it directly in `serverless.yml`:

```yaml
environment:
  DATABASE_URL: mongodb+srv://username:password@cluster.mongodb.net/dbname
```

**⚠️ WARNING:** Don't commit secrets to git! Use `.env` file instead.

## Get Your MongoDB Atlas Connection String

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<dbname>` with your database name

**Format:**
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
```

## Verify Connection String

Your connection string should:
- ✅ Start with `mongodb+srv://`
- ✅ Include your username and password
- ✅ Point to your cluster (e.g., `cluster0.abc123.mongodb.net`)
- ✅ Include database name
- ✅ NOT be `mongodb://localhost:27017`

## After Fixing

1. **Redeploy** (if you updated `.env`):
   ```bash
   cd backend
   npm run sls:deploy
   ```

2. **Test:**
   ```bash
   curl -X POST https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"AdminPass123!"}'
   ```

3. **Check CloudWatch logs:**
   ```bash
   cd backend
   npm run sls:logs
   ```

   You should see:
   - ✅ `MongoDB Connected: cluster0.xxx.mongodb.net` (not localhost!)
   - ❌ No more `ECONNREFUSED 127.0.0.1:27017` errors

## Quick Checklist

- [ ] `.env` file has MongoDB Atlas connection string (not localhost)
- [ ] Connection string format is correct (`mongodb+srv://...`)
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- [ ] Database user credentials are correct
- [ ] Redeployed Lambda (or updated environment variable in AWS Console)
- [ ] Tested and verified connection works

