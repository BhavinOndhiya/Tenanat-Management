# Tenant Onboarding Implementation Checklist

## ✅ Implementation Status: COMPLETE

This document verifies that all requirements from the tenant onboarding flow have been implemented.

---

## 1️⃣ Owner Flow – Add Property & Add Tenant

### Backend ✅
- [x] **Property Model (`backend/src/models/Flat.js`)**: All required fields implemented
  - `name` (PG name)
  - `address` (full address structure)
  - `facilitiesAvailable` (array)
  - `defaultRent`
  - `defaultDeposit`
  - `dueDate` (day of month, 1-31)
  - `lastPenaltyFreeDate` (day of month, 1-31)
  - `lateFeePerDay`
  - `noticePeriodMonths`
  - `lockInMonths`
  - `houseRules` (string)

- [x] **Room/Bed Model**: Using `PgTenantProfile` model with:
  - `roomNumber`
  - `bedNumber`
  - `propertyId` reference

- [x] **Add Tenant Route (`backend/src/routes/owner.js`)**: 
  - Owner selects: `propertyId`, `roomNumber`, `bedNumber`, `monthlyRent`, `securityDeposit`, `moveInDate`
  - Creates `User` with `role: "PG_TENANT"`, `onboardingStatus: "invited"`
  - Associates user to property/room/bed
  - Generates password setup token
  - Sends email with setup link

### Frontend ✅
- [x] **Add Tenant Form (`frontend/src/pages/owner/PgTenantManagement.jsx`)**:
  - Property selection
  - Room number input
  - Bed number input
  - Rent input (`monthlyRent`)
  - Deposit input (`securityDeposit`)
  - Move-in date picker
  - Tenant name, email, phone inputs
  - Success message: "Tenant invited. Password setup email sent."

- [x] **Property Form (`frontend/src/pages/owner/PgProperties.jsx`)**:
  - All PG onboarding fields added:
    - Default Rent
    - Default Deposit
    - Payment Due Date
    - Last Penalty-Free Date
    - Late Fee Per Day
    - Notice Period (Months)
    - Lock-In Period (Months)
    - House Rules (textarea)

---

## 2️⃣ Reset Password → Force Tenant Onboarding

### Backend ✅
- [x] **Setup Password Route (`backend/src/routes/auth.js` - `/setup-password`)**:
  - After password setup, sets `user.onboardingStatus = "kyc_pending"` for `PG_TENANT`
  - Returns JWT token with `redirectTo: "/tenant/onboarding"` for tenants
  - Returns `onboardingStatus` in response

- [x] **Reset Password Route (`backend/src/routes/auth.js` - `/reset-password`)**:
  - After password reset, sets `user.onboardingStatus = "kyc_pending"` for `PG_TENANT`
  - Returns JWT token with `redirectTo: "/tenant/onboarding"` for tenants
  - Returns `onboardingStatus` in response

- [x] **Update Password Route (`backend/src/routes/auth.js` - `/update-password`)**:
  - After password update, sets `user.onboardingStatus = "kyc_pending"` for `PG_TENANT`
  - Returns JWT token with `redirectTo: "/tenant/onboarding"` for tenants

### Frontend ✅
- [x] **Setup Password Page (`frontend/src/pages/SetupPassword.jsx`)**:
  - Handles `redirectTo` from API response
  - Navigates to `/tenant/onboarding` if provided

- [x] **Reset Password Page (`frontend/src/pages/ResetPassword.jsx`)**:
  - Handles `redirectTo` from API response
  - Navigates to `/tenant/onboarding` if provided

- [x] **Update Password Page (`frontend/src/pages/UpdatePassword.jsx`)**:
  - Handles `redirectTo` from API response
  - Navigates to `/tenant/onboarding` if provided

---

## 3️⃣ Tenant Onboarding Route & Protection

### Backend ✅
- [x] **GET `/api/tenant/onboarding` (`backend/src/routes/tenantOnboarding.js`)**:
  - Requires authenticated `PG_TENANT` JWT
  - Returns:
    - Tenant user info with `onboardingStatus`
    - Linked property info (name, address, facilities, financial terms)
    - Linked room/bed info
    - Rent, deposit, moveInDate
    - Payment dates, late fees, notice/lock-in periods
    - House rules
    - KYC status
    - Agreement status

