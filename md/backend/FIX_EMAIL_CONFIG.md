# Fix Email Configuration

## ❌ Current Issue

Your `.env` file has:
```
SMTP_PASS=YOUR_EMAIL_PASSWORD   # This is still a placeholder!
```

## ✅ Solution

### Step 1: Update Your `.env` File

Open `backend/.env` and replace `YOUR_EMAIL_PASSWORD` with your **actual Hostinger email password**.

**Before:**
```env
SMTP_PASS=YOUR_EMAIL_PASSWORD
```

**After:**
```env
SMTP_PASS=your-actual-hostinger-email-password
```

### Step 2: Add SMTP_FROM (if missing)

Add this line to your `.env`:
```env
SMTP_FROM=team@streamivus.com
```

### Step 3: Complete .env Configuration

Your `.env` should have:
```env
# SMTP (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=team@streamivus.com
SMTP_PASS=your-actual-password-here
SMTP_FROM=team@streamivus.com
FRONTEND_URL=http://localhost:5173
```

### Step 4: Restart Server

After updating `.env`, **restart your backend server**:
1. Stop the server (Ctrl+C)
2. Start again: `npm run dev` or `npm start`

### Step 5: Test Email

Visit: `http://localhost:3000/api/test-email?to=your-email@gmail.com`

You should see:
- Console: `[EMAIL CONFIG] ✅ SMTP transporter configured successfully`
- Console: `[EMAIL] ✅ Welcome email sent to...`
- Email in your inbox

---

## 🔍 How to Find Your Hostinger Email Password

1. **Login to Hostinger** (hPanel)
2. Go to **Email** section
3. Find your email account: `team@streamivus.com`
4. Click **Manage** or **Settings**
5. Look for **Email Password** or **Mailbox Password**
6. Copy that password and use it as `SMTP_PASS`

**Note:** This is the password you set when creating the email account in Hostinger, NOT your Hostinger account password.

---

## 🧪 Testing

After updating, check the console when server starts:

**✅ Success:**
```
[EMAIL CONFIG] ✅ SMTP transporter configured successfully
```

**❌ Still Not Working:**
```
[EMAIL CONFIG] ⚠️  WARNING: SMTP_PASS is not set or is still a placeholder!
```

If you see the warning, make sure:
1. You replaced `YOUR_EMAIL_PASSWORD` with actual password
2. No quotes around the password
3. No spaces before/after the password
4. Server was restarted after changes

