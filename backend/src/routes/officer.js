import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import { requireOfficer } from "../middleware/roleCheck.js";
import Complaint from "../models/Complaint.js";
import User from "../models/User.js";

const router = express.Router();

// All officer routes require authentication and officer role
router.use(authenticateToken);
router.use(requireOfficer);

// GET /api/officer/complaints
// Returns all complaints with citizen information
router.get("/complaints", async (req, res, next) => {
  try {
    const complaints = await Complaint.find({})
      .populate("userId", "name email")
      .populate("assignedOfficerId", "name email")
      .populate("flatId", "buildingName block flatNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Transform to include id field instead of _id
    const transformedComplaints = complaints.map((complaint) => {
      const obj = { ...complaint };
      obj.id = obj._id.toString();
      delete obj._id;

      // Transform citizen info
      if (obj.userId) {
        obj.citizen = {
          id: obj.userId._id.toString(),
          name: obj.userId.name,
          email: obj.userId.email,
        };
        delete obj.userId;
      } else {
        obj.citizen = null;
      }

      // Transform assigned officer info
      if (obj.assignedOfficerId) {
        obj.assignedOfficer = {
          id: obj.assignedOfficerId._id.toString(),
          name: obj.assignedOfficerId.name,
          email: obj.assignedOfficerId.email,
        };
        delete obj.assignedOfficerId;
      } else {
        obj.assignedOfficer = null;
      }

      if (obj.flatId) {
        obj.flat = {
          id: obj.flatId._id.toString(),
          buildingName: obj.flatId.buildingName,
          block: obj.flatId.block,
          flatNumber: obj.flatId.flatNumber,
        };
        delete obj.flatId;
      } else {
        obj.flat = null;
      }

      return obj;
    });

    res.json(transformedComplaints);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/officer/complaints/:id/status
// Update complaint status
router.patch("/complaints/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatuses = ["NEW", "IN_PROGRESS", "RESOLVED"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    // Find and update complaint
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email")
      .populate("assignedOfficerId", "name email")
      .populate("flatId", "buildingName block flatNumber")
      .lean();

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Transform response
    const transformed = { ...complaint };
    transformed.id = transformed._id.toString();
    delete transformed._id;

    if (transformed.userId) {
      transformed.citizen = {
        id: transformed.userId._id.toString(),
        name: transformed.userId.name,
        email: transformed.userId.email,
      };
      delete transformed.userId;
    }

    if (transformed.assignedOfficerId) {
      transformed.assignedOfficer = {
        id: transformed.assignedOfficerId._id.toString(),
        name: transformed.assignedOfficerId.name,
        email: transformed.assignedOfficerId.email,
      };
      delete transformed.assignedOfficerId;
    } else {
      transformed.assignedOfficer = null;
    }

    if (transformed.flatId) {
      transformed.flat = {
        id: transformed.flatId._id.toString(),
        buildingName: transformed.flatId.buildingName,
        block: transformed.flatId.block,
        flatNumber: transformed.flatId.flatNumber,
      };
      delete transformed.flatId;
    } else {
      transformed.flat = null;
    }

    res.json(transformed);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/officer/complaints/:id/assign
// Assign complaint to current logged-in officer
router.patch("/complaints/:id/assign", async (req, res, next) => {
  try {
    const { id } = req.params;
    const officerId = req.user.id; // Current logged-in officer

    // Find and update complaint
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { assignedOfficerId: new mongoose.Types.ObjectId(officerId) },
      { new: true, runValidators: true }
    )
      .populate("userId", "name email")
      .populate("assignedOfficerId", "name email")
      .populate("flatId", "buildingName block flatNumber")
      .lean();

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Transform response
    const transformed = { ...complaint };
    transformed.id = transformed._id.toString();
    delete transformed._id;

    if (transformed.userId) {
      transformed.citizen = {
        id: transformed.userId._id.toString(),
        name: transformed.userId.name,
        email: transformed.userId.email,
      };
      delete transformed.userId;
    }

    if (transformed.assignedOfficerId) {
      transformed.assignedOfficer = {
        id: transformed.assignedOfficerId._id.toString(),
        name: transformed.assignedOfficerId.name,
        email: transformed.assignedOfficerId.email,
      };
      delete transformed.assignedOfficerId;
    } else {
      transformed.assignedOfficer = null;
    }

    if (transformed.flatId) {
      transformed.flat = {
        id: transformed.flatId._id.toString(),
        buildingName: transformed.flatId.buildingName,
        block: transformed.flatId.block,
        flatNumber: transformed.flatId.flatNumber,
      };
      delete transformed.flatId;
    } else {
      transformed.flat = null;
    }

    res.json(transformed);
  } catch (error) {
    next(error);
  }
});

// GET /api/officer/summary
router.get("/summary", async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [newCount, inProgressCount, resolvedLastWeek] = await Promise.all([
      Complaint.countDocuments({ status: "NEW" }),
      Complaint.countDocuments({ status: "IN_PROGRESS" }),
      Complaint.countDocuments({
        status: "RESOLVED",
        updatedAt: { $gte: sevenDaysAgo },
      }),
    ]);

    res.json({
      newComplaints: newCount,
      inProgressComplaints: inProgressCount,
      resolvedLast7Days: resolvedLastWeek,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
