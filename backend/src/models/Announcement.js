import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["GENERAL", "MAINTENANCE", "EVENT_NOTICE", "OTHER"],
      default: "GENERAL",
    },
    targetBuilding: {
      type: String,
      trim: true,
    },
    targetFlatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ type: 1, targetBuilding: 1 });

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
