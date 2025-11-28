import mongoose from "mongoose";

const rentPaymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
      index: true,
    },
    agreementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalAgreement",
      default: null,
    },
    periodMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    periodYear: {
      type: Number,
      required: true,
      min: 2000,
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // First payment charges (only for first month)
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
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    invoicePdfUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one payment per tenant per month/year
rentPaymentSchema.index(
  { tenantId: 1, periodMonth: 1, periodYear: 1 },
  { unique: true }
);

const RentPayment = mongoose.model("RentPayment", rentPaymentSchema);

export default RentPayment;
