import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Announcement from "../models/Announcement.js";
import UserFlat from "../models/UserFlat.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    const [assignments, announcements] = await Promise.all([
      UserFlat.find({ userId: req.user.id })
        .populate("flatId", "buildingName block flatNumber")
        .lean(),
      Announcement.find({
        status: "ACTIVE",
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .populate("targetFlatId", "buildingName block flatNumber")
        .populate("createdBy", "name email")
        .sort({ isUrgent: -1, createdAt: -1 })
        .lean(),
    ]);

    const buildingSet = new Set();
    const flatIdSet = new Set();

    assignments.forEach((assignment) => {
      if (assignment.flatId) {
        flatIdSet.add(assignment.flatId._id.toString());
        if (assignment.flatId.buildingName) {
          buildingSet.add(assignment.flatId.buildingName.toLowerCase());
        }
      }
    });

    const filtered = announcements.filter((announcement) => {
      if (announcement.targetFlatId) {
        return flatIdSet.has(announcement.targetFlatId._id.toString());
      }
      if (announcement.targetBuilding) {
        return buildingSet.has(announcement.targetBuilding.toLowerCase());
      }
      return true;
    });

    const serialized = filtered.map((announcement) => ({
      id: announcement._id.toString(),
      title: announcement.title,
      body: announcement.body,
      type: announcement.type,
      isUrgent: announcement.isUrgent,
      startsAt: announcement.startsAt,
      endsAt: announcement.endsAt,
      targetBuilding: announcement.targetBuilding,
      targetFlat: announcement.targetFlatId
        ? {
            id: announcement.targetFlatId._id.toString(),
            buildingName: announcement.targetFlatId.buildingName,
            flatNumber: announcement.targetFlatId.flatNumber,
          }
        : null,
      createdBy: announcement.createdBy
        ? {
            id: announcement.createdBy._id.toString(),
            name: announcement.createdBy.name,
          }
        : null,
      createdAt: announcement.createdAt,
    }));

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

export default router;
