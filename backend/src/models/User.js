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
      required: true,
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
