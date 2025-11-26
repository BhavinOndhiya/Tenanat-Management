import mongoose from "mongoose";

const eventParticipantSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["INTERESTED", "GOING"],
      default: "INTERESTED",
    },
  },
  {
    timestamps: true,
  }
);

eventParticipantSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventParticipant = mongoose.model(
  "EventParticipant",
  eventParticipantSchema
);

export default EventParticipant;
