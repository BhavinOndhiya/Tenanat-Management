import mongoose from "mongoose";
import { FACILITY_OPTIONS, GENDER_OPTIONS } from "../constants/facilities.js";

const flatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["FLAT", "PG"],
      default: "FLAT",
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    buildingName: {
      type: String,
      required: true,
      trim: true,
    },
    block: {
      type: String,
      trim: true,
      default: "",
    },
    flatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      default: null,
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    pgMetadata: {
      totalBeds: { type: Number, min: 0 },
      totalRooms: { type: Number, min: 0 },
      amenities: [{ type: String, trim: true }],
    },
    totalRooms: {
      type: Number,
      min: 0,
    },
    totalBeds: {
      type: Number,
      min: 0,
    },
    name: {
      type: String,
      trim: true,
    },
    genderType: {
      type: String,
      enum: GENDER_OPTIONS,
      default: "COED",
    },
    facilitiesAvailable: {
      type: [
        {
          type: String,
          enum: FACILITY_OPTIONS,
        },
      ],
      default: [],
    },
    baseRentPerBed: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // PG-specific onboarding fields
    defaultRent: {
      type: Number,
      min: 0,
      default: null,
    },
    defaultDeposit: {
      type: Number,
      min: 0,
      default: null,
    },
    dueDate: {
      type: Number, // Day of month (1-31)
      min: 1,
      max: 31,
      default: 1,
    },
    lastPenaltyFreeDate: {
      type: Number, // Day of month (1-31)
      min: 1,
      max: 31,
      default: 5,
    },
    lateFeePerDay: {
      type: Number,
      min: 0,
      default: 50,
    },
    noticePeriodMonths: {
      type: Number,
      min: 0,
      default: 1,
    },
    lockInMonths: {
      type: Number,
      min: 0,
      default: 0,
    },
    houseRules: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

flatSchema.index(
  { buildingName: 1, block: 1, flatNumber: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Flat = mongoose.model("Flat", flatSchema);

export default Flat;
