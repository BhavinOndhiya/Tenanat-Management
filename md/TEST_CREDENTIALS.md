# Test User Credentials

All test users are created when you run the database seed script: `npm run db:seed` in the backend directory.

## 🔐 Login Credentials

### Admin User
- **Email:** `admin@example.com`
- **Password:** `AdminPass123!`
- **Role:** ADMIN
- **Access:** Full admin dashboard, user management, flat management, billing, announcements, events
- **Flat Assignment:** None (admin doesn't need flat)

### Officer User
- **Email:** `officer@example.com`
- **Password:** `OfficerPass123!`
- **Role:** OFFICER
- **Access:** Officer dashboard, complaint management (Kanban board), can assign complaints to themselves
- **Flat Assignment:** Lakeview Towers • B-204 (Owner)

### Citizen User #1
- **Email:** `citizen@example.com`
- **Password:** `CitizenPass123!`
- **Role:** CITIZEN
- **Name:** Asha Patel
- **Access:** Citizen dashboard, complaints, events, billing, announcements
- **Flat Assignment:** Skyline Residency • A-101 (Owner, Primary)
- **Has Sample Data:** 
  - Complaints (NEW, IN_PROGRESS)
  - Maintenance invoices (PENDING, PARTIALLY_PAID)

### Citizen User #2
- **Email:** `rohan@example.com`
- **Password:** `CitizenPass123!`
- **Role:** CITIZEN
- **Name:** Rohan Mehta
- **Access:** Citizen dashboard, complaints, events, billing, announcements
- **Flat Assignment:** Skyline Residency • A-502 (Owner, Primary)
- **Has Sample Data:**
  - Complaints (RESOLVED)
  - Maintenance invoices (PAID)

## 📋 Quick Reference Table

| Role | Email | Password | Flat(s) |
|------|-------|----------|---------|
| **Admin** | `admin@example.com` | `AdminPass123!` | — |
| **Officer** | `officer@example.com` | `OfficerPass123!` | Lakeview Towers • B-204 |
| **Citizen #1** | `citizen@example.com` | `CitizenPass123!` | Skyline Residency • A-101 |
| **Citizen #2** | `rohan@example.com` | `CitizenPass123!` | Skyline Residency • A-502 |

## 🎯 Testing Scenarios

### For Testing Billing Feature (Mobile App)

**Recommended User:** `citizen@example.com`
- Has multiple invoices with different statuses
- Has payment history
- Can test filters, pagination, and detail view

**Alternative User:** `rohan@example.com`
- Has paid invoices
- Can test different invoice states

### For Testing Admin Features

**User:** `admin@example.com`
- Full access to all admin features
- Can manage users, flats, billing, announcements, events

### For Testing Officer Features

**User:** `officer@example.com`
- Can view and manage complaints
- Can assign complaints to themselves
- Has a flat assignment (can also test citizen features)

## 🔄 Resetting Test Data

To reset and recreate all test users and data:

```bash
cd backend
npm run db:seed
```

This will:
- Create all test users (if they don't exist)
- Create sample flats
- Create flat assignments
- Create sample complaints
- Create sample announcements
- Create sample events
- Create sample maintenance invoices with payment history

## ⚠️ Important Notes

1. **These are test credentials only** - Do not use in production
2. **All passwords follow pattern:** `[Role]Pass123!`
3. **Users are created with `isActive: true`** - They can login immediately
4. **Seed script is idempotent** - Running it multiple times won't duplicate data
5. **For serverless backend:** These credentials work with the deployed API at `https://4rig7aawdl.execute-api.us-east-1.amazonaws.com`

## 🧪 Testing Mobile App

1. **Login Screen:** Use any of the citizen credentials
2. **Billing Tab:** Navigate to see invoices
3. **Filters:** Test status, month, year filters
4. **Detail View:** Tap any invoice to see details
5. **Payment History:** View payment records

## 🧪 Testing Web App

1. **Login:** Use any credentials based on role
2. **Dashboard:** Role-specific dashboards load automatically
3. **Billing:** `/billing` route for citizens
4. **Admin Panel:** `/admin/dashboard` for admins
5. **Officer Panel:** `/officer/dashboard` for officers

## 📱 Mobile App Login

In your mobile app, use these credentials on the login screen:

```
Email: citizen@example.com
Password: CitizenPass123!
```

Or test with the second citizen:

```
Email: rohan@example.com
Password: CitizenPass123!
```

## 🌐 Web App Login

Visit your web app login page and use:

- **Admin:** `admin@example.com` / `AdminPass123!`
- **Officer:** `officer@example.com` / `OfficerPass123!`
- **Citizen:** `citizen@example.com` / `CitizenPass123!`

## 🔍 Verification

After login, verify:
- ✅ Correct dashboard loads (based on role)
- ✅ User name displays correctly
- ✅ Flat assignments show (for citizens/officers)
- ✅ Sample data is visible (complaints, invoices, etc.)

