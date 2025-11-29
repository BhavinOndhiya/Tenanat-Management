# Check Email Issues - Onboarding Documents

## Problem
After tenant completes onboarding, no emails are received with eKYC and Agreement documents.

## Quick Check

### 1. Check API Response
After accepting agreement, the API now returns email status:

```json
{
  "success": true,
  "message": "Agreement accepted successfully...",
  "onboardingStatus": "completed",
  "emailStatus": {
    "sent": false,
    "configured": false,
    "error": "Email not configured...",
    "message": "..."
  }
}
```

**Check the `emailStatus` field:**
- `configured: false` → SMTP not configured
- `sent: false` → Email failed to send
- `error: "..."` → Specific error message

### 2. Check Server Logs

```bash
cd backend
npm run sls:logs
```

Look for:
- `[EMAIL CONFIG]` - Email configuration status
- `[Documents]` - Document generation and email sending logs
- `[EMAIL]` - Email sending status

### 3. Check Environment Variables

In `backend/.env` or `serverless.yml` environment section, ensure:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_EMAIL=your-email@gmail.com
EMAIL_FROM_NAME=Streamivus
```

### 4. For Gmail

1. Enable 2-Factor Authentication
2. Generate App Password:
   - Go to Google Account → Security
   - 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use that password in `SMTP_PASS`

### 5. Common Issues

#### Issue: "Email not configured"
**Solution:** Add SMTP environment variables to `serverless.yml`:

```yaml
provider:
  environment:
    SMTP_HOST: ${env:SMTP_HOST}
    SMTP_PORT: ${env:SMTP_PORT}
    SMTP_USER: ${env:SMTP_USER}
    SMTP_PASS: ${env:SMTP_PASS}
    EMAIL_FROM_EMAIL: ${env:EMAIL_FROM_EMAIL}
    EMAIL_FROM_NAME: ${env:EMAIL_FROM_NAME}
```

Then redeploy:
```bash
cd backend
npm run sls:deploy
```

#### Issue: "Authentication failed"
**Solution:** 
- Check SMTP credentials
- For Gmail, use App Password (not regular password)
- Ensure 2FA is enabled

#### Issue: "Connection timeout"
**Solution:**
- Check SMTP_HOST is correct
- Check SMTP_PORT (587 for TLS, 465 for SSL)
- Check firewall/network settings

#### Issue: "PDF not found"
**Solution:**
- Check Lambda `/tmp/documents` directory exists
- Check file permissions
- This is usually a Lambda environment issue

### 6. Test Email Configuration

You can test email by checking the logs after onboarding:

```bash
cd backend
serverless logs -f api --tail 50
```

Look for:
- ✅ `[EMAIL] ✅ Onboarding documents email sent to ...`
- ❌ `[EMAIL] ❌ Failed to send...`
- ⚠️ `[EMAIL] Transporter not configured...`

### 7. Manual Email Test

Create a test endpoint or use existing test email route if available.

## Next Steps

1. **Check API response** - Look at `emailStatus` field
2. **Check logs** - See what errors are logged
3. **Configure SMTP** - Add environment variables
4. **Redeploy** - Deploy updated configuration
5. **Test again** - Complete onboarding and check response

## After Fixing

Once SMTP is configured and deployed, the API response will show:
```json
{
  "emailStatus": {
    "sent": true,
    "configured": true,
    "message": "Documents sent successfully via email"
  }
}
```

And you'll receive emails with PDF attachments!

