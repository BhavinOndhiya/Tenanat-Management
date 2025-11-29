# Tenant Onboarding Documents Flow

## Overview

After a tenant completes onboarding (eKYC + Agreement acceptance), the system automatically:
1. Generates **eKYC Verification Document** PDF from the filled KYC details
2. Generates **PG Rental Agreement** PDF with e-signature
3. Sends both documents via email to:
   - **PG Owner**
   - **PG Tenant**

## Flow Diagram

```
Tenant Completes Onboarding
    ↓
Agreement Accepted (POST /api/tenant/onboarding/agreement/accept)
    ↓
User.onboardingStatus = "completed"
    ↓
[Async] Generate Documents
    ├── Generate eKYC PDF (from stored KYC data)
    └── Generate PG Agreement PDF (with e-signature)
    ↓
Store PDF paths in User model
    ├── user.ekycDocumentPath
    └── user.agreementDocumentPath
    ↓
Send Emails (with PDF attachments)
    ├── Email to Tenant (user.email)
    └── Email to Owner (property.ownerId.email)
    ↓
✅ Documents delivered to both parties
```

## Implementation Details

### 1. Document Generation Service

**File**: `backend/src/services/documentService.js`

#### Functions:

- **`generateEKycDocument({ user, kycData })`**
  - Generates eKYC verification document PDF
  - Includes: Personal details, ID details, verification status, timestamps
  - Returns: File path to generated PDF

- **`generatePgAgreementDocument({ user, property, owner, profile })`**
  - Generates PG Rental Agreement PDF with e-signature
  - Includes: Parties, property details, financial terms, facilities, house rules, consent, digital signatures
  - Returns: File path to generated PDF

### 2. KYC Data Storage

**File**: `backend/src/models/User.js`

KYC form data is stored in `user.kycData` when eKYC is submitted:
```javascript
kycData: {
  fullName: String,
  dateOfBirth: Date,
  gender: String,
  fatherMotherName: String,
  phone: String,
  email: String,
  permanentAddress: String,
  occupation: String,
  companyCollegeName: String,
  idType: String,
  idNumber: String,
}
```

This data is used later to generate the eKYC document PDF.

### 3. Document Paths Storage

**File**: `backend/src/models/User.js`

Generated PDF paths are stored in the User model:
- `user.ekycDocumentPath` - Path to eKYC PDF
- `user.agreementDocumentPath` - Path to Agreement PDF

### 4. Email Service

**File**: `backend/src/services/notificationService.js`

#### Function:

- **`sendOnboardingDocumentsEmail({ recipientEmail, recipientName, tenantName, propertyName, ekycPdfPath, agreementPdfPath, isOwner })`**
  - Sends email with both PDF attachments
  - Different email content for owner vs tenant
  - Attachments:
    - `eKYC-{TenantName}.pdf`
    - `PG-Agreement-{TenantName}.pdf`

### 5. Agreement Acceptance Route

**File**: `backend/src/routes/tenantOnboarding.js`

**Route**: `POST /api/tenant/onboarding/agreement/accept`

**Flow**:
1. Validates OTP and consent flags
2. Updates user: `onboardingStatus = "completed"`
3. **Async**: Calls `generateAndSendDocuments()` (doesn't block response)
4. Returns success response immediately

**Note**: Document generation happens asynchronously to avoid blocking the API response. If generation fails, it's logged but doesn't fail the request.

## Document Storage

### Local Development
- PDFs stored in: `backend/documents/`
- Files: `ekyc-{userId}-{timestamp}.pdf`, `pg-agreement-{userId}-{timestamp}.pdf`

### AWS Lambda (Production)
- PDFs stored in: `/tmp/documents/`
- **Note**: Lambda `/tmp` is ephemeral (max 512MB, cleared after execution)
- For production, consider uploading to S3 and storing S3 URLs

## Email Templates

### Tenant Email
- Subject: `Your Onboarding Documents - {PropertyName}`
- Content: Congratulations message, document info, dashboard link
- Attachments: Both PDFs

### Owner Email
- Subject: `Tenant Onboarding Complete - {TenantName} - {PropertyName}`
- Content: Notification that tenant completed onboarding, document info
- Attachments: Both PDFs

## Testing

### Test Flow:
1. Tenant completes eKYC (Step 2)
2. Tenant accepts agreement (Step 3)
3. Check console logs for:
   - `[Documents] Generating PDFs for tenant...`
   - `[Documents] PDFs generated: eKYC=..., Agreement=...`
   - `[Documents] Email sent to tenant: ...`
   - `[Documents] Email sent to owner: ...`
4. Check email inboxes for both tenant and owner
5. Verify PDF attachments are present

### Mock OTP for Testing:
- Use `"123456"` or any 4+ digit code

## Future Enhancements

1. **S3 Storage**: Upload PDFs to S3 and store URLs instead of file paths
2. **Document Download API**: Create endpoints to download documents
3. **Document History**: Track all generated documents
4. **Re-generation**: Allow re-generating documents if needed
5. **Digital Signature**: Integrate real digital signature provider (e.g., DocuSign, Signzy)

## Error Handling

- Document generation errors are logged but don't fail the agreement acceptance
- Email sending errors are logged
- PDF paths are stored even if email fails (can be sent later)
- Check logs for any errors in document generation/email sending

## Files Modified/Created

**Created**:
- `backend/src/services/documentService.js` - Document generation service
- `ONBOARDING_DOCUMENTS_FLOW.md` - This documentation

**Modified**:
- `backend/src/models/User.js` - Added `kycData`, `ekycDocumentPath`, `agreementDocumentPath`
- `backend/src/routes/tenantOnboarding.js` - Store KYC data, generate documents on agreement acceptance
- `backend/src/services/notificationService.js` - Added `sendOnboardingDocumentsEmail` function

---

**Implementation Date**: 2025-01-29
**Status**: ✅ COMPLETE

