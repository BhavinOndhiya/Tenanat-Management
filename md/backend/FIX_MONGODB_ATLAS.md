# Fix MongoDB Atlas Network Access for AWS Lambda

## Problem
"Internal Server Error" when calling the serverless API - likely because MongoDB Atlas is blocking connections from AWS Lambda.

## Solution: Whitelist All IPs in MongoDB Atlas

Since AWS Lambda functions have **dynamic IP addresses** that change frequently, you need to allow connections from anywhere.

### Step 1: Go to MongoDB Atlas

1. Login to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your project/cluster

### Step 2: Configure Network Access

1. Click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"** button
3. Click **"Allow Access from Anywhere"** button
   - This will add `0.0.0.0/0` to the whitelist
4. Click **"Confirm"**

**Important:** `0.0.0.0/0` means "allow from anywhere" - this is safe if:
- Your database user has a strong password
- You're using authentication
- You're not exposing the database directly to the internet (only through your API)

### Step 3: Verify Your Database User

1. Go to **"Database Access"** in MongoDB Atlas
2. Make sure your database user exists and has proper permissions
3. Note the username and password (you'll need them for DATABASE_URL)

### Step 4: Update Environment Variables

Make sure your `.env` file in the `backend/` directory has the correct MongoDB Atlas connection string:

```env
DATABASE_URL=mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
```

**Format:**
- `username` - Your MongoDB Atlas database user
- `password` - Your MongoDB Atlas database password (URL-encoded if it has special characters)
- `cluster-name` - Your cluster name (e.g., `cluster0.abc123`)
- `database-name` - Your database name (e.g., `first-project`)

### Step 5: Update Lambda Environment Variables

After updating MongoDB Atlas network access, you need to ensure your Lambda function has the correct DATABASE_URL:

1. **Option A: Update via Serverless (Recommended)**
   - Make sure your `.env` file has the correct `DATABASE_URL`
   - Redeploy: `npm run sls:deploy`
   - This will update the Lambda environment variables

2. **Option B: Update via AWS Console**
   - Go to AWS Lambda Console
   - Find your function: `complaint-management-api-dev-api`
   - Go to Configuration → Environment variables
   - Update `DATABASE_URL` with your MongoDB Atlas connection string

### Step 6: Test Again

After whitelisting IPs and updating environment variables:

1. **Redeploy (if you updated .env):**
   ```bash
   cd backend
   npm run sls:deploy
   ```

2. **Test the API:**
   ```bash
   curl -X POST https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"AdminPass123!"}'
   ```

## Alternative: Whitelist Specific AWS IP Ranges (More Secure)

If you want to be more restrictive (but requires maintenance):

1. Go to MongoDB Atlas → Network Access
2. Add these AWS IP ranges (you'll need to update periodically):
   - Search for "AWS IP ranges" online
   - Add the ranges for your Lambda region (us-east-1)

**Note:** This is more complex and requires regular updates. For most use cases, `0.0.0.0/0` with strong authentication is sufficient.

## Verify Connection

To verify MongoDB Atlas is accessible:

1. Check CloudWatch logs:
   ```bash
   cd backend
   npm run sls:logs
   ```

2. Look for:
   - ✅ `MongoDB Connected: cluster0.xxx.mongodb.net` (success)
   - ❌ `MongoDB connection error` (still blocked)

## Common Issues

### Issue: Still getting connection errors after whitelisting

**Solutions:**
1. Wait 1-2 minutes for MongoDB Atlas network changes to propagate
2. Verify DATABASE_URL is correct (check username, password, cluster name)
3. Make sure password is URL-encoded if it has special characters
4. Check CloudWatch logs for specific error messages

### Issue: Password has special characters

**Solution:** URL-encode the password in the connection string:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- etc.

Or use MongoDB Atlas connection string builder (it handles encoding automatically).

## Security Best Practices

1. ✅ Use strong database passwords
2. ✅ Enable MongoDB Atlas authentication
3. ✅ Use connection string with authentication
4. ✅ Regularly rotate passwords
5. ✅ Monitor database access logs
6. ✅ Use MongoDB Atlas IP whitelist for additional security (if needed)

## Quick Checklist

- [ ] MongoDB Atlas Network Access allows `0.0.0.0/0`
- [ ] Database user exists with correct permissions
- [ ] `.env` file has correct `DATABASE_URL` with MongoDB Atlas connection string
- [ ] Lambda environment variables updated (via redeploy or AWS Console)
- [ ] Tested connection and verified in CloudWatch logs

