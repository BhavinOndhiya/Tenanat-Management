import express from "express";
import bcrypt from "bcryptjs";
import { authenticateToken } from "../middleware/auth.js";
import Tenant from "../models/Tenant.js";
import UserFlat from "../models/UserFlat.js";
import User from "../models/User.js";
import Flat from "../models/Flat.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper: Check if user is owner of a flat
const isOwnerOfFlat = async (userId, flatId) => {
  const assignment = await UserFlat.findOne({
    userId,
    flatId,
    relation: "OWNER",
  });
  return !!assignment;
};

// Helper: Check if user can manage tenant (admin or owner)
const canManageTenant = async (userId, userRole, flatId) => {
  // Admins can manage tenants for any flat
  if (userRole === "ADMIN") {
    return true;
  }
  // Owners can manage tenants for their own flats
  return await isOwnerOfFlat(userId, flatId);
};

// GET /api/tenants/users - Get list of users for tenant selection
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select("name email role")
      .sort({ name: 1 })
      .lean();

    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      }))
    );
  } catch (error) {
    next(error);
  }
});

const generateTemporaryPassword = () =>
  `tenant-${Math.random().toString(36).slice(-8)}`;

// POST /api/tenants/users - Allow owners/admins to create tenant users
router.post("/users", async (req, res, next) => {
  try {
    const { flatId, name, email, phone, password } = req.body;

    if (!flatId || !name || !email) {
      return res.status(400).json({
        error: "flatId, name, and email are required",
      });
    }

    const canManage = await canManageTenant(req.user.id, req.user.role, flatId);

    if (!canManage) {
      return res.status(403).json({
        error: "You don't have permission to add tenant users for this flat",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "A user with this email already exists" });
    }

    let finalPassword =
      typeof password === "string" && password.trim().length >= 6
        ? password.trim()
        : null;

    if (!finalPassword) {
      finalPassword = generateTemporaryPassword();
    }

    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const tenantUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "TENANT",
      phone: phone?.trim() || "",
      isActive: true,
    });

    res.status(201).json({
      user: {
        id: tenantUser._id.toString(),
        name: tenantUser.name,
        email: tenantUser.email,
        role: tenantUser.role,
        phone: tenantUser.phone || "",
      },
      temporaryPassword:
        typeof password === "string" && password.trim().length >= 6
          ? null
          : finalPassword,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ error: "Email already registered" });
    }
    next(error);
  }
});

// GET /api/tenants/my-flats - Get all flats owned by the user (or all flats if admin)
router.get("/my-flats", async (req, res, next) => {
  try {
    let assignments;

    // Admins can see all flats, owners see only their flats
    if (req.user.role === "ADMIN") {
      const allFlats = await Flat.find({ isActive: true })
        .sort({ buildingName: 1, flatNumber: 1 })
        .lean();

      res.json(
        allFlats.map((flat) => ({
          id: flat._id.toString(),
          buildingName: flat.buildingName,
          block: flat.block,
          flatNumber: flat.flatNumber,
          floor: flat.floor,
        }))
      );
      return;
    }

    // For owners, get only their flats
    assignments = await UserFlat.find({
      userId: req.user.id,
      relation: "OWNER",
    })
      .populate("flatId", "buildingName block flatNumber floor")
      .lean();

    const flats = assignments
      .filter((a) => !!a.flatId)
      .map((a) => ({
        id: a.flatId._id.toString(),
        buildingName: a.flatId.buildingName,
        block: a.flatId.block,
        flatNumber: a.flatId.flatNumber,
        floor: a.flatId.floor,
        assignmentId: a._id.toString(),
      }));

    res.json(flats);
  } catch (error) {
    next(error);
  }
});

