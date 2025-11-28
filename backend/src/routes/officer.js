import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import { requireOfficer } from "../middleware/roleCheck.js";
import Complaint from "../models/Complaint.js";

const router = express.Router();

router.use(authenticateToken);
router.use(requireOfficer);

const serializeComplaint = (complaint) => {
  const obj = complaint.toObject ? complaint.toObject() : complaint;
  const payload = {
    id: obj._id.toString(),
    title: obj.title,
    description: obj.description,
    category: obj.category,
    priority: obj.priority,
    status: obj.status,
    type: obj.type,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    citizen: obj.userId
      ? {
          id: obj.userId._id.toString(),
          name: obj.userId.name,
          email: obj.userId.email,
        }
      : null,
    assignedOfficer: obj.assignedOfficerId
      ? {
          id: obj.assignedOfficerId._id.toString(),
          name: obj.assignedOfficerId.name,
          email: obj.assignedOfficerId.email,
        }
      : null,
    flat: obj.flatId
      ? {
          id: obj.flatId._id.toString(),
          buildingName: obj.flatId.buildingName,
          block: obj.flatId.block,
          flatNumber: obj.flatId.flatNumber,
          type: obj.flatId.type,
        }
      : null,
  };
  return payload;
};

router.get("/complaints", async (req, res, next) => {
  try {
    const complaints = await Complaint.find({})
      .populate("userId", "name email")
      .populate("assignedOfficerId", "name email")
      .populate("flatId", "buildingName block flatNumber type")
      .sort({ createdAt: -1 });

    res.json(complaints.map(serializeComplaint));
  } catch (error) {
    next(error);
  }
});

router.patch("/complaints/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email")
      .populate("assignedOfficerId", "name email")
      .populate("flatId", "buildingName block flatNumber type");

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(serializeComplaint(complaint));
  } catch (error) {
    next(error);
  }
});

router.patch("/complaints/:id/assign", async (req, res, next) => {
  try {
    const { id } = req.params;
    const officerId = req.user.id;

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { assignedOfficerId: new mongoose.Types.ObjectId(officerId) },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email")
      .populate("assignedOfficerId", "name email")
      .populate("flatId", "buildingName block flatNumber type");

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(serializeComplaint(complaint));
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [openCount, inProgressCount, recentlyResolved] = await Promise.all([
      Complaint.countDocuments({ status: "OPEN" }),
      Complaint.countDocuments({ status: "IN_PROGRESS" }),
      Complaint.countDocuments({
        status: { $in: ["RESOLVED", "CLOSED"] },
        updatedAt: { $gte: sevenDaysAgo },
      }),
    ]);

    res.json({
      newComplaints: openCount,
      inProgressComplaints: inProgressCount,
      resolvedLast7Days: recentlyResolved,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
