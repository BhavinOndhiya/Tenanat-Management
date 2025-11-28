# Complete Serverless Deployment Flow

This document provides a step-by-step flow to deploy your backend API to AWS Lambda (serverless) so it can be accessed from anywhere, including your mobile application.

## 📋 Overview

Your Express.js backend will be deployed to AWS Lambda using the Serverless Framework. This makes your API:
- ✅ Accessible from anywhere (mobile apps, web apps, etc.)
- ✅ Auto-scaling (handles traffic automatically)
- ✅ Cost-effective (pay only for what you use)
- ✅ Highly available (AWS managed infrastructure)

## 🚀 Complete Deployment Flow

### Phase 1: Preparation (15 minutes)

#### 1.1 Install Prerequisites
```bash
# Install AWS CLI (if not installed)
# Windows: Download from https://aws.amazon.com/cli
# Mac: brew install awscli
# Linux: sudo apt-get install awscli

# Verify installation
aws --version
```

#### 1.2 Setup AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com) and create account
2. Go to IAM Console → Users → Create User
3. Attach policy: `AdministratorAccess` (or custom policy with Lambda/API Gateway permissions)
4. Create Access Key → Download credentials

#### 1.3 Configure AWS Credentials
```bash
aws configure
# Enter:
# - AWS Access Key ID: [from step 1.2]
# - AWS Secret Access Key: [from step 1.2]
# - Default region: us-east-1 (or your preferred region)
# - Default output format: json
```

#### 1.4 Setup MongoDB Atlas (Cloud Database)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
5. Get connection string (format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`)

### Phase 2: Backend Configuration (10 minutes)

#### 2.1 Install Dependencies
```bash
cd backend
npm install
```

This installs:
- `serverless-http` - Wraps Express for Lambda
- `serverless` - Deployment framework
- `serverless-offline` - Local testing
- `serverless-dotenv-plugin` - Environment variables

#### 2.2 Configure Environment Variables
```bash
# Copy example file
cp env.example .env

# Edit .env with your values:
# - DATABASE_URL: MongoDB Atlas connection string
# - JWT_SECRET: Strong random secret
# - RAZORPAY_*: Your Razorpay credentials
```

**Important:** Never commit `.env` file to git!

### Phase 3: Local Testing (5 minutes)

#### 3.1 Test Serverless Locally
```bash
npm run sls:offline
```

This starts a local server at `http://localhost:3000` that mimics AWS Lambda.

#### 3.2 Test Your API
```bash
# Health check
curl http://localhost:3000/health

# Test login (adjust credentials)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Phase 4: Deploy to AWS (5-10 minutes)

#### 4.1 Deploy to Development
```bash
npm run sls:deploy
```

**First deployment takes 2-5 minutes** - Serverless Framework creates:
- Lambda function
- API Gateway
- CloudWatch Logs
- IAM roles

#### 4.2 Get Your API URL
After deployment, you'll see output like:
```
endpoints:
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/{proxy+}
```

**Copy this URL** - this is your production API endpoint!

#### 4.3 Verify Deployment
```bash
# Test health endpoint
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/health

# Should return: {"status":"ok"}
```

### Phase 5: Update Mobile App (5 minutes)

#### 5.1 Update API Configuration
Edit `frontend-mobile-app/frontend-app/src/utils/api.js`:

```javascript
const API_BASE_URL = __DEV__
  ? "http://localhost:3000/api"  // Local
  : "https://abc123xyz.execute-api.us-east-1.amazonaws.com/api";  // Serverless
```

Replace `abc123xyz.execute-api.us-east-1.amazonaws.com` with your actual API URL.

#### 5.2 Test Mobile App Connection
1. Build and run your mobile app
2. Test login/registration
3. Verify all API calls work

### Phase 6: Production Deployment (Optional)

#### 6.1 Deploy to Production Stage
```bash
npm run sls:deploy:prod
```

This creates a separate production environment.

#### 6.2 Update Mobile App for Production
Use the production API URL in your mobile app's production build.

## 📊 Deployment Architecture

```
Mobile App
    ↓
API Gateway (AWS)
    ↓
Lambda Function (Your Express App)
    ↓
MongoDB Atlas (Cloud Database)
```

## 🔄 Update Flow (For Future Changes)

When you make changes to your backend:

1. **Test locally:**
   ```bash
   npm run sls:offline
   ```

2. **Deploy updates:**
   ```bash
   npm run sls:deploy
   ```
   (Takes 30-60 seconds for updates)

3. **Verify:**
   ```bash
   curl https://your-api-url/health
   ```

## 📝 Important Files Created

- `serverless.yml` - Serverless configuration
- `src/handler.js` - Lambda entry point
- `SERVERLESS_DEPLOYMENT.md` - Detailed documentation
- `QUICK_START_SERVERLESS.md` - Quick reference
- `MOBILE_APP_CONFIG.md` - Mobile app integration guide

## 🎯 Quick Command Reference

| Command | Purpose |
|---------|---------|
| `npm run sls:deploy` | Deploy to dev |
| `npm run sls:deploy:prod` | Deploy to production |
| `npm run sls:offline` | Test locally |
| `npm run sls:logs` | View logs |
| `npm run sls:remove` | Delete deployment |

## 💰 Cost Estimation

**AWS Free Tier (First 12 months):**
- 1M requests/month FREE
- 400,000 GB-seconds FREE

**After Free Tier:**
- ~$0.20 per 1M requests
- ~$0.0000166667 per GB-second

**Typical App (100K requests/month):**
- **Cost: $0-5/month** (likely stays in free tier)

## 🆘 Troubleshooting

### Deployment Fails
- Check AWS credentials: `aws configure list`
- Verify IAM permissions
- Check CloudFormation console for errors

### API Returns Errors
- View logs: `npm run sls:logs`
- Check CloudWatch Logs in AWS Console
- Verify environment variables in Lambda

### Database Connection Fails
- Verify MongoDB Atlas connection string
- Check IP whitelist (should include 0.0.0.0/0)
- Verify database user credentials

### Mobile App Can't Connect
- Verify API URL is correct
- Check CORS configuration
- Test API directly with curl/Postman
- Check network connectivity

## ✅ Deployment Checklist

- [ ] AWS account created
- [ ] AWS credentials configured
- [ ] MongoDB Atlas setup complete
- [ ] Environment variables configured (.env)
- [ ] Dependencies installed (npm install)
- [ ] Local testing successful (sls:offline)
- [ ] Deployment successful (sls:deploy)
- [ ] API URL copied
- [ ] Mobile app updated with API URL
- [ ] Mobile app tested and working
- [ ] Production deployment (optional)

## 📚 Additional Resources

- **Detailed Guide:** `SERVERLESS_DEPLOYMENT.md`
- **Quick Start:** `QUICK_START_SERVERLESS.md`
- **Mobile Config:** `MOBILE_APP_CONFIG.md`
- **Serverless Docs:** https://www.serverless.com/framework/docs
- **AWS Lambda Docs:** https://docs.aws.amazon.com/lambda/

## 🎉 Next Steps

1. ✅ Deploy your backend
2. ✅ Update mobile app
3. ✅ Test thoroughly
4. ✅ Monitor usage in AWS Console
5. ✅ Set up alerts (optional)
6. ✅ Configure custom domain (optional)

---

**Need Help?** Check the detailed documentation files or AWS CloudWatch logs for error details.

