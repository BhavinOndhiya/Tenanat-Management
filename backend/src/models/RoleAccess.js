import mongoose from "mongoose";

const roleAccessSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    navItems: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

const RoleAccess = mongoose.model("RoleAccess", roleAccessSchema);

export default RoleAccess;
