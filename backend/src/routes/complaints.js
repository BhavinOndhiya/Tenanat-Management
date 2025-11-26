import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import Complaint from "../models/Complaint.js";
import UserFlat from "../models/UserFlat.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/complaints
router.post("/", async (req, res, next) => {
  try {
    const { title, description, category, flatId } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ error: "Title, description, and category are required" });
    }

    // Determine flat association (explicit or primary assignment)
    let resolvedFlatId = null;

    if (flatId) {
      const assignment = await UserFlat.findOne({
        userId: req.user.id,
        flatId,
      });

      if (!assignment) {
        return res
          .status(400)
          .json({ error: "You are not assigned to the selected flat" });
      }
      resolvedFlatId = assignment.flatId;
    } else {
      const defaultAssignment = await UserFlat.findOne({
        userId: req.user.id,
      })
        .sort({ isPrimary: -1, createdAt: 1 })
        .lean();

      if (defaultAssignment?.flatId) {
        resolvedFlatId = defaultAssignment.flatId;
      }
    }

    // Create complaint
    const complaint = await Complaint.create({
      title,
      description,
      category,
      status: "NEW",
      userId: new mongoose.Types.ObjectId(req.user.id),
      flatId: resolvedFlatId,
    });

    // Transform to include id field
    const complaintObj = complaint.toObject();
    complaintObj.id = complaintObj._id.toString();
    delete complaintObj._id;

    if (resolvedFlatId) {
      await complaint.populate("flatId", "buildingName block flatNumber");
      complaintObj.flat = {
        id: complaint.flatId._id.toString(),
        buildingName: complaint.flatId.buildingName,
        block: complaint.flatId.block,
        flatNumber: complaint.flatId.flatNumber,
      };
    } else {
      complaintObj.flat = null;
    }
    delete complaintObj.flatId;

    res.status(201).json(complaintObj);
  } catch (error) {
    next(error);
  }
});

// GET /api/complaints/my
router.get("/my", async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
    })
      .populate("flatId", "buildingName block flatNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Transform to include id field instead of _id
    const transformedComplaints = complaints.map((complaint) => {
      const obj = { ...complaint };
      obj.id = obj._id.toString();
      delete obj._id;
      obj.flat = complaint.flatId
        ? {
            id: complaint.flatId._id.toString(),
            buildingName: complaint.flatId.buildingName,
            block: complaint.flatId.block,
            flatNumber: complaint.flatId.flatNumber,
          }
        : null;
      delete obj.flatId;
      return obj;
    });

    res.json(transformedComplaints);
  } catch (error) {
    next(error);
  }
});

export default router;
