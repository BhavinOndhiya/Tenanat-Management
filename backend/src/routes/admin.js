import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/roleCheck.js";
import User from "../models/User.js";
import Flat from "../models/Flat.js";
import UserFlat from "../models/UserFlat.js";
import Tenant from "../models/Tenant.js";
import Complaint from "../models/Complaint.js";
import Announcement from "../models/Announcement.js";
import Event from "../models/Event.js";
import EventParticipant from "../models/EventParticipant.js";
import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import MaintenancePayment from "../models/MaintenancePayment.js";
import {
  PAYMENT_SOURCE,
  PAYMENT_STATE,
  recalculateInvoiceTotals,
  sumApprovedPaymentsByInvoice,
} from "../services/billingPaymentService.js";
import {
  findInvoicesRequiringReminders,
  getResidentsForFlat,
  logReminder,
  reminderAlreadySentToday,
  sendEmailReminder,
  sendWhatsAppReminder,
} from "../services/billingReminderService.js";
const buildDateRangeFilter = (from, to) => {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(from);
    }
    if (to) {
      filter.createdAt.$lte = new Date(to);
    }
  }
  return filter;
};

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeComplaintListItem = (complaint) => ({
  id: complaint._id.toString(),
  title: complaint.title,
  status: complaint.status,
  createdAt: complaint.createdAt,
  citizen: complaint.userId
    ? {
        id: complaint.userId._id.toString(),
        name: complaint.userId.name,
        email: complaint.userId.email,
      }
    : null,
  flat: complaint.flatId
    ? {
        id: complaint.flatId._id.toString(),
        buildingName: complaint.flatId.buildingName,
        block: complaint.flatId.block,
        flatNumber: complaint.flatId.flatNumber,
      }
    : null,
});

const convertToCsv = (rows, columns) => {
  const header = columns.map((col) => col.header).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const value = col.accessor(row);
        const stringValue =
          value === null || value === undefined ? "" : String(value);
        const escaped = stringValue.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
};

const computeDefaultDueDate = (month, year) => {
  const dueMonthIndex = month === 12 ? 0 : month;
  const dueYear = month === 12 ? year + 1 : year;
  return new Date(dueYear, dueMonthIndex, 10);
};

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const sanitizeFlat = (flat) => ({
  id: flat._id.toString(),
  buildingName: flat.buildingName,
  block: flat.block,
  flatNumber: flat.flatNumber,
  floor: flat.floor,
  isActive: flat.isActive,
  createdAt: flat.createdAt,
});

const sanitizeAnnouncement = (announcement) => ({
  id: announcement._id.toString(),
  title: announcement.title,
  body: announcement.body,
  type: announcement.type,
  targetBuilding: announcement.targetBuilding,
  targetFlat: announcement.targetFlatId
    ? {
        id: announcement.targetFlatId._id.toString(),
        buildingName: announcement.targetFlatId.buildingName,
        flatNumber: announcement.targetFlatId.flatNumber,
      }
    : null,
  isUrgent: announcement.isUrgent,
  startsAt: announcement.startsAt,
  endsAt: announcement.endsAt,
  status: announcement.status,
  createdAt: announcement.createdAt,
  createdBy: announcement.createdBy
    ? {
        id: announcement.createdBy._id.toString(),
        name: announcement.createdBy.name,
        email: announcement.createdBy.email,
      }
    : null,
});

const sanitizeEvent = (event, counters = {}, viewerStatus = null) => ({
  id: event._id.toString(),
  title: event.title,
  description: event.description,
  date: event.date,
  location: event.location,
  requiresApproval: event.requiresApproval,
  status: event.status,
  createdAt: event.createdAt,
  createdBy: event.createdBy
    ? {
        id: event.createdBy._id.toString(),
        name: event.createdBy.name,
        email: event.createdBy.email,
      }
    : null,
  participants: {
    going: counters.going || 0,
    interested: counters.interested || 0,
  },
  viewerStatus,
});

/**
 * USER MANAGEMENT
 */
