# Fix: Environment Variables Error

## Problem
You're getting this error:
```
Cannot resolve variable at "provider.environment.DATABASE_URL": Value not found at "env" source
```

## Solution Applied

I've updated `serverless.yml` to:
1. ✅ Add default values for all environment variables (so deployment works even without .env)
2. ✅ Simplified the dotenv plugin configuration
3. ✅ Made the plugin load the .env file automatically

## Steps to Fix

### Option 1: Create .env File (Recommended)

1. **Create the .env file:**
   ```bash
   cd backend
   copy env.example .env
   ```

   Or on PowerShell:
   ```powershell
   cd backend
   Copy-Item env.example .env
   ```

2. **Edit .env with your actual values:**
   - `DATABASE_URL`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong random secret
   - `RAZORPAY_*`: Your Razorpay credentials

3. **Deploy:**
   ```bash
   npm run sls:deploy
   ```

### Option 2: Use Default Values (For Testing)

The serverless.yml now has default values, so you can deploy without .env file for testing. **But update them before production!**

## Verify .env File Exists

Check if .env exists:
```powershell
cd backend
Test-Path .env
```

If it returns `False`, create it:
```powershell
Copy-Item env.example .env
```

## Important Notes

- ⚠️ **Never commit .env file to git** (it's in .gitignore)
- ⚠️ **Update default values in serverless.yml** before production deployment
- ✅ The default values in serverless.yml are just placeholders for testing

## Next Steps

1. Create `.env` file from `env.example`
2. Update values in `.env` with your actual credentials
3. Run `npm run sls:deploy` again

The deployment should work now! 🚀

