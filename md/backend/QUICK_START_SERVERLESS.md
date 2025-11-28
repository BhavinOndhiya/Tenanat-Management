# Quick Start: Serverless Deployment

## 🚀 Fast Track (5 Minutes)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Key, and Region
```

### 3. Configure Environment
```bash
cp env.example .env
# Edit .env with your MongoDB Atlas URL and secrets
```

### 4. Deploy
```bash
npm run sls:deploy
```

### 5. Copy API URL
After deployment, copy the endpoint URL from the output and update your mobile app!

---

## 📱 Mobile App Integration

Once deployed, update your mobile app's API base URL:

```javascript
// Before (Local)
const API_URL = 'http://localhost:3000/api';

// After (Serverless)
const API_URL = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/api';
```

---

## 🔧 Common Commands

| Command | Description |
|---------|-------------|
| `npm run sls:deploy` | Deploy to dev stage |
| `npm run sls:deploy:prod` | Deploy to production |
| `npm run sls:offline` | Test locally |
| `npm run sls:logs` | View logs |
| `npm run sls:remove` | Remove deployment |

---

## ⚠️ Important Notes

1. **MongoDB**: Use MongoDB Atlas (cloud) - local MongoDB won't work
2. **Environment Variables**: Never commit `.env` file
3. **First Deploy**: Takes 2-5 minutes, subsequent deploys are faster
4. **Cost**: Free tier covers ~1M requests/month

---

## 🆘 Need Help?

See `SERVERLESS_DEPLOYMENT.md` for detailed documentation.

