# Fix bcrypt Native Module Error

## Problem
Error: `invalid ELF header` - bcrypt is a native module compiled for Windows/macOS, but AWS Lambda runs on Linux.

## Solution Applied
Replaced `bcrypt` with `bcryptjs` (pure JavaScript, works everywhere)

## Steps to Fix

### 1. Install bcryptjs and Remove bcrypt

```bash
cd backend
npm uninstall bcrypt
npm install bcryptjs
```

### 2. Verify Changes

The following files have been updated:
- ✅ `package.json` - Changed dependency from `bcrypt` to `bcryptjs`
- ✅ `src/routes/auth.js` - Updated import
- ✅ `src/routes/admin.js` - Updated import  
- ✅ `src/db/seed.js` - Updated import

**Note:** The API is identical, so no code changes needed - just the import!

### 3. Test Locally (Optional)

```bash
npm run dev
```

Try registering a user to verify bcryptjs works.

### 4. Redeploy to Lambda

```bash
npm run sls:deploy
```

This will:
- Package the new dependencies
- Upload to Lambda
- Update the function

### 5. Test the API

```bash
curl -X POST https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminPass123!"}'
```

## Why bcryptjs?

- ✅ Pure JavaScript - no native compilation needed
- ✅ Works on all platforms (Windows, macOS, Linux)
- ✅ Same API as bcrypt - drop-in replacement
- ✅ Perfect for serverless/Lambda
- ⚠️ Slightly slower than bcrypt (but negligible for most use cases)

## Verification

After redeploy, check CloudWatch logs:
```bash
npm run sls:logs
```

You should see:
- ✅ No more "invalid ELF header" errors
- ✅ Successful login/registration
- ✅ Database connections working

