import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import UserFlat from "../models/UserFlat.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/my", async (req, res, next) => {
  try {
    const assignments = await UserFlat.find({ userId: req.user.id })
      .populate("flatId", "buildingName block flatNumber floor")
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean();

    const serialized = assignments
      .filter((assignment) => !!assignment.flatId)
      .map((assignment) => ({
        id: assignment._id.toString(),
        relation: assignment.relation,
        isPrimary: assignment.isPrimary,
        flat: {
          id: assignment.flatId._id.toString(),
          buildingName: assignment.flatId.buildingName,
          block: assignment.flatId.block,
          flatNumber: assignment.flatId.flatNumber,
          floor: assignment.flatId.floor,
        },
      }));

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

export default router;
