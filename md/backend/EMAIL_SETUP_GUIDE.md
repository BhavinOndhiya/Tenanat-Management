# Email Setup & Flow Guide

## 📧 SMTP Configuration

### Environment Variables (in `backend/.env`)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:5173
```

### Gmail Setup Steps

1. **Enable 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "PG Management System" as the name
   - Copy the 16-character password (no spaces)

3. **Add to .env**
   - Use the 16-character app password as `SMTP_PASS`
   - Use your Gmail address as `SMTP_USER` and `SMTP_FROM`

---

## 🧪 Testing Email Configuration

### Test Endpoint

**GET** `/api/test-email?to=your-email@example.com`

**Example:**
```
http://localhost:3000/api/test-email?to=test@gmail.com
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent to test@gmail.com. Please check your inbox (and spam folder)."
}
```

**If email fails:**
```json
{
  "error": "Failed to send test email",
  "details": "Error message here",
  "check": "Verify your SMTP credentials in .env file"
}
```

---

## 🔄 Email Flow: Tenant Creation

### Scenario 1: New User with Password Provided

1. **PG Owner adds tenant** with email and password
2. **System creates user account** with provided password
3. **Email sent** with:
   - Welcome message
   - Property details (room, bed, rent, services)
   - **Login credentials** (email + password)
4. **WhatsApp message** sent (if phone provided) with login credentials
5. **Tenant can login immediately** with provided credentials

### Scenario 2: New User without Password

1. **PG Owner adds tenant** with email (no password)
2. **System creates user account** with temporary password
3. **System generates password setup token** (valid 7 days)
4. **Email sent** with:
   - Welcome message
   - Property details
   - **"Set Up Password" button** (link to password setup page)
5. **WhatsApp message** sent (if phone provided) asking to check email
6. **Tenant clicks link** → Sets password → Auto-logged in

### Scenario 3: Existing User (Not Assigned to PG)

1. **PG Owner adds tenant** with existing email
2. **System assigns user** to this PG property
3. **Email sent** with:
   - Assignment notification
   - Property details
   - **"Use existing credentials"** message
4. **Tenant uses existing password** to login

### Scenario 4: Existing User (Already Assigned)

1. **PG Owner tries to add tenant** with email already assigned
2. **System returns error:**
   ```
   "This email is already assigned to [Property Name]. 
   Please use a different email or contact support to transfer the tenant."
   ```
3. **No email sent**

---

## 📨 Email Content

### What's Included in Welcome Email:

1. **Header**: Property name and welcome message
2. **Allotment Details**:
   - Full property address
   - Room number
   - Bed number
3. **Services & Rent**:
   - Monthly rent amount
   - Included services (WiFi, AC, Food, etc.)
   - Package details (sharing type, AC preference, food preference)
4. **Login Credentials**:
   - **If password provided**: Shows email and password
   - **If no password**: Shows "Set Up Password" button with link
   - **If existing user**: Shows "Use existing credentials" message
5. **Footer**: Contact information

---

## 🔍 Troubleshooting

### Email Not Sending?

1. **Check Console Logs:**
   - Look for `[EMAIL] ✅ Welcome email sent...` (success)
   - Look for `[EMAIL] ❌ Failed to send...` (error)

2. **Verify .env Variables:**
   ```bash
   # Check if all required variables are set
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```

3. **Test Email Endpoint:**
   ```
   GET http://localhost:3000/api/test-email?to=your-email@gmail.com
   ```

4. **Common Issues:**
   - **"Invalid login"**: App password incorrect or not generated
   - **"Connection timeout"**: Check SMTP_HOST and SMTP_PORT
   - **"Authentication failed"**: Verify SMTP_USER and SMTP_PASS
   - **Email in spam**: Check spam folder, mark as "Not Spam"

### Gmail-Specific Issues:

- **"Less secure app access"**: Not needed if using App Password
- **"Access blocked"**: Google may require verification - check email for security alert
- **"Quota exceeded"**: Gmail has daily sending limits (500 emails/day for free accounts)

---

## 📊 Email Status in Console

### Success:
```
[EMAIL] ✅ Welcome email sent to tenant@example.com. Message ID: <message-id>
```

### Failure:
```
[EMAIL] ❌ Failed to send welcome email: Error message here
```

### Not Configured:
```
[EMAIL] transporter not configured. Payload: {...}
[EMAIL] Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file
```

---

## 🚀 Quick Start

1. **Add SMTP credentials to `backend/.env`**
2. **Test email configuration:**
   ```
   GET http://localhost:3000/api/test-email?to=your-email@gmail.com
   ```
3. **Create a tenant** via PG Owner dashboard
4. **Check tenant's email** for welcome message
5. **Verify tenant can login** with provided credentials

---

## 📝 Notes

- **Email sending is non-blocking**: If email fails, tenant creation still succeeds
- **Password setup links expire**: Valid for 7 days only
- **WhatsApp integration**: Currently logs messages (not actually sent)
- **Email template**: HTML formatted, responsive design
- **From address**: Uses `SMTP_FROM` from .env