- [x] **Route Registration (`backend/src/routes/index.js`)**:
  - `/api/tenant/onboarding` routes registered
  - `/api/me` endpoint includes `onboardingStatus`, `kycStatus`, `agreementAccepted`

### Frontend ✅
- [x] **Route Protection (`frontend/src/App.jsx`)**:
  - `ProtectedRoute`: Redirects `PG_TENANT` with `onboardingStatus !== "completed"` to `/tenant/onboarding`
  - `RoleRoute`: Same protection for tenant routes (except onboarding route itself)
  - `/tenant/onboarding` route created and protected

---

## 4️⃣ Tenant Onboarding UI – 3 Steps

### Frontend ✅
- [x] **TenantOnboarding Component (`frontend/src/pages/TenantOnboarding.jsx`)**:
  - Multi-step UI with step navigation
  - **STEP 1 – PG Details (Read-Only)**:
    - Displays all PG information (name, address, room/bed, rent, deposit, dates, fees, rules)
    - "Continue" button to proceed
  - **STEP 2 – Tenant eKYC Form**:
    - Personal details form (name, DOB, gender, parent name, phone, email, address, occupation)
    - ID details (type dropdown, ID number)
    - File uploads (ID front, ID back, selfie)
    - "Verify My Identity (eKYC)" button
  - **STEP 3 – Legal Agreement**:
    - "Preview Agreement" button (opens HTML in modal)
    - Consent checkboxes (4 required)
    - OTP input field
    - "Accept & Complete Onboarding" button
    - Success screen with redirect to dashboard

### Backend ✅
- [x] **POST `/api/tenant/onboarding/ekyc` (`backend/src/routes/tenantOnboarding.js`)**:
  - Authenticated tenant only
  - Accepts `multipart/form-data` (multer for file uploads)
  - Validates required fields
  - Mock KYC verification (2s delay)
  - Updates user:
    - `onboardingStatus = "kyc_verified"`
    - `kycStatus = "verified"`
    - `kycTransactionId` (mock)
    - `kycVerifiedAt`
  - Returns success with transaction ID
  - **TODO comments added** for real KYC provider integration

- [x] **GET `/api/tenant/onboarding/agreement/preview` (`backend/src/routes/tenantOnboarding.js`)**:
  - Authenticated tenant only
  - Requires `kycStatus === "verified"`
  - Generates HTML agreement with:
    - Owner and tenant details
    - Property address
    - Room & bed details
    - Financial terms (rent, deposit, dates, fees)
    - Notice & lock-in periods
    - Facilities
    - House rules
    - Consent clauses
    - Digital signature note
  - Returns HTML string

- [x] **POST `/api/tenant/onboarding/agreement/accept` (`backend/src/routes/tenantOnboarding.js`)**:
  - Authenticated tenant only
  - Requires `kycStatus === "verified"`
  - Validates OTP (mock: accepts "123456" or any 4+ digit code)
  - Validates all consent checkboxes
  - Updates user:
    - `agreementAccepted = true`
    - `agreementAcceptedAt`
    - `agreementOtpRef` (mock)
    - `onboardingStatus = "completed"`
  - Returns success
  - **TODO comments added** for real SMS OTP provider integration

---

## 5️⃣ Tenant Dashboard Access Control

### Frontend ✅
- [x] **Route Guards (`frontend/src/App.jsx`)**:
  - `ProtectedRoute`: Checks `onboardingStatus !== "completed"` for `PG_TENANT`, redirects to `/tenant/onboarding`
  - `RoleRoute`: Same check for tenant-specific routes
  - `TenantOnboarding` component: Redirects to `/dashboard` if already `completed`

- [x] **Auth Context**: User object includes `onboardingStatus` from `/api/me` endpoint

---

## 6️⃣ Clean Up & Docs

