import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: function () {
        // Only required if user is not using OAuth
        return !this.oauthProvider;
      },
    },
    // OAuth fields
    oauthProvider: {
      type: String,
      enum: ["GOOGLE", "FACEBOOK"],
      default: null,
    },
    oauthId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: [
        "CITIZEN",
        "OFFICER",
        "ADMIN",
        "TENANT",
        "PG_TENANT",
        "FLAT_OWNER",
        "PG_OWNER",
      ],
      default: "CITIZEN",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ownerProperties: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Flat",
        },
      ],
      default: [],
    },
    assignedProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    bedNumber: {
      type: String,
      trim: true,
    },
    // Profile fields
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    phone: String,
    avatarUrl: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    preferredBillingChannel: {
      type: String,
      enum: ["WHATSAPP", "EMAIL", "BOTH"],
      default: "EMAIL",
    },
    maritalStatus: {
      type: String,
      enum: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"],
    },
    familyDetails: {
      spouseName: String,
      children: [
        {
          name: String,
          age: Number,
          relationship: String,
        },
      ],
      otherMembers: [
        {
          name: String,
          age: Number,
          relationship: String,
        },
      ],
    },
    personalDetails: {
      occupation: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
      },
    },
    // Password reset rate limiting
    passwordResetAttempts: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Track used password tokens (one-time use)
    usedPasswordTokens: {
      type: [String],
      default: [],
    },
    // Tenant onboarding status
    // State machine: "invited" → "kyc_pending" → "kyc_verified" → "completed"
    // - "invited": Owner has added tenant, password setup email sent
    // - "kyc_pending": Tenant has set password, needs to complete eKYC
    // - "kyc_verified": eKYC completed, needs to accept agreement
    // - "completed": Full onboarding complete, can access dashboard
    onboardingStatus: {
      type: String,
      enum: ["invited", "kyc_pending", "kyc_verified", "completed"],
      default: null,
    },
    // KYC verification details
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: null,
    },
    kycTransactionId: {
      type: String,
      trim: true,
    },
    kycVerifiedAt: {
      type: Date,
    },
    // Store KYC form data for document generation
    kycData: {
      type: {
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
        idFrontUrl: String, // URL to uploaded ID front
        idBackUrl: String, // URL to uploaded ID back
        selfieUrl: String, // URL to uploaded selfie
      },
      default: null,
    },
    // Store uploaded images as base64 for reference document
    kycImages: {
      idFrontBase64: String,
      idBackBase64: String,
      selfieBase64: String,
    },
    // Reference document PDF (images PDF for owner)
    referenceDocumentPath: {
      type: String,
      trim: true,
    },
    referenceDocumentBase64: {
      type: String,
    },
    // Document file paths
    ekycDocumentPath: {
      type: String,
      trim: true,
    },
    agreementDocumentPath: {
      type: String,
      trim: true,
    },
    // Store PDF content as base64 for persistence (Lambda /tmp is ephemeral)
    ekycDocumentBase64: {
      type: String,
    },
    agreementDocumentBase64: {
      type: String,
    },
    // Flag to indicate documents were generated
    documentsGenerated: {
      type: Boolean,
      default: false,
    },
    documentsGeneratedAt: {
      type: Date,
    },
    // Agreement acceptance details
    agreementAccepted: {
      type: Boolean,
      default: false,
    },
    agreementAcceptedAt: {
      type: Date,
    },
    agreementOtpRef: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
