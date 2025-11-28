# Serverless Deployment Guide

This guide will help you deploy your backend API to AWS Lambda using the Serverless Framework, making it accessible from anywhere including your mobile application.

## Prerequisites

1. **AWS Account**: Sign up at [aws.amazon.com](https://aws.amazon.com)
2. **AWS CLI**: Install from [aws.amazon.com/cli](https://aws.amazon.com/cli)
3. **Node.js**: Version 18.x or higher
4. **Serverless Framework**: Will be installed via npm

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `serverless-http`: Wraps Express app for Lambda
- `serverless`: Serverless Framework CLI
- `serverless-offline`: For local testing
- `serverless-dotenv-plugin`: For environment variables

## Step 2: Configure AWS Credentials

### Option A: AWS CLI Configuration (Recommended)

```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Get from AWS IAM Console
- **AWS Secret Access Key**: Get from AWS IAM Console
- **Default region**: e.g., `us-east-1`, `ap-south-1`
- **Default output format**: `json`

### Option B: Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### Creating IAM User with Required Permissions

1. Go to AWS IAM Console
2. Create a new user (e.g., `serverless-deploy`)
3. Attach policy: `AdministratorAccess` (for full deployment) OR create custom policy with:
   - Lambda permissions
   - API Gateway permissions
   - CloudFormation permissions
   - CloudWatch Logs permissions
   - IAM permissions (for role creation)

## Step 3: Configure Environment Variables

Create a `.env` file in the `backend` directory (copy from `env.example`):

```bash
cp env.example .env
```

Update `.env` with your production values:

```env
PORT=3000
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_CURRENCY=INR
```

**Important**: 
- Use MongoDB Atlas (cloud MongoDB) for production
- Never commit `.env` file to git
- Use strong, unique secrets

## Step 4: Deploy to AWS Lambda

### Deploy to Development Stage

```bash
npm run sls:deploy
```

### Deploy to Production Stage

```bash
npm run sls:deploy:prod
```

### First Deployment

The first deployment will:
1. Create a Lambda function
2. Create an API Gateway
3. Set up CloudWatch Logs
4. Configure IAM roles
5. Take 2-5 minutes

### Subsequent Deployments

Updates are faster (30-60 seconds) as only changed resources are updated.

## Step 5: Get Your API Endpoint

After deployment, you'll see output like:

```
endpoints:
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/{proxy+}
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/
```

**Copy this URL** - this is your API base URL!

## Step 6: Update Mobile App Configuration

Update your mobile app's API configuration:

### For React Native / Expo

In `src/utils/api.js` or similar:

```javascript
// Development
const API_BASE_URL = 'http://localhost:3000/api';

// Production (Serverless)
const API_BASE_URL = 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/api';
```

### Environment-based Configuration

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/api';
```

## Step 7: Test Your Deployment

### Health Check

```bash
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/health
```

### Test API Endpoint

```bash
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Local Testing with Serverless Offline

Test your serverless setup locally before deploying:

```bash
npm run sls:offline
```

This starts a local server at `http://localhost:3000` that mimics AWS Lambda.

## Monitoring and Logs

### View Logs

```bash
npm run sls:logs
```

### View in AWS Console

1. Go to AWS CloudWatch Console
2. Navigate to Log Groups
3. Find `/aws/lambda/complaint-management-api-dev-api`

## Cost Estimation

AWS Lambda pricing (as of 2024):
- **Free Tier**: 1M requests/month, 400,000 GB-seconds
- **After Free Tier**: 
  - $0.20 per 1M requests
  - $0.0000166667 per GB-second

For a typical app with 100K requests/month:
- **Estimated Cost**: $0-5/month (likely free tier)

## Custom Domain Setup (Optional)

### Using AWS API Gateway Custom Domain

1. Go to API Gateway → Custom Domain Names
2. Add your domain (e.g., `api.yourdomain.com`)
3. Configure SSL certificate (AWS Certificate Manager)
4. Update DNS records
5. Update `serverless.yml` with domain configuration

### Using Cloudflare / Other CDN

Point your domain to the API Gateway URL via CNAME.

## Environment-Specific Deployments

### Development

```bash
serverless deploy --stage dev
```

### Staging

```bash
serverless deploy --stage staging
```

### Production

```bash
serverless deploy --stage prod
```

Each stage creates separate:
- Lambda functions
- API Gateways
- CloudWatch Logs

## Troubleshooting

### Issue: "Access Denied" during deployment

**Solution**: Check AWS credentials and IAM permissions

### Issue: "Timeout" errors

**Solution**: Increase timeout in `serverless.yml`:
```yaml
provider:
  timeout: 60  # Increase from 30 to 60 seconds
```

### Issue: Database connection errors

**Solution**: 
- Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0) or whitelist AWS Lambda IPs
- Check DATABASE_URL in environment variables

### Issue: Cold start delays

**Solution**: 
- Use provisioned concurrency (adds cost)
- Optimize Lambda package size
- Use connection pooling (already implemented)

### Issue: CORS errors in mobile app

**Solution**: CORS is already configured in `serverless.yml`. If issues persist:
1. Check allowed origins
2. Verify mobile app is sending correct headers

## Removing Deployment

To completely remove the serverless deployment:

```bash
npm run sls:remove
```

This deletes:
- Lambda function
- API Gateway
- CloudWatch Logs
- IAM roles (if created by Serverless)

## Additional Resources

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [MongoDB Atlas Setup](https://www.mongodb.com/cloud/atlas)

## Support

For issues specific to this deployment:
1. Check CloudWatch Logs
2. Review `serverless.yml` configuration
3. Verify environment variables
4. Test locally with `sls:offline`

