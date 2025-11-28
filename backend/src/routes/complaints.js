import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import Complaint from "../models/Complaint.js";
import Flat from "../models/Flat.js";
import UserFlat from "../models/UserFlat.js";
import User from "../models/User.js";

const router = express.Router();

router.use(authenticateToken);

const ALLOWED_ROLES = ["TENANT", "PG_TENANT", "ADMIN"];

const serializeComplaint = (complaint) => {
  const obj = complaint.toObject ? complaint.toObject() : complaint;
  return {
    id: obj._id.toString(),
    type: obj.type,
    title: obj.title,
    description: obj.description,
    category: obj.category,
    priority: obj.priority,
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    property: obj.propertyId
      ? {
          id: obj.propertyId._id
            ? obj.propertyId._id.toString()
            : obj.propertyId.toString(),
          buildingName:
            obj.propertyId.buildingName ||
            obj.metadata?.propertySnapshot?.buildingName,
          block: obj.propertyId.block || obj.metadata?.propertySnapshot?.block,
          flatNumber:
            obj.propertyId.flatNumber ||
            obj.metadata?.propertySnapshot?.flatNumber,
          type: obj.propertyId.type || obj.metadata?.propertySnapshot?.type,
        }
      : obj.metadata?.propertySnapshot || null,
    tenant: obj.tenantId
      ? {
          id: obj.tenantId._id
            ? obj.tenantId._id.toString()
            : obj.tenantId.toString(),
          name: obj.tenantId.name || obj.metadata?.tenantSnapshot?.name,
          email: obj.tenantId.email || obj.metadata?.tenantSnapshot?.email,
          phone: obj.tenantId.phone || obj.metadata?.tenantSnapshot?.phone,
        }
      : obj.metadata?.tenantSnapshot || null,
    ownerId: obj.ownerId?.toString(),
    comments: obj.comments || [],
  };
};

const resolveOwnerId = async (flat) => {
  if (flat.ownerId) {
    return flat.ownerId.toString();
  }
  const assignment = await UserFlat.findOne({
    flatId: flat._id,
    relation: "OWNER",
  }).lean();
  return assignment?.userId?.toString() || null;
};

const resolvePropertyForUser = async ({ user, requestedFlatId }) => {
  if (user.role === "ADMIN" && requestedFlatId) {
    const property = await Flat.findById(requestedFlatId);
    if (!property) {
      throw new Error("Flat not found");
    }
    return property;
  }

  if (user.role === "PG_TENANT") {
    if (!user.assignedProperty) {
      throw new Error("You are not assigned to any PG property");
    }
    const property = await Flat.findById(user.assignedProperty);
    if (!property) {
      throw new Error("Assigned property not found");
    }
    if (property.type !== "PG") {
      throw new Error("Assigned property is not a PG");
    }
    return property;
  }

  // For regular tenants (legacy flat owners)
  let resolvedFlatId = null;

  if (requestedFlatId) {
    const assignment = await UserFlat.findOne({
      userId: user._id,
      flatId: requestedFlatId,
    }).lean();
    if (!assignment) {
      throw new Error("You are not assigned to the selected flat");
    }
    resolvedFlatId = assignment.flatId;
  } else {
    const defaultAssignment = await UserFlat.findOne({
      userId: user._id,
    })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean();
    if (defaultAssignment?.flatId) {
      resolvedFlatId = defaultAssignment.flatId;
    }
  }

  if (!resolvedFlatId) {
    throw new Error("You are not assigned to any flat");
  }

  const property = await Flat.findById(resolvedFlatId);
  if (!property) {
    throw new Error("Flat not found");
  }
  if (property.type !== "FLAT") {
    throw new Error("Selected property is not a flat");
  }
  return property;
};

// POST /api/complaints
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      flatId,
      priority = "MEDIUM",
    } = req.body;
    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ error: "Title, description, and category are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res
        .status(403)
        .json({ error: "You are not allowed to create complaints" });
    }

    const property = await resolvePropertyForUser({
      user,
      requestedFlatId: flatId,
    });
    const ownerId = await resolveOwnerId(property);

    if (!ownerId) {
      return res
        .status(400)
        .json({ error: "No owner associated with the selected property" });
    }

    const complaint = await Complaint.create({
      type: property.type,
      tenantId: user._id,
      userId: user._id,
      ownerId,
      propertyId: property._id,
      flatId: property._id,
      title,
      description,
      category,
      priority,
      status: "OPEN",
      metadata: {
        tenantSnapshot: {
          name: user.name,
          email: user.email,
          phone: user.phone || "",
        },
        propertySnapshot: {
          buildingName: property.buildingName,
          block: property.block,
          flatNumber: property.flatNumber,
          type: property.type,
        },
      },
    });

    await complaint.populate([
      { path: "propertyId", select: "buildingName block flatNumber type" },
      { path: "tenantId", select: "name email phone" },
    ]);

    res.status(201).json(serializeComplaint(complaint));
  } catch (error) {
    if (error.message?.includes("assigned")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// GET /api/complaints/my
router.get("/my", async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      tenantId: new mongoose.Types.ObjectId(req.user.id),
    })
      .populate([
        { path: "propertyId", select: "buildingName block flatNumber type" },
      ])
      .sort({ createdAt: -1 });

    res.json(complaints.map(serializeComplaint));
  } catch (error) {
    next(error);
  }
});

export default router;
