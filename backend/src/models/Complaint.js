import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const tenantSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const propertySnapshotSchema = new mongoose.Schema(
  {
    buildingName: { type: String, default: "" },
    block: { type: String, default: "" },
    flatNumber: { type: String, default: "" },
    type: { type: String, default: "" },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["FLAT", "PG"],
      default: "FLAT",
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    comments: [commentSchema],
    metadata: {
      tenantSnapshot: {
        type: tenantSnapshotSchema,
        default: undefined,
      },
      propertySnapshot: {
        type: propertySnapshotSchema,
        default: undefined,
      },
    },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ ownerId: 1, type: 1, status: 1 });

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