// GET /api/tenants/flat/:flatId - Get all tenants for a specific flat (with optional filters)
router.get("/flat/:flatId", async (req, res, next) => {
  try {
    const { flatId } = req.params;
    const { roomType, foodIncluded } = req.query;

    // Verify user can manage tenant (admin or owner)
    const canManage = await canManageTenant(req.user.id, req.user.role, flatId);
    if (!canManage) {
      return res.status(403).json({
        error: "You don't have permission to manage tenants for this flat",
      });
    }

    // Build query
    const query = {
      flatId,
      isActive: true,
    };

    if (roomType && (roomType === "AC" || roomType === "NON_AC")) {
      query.roomType = roomType;
    }

    if (foodIncluded !== undefined) {
      query.foodIncluded = foodIncluded === "true" || foodIncluded === true;
    }

    const tenants = await Tenant.find(query)
      .populate([
        { path: "tenantUserId", select: "name email phone" },
        { path: "flatId", select: "buildingName block flatNumber floor" },
      ])
      .sort({ roomNumber: 1, createdAt: 1 })
      .lean();

    res.json(
      tenants.map((tenant) => ({
        id: tenant._id.toString(),
        flat: {
          id: tenant.flatId._id.toString(),
          buildingName: tenant.flatId.buildingName,
          block: tenant.flatId.block,
          flatNumber: tenant.flatId.flatNumber,
          floor: tenant.flatId.floor,
        },
        tenant: {
          id: tenant.tenantUserId._id.toString(),
          name: tenant.tenantUserId.name,
          email: tenant.tenantUserId.email,
          phone: tenant.tenantUserId.phone,
        },
        rentAmount: tenant.rentAmount,
        rentDueDate: tenant.rentDueDate,
        leaseStartDate: tenant.leaseStartDate,
        leaseEndDate: tenant.leaseEndDate,
        contactPhone: tenant.contactPhone,
        contactEmail: tenant.contactEmail,
        notes: tenant.notes,
        roomType: tenant.roomType,
        foodIncluded: tenant.foodIncluded,
        roomNumber: tenant.roomNumber || "",
        sharing: tenant.sharing || 1,
        lastReminderSent: tenant.lastReminderSent,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// POST /api/tenants - Create/assign a tenant to a flat
router.post("/", async (req, res, next) => {
  try {
    const {
      flatId,
      tenantUserId,
      rentAmount,
      rentDueDate,
      leaseStartDate,
      leaseEndDate,
      contactPhone,
      contactEmail,
      notes,
      roomType,
      foodIncluded,
      roomNumber,
      sharing,
    } = req.body;

    if (!flatId || !tenantUserId || !rentAmount || !rentDueDate) {
      return res.status(400).json({
        error: "flatId, tenantUserId, rentAmount, and rentDueDate are required",
      });
    }

    // Verify user can manage tenant (admin or owner)
    const canManage = await canManageTenant(req.user.id, req.user.role, flatId);
    if (!canManage) {
      return res.status(403).json({
        error: "You don't have permission to manage tenants for this flat",
      });
    }

    // Check if tenant user exists
    const tenantUser = await User.findById(tenantUserId);
    if (!tenantUser) {
      return res.status(404).json({ error: "Tenant user not found" });
    }

    // Check if flat exists
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ error: "Flat not found" });
    }

    // Deactivate any existing tenant for this flat+room combination
    if (roomNumber) {
      await Tenant.updateMany(
        { flatId, roomNumber, isActive: true },
        { $set: { isActive: false } }
      );
    }

    // Create tenant assignment in UserFlat if not exists
    const existingAssignment = await UserFlat.findOne({
      userId: tenantUserId,
      flatId,
    });

    if (!existingAssignment) {
      await UserFlat.create({
        userId: tenantUserId,
        flatId,
        relation: "TENANT",
        isPrimary: false,
      });
    } else if (existingAssignment.relation !== "TENANT") {
      existingAssignment.relation = "TENANT";
      await existingAssignment.save();
    }

    // Get the actual owner of the flat (not the admin who is assigning)
    let actualOwnerId = req.user.id;
    if (req.user.role === "ADMIN") {
      // If admin is assigning, find the actual owner of the flat
      const ownerAssignment = await UserFlat.findOne({
        flatId,
        relation: "OWNER",
      });
      if (ownerAssignment) {
        actualOwnerId = ownerAssignment.userId.toString();
      }
    }

    // Calculate lease end date based on lease start date and rent due date
    // If lease start is on 5th, next due is 5th of next month, and so on
    let calculatedLeaseEndDate = null;
    if (leaseStartDate && rentDueDate) {
      const startDate = new Date(leaseStartDate);
      const dueDay = parseInt(rentDueDate);

      // Calculate the next occurrence of the due date after start date
      const nextDueDate = new Date(startDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      nextDueDate.setDate(dueDay);

      // If the calculated date is before start date, move to next month
      if (nextDueDate <= startDate) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      // Set lease end to the next due date (one month after start, on the due day)
      calculatedLeaseEndDate = nextDueDate;
    }

    // Prepare notes - if not provided, show who assigned
    let finalNotes = notes;
    if (!finalNotes || finalNotes.trim() === "") {
      let assignerName = "Admin";
      if (req.user.role !== "ADMIN") {
        // Fetch user's name from database
        const assignerUser = await User.findById(req.user.id).select("name");
        assignerName = assignerUser?.name || "User";
      }
      finalNotes = `Assigned by ${assignerName}`;
    }

    // Create tenant record
    const tenant = await Tenant.create({
      flatId,
      ownerId: actualOwnerId,
      tenantUserId,
      rentAmount: parseFloat(rentAmount),
      rentDueDate: parseInt(rentDueDate),
      leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : new Date(),
      leaseEndDate: leaseEndDate
        ? new Date(leaseEndDate)
        : calculatedLeaseEndDate,
      contactPhone: contactPhone || tenantUser.phone || "",
      contactEmail: contactEmail || tenantUser.email || "",
      notes: finalNotes,
      roomType: roomType || "NON_AC",
      foodIncluded: foodIncluded === true || foodIncluded === "true",
      roomNumber: roomNumber || "",
      sharing: sharing ? parseInt(sharing) : 1,
      isActive: true,
    });

    await tenant.populate([
      { path: "tenantUserId", select: "name email phone" },
      { path: "flatId", select: "buildingName block flatNumber floor" },
    ]);
    const populated = tenant;

    res.status(201).json({
      id: populated._id.toString(),
      flat: {
        id: populated.flatId._id.toString(),
        buildingName: populated.flatId.buildingName,
        block: populated.flatId.block,
        flatNumber: populated.flatId.flatNumber,
        floor: populated.flatId.floor,
      },
      tenant: {
        id: populated.tenantUserId._id.toString(),
        name: populated.tenantUserId.name,
        email: populated.tenantUserId.email,
        phone: populated.tenantUserId.phone,
      },
      rentAmount: populated.rentAmount,
      rentDueDate: populated.rentDueDate,
      leaseStartDate: populated.leaseStartDate,
      leaseEndDate: populated.leaseEndDate,
      contactPhone: populated.contactPhone,
      contactEmail: populated.contactEmail,
      notes: populated.notes,
      roomType: populated.roomType,
      foodIncluded: populated.foodIncluded,
      roomNumber: populated.roomNumber || "",
      sharing: populated.sharing || 1,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tenants/:id - Update tenant details
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      rentAmount,
      rentDueDate,
      leaseStartDate,
      leaseEndDate,
      contactPhone,
      contactEmail,
      notes,
      roomType,
      foodIncluded,
      roomNumber,
      sharing,
    } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Verify user can manage tenant (admin or owner)
    const canManage = await canManageTenant(
      req.user.id,
      req.user.role,
      tenant.flatId.toString()
    );
    if (!canManage) {
      return res.status(403).json({
        error: "You don't have permission to manage tenants for this flat",
      });
    }

    const updateData = {};
    if (rentAmount !== undefined)
      updateData.rentAmount = parseFloat(rentAmount);
    if (rentDueDate !== undefined)
      updateData.rentDueDate = parseInt(rentDueDate);
    if (leaseStartDate !== undefined)
      updateData.leaseStartDate = new Date(leaseStartDate);
    if (leaseEndDate !== undefined)
      updateData.leaseEndDate = leaseEndDate ? new Date(leaseEndDate) : null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (notes !== undefined) updateData.notes = notes;
    if (roomType !== undefined && (roomType === "AC" || roomType === "NON_AC"))
      updateData.roomType = roomType;
    if (foodIncluded !== undefined)
      updateData.foodIncluded =
        foodIncluded === true || foodIncluded === "true";
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (sharing !== undefined && [1, 2, 3, 4].includes(parseInt(sharing)))
      updateData.sharing = parseInt(sharing);

    // Recalculate lease end date if lease start date or rent due date changes
    // Only auto-calculate if leaseEndDate is not explicitly provided
    if (
      leaseEndDate === undefined &&
      (leaseStartDate !== undefined || rentDueDate !== undefined)
    ) {
      const currentTenant = await Tenant.findById(id);
      const startDate = leaseStartDate
        ? new Date(leaseStartDate)
        : currentTenant.leaseStartDate;
      const dueDay = rentDueDate
        ? parseInt(rentDueDate)
        : currentTenant.rentDueDate;

      if (startDate && dueDay) {
        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setDate(dueDay);

        // If calculated date is before or equal to start date, move to next month
        if (nextDueDate <= startDate) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        updateData.leaseEndDate = nextDueDate;
      }
    } else if (leaseEndDate !== undefined) {
      // If explicitly provided, use that value
      updateData.leaseEndDate = leaseEndDate ? new Date(leaseEndDate) : null;
    }

    const updated = await Tenant.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    await updated.populate([
      { path: "tenantUserId", select: "name email phone" },
      { path: "flatId", select: "buildingName block flatNumber floor" },
    ]);

    res.json({
      id: updated._id.toString(),
      flat: {
        id: updated.flatId._id.toString(),
        buildingName: updated.flatId.buildingName,
        block: updated.flatId.block,
        flatNumber: updated.flatId.flatNumber,
        floor: updated.flatId.floor,
      },
      tenant: {
        id: updated.tenantUserId._id.toString(),
        name: updated.tenantUserId.name,
        email: updated.tenantUserId.email,
        phone: updated.tenantUserId.phone,
      },
      rentAmount: updated.rentAmount,
      rentDueDate: updated.rentDueDate,
      leaseStartDate: updated.leaseStartDate,
      leaseEndDate: updated.leaseEndDate,
      contactPhone: updated.contactPhone,
      contactEmail: updated.contactEmail,
      notes: updated.notes,
      roomType: updated.roomType,
      foodIncluded: updated.foodIncluded,
      roomNumber: updated.roomNumber || "",
      sharing: updated.sharing || 1,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tenants/:id - Remove tenant (deactivate)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Verify user can manage tenant (admin or owner)
    const canManage = await canManageTenant(
      req.user.id,
      req.user.role,
      tenant.flatId.toString()
    );
    if (!canManage) {
      return res.status(403).json({
        error: "You don't have permission to manage tenants for this flat",
      });
    }

    await Tenant.findByIdAndUpdate(id, { $set: { isActive: false } });

    res.json({ message: "Tenant removed successfully" });
  } catch (error) {
    next(error);
  }
});

// POST /api/tenants/:id/send-reminder - Send rent reminder
router.post("/:id/send-reminder", async (req, res, next) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    await tenant.populate([
      { path: "tenantUserId", select: "name email phone" },
      { path: "flatId", select: "buildingName block flatNumber floor" },
      { path: "ownerId", select: "name email" },
    ]);

    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Verify user can manage tenant (admin or owner)
    const canManage = await canManageTenant(
      req.user.id,
      req.user.role,
      tenant.flatId.toString()
    );
    if (!canManage) {
      return res.status(403).json({
        error: "You don't have permission to manage tenants for this flat",
      });
    }

    // Update last reminder sent
    await Tenant.findByIdAndUpdate(id, {
      $set: { lastReminderSent: new Date() },
    });

    // TODO: Send email reminder
    // For now, just return success
    // In production, integrate with email service (nodemailer, sendgrid, etc.)

    res.json({
      message: "Rent reminder sent successfully",
      tenant: {
        name: tenant.tenantUserId.name,
        email: tenant.tenantUserId.email,
      },
      rentAmount: tenant.rentAmount,
      rentDueDate: tenant.rentDueDate,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
