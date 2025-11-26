import mongoose from "mongoose";

const billingReminderLogSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceInvoice",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["EMAIL", "WHATSAPP"],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },
    error: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false,
  }
);

billingReminderLogSchema.index(
  { invoice: 1, user: 1, sentAt: 1 },
  { unique: false }
);

const BillingReminderLog = mongoose.model(
  "BillingReminderLog",
  billingReminderLogSchema
);

export default BillingReminderLog;