router.get("/users", async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;
    const filter = {};

    if (role && role !== "ALL") {
      filter.role = role;
    }

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();

    res.json(users.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const { name, email, password, role = "CITIZEN" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required",
      });
    }

    if (!["CITIZEN", "OFFICER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      isActive: true,
    });

    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["CITIZEN", "OFFICER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ error: "isActive boolean is required in request body" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

/**
 * FLATS MANAGEMENT
 */
router.get("/flats", async (req, res, next) => {
  try {
    const { building, block, isActive } = req.query;
    const filter = {};

    if (building) {
      filter.buildingName = { $regex: building, $options: "i" };
    }

    if (block) {
      filter.block = { $regex: block, $options: "i" };
    }

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    const flats = await Flat.find(filter).sort({ buildingName: 1 }).lean();

    res.json(flats.map(sanitizeFlat));
  } catch (error) {
    next(error);
  }
});

router.post("/flats", async (req, res, next) => {
  try {
    const {
      buildingName,
      block,
      flatNumber,
      floor,
      isActive = true,
    } = req.body;

    if (!buildingName || !flatNumber) {
      return res
        .status(400)
        .json({ error: "buildingName and flatNumber are required" });
    }

    const flat = await Flat.create({
      buildingName,
      block,
      flatNumber,
      floor,
      isActive,
    });

    res.status(201).json(sanitizeFlat(flat));
  } catch (error) {
    // Handle duplicate flat constraint
    if (error?.code === 11000) {
      return res
        .status(400)
        .json({ error: "Flat already exists in this building/block" });
    }
    next(error);
  }
});

router.patch("/flats/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { buildingName, block, flatNumber, floor, isActive } = req.body;

    const updateData = {};
    if (typeof buildingName !== "undefined")
      updateData.buildingName = buildingName;
    if (typeof block !== "undefined") updateData.block = block;
    if (typeof flatNumber !== "undefined") updateData.flatNumber = flatNumber;
    if (typeof floor !== "undefined") updateData.floor = floor;
    if (typeof isActive !== "undefined") updateData.isActive = isActive;

    const flat = await Flat.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!flat) {
      return res.status(404).json({ error: "Flat not found" });
    }

    res.json(sanitizeFlat(flat));
  } catch (error) {
    next(error);
  }
});

