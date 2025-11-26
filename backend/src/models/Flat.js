import mongoose from "mongoose";

const flatSchema = new mongoose.Schema(
  {
    buildingName: {
      type: String,
      required: true,
      trim: true,
    },
    block: {
      type: String,
      trim: true,
      default: "",
    },
    flatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

flatSchema.index(
  { buildingName: 1, block: 1, flatNumber: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Flat = mongoose.model("Flat", flatSchema);

export default Flat;
