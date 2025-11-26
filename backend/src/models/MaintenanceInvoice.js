import mongoose from "mongoose";

const maintenanceInvoiceSchema = new mongoose.Schema(
  {
    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE"],
      default: "PENDING",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

maintenanceInvoiceSchema.index(
  { flat: 1, month: 1, year: 1 },
  { unique: true }
);

const MaintenanceInvoice = mongoose.model(
  "MaintenanceInvoice",
  maintenanceInvoiceSchema
);

export default MaintenanceInvoice;
