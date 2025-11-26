import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    rentDueDate: {
      type: Number, // Day of month (1-31)
      required: true,
      min: 1,
      max: 31,
    },
    leaseStartDate: {
      type: Date,
      default: Date.now,
    },
    leaseEndDate: {
      type: Date,
      default: null,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ["AC", "NON_AC"],
      default: "NON_AC",
    },
    foodIncluded: {
      type: Boolean,
      default: false,
    },
    roomNumber: {
      type: String,
      trim: true,
      default: "",
    },
    sharing: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastReminderSent: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index to ensure unique active tenant per flat+room combination
tenantSchema.index({ flatId: 1, roomNumber: 1, isActive: 1 });

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;
