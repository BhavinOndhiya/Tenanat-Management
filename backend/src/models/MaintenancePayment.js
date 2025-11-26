import mongoose from "mongoose";

const maintenancePaymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceInvoice",
      required: true,
      index: true,
    },
    paidByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    method: {
      type: String,
      enum: ["ONLINE", "CASH", "CHEQUE", "OTHER"],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    gateway: {
      type: String,
      enum: ["RAZORPAY"],
      default: null,
    },
    gatewayOrderId: {
      type: String,
      index: true,
    },
    gatewayPaymentId: {
      type: String,
    },
    gatewaySignature: {
      type: String,
    },
    source: {
      type: String,
      enum: ["ADMIN", "CITIZEN", "GATEWAY"],
      default: "ADMIN",
      index: true,
    },
    state: {
      type: String,
      enum: ["PENDING", "APPROVED", "FAILED"],
      default: "APPROVED",
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const MaintenancePayment = mongoose.model(
  "MaintenancePayment",
  maintenancePaymentSchema
);

export default MaintenancePayment;
