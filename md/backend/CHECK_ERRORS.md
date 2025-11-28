# Check Lambda Error Logs

## Quick Commands

### View Recent Logs
```bash
cd backend
npm run sls:logs
```

### View Logs with Tail (Live Updates)
```bash
cd backend
serverless logs -f api -t --tail
```

### View Specific Number of Log Lines
```bash
cd backend
serverless logs -f api --tail 50
```

## Alternative: AWS Console

1. Go to [AWS CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Click "Log groups" in left sidebar
3. Find: `/aws/lambda/complaint-management-api-dev-api`
4. Click on it
5. Click on the latest log stream
6. Look for error messages (red text)

## What to Look For

Common errors you might see:

### Database Connection Errors
- `MongoServerError: Authentication failed`
- `MongoServerError: bad auth`
- `MongoNetworkError: connection timeout`
- `MongoServerSelectionError`

### Environment Variable Errors
- `DATABASE_URL is not defined`
- `Cannot read property of undefined`

### Code Errors
- `TypeError: ...`
- `ReferenceError: ...`
- Stack traces pointing to specific files

## After Finding the Error

Once you see the actual error message, we can fix it. Common fixes:

1. **Authentication failed** → Wrong username/password in DATABASE_URL
2. **Connection timeout** → Network issue or wrong cluster URL
3. **Database not found** → Wrong database name in connection string
4. **Code error** → Need to fix the code