### Code Comments ✅
- [x] **User Model (`backend/src/models/User.js`)**:
  - Detailed comments explaining `onboardingStatus` state machine:
    - `"invited"`: Owner has added tenant, password setup email sent
    - `"kyc_pending"`: Tenant has set password, needs to complete eKYC
    - `"kyc_verified"`: eKYC completed, needs to accept agreement
    - `"completed"`: Full onboarding complete, can access dashboard

- [x] **eKYC Route (`backend/src/routes/tenantOnboarding.js`)**:
  - TODO comment explaining where to integrate real KYC provider
  - Example code structure provided

- [x] **Agreement Accept Route (`backend/src/routes/tenantOnboarding.js`)**:
  - TODO comment explaining where to integrate real SMS OTP provider
  - Example code structure provided

---

## 7️⃣ Important Constraints

- [x] **No TypeScript**: All code in JavaScript ✅
- [x] **No Breaking Changes**: Existing flows (admin/owner) remain unchanged ✅
- [x] **Simple UI**: Clean, functional UI using existing components ✅
- [x] **Auth Protection**: All new routes protected by `authenticateToken` middleware ✅
- [x] **Route Guards**: Frontend route protection implemented ✅

---

## Summary

**All requirements have been successfully implemented!**

### Key Files Modified/Created:

**Backend:**
- `backend/src/models/User.js` - Added onboarding fields and comments
- `backend/src/models/Flat.js` - Added PG onboarding fields
- `backend/src/routes/owner.js` - Set `onboardingStatus: "invited"` on tenant creation
- `backend/src/routes/auth.js` - Updated password routes to set `onboardingStatus` and return `redirectTo`
- `backend/src/routes/tenantOnboarding.js` - **NEW** - All onboarding routes
- `backend/src/routes/index.js` - Registered tenant onboarding routes
- `backend/package.json` - Added `multer` dependency

**Frontend:**
- `frontend/src/pages/TenantOnboarding.jsx` - **NEW** - Complete 3-step onboarding UI
- `frontend/src/pages/owner/PgProperties.jsx` - Added PG onboarding fields to form
- `frontend/src/pages/owner/PgTenantManagement.jsx` - Updated success message
- `frontend/src/pages/SetupPassword.jsx` - Handle `redirectTo`
- `frontend/src/pages/ResetPassword.jsx` - Handle `redirectTo`
- `frontend/src/pages/UpdatePassword.jsx` - Handle `redirectTo`
- `frontend/src/App.jsx` - Added route protection and `/tenant/onboarding` route
- `frontend/src/utils/api.js` - Added onboarding API methods

### Testing Checklist:

1. ✅ Owner can create PG property with all onboarding fields
2. ✅ Owner can add tenant with room/bed, rent, deposit, move-in date
3. ✅ Tenant receives password setup email
4. ✅ Tenant sets password → redirected to `/tenant/onboarding`
5. ✅ Tenant completes Step 1 (PG Details review)
6. ✅ Tenant completes Step 2 (eKYC - mock verification works)
7. ✅ Tenant completes Step 3 (Agreement preview + OTP acceptance)
8. ✅ Tenant redirected to dashboard after completion
9. ✅ Tenant cannot access dashboard until onboarding complete
10. ✅ Existing admin/owner flows still work

---

## Next Steps for Production:

1. **Integrate Real KYC Provider**: Replace mock eKYC in `POST /api/tenant/onboarding/ekyc`
   - Options: Digio, Signzy, eMudhra, etc.
   - Store actual transaction IDs and verification results
   - Handle async webhook responses

2. **Integrate Real SMS OTP Provider**: Replace mock OTP in `POST /api/tenant/onboarding/agreement/accept`
   - Options: Twilio, AWS SNS, MSG91, etc.
   - Generate and send OTP via SMS
   - Store OTP in database/cache with expiration
   - Validate OTP on acceptance

3. **File Storage**: Currently using in-memory multer storage
   - Move to S3/cloud storage for production
   - Store ID documents and selfies securely

4. **Agreement PDF Generation**: Currently returns HTML
   - Consider using `pdfkit` or `puppeteer` to generate PDFs
   - Store signed agreements for legal compliance

---

**Implementation Date**: 2025-01-29
**Status**: ✅ COMPLETE

