import mongoose from "mongoose";
import { FACILITY_OPTIONS } from "../constants/facilities.js";

const pgTenantProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    roomNumber: {
      type: String,
      trim: true,
      default: "",
    },
    bedNumber: {
      type: String,
      trim: true,
      default: "",
    },
    monthlyRent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // First payment charges (variable, one-time)
    securityDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    joiningFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstMonthAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Other optional charges for first payment
    otherCharges: [
      {
        description: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    moveInDate: {
      type: Date,
      default: null,
    },
    billingDueDay: {
      type: Number,
      default: 1,
      min: 1,
      max: 31,
    },
    billingGraceLastDay: {
      type: Number,
      default: 5,
      min: 1,
      max: 31,
    },
    lateFeePerDay: {
      type: Number,
      default: 50,
      min: 0,
    },
    servicesIncluded: [
      {
        type: String,
        enum: FACILITY_OPTIONS,
      },
    ],
    startDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    sharingType: {
      type: String,
      enum: ["1", "2", "3", "4"],
      default: "1",
    },
    acPreference: {
      type: String,
      enum: ["AC", "NON_AC"],
      default: "AC",
    },
    foodPreference: {
      type: String,
      enum: ["WITH_FOOD", "WITHOUT_FOOD"],
      default: "WITH_FOOD",
    },
  },
  {
    timestamps: true,
  }
);

const PgTenantProfile = mongoose.model(
  "PgTenantProfile",
  pgTenantProfileSchema
);

export default PgTenantProfile;