router.delete("/flats/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const hasAssignments = await UserFlat.exists({ flatId: id });
    if (hasAssignments) {
      return res
        .status(400)
        .json({ error: "Cannot delete flat with existing assignments" });
    }

    const linkedComplaints = await Complaint.exists({ flatId: id });
    if (linkedComplaints) {
      return res
        .status(400)
        .json({ error: "Cannot delete flat linked to complaints" });
    }

    const result = await Flat.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Flat not found" });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * FLAT ASSIGNMENTS
 */
router.get("/flat-assignments", async (req, res, next) => {
  try {
    const assignments = await UserFlat.find({})
      .populate("userId", "name email role")
      .populate("flatId", "buildingName block flatNumber floor")
      .sort({ createdAt: -1 })
      .lean();

    const serialized = assignments.map((assignment) => ({
      id: assignment._id.toString(),
      relation: assignment.relation,
      isPrimary: assignment.isPrimary,
      user: assignment.userId
        ? {
            id: assignment.userId._id.toString(),
            name: assignment.userId.name,
            email: assignment.userId.email,
            role: assignment.userId.role,
          }
        : null,
      flat: assignment.flatId
        ? {
            id: assignment.flatId._id.toString(),
            buildingName: assignment.flatId.buildingName,
            block: assignment.flatId.block,
            flatNumber: assignment.flatId.flatNumber,
            floor: assignment.flatId.floor,
          }
        : null,
    }));

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

router.post("/flat-assignments", async (req, res, next) => {
  try {
    const { userId, flatId, relation = "OWNER", isPrimary = false } = req.body;

    if (!userId || !flatId) {
      return res
        .status(400)
        .json({ error: "userId and flatId are required for assignment" });
    }

    const userExists = await User.exists({ _id: userId });
    const flatExists = await Flat.exists({ _id: flatId });

    if (!userExists || !flatExists) {
      return res.status(404).json({ error: "User or flat not found" });
    }

    if (!["OWNER", "TENANT", "FAMILY", "OTHER"].includes(relation)) {
      return res.status(400).json({ error: "Invalid relation type" });
    }

    if (isPrimary) {
      await UserFlat.updateMany(
        { userId: new mongoose.Types.ObjectId(userId) },
        { $set: { isPrimary: false } }
      );
    }

    const assignment = await UserFlat.create({
      userId,
      flatId,
      relation,
      isPrimary,
    });

    // If relation is TENANT, also create a Tenant record so owners can see it
    if (relation === "TENANT") {
      try {
        // Find the owner of the flat
        const ownerAssignment = await UserFlat.findOne({
          flatId,
          relation: "OWNER",
        });

        const ownerId = ownerAssignment
          ? ownerAssignment.userId.toString()
          : req.user.id; // Fallback to admin if no owner found

        // Get tenant user details and admin user details
        const tenantUser = await User.findById(userId);
        const adminUser = await User.findById(req.user.id).select("name");

        if (!tenantUser) {
          console.warn(
            `Tenant user ${userId} not found, skipping Tenant record creation`
          );
        } else {
          // Check if tenant record already exists for this flat+user
          const existingTenant = await Tenant.findOne({
            flatId,
            tenantUserId: userId,
            isActive: true,
          });

          if (!existingTenant) {
            // Create a basic Tenant record with default values
            // Owner can update rent details later via Tenant Management
            try {
              await Tenant.create({
                flatId,
                ownerId,
                tenantUserId: userId,
                rentAmount: 0, // Default, to be updated by owner
                rentDueDate: 1, // Default to 1st of month
                leaseStartDate: new Date(),
                leaseEndDate: null,
                contactPhone: tenantUser?.phone || "",
                contactEmail: tenantUser?.email || "",
                notes: `Assigned by ${adminUser?.name || "Admin"}`,
                roomType: "NON_AC",
                foodIncluded: false,
                roomNumber: "",
                sharing: 1,
                isActive: true,
              });
            } catch (createError) {
              // If creation fails (e.g., duplicate key), log but don't throw
              console.warn(
                "Could not create Tenant record (may already exist):",
                createError.message || createError
              );
            }
          }
        }
      } catch (tenantError) {
        // Log the error but don't fail the assignment
        // The UserFlat assignment should still succeed
        console.warn(
          "Error in Tenant record creation (non-critical):",
          tenantError.message || tenantError
        );
        // Continue with the assignment response - this error is not critical
      }
    }

    await assignment.populate([
      { path: "userId", select: "name email role" },
      { path: "flatId", select: "buildingName block flatNumber floor" },
    ]);
    const populated = assignment;

    res.status(201).json({
      id: populated._id.toString(),
      relation: populated.relation,
      isPrimary: populated.isPrimary,
      user: {
        id: populated.userId._id.toString(),
        name: populated.userId.name,
        email: populated.userId.email,
        role: populated.userId.role,
      },
      flat: {
        id: populated.flatId._id.toString(),
        buildingName: populated.flatId.buildingName,
        block: populated.flatId.block,
        flatNumber: populated.flatId.flatNumber,
        floor: populated.flatId.floor,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(400)
        .json({ error: "User already assigned to this flat" });
    }
    next(error);
  }
});

router.delete("/flat-assignments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get the assignment before deleting to check if it's a TENANT
    const assignment = await UserFlat.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // If it's a TENANT assignment, also deactivate the Tenant record
    if (assignment.relation === "TENANT") {
      await Tenant.updateMany(
        {
          flatId: assignment.flatId,
          tenantUserId: assignment.userId,
          isActive: true,
        },
        { $set: { isActive: false } }
      );
    }

    await UserFlat.findByIdAndDelete(id);

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/flats/detailed", async (req, res, next) => {
  try {
    const flats = await Flat.find({})
      .sort({ buildingName: 1, flatNumber: 1 })
      .lean();

    const assignments = await UserFlat.find({
      flatId: { $in: flats.map((flat) => flat._id) },
    })
      .populate("userId", "name email role")
      .lean();

    const assignmentsByFlat = assignments.reduce((acc, assignment) => {
      const key = assignment.flatId.toString();
      acc[key] = acc[key] || [];
      acc[key].push({
        id: assignment._id.toString(),
        relation: assignment.relation,
        isPrimary: assignment.isPrimary,
        user: assignment.userId
          ? {
              id: assignment.userId._id.toString(),
              name: assignment.userId.name,
              email: assignment.userId.email,
              role: assignment.userId.role,
            }
          : null,
      });
      return acc;
    }, {});

    const payload = flats.map((flat) => ({
      ...sanitizeFlat(flat),
      occupants: assignmentsByFlat[flat._id.toString()] || [],
    }));

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

/**
 * ANNOUNCEMENTS
 */
router.get("/announcements", async (req, res, next) => {
  try {
    const { type, status = "ACTIVE" } = req.query;
    const filter = { status };

    if (type && type !== "ALL") {
      filter.type = type;
    }

    const announcements = await Announcement.find(filter)
      .populate("targetFlatId", "buildingName flatNumber")
      .populate("createdBy", "name email")
      .sort({ isUrgent: -1, createdAt: -1 })
      .lean();

    res.json(announcements.map(sanitizeAnnouncement));
  } catch (error) {
    next(error);
  }
});

router.post("/announcements", async (req, res, next) => {
  try {
    const {
      title,
      body,
      type = "GENERAL",
      targetBuilding,
      targetFlatId,
      isUrgent = false,
      startsAt,
      endsAt,
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const announcement = await Announcement.create({
      title,
      body,
      type,
      targetBuilding,
      targetFlatId: targetFlatId || null,
      isUrgent,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdBy: req.user.id,
    });

    const populated = await announcement
      .populate("targetFlatId", "buildingName flatNumber")
      .populate("createdBy", "name email");

    res.status(201).json(sanitizeAnnouncement(populated));
  } catch (error) {
    next(error);
  }
});

router.patch("/announcements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      body,
      type,
      targetBuilding,
      targetFlatId,
      isUrgent,
      startsAt,
      endsAt,
      status,
    } = req.body;

    const updateData = {};
    if (typeof title !== "undefined") updateData.title = title;
    if (typeof body !== "undefined") updateData.body = body;
    if (typeof type !== "undefined") updateData.type = type;
    if (typeof targetBuilding !== "undefined")
      updateData.targetBuilding = targetBuilding;
    if (typeof targetFlatId !== "undefined")
      updateData.targetFlatId = targetFlatId || null;
    if (typeof isUrgent !== "undefined") updateData.isUrgent = isUrgent;
    if (typeof startsAt !== "undefined")
      updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (typeof endsAt !== "undefined")
      updateData.endsAt = endsAt ? new Date(endsAt) : null;
    if (typeof status !== "undefined") updateData.status = status;

    const announcement = await Announcement.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("targetFlatId", "buildingName flatNumber")
      .populate("createdBy", "name email");

    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(sanitizeAnnouncement(announcement));
  } catch (error) {
    next(error);
  }
});

router.delete("/announcements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { status: "ARCHIVED" },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/announcements/all", async (req, res, next) => {
  try {
    const announcements = await Announcement.find({})
      .populate("targetFlatId", "buildingName flatNumber")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(announcements.map(sanitizeAnnouncement));
  } catch (error) {
    next(error);
  }
});

/**
 * MAINTENANCE BILLING
 */
router.post("/billing/generate", async (req, res, next) => {
  try {
    const { month, year, flatIds, amount, dueDate } = req.body;

    const monthNum = Number(month);
    const yearNum = Number(year);
    const amountNum = Number(amount);

    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid month. Use 1-12." });
    }

    if (!Number.isInteger(yearNum) || yearNum < 2000) {
      return res.status(400).json({ error: "Invalid year." });
    }

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be a positive number." });
    }

    let dueDateOverride = null;
    if (dueDate) {
      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: "Invalid dueDate." });
      }
      dueDateOverride = parsedDueDate;
    }

    let flatFilter = {};
    if (Array.isArray(flatIds) && flatIds.length > 0) {
      try {
        flatFilter._id = {
          $in: flatIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      } catch (error) {
        return res.status(400).json({ error: "Invalid flatIds provided." });
      }
    } else {
      flatFilter.isActive = true;
    }

    const targetFlats = await Flat.find(flatFilter).select("_id").lean();
    const totalTargets = targetFlats.length;

    if (totalTargets === 0) {
      return res.json({
        month: monthNum,
        year: yearNum,
        totalTargets: 0,
        createdCount: 0,
        skippedExistingCount: 0,
      });
    }

    const existingInvoices = await MaintenanceInvoice.find({
      month: monthNum,
      year: yearNum,
      flat: { $in: targetFlats.map((flat) => flat._id) },
    })
      .select("flat")
      .lean();

    const existingSet = new Set(
      existingInvoices.map((invoice) => invoice.flat.toString())
    );

    let createdCount = 0;
    let skippedExistingCount = 0;

    for (const flat of targetFlats) {
      if (existingSet.has(flat._id.toString())) {
        skippedExistingCount++;
        continue;
      }

      const invoiceDueDate = dueDateOverride
        ? new Date(dueDateOverride)
        : computeDefaultDueDate(monthNum, yearNum);

      try {
        await MaintenanceInvoice.create({
          flat: flat._id,
          month: monthNum,
          year: yearNum,
          amount: amountNum,
          dueDate: invoiceDueDate,
          status: "PENDING",
        });
        createdCount++;
      } catch (error) {
        if (error?.code === 11000) {
          skippedExistingCount++;
        } else {
          throw error;
        }
      }
    }

    res.json({
      month: monthNum,
      year: yearNum,
      totalTargets,
      createdCount,
      skippedExistingCount,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/billing/invoices", async (req, res, next) => {
  try {
    const { flatId, status, month, year, page = 1, pageSize = 20 } = req.query;

    const query = {};

    if (flatId) {
      if (!mongoose.Types.ObjectId.isValid(flatId)) {
        return res.status(400).json({ error: "Invalid flatId" });
      }
      query.flat = new mongoose.Types.ObjectId(flatId);
    }

    if (status) {
      query.status = status;
    }

    if (month) {
      const monthNum = Number(month);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ error: "Invalid month" });
      }
      query.month = monthNum;
    }

    if (year) {
      const yearNum = Number(year);
      if (!Number.isInteger(yearNum) || yearNum < 2000) {
        return res.status(400).json({ error: "Invalid year" });
      }
      query.year = yearNum;
    }

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedPageSize = Math.min(
      Math.max(parseInt(pageSize, 10) || 20, 1),
      100
    );
    const skip = (parsedPage - 1) * parsedPageSize;

    const [total, invoices] = await Promise.all([
      MaintenanceInvoice.countDocuments(query),
      MaintenanceInvoice.find(query)
        .populate("flat", "buildingName block flatNumber floor")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedPageSize)
        .lean(),
    ]);

    if (invoices.length === 0) {
      return res.json({
        items: [],
        page: parsedPage,
        pageSize: parsedPageSize,
        total,
      });
    }

    const invoiceIds = invoices.map((invoice) => invoice._id);

    const totalsMap = await sumApprovedPaymentsByInvoice(invoiceIds);

    const items = invoices.map((invoice) => {
      const invoiceId = invoice._id.toString();
      const totalPaid = totalsMap[invoiceId] || 0;
      const outstanding = Math.max(invoice.amount - totalPaid, 0);

      return {
        ...invoice,
        totalPaid,
        outstanding,
      };
    });

    res.json({
      items,
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/billing/invoices/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await MaintenanceInvoice.findById(id)
      .populate("flat", "buildingName block flatNumber floor")
      .lean();

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const payments = await MaintenancePayment.find({
      invoice: invoice._id,
    })
      .populate("paidByUser", "name email role")
      .sort({ paidAt: -1 })
      .lean();

    const totalsMap = await sumApprovedPaymentsByInvoice([invoice._id]);
    const totalPaid = totalsMap[invoice._id.toString()] || 0;
    const outstanding = Math.max(invoice.amount - totalPaid, 0);

    res.json({
      invoice,
      payments,
      totalPaid,
      outstanding,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * EVENTS MANAGEMENT
 */
router.get("/events", async (req, res, next) => {
  try {
    const events = await Event.find({})
      .populate("createdBy", "name email")
      .sort({ date: 1 })
      .lean();

    const eventIds = events.map((e) => e._id);

    const participantCounts = await EventParticipant.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: { eventId: "$eventId", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const countersMap = {};
    participantCounts.forEach((item) => {
      const eventId = item._id.eventId.toString();
      const statusKey = item._id.status.toLowerCase();
      countersMap[eventId] = countersMap[eventId] || {};
      countersMap[eventId][statusKey] = item.count;
    });

    const serialized = events.map((event) =>
      sanitizeEvent(event, countersMap[event._id.toString()])
    );

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      location,
      requiresApproval = false,
    } = req.body;

    if (!title || !description || !date || !location) {
      return res
        .status(400)
        .json({ error: "title, description, date, and location are required" });
    }

    const event = await Event.create({
      title,
      description,
      date: new Date(date),
      location,
      requiresApproval,
      status: requiresApproval ? "PENDING" : "PUBLISHED",
      createdBy: req.user.id,
    });

    const populated = await event.populate("createdBy", "name email");

    res.status(201).json(sanitizeEvent(populated));
  } catch (error) {
    next(error);
  }
});

router.patch("/events/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, status, requiresApproval } =
      req.body;

    const updateData = {};
    if (typeof title !== "undefined") updateData.title = title;
    if (typeof description !== "undefined")
      updateData.description = description;
    if (typeof date !== "undefined") updateData.date = new Date(date);
    if (typeof location !== "undefined") updateData.location = location;
    if (typeof status !== "undefined") updateData.status = status;
    if (typeof requiresApproval !== "undefined")
      updateData.requiresApproval = requiresApproval;

    const event = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const counters = await EventParticipant.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counterMap = {};
    counters.forEach((row) => {
      counterMap[row._id.toLowerCase()] = row.count;
    });

    res.json(sanitizeEvent(event, counterMap));
  } catch (error) {
    next(error);
  }
});

router.delete("/events/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    await EventParticipant.deleteMany({ eventId: id });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/events/all", async (req, res, next) => {
  try {
    const events = await Event.find({})
      .populate("createdBy", "name email")
      .sort({ date: -1 })
      .lean();

    const eventIds = events.map((event) => event._id);
    const participantCounts = await EventParticipant.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: { eventId: "$eventId", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const countersMap = {};
    participantCounts.forEach((row) => {
      const eventId = row._id.eventId.toString();
      const statusKey = row._id.status.toLowerCase();
      countersMap[eventId] = countersMap[eventId] || {};
      countersMap[eventId][statusKey] = row.count;
    });

    res.json(
      events.map((event) =>
        sanitizeEvent(event, countersMap[event._id.toString()])
      )
    );
  } catch (error) {
    next(error);
  }
});

/**
 * COMPLAINT DRILLDOWNS
 */
const fetchComplaints = async ({ status, from, to, search, category }) => {
  const filter = {
    ...buildDateRangeFilter(from, to),
  };

  if (status) {
    if (typeof status === "string") {
      if (status !== "ALL") {
        filter.status = status;
      }
    } else {
      filter.status = status;
    }
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (category) {
    filter.category = { $regex: escapeRegex(category), $options: "i" };
  }

  return Complaint.find(filter)
    .populate("userId", "name email")
    .populate("flatId", "buildingName block flatNumber")
    .sort({ createdAt: -1 })
    .lean();
};

router.get("/complaints/all", async (req, res, next) => {
  try {
    const { from, to, search, status, category } = req.query;
    const complaints = await fetchComplaints({
      status,
      from,
      to,
      search,
      category,
    });
    res.json(complaints.map(sanitizeComplaintListItem));
  } catch (error) {
    next(error);
  }
});

router.get("/complaints/open", async (req, res, next) => {
  try {
    const { from, to, search, category } = req.query;
    const complaints = await fetchComplaints({
      status: { $in: ["NEW", "IN_PROGRESS"] },
      from,
      to,
      search,
      category,
    });
    res.json(complaints.map(sanitizeComplaintListItem));
  } catch (error) {
    next(error);
  }
});

router.get("/complaints/resolved", async (req, res, next) => {
  try {
    const { from, to, search, category } = req.query;
    const complaints = await fetchComplaints({
      status: "RESOLVED",
      from,
      to,
      search,
      category,
    });
    res.json(complaints.map(sanitizeComplaintListItem));
  } catch (error) {
    next(error);
  }
});

/**
 * DASHBOARD / ANALYTICS
 */
router.get("/dashboard/summary", async (req, res, next) => {
  try {
    const now = new Date();

    const [
      citizenCount,
      flatCount,
      statusAggregation,
      categoryAggregation,
      activeAnnouncementCount,
      upcomingEventsCount,
    ] = await Promise.all([
      User.countDocuments({ role: "CITIZEN" }),
      Flat.countDocuments({}),
      Complaint.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
      Announcement.countDocuments({
        status: "ACTIVE",
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      }),
      Event.countDocuments({
        status: { $ne: "CANCELLED" },
        date: { $gte: now },
      }),
    ]);

    const statusMap = statusAggregation.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    const categoryData = categoryAggregation.map((row) => ({
      category: row._id || "Uncategorized",
      count: row.count,
    }));

    res.json({
      stats: {
        totalCitizens: citizenCount,
        totalFlats: flatCount,
        openComplaints: (statusMap.NEW || 0) + (statusMap.IN_PROGRESS || 0),
        resolvedComplaints: statusMap.RESOLVED || 0,
        activeAnnouncements: activeAnnouncementCount,
        upcomingEvents: upcomingEventsCount,
      },
      charts: {
        complaintsByStatus: [
          { status: "NEW", count: statusMap.NEW || 0 },
          { status: "IN_PROGRESS", count: statusMap.IN_PROGRESS || 0 },
          { status: "RESOLVED", count: statusMap.RESOLVED || 0 },
        ],
        complaintsByCategory: categoryData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * CSV EXPORTS
 */
router.get("/export/:type", async (req, res, next) => {
  try {
    const { type } = req.params;
    const { from, to, search, status, category } = req.query;
    let csv = "";
    let filename = `${type}-${Date.now()}.csv`;

    switch (type) {
      case "complaints_all": {
        const complaints = await fetchComplaints({
          status,
          from,
          to,
          search,
          category,
        });
        const rows = complaints.map(sanitizeComplaintListItem);
        const columns = [
          { header: "ID", accessor: (row) => row.id },
          { header: "Title", accessor: (row) => row.title },
          {
            header: "Citizen",
            accessor: (row) => row.citizen?.name || row.citizen?.email || "",
          },
          {
            header: "Flat",
            accessor: (row) =>
              row.flat ? `${row.flat.buildingName} ${row.flat.flatNumber}` : "",
          },
          { header: "Status", accessor: (row) => row.status },
          { header: "Created At", accessor: (row) => row.createdAt },
        ];
        csv = convertToCsv(rows, columns);
        break;
      }
      case "complaints_open": {
        const complaints = await fetchComplaints({
          status: { $in: ["NEW", "IN_PROGRESS"] },
          from,
          to,
          search,
          category,
        });
        const rows = complaints.map(sanitizeComplaintListItem);
        const columns = [
          { header: "ID", accessor: (row) => row.id },
          { header: "Title", accessor: (row) => row.title },
          {
            header: "Citizen",
            accessor: (row) => row.citizen?.name || row.citizen?.email || "",
          },
          {
            header: "Flat",
            accessor: (row) =>
              row.flat ? `${row.flat.buildingName} ${row.flat.flatNumber}` : "",
          },
          { header: "Status", accessor: (row) => row.status },
          { header: "Created At", accessor: (row) => row.createdAt },
        ];
        csv = convertToCsv(rows, columns);
        break;
      }
      case "complaints_resolved": {
        const complaints = await fetchComplaints({
          status: "RESOLVED",
          from,
          to,
          search,
          category,
        });
        const rows = complaints.map(sanitizeComplaintListItem);
        const columns = [
          { header: "ID", accessor: (row) => row.id },
          { header: "Title", accessor: (row) => row.title },
          {
            header: "Citizen",
            accessor: (row) => row.citizen?.name || row.citizen?.email || "",
          },
          {
            header: "Flat",
            accessor: (row) =>
              row.flat ? `${row.flat.buildingName} ${row.flat.flatNumber}` : "",
          },
          { header: "Status", accessor: (row) => row.status },
          { header: "Created At", accessor: (row) => row.createdAt },
        ];
        csv = convertToCsv(rows, columns);
        break;
      }
      case "announcements": {
        const announcements = await Announcement.find({})
          .sort({ createdAt: -1 })
          .lean();
        const columns = [
          { header: "ID", accessor: (row) => row._id.toString() },
          { header: "Title", accessor: (row) => row.title },
          { header: "Type", accessor: (row) => row.type },
          { header: "Target Building", accessor: (row) => row.targetBuilding },
          { header: "Is Urgent", accessor: (row) => row.isUrgent },
          { header: "Starts At", accessor: (row) => row.startsAt },
          { header: "Ends At", accessor: (row) => row.endsAt },
        ];
        csv = convertToCsv(announcements, columns);
        break;
      }
      case "events": {
        const events = await Event.find({})
          .sort({ date: -1 })
          .populate("createdBy", "name email")
          .lean();
        const columns = [
          { header: "ID", accessor: (row) => row._id.toString() },
          { header: "Title", accessor: (row) => row.title },
          { header: "Date", accessor: (row) => row.date },
          { header: "Location", accessor: (row) => row.location },
          {
            header: "Created By",
            accessor: (row) =>
              row.createdBy?.name || row.createdBy?.email || "",
          },
          { header: "Status", accessor: (row) => row.status },
        ];
        csv = convertToCsv(events, columns);
        break;
      }
      default:
        return res.status(400).json({ error: "Unsupported export type" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

router.post("/billing/invoices/:id/payments", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, method, reference } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be a positive number" });
    }

    const allowedMethods = ["ONLINE", "CASH", "CHEQUE", "OTHER"];
    if (!method || !allowedMethods.includes(method)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const invoice = await MaintenanceInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    await MaintenancePayment.create({
      invoice: invoice._id,
      paidByUser: req.user.id,
      amount: amountNum,
      method,
      reference: reference || undefined,
      paidAt: new Date(),
      source: PAYMENT_SOURCE.ADMIN,
      state: PAYMENT_STATE.APPROVED,
    });

    const totals = await recalculateInvoiceTotals(invoice._id);

    res.json({
      invoice: totals?.invoice || invoice,
      totalPaid: totals?.totalPaid ?? 0,
      outstanding: totals?.outstanding ?? invoice.amount,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/billing/invoices/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, dueDate, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await MaintenanceInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updates = {};

    if (typeof amount !== "undefined") {
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return res
          .status(400)
          .json({ error: "Amount must be a positive number" });
      }
      updates.amount = amountNum;
    }

    if (typeof dueDate !== "undefined") {
      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: "Invalid dueDate" });
      }
      updates.dueDate = parsedDueDate;
    }

    if (typeof notes !== "undefined") {
      updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    Object.assign(invoice, updates);
    await invoice.save();

    const totals = await recalculateInvoiceTotals(invoice._id);

    res.json({
      invoice: totals?.invoice || invoice,
      totalPaid: totals?.totalPaid ?? 0,
      outstanding: totals?.outstanding ?? invoice.amount,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/billing/summary", async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const filters = {};
    if (month) {
      const monthNum = Number(month);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ error: "Invalid month" });
      }
      filters.month = monthNum;
    }

    if (year) {
      const yearNum = Number(year);
      if (!Number.isInteger(yearNum) || yearNum < 2000) {
        return res.status(400).json({ error: "Invalid year" });
      }
      filters.year = yearNum;
    }

    const invoices = await MaintenanceInvoice.find(filters)
      .select("_id amount dueDate status")
      .lean();

    if (invoices.length === 0) {
      return res.json({
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        countOverdue: 0,
      });
    }

    const invoiceIds = invoices.map((invoice) => invoice._id);

    const paymentMap = await sumApprovedPaymentsByInvoice(invoiceIds);

    let totalAmount = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let countOverdue = 0;
    const today = new Date();

    invoices.forEach((invoice) => {
      const invoiceId = invoice._id.toString();
      const paidAmount = paymentMap[invoiceId] || 0;
      const outstanding = Math.max(invoice.amount - paidAmount, 0);

      totalAmount += invoice.amount;
      totalPaid += paidAmount;
      totalOutstanding += outstanding;

      if (invoice.status === "OVERDUE") {
        countOverdue++;
      } else if (
        invoice.status !== "PAID" &&
        outstanding > 0 &&
        invoice.dueDate < today
      ) {
        countOverdue++;
      }
    });

    res.json({
      totalInvoices: invoices.length,
      totalAmount,
      totalPaid,
      totalOutstanding,
      countOverdue,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/billing/run-reminders", async (req, res, next) => {
  try {
    const { daysBeforeDue = 0 } = req.body || {};
    const parsedDays = Math.max(Number(daysBeforeDue) || 0, 0);
    const invoices = await findInvoicesRequiringReminders(parsedDays);

    let remindersSent = 0;
    let skippedNoContact = 0;
    const byChannel = { EMAIL: 0, WHATSAPP: 0 };
    let checkedInvoices = invoices.length;

    for (const invoice of invoices) {
      const flatId = invoice.flat?._id?.toString() || invoice.flat?.toString();
      if (!flatId) continue;

      const residents = await getResidentsForFlat(flatId);
      if (!residents.length) continue;

      for (const user of residents) {
        if (!user?._id) continue;

        const alreadySent = await reminderAlreadySentToday(
          invoice._id,
          user._id
        );
        if (alreadySent) {
          continue;
        }

        const preferred = user.preferredBillingChannel || "EMAIL";
        const hasWhatsApp = !!(user.whatsappNumber || user.phoneNumber);
        const hasEmail = !!user.email;

        let channelOrder = [];
        if (preferred === "WHATSAPP") {
          channelOrder = ["WHATSAPP", "EMAIL"];
        } else if (preferred === "BOTH") {
          channelOrder = ["WHATSAPP", "EMAIL"];
        } else {
          channelOrder = ["EMAIL", "WHATSAPP"];
        }

        channelOrder = channelOrder.filter((channel) => {
          if (channel === "WHATSAPP") return hasWhatsApp;
          if (channel === "EMAIL") return hasEmail;
          return false;
        });

        if (channelOrder.length === 0) {
          skippedNoContact++;
          continue;
        }

        let sent = false;
        let lastError = null;

        for (const channel of channelOrder) {
          try {
            if (channel === "WHATSAPP") {
              await sendWhatsAppReminder(user, invoice);
            } else {
              await sendEmailReminder(user, invoice);
            }

            await logReminder({
              invoiceId: invoice._id,
              userId: user._id,
              channel,
              status: "SUCCESS",
            });

            remindersSent++;
            byChannel[channel] = (byChannel[channel] || 0) + 1;
            sent = true;
            break;
          } catch (error) {
            lastError = error;
            await logReminder({
              invoiceId: invoice._id,
              userId: user._id,
              channel,
              status: "FAILED",
              error: error.message,
            });
          }
        }

        if (!sent) {
          skippedNoContact++;
          if (lastError) {
            console.warn(
              `[BillingReminder] Failed for user ${user._id}:`,
              lastError.message
            );
          }
        }
      }
    }

    res.json({
      checkedInvoices,
      remindersSent,
      byChannel,
      skippedNoContact,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
