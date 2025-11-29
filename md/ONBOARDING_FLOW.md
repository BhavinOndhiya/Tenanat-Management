# Tenant eKYC + Legal Onboarding Flow

This document describes the complete tenant onboarding flow with eKYC verification and legal PG agreement acceptance.

## Overview

The onboarding flow ensures that:
1. Owners pre-define all PG details
2. Tenants review and accept PG details
3. Tenants complete eKYC verification (mock/sandbox)
4. Tenants accept the legal PG agreement with OTP verification

## Flow Diagram

```
Owner adds tenant → Tenant sets password → Forced Onboarding → Dashboard Access
                                    ↓
                    [Step 1: PG Details Review]
                                    ↓
                    [Step 2: eKYC Verification]
                                    ↓
                    [Step 3: Agreement Acceptance]
                                    ↓
                            [Dashboard Access]
```

## State Machine

The `onboardingStatus` field in the User model follows this state machine:

- `invited` → Tenant is added by owner, password setup email sent
- `kyc_pending` → Password set, tenant needs to complete eKYC
- `kyc_verified` → eKYC completed, tenant needs to accept agreement
- `completed` → Full onboarding complete, tenant can access dashboard

## Backend Implementation

### Models

#### User Model
Added fields:
- `onboardingStatus`: Enum ["invited", "kyc_pending", "kyc_verified", "completed"]
- `kycStatus`: Enum ["pending", "verified", "rejected"]
- `kycTransactionId`: String
- `kycVerifiedAt`: Date
- `agreementAccepted`: Boolean
- `agreementAcceptedAt`: Date
- `agreementOtpRef`: String

#### Flat Model
Added PG-specific fields:
- `defaultRent`: Number
- `defaultDeposit`: Number
- `dueDate`: Number (1-31, day of month)
- `lastPenaltyFreeDate`: Number (1-31, day of month)
- `lateFeePerDay`: Number
- `noticePeriodMonths`: Number
- `lockInMonths`: Number
- `houseRules`: String

### Routes

#### `/api/tenant/onboarding` (GET)
- **Auth**: Required (PG_TENANT role)
- **Returns**: Complete onboarding data including property, room, financial details, and user status

#### `/api/tenant/ekyc` (POST)
- **Auth**: Required (PG_TENANT role)
- **Body**: FormData with personal details, ID details, and file uploads (idFront, idBack, selfie)
- **Returns**: KYC verification result (mock implementation)
- **Note**: Currently accepts any valid form data and simulates verification. Replace with real KYC provider integration.

#### `/api/tenant/agreement/preview` (GET)
- **Auth**: Required (PG_TENANT role)
- **Requires**: `kycStatus === "verified"`
- **Returns**: HTML agreement document

#### `/api/tenant/agreement/accept` (POST)
- **Auth**: Required (PG_TENANT role)
- **Body**: `{ otp: string, consentFlags: object }`
- **Requires**: `kycStatus === "verified"` and all consent flags checked
- **Returns**: Success status and updated onboarding status
- **Note**: Currently accepts OTP "123456" or any 4+ digit code for testing. Replace with real SMS OTP provider.

### Password Setup/Reset Routes

Updated routes to:
1. Set `onboardingStatus = "kyc_pending"` for tenants after password is set
2. Generate JWT token
3. Return `redirectTo` field indicating where to redirect the user

Routes updated:
- `/api/auth/setup-password`
- `/api/auth/reset-password`
- `/api/auth/update-password`

## Frontend Implementation

### Components

#### `TenantOnboarding.jsx`
Multi-step onboarding component with 3 steps:

1. **PG Details Review** (Read-only)
   - Displays all PG information
   - Property details, room/bed, financial terms, facilities, house rules
   - User cannot edit, must contact owner for changes

2. **eKYC Verification**
   - Personal details form
   - ID type and number
   - File uploads (ID front, ID back, selfie)
   - Mock verification (2 second delay)

3. **Agreement Acceptance**
   - Agreement preview (HTML modal)
   - Consent checkboxes
   - OTP input (mock: accepts "123456" or any 4+ digit code)
   - Final acceptance

### Route Protection

Updated route guards in `App.jsx`:
- `ProtectedRoute`: Redirects tenants to `/tenant/onboarding` if `onboardingStatus !== "completed"`
- `RoleRoute`: Same protection for role-specific routes

### Password Pages

Updated pages to handle `redirectTo` from API:
- `SetupPassword.jsx`: Auto-login and redirect based on `redirectTo`
- `ResetPassword.jsx`: Auto-login and redirect based on `redirectTo`
- `UpdatePassword.jsx`: Auto-login and redirect based on `redirectTo`

## Testing Locally

### Mock KYC
The eKYC endpoint currently:
- Accepts any valid form data
- Simulates a 2-second delay
- Returns success with mock transaction ID
- Updates user `kycStatus` to "verified"

**To test**: Fill out the eKYC form with any valid data and submit.

### Mock OTP
The agreement acceptance endpoint currently:
- Accepts OTP "123456" or any 4+ digit code
- Validates all consent flags are checked
- Updates user `onboardingStatus` to "completed"

**To test**: Use OTP "123456" or any 4+ digit code when accepting agreement.

## Integration Points for Real Implementation

### Real KYC Provider
Replace the mock logic in `/api/tenant/ekyc` with:
1. Real KYC API integration (e.g., DigiLocker, Aadhaar eKYC, etc.)
2. Actual file upload handling and storage
3. Real verification response processing

**Location**: `backend/src/routes/tenantOnboarding.js` - `POST /api/tenant/ekyc` route

### Real SMS OTP Provider
Replace the mock OTP validation in `/api/tenant/agreement/accept` with:
1. SMS OTP generation (e.g., Twilio, AWS SNS, etc.)
2. OTP storage and expiration handling
3. Real OTP verification

**Location**: `backend/src/routes/tenantOnboarding.js` - `POST /api/tenant/agreement/accept` route

## Owner Flow

### Adding a Tenant
When an owner adds a tenant via `/api/owner/pg/tenants`:
1. User is created with `onboardingStatus: "invited"`
2. Password setup token is generated
3. Welcome email is sent with password setup link
4. Tenant must complete onboarding before accessing dashboard

### Property Setup
Owners should set the following fields when creating/updating PG properties:
- `houseRules`: House rules text
- `defaultRent`: Default monthly rent
- `defaultDeposit`: Default security deposit
- `dueDate`: Payment due day (1-31)
- `lastPenaltyFreeDate`: Last penalty-free day (1-31)
- `lateFeePerDay`: Late fee amount per day
- `noticePeriodMonths`: Notice period in months
- `lockInMonths`: Lock-in period in months

## Tenant Flow

1. **Receive Invitation**: Tenant receives email with password setup link
2. **Set Password**: Tenant sets password via `/auth/setup-password`
3. **Auto-redirect**: Tenant is automatically redirected to `/tenant/onboarding`
4. **Step 1**: Review PG details (read-only)
5. **Step 2**: Complete eKYC verification
6. **Step 3**: Review and accept agreement with OTP
7. **Complete**: Redirected to dashboard

## Security Considerations

1. **Route Protection**: All onboarding routes require authentication and PG_TENANT role
2. **KYC Verification**: Agreement preview requires `kycStatus === "verified"`
3. **OTP Verification**: Agreement acceptance requires valid OTP (currently mocked)
4. **State Validation**: Backend validates onboarding state transitions

## Future Enhancements

1. Real KYC provider integration
2. Real SMS OTP integration
3. Agreement PDF generation and storage
4. Email notifications at each onboarding step
5. Onboarding progress tracking for owners
6. Support for multiple ID types with different verification flows

