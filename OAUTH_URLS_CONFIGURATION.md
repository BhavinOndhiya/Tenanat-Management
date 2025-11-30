# OAuth URLs Configuration Guide

This document lists **ALL** URLs you need to add to Google and Facebook OAuth settings for your project to work in both development and production.

## Your Project URLs

Based on your configuration:
- **Local Frontend**: `http://localhost:5173` (Vite default port)
- **Local Backend**: `http://localhost:3000`
- **Production Frontend**: `https://tenanat-management.vercel.app`
- **Production Backend**: `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`

---

## Google OAuth Configuration

### 1. Authorized JavaScript Origins

Add these URLs (where your frontend runs):

**Development:**
```
http://localhost:5173
```

**Production:**
```
https://tenanat-management.vercel.app
```

**Complete List:**
- `http://localhost:5173`
- `https://tenanat-management.vercel.app`

### 2. Authorized Redirect URIs

**Note:** The current implementation uses Google Identity Services (token-based), which doesn't require redirect URIs. However, add these for compatibility and future use:

**Development:**
```
http://localhost:5173
http://localhost:3000/api/auth/google/callback
```

**Production:**
```
https://tenanat-management.vercel.app
https://tenanat-management.vercel.app/auth/callback/google
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/google/callback
```

**Complete List:**
- `http://localhost:5173`
- `http://localhost:3000/api/auth/google/callback`
- `https://tenanat-management.vercel.app`
- `https://tenanat-management.vercel.app/auth/callback/google`
- `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/google/callback`

---

## Facebook OAuth Configuration

### 1. Valid OAuth Redirect URIs

Add these URLs in Facebook App Settings > Facebook Login > Settings:

**Development:**
```
http://localhost:5173
http://localhost:5173/auth/callback/facebook
http://localhost:3000/api/auth/facebook/callback
```

**Production:**
```
https://tenanat-management.vercel.app
https://tenanat-management.vercel.app/auth/callback/facebook
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/facebook/callback
```

**Complete List:**
- `http://localhost:5173`
- `http://localhost:5173/auth/callback/facebook`
- `http://localhost:3000/api/auth/facebook/callback`
- `https://tenanat-management.vercel.app`
- `https://tenanat-management.vercel.app/auth/callback/facebook`
- `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/facebook/callback`

### 2. Site URL (Facebook App Settings > Basic)

**Development:**
```
http://localhost:5173
```

**Production:**
```
https://tenanat-management.vercel.app
```

---

## Quick Copy-Paste Lists

### Google OAuth - Authorized JavaScript Origins
```
http://localhost:5173
https://tenanat-management.vercel.app
```

### Google OAuth - Authorized Redirect URIs
```
http://localhost:5173
http://localhost:3000/api/auth/google/callback
https://tenanat-management.vercel.app
https://tenanat-management.vercel.app/auth/callback/google
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/google/callback
```

### Facebook OAuth - Valid OAuth Redirect URIs
```
http://localhost:5173
http://localhost:5173/auth/callback/facebook
http://localhost:3000/api/auth/facebook/callback
https://tenanat-management.vercel.app
https://tenanat-management.vercel.app/auth/callback/facebook
https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api/auth/facebook/callback
```

---

## Important Notes

1. **No trailing slashes**: Don't add trailing slashes (`/`) to URLs
2. **Exact match required**: URLs must match exactly (including `http` vs `https`)
3. **Protocol matters**: `http://localhost:5173` and `https://localhost:5173` are different
4. **Port numbers**: Include port numbers for local development URLs
5. **Case sensitive**: URLs are case-sensitive

---

## Testing After Configuration

1. **Local Development:**
   - Start frontend: `cd frontend && npm run dev` (runs on `http://localhost:5173`)
   - Start backend: `cd backend && npm run dev` (runs on `http://localhost:3000`)
   - Test OAuth login on login page

2. **Production:**
   - Ensure frontend is deployed to `https://tenanat-management.vercel.app`
   - Ensure backend is deployed to `https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api`
   - Test OAuth login on production

---

## Troubleshooting

### "Redirect URI mismatch" Error
- Check that the exact URL is added (no trailing slash, correct protocol)
- For Google: Check both JavaScript origins AND redirect URIs
- For Facebook: Check Valid OAuth Redirect URIs

### "Invalid client" Error
- Verify Client ID is correct in environment variables
- Check that OAuth consent screen is configured
- Ensure the project is active in Google Cloud Console

### OAuth Not Working in Production
- Verify HTTPS is enabled (OAuth requires HTTPS in production)
- Check that production URLs are added to OAuth settings
- Verify environment variables are set correctly in production

