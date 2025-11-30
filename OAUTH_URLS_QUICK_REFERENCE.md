# OAuth URLs - Quick Reference (Copy & Paste)

## Google OAuth Configuration

### Authorized JavaScript Origins
```
http://localhost:5173
https://tenanat-management.vercel.app
```

### Authorized Redirect URIs
```
http://localhost:5173
http://localhost:3000/api/auth/google/callback
https://tenanat-management.vercel.app
https://tenanat-management.vercel.app/auth/callback/google
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/google/callback
```

---

## Facebook OAuth Configuration

### Valid OAuth Redirect URIs
```
http://localhost:5173
http://localhost:5173/auth/callback/facebook
http://localhost:3000/api/auth/facebook/callback
https://tenanat-management.vercel.app
https://tenanat-management.vercel.app/auth/callback/facebook
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/facebook/callback
```

### Site URL (Facebook App Settings > Basic)
```
https://tenanat-management.vercel.app
```

---

## Where to Add These URLs

### Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Navigate to: **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add URLs to:
   - **Authorized JavaScript origins**
   - **Authorized redirect URIs**

### Facebook Developers
1. Go to: https://developers.facebook.com/
2. Select your app
3. Navigate to: **Facebook Login** > **Settings**
4. Add URLs to: **Valid OAuth Redirect URIs**
5. Also set **Site URL** in **Settings** > **Basic**

---

## Summary

- **Total URLs for Google**: 7 URLs (2 origins + 5 redirects)
- **Total URLs for Facebook**: 7 URLs (6 redirects + 1 site URL)

**All URLs are listed above - just copy and paste them into the respective OAuth provider settings!**

