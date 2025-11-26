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
      enum: ["CITIZEN", "OFFICER", "ADMIN"],
      default: "CITIZEN",
    },
    isActive: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
