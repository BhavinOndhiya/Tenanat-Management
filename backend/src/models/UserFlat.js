import mongoose from "mongoose";

const userFlatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    relation: {
      type: String,
      enum: ["OWNER", "TENANT", "FAMILY", "OTHER"],
      default: "OWNER",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userFlatSchema.index({ userId: 1, flatId: 1 }, { unique: true });

const UserFlat = mongoose.model("UserFlat", userFlatSchema);

export default UserFlat;
