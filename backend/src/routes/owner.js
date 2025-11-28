import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { authenticateToken } from "../middleware/auth.js";
import Complaint from "../models/Complaint.js";
import Flat from "../models/Flat.js";
import User from "../models/User.js";
import UserFlat from "../models/UserFlat.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import MaintenancePayment from "../models/MaintenancePayment.js";
import RentPayment from "../models/RentPayment.js";
import {
  createFirstMonthPayment,
  createRecurringMonthPayment,
} from "../services/rentBillingService.js";
import {
  sendTenantWelcomeEmail,
  sendTenantWhatsApp,
} from "../services/notificationService.js";
import { FACILITY_OPTIONS, GENDER_OPTIONS } from "../constants/facilities.js";

const router = express.Router();

const OWNER_ROLES = ["FLAT_OWNER", "PG_OWNER"];
const SHARING_OPTIONS = ["1", "2", "3", "4"];
const AC_OPTIONS = ["AC", "NON_AC"];
const FOOD_OPTIONS = ["WITH_FOOD", "WITHOUT_FOOD"];
const ALLOWED_OWNER_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const requireOwner = (req, res, next) => {
  if (!OWNER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "Owner access required" });
  }
  next();
};

const buildOwnerMatch = (user) => {
  const base = {
    ownerId: new mongoose.Types.ObjectId(user.id),
  };
  base.type = user.role === "PG_OWNER" ? "PG" : "FLAT";
  return base;
};

const ensureFlatType = async (flat) => {
  if (!flat.type) {
    flat.type =
      flat.pgMetadata || (flat.flatNumber || "").toUpperCase().startsWith("PG")
        ? "PG"
        : "FLAT";
    await flat.save();
  }
  return flat;
};

const resolveOwnerProperties = async (user, type) => {
  const owned = await Flat.find({ ownerId: user.id });
  const assignments = await UserFlat.find({
    userId: user.id,
    relation: "OWNER",
  })
    .populate("flatId")
    .lean();

  const mapped = [
    ...owned,
    ...assignments
      .map((assignment) => assignment.flatId)
      .filter((flat) => !!flat),
  ];

  const normalized = await Promise.all(mapped.map(ensureFlatType));

  return normalized.filter((flat) => flat.type === type);
};

const serializeComplaint = (complaint) => {
  const property = complaint.flatId || complaint.propertyId;
  return {
    id: complaint._id.toString(),
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    tenant: complaint.tenantId
      ? {
          id: complaint.tenantId._id.toString(),
          name: complaint.tenantId.name,
          email: complaint.tenantId.email,
          phone: complaint.tenantId.phone || "",
        }
      : null,
    property: property
      ? {
          id: property._id.toString(),
          buildingName: property.buildingName,
          block: property.block,
          flatNumber: property.flatNumber,
          type: property.type,
        }
      : null,
    comments: complaint.comments || [],
  };
};

const sortPeriodsDesc = (a, b) => {
  if (a.year === b.year) {
    return b.month - a.month;
  }
  return b.year - a.year;
};

const buildIncomeSummary = async (flatIds, { month, year }, isPG = false) => {
  if (!flatIds.length) {
    return null;
  }

  if (isPG) {
    // For PG owners, use RentPayment
    const match = {
      propertyId: { $in: flatIds },
    };

    const payments = await RentPayment.find(match)
      .select(
        "_id periodMonth periodYear dueDate status baseAmount amount lateFeeAmount paidAt"
      )
      .lean();

    if (!payments.length) {
      return null;
    }

    const normalizedFilter =
      month && year
        ? {
            month: Number(month),
            year: Number(year),
          }
        : null;

    const filtered = normalizedFilter
      ? payments.filter(
          (p) =>
            p.periodMonth === normalizedFilter.month &&
            p.periodYear === normalizedFilter.year
        )
      : payments;

    const computeTotals = (subset) => {
      let totalDue = 0;
      let received = 0;
      let pending = 0;

      subset.forEach((payment) => {
        const baseAmount = payment.baseAmount || payment.amount;
        const lateFeeAmount = payment.lateFeeAmount || 0;
        const totalAmount = baseAmount + lateFeeAmount;
        totalDue += totalAmount;

        if (payment.status === "PAID") {
          received += totalAmount;
        } else if (payment.status === "PENDING") {
          pending += totalAmount;
        }
      });

      return { totalDue, received, pending };
    };

    const earliestDueDate = (records) => {
      const timestamps = records
        .map((p) => {
          const time = p.dueDate ? new Date(p.dueDate).getTime() : null;
          return Number.isFinite(time) ? time : null;
        })
        .filter((time) => time !== null)
        .sort((a, b) => a - b);
      return timestamps.length ? new Date(timestamps[0]) : null;
    };

    const periodDueDate = earliestDueDate(filtered);

    const now = Date.now();
    const upcomingDue = payments
      .filter(
        (p) => p.status === "PENDING" && new Date(p.dueDate).getTime() > now
      )
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )[0];

    const availableFilters = Array.from(
      new Map(
        payments.map((p) => [
          `${p.periodMonth}-${p.periodYear}`,
          { month: p.periodMonth, year: p.periodYear },
        ])
      ).values()
    ).sort(sortPeriodsDesc);

    return {
      filter: normalizedFilter,
      period: computeTotals(filtered),
      overall: computeTotals(payments),
      availableFilters,
      periodDueDate: periodDueDate ? periodDueDate.toISOString() : null,
      nextDueDate: upcomingDue
        ? new Date(upcomingDue.dueDate).toISOString()
        : null,
    };
  }

  // For FLAT owners, use MaintenanceInvoice
  const invoices = await MaintenanceInvoice.find({
    flat: { $in: flatIds },
  })
    .select("_id amount month year dueDate status")
    .lean();

  if (!invoices.length) {
    return null;
  }

  const paymentRecords = await MaintenancePayment.aggregate([
    { $match: { invoice: { $in: invoices.map((inv) => inv._id) } } },
    {
      $group: {
        _id: "$invoice",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const paymentMap = paymentRecords.reduce((acc, row) => {
    acc[row._id.toString()] = row.total;
    return acc;
  }, {});

  const computeTotals = (subset) => {
    const totalDue = subset.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const received = subset.reduce(
      (sum, inv) => sum + (paymentMap[inv._id.toString()] || 0),
      0
    );
    return {
      totalDue,
      received,
      pending: Math.max(totalDue - received, 0),
    };
  };

  const normalizedFilter =
    month && year
      ? {
          month: Number(month),
          year: Number(year),
        }
      : null;

  const filtered = normalizedFilter
    ? invoices.filter(
        (inv) =>
          inv.month === normalizedFilter.month &&
          inv.year === normalizedFilter.year
      )
    : invoices;

  const earliestDueDate = (records) => {
    const timestamps = records
      .map((inv) => {
        const time = inv.dueDate ? new Date(inv.dueDate).getTime() : null;
        return Number.isFinite(time) ? time : null;
      })
      .filter((time) => time !== null)
      .sort((a, b) => a - b);
    return timestamps.length ? new Date(timestamps[0]) : null;
  };
  const periodDueDate = earliestDueDate(filtered);

  const now = Date.now();
  const upcomingDue = invoices
    .filter((inv) => inv.dueDate && new Date(inv.dueDate).getTime() >= now)
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];

  const availableFilters = Array.from(
    new Map(
      invoices.map((inv) => [
        `${inv.month}-${inv.year}`,
        { month: inv.month, year: inv.year },
      ])
    ).values()
  ).sort(sortPeriodsDesc);

  return {
    filter: normalizedFilter,
    period: computeTotals(filtered),
    overall: computeTotals(invoices),
    availableFilters,
    periodDueDate: periodDueDate ? periodDueDate.toISOString() : null,
    nextDueDate: upcomingDue ? upcomingDue.dueDate.toISOString() : null,
  };
};

const formatAddress = (property) => {
  if (!property) return "";
  const parts = [
    property.buildingName,
    property.block ? `Block ${property.block}` : null,
    property.address?.line1,
    property.address?.line2,
    property.address?.city,
    property.address?.state,
    property.address?.zipCode,
  ].filter(Boolean);
  return parts.join(", ");
};

const parseServices = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((val) => val.trim());
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((val) => val.trim())
      .filter(Boolean);
  }
  return [];
};

const assertChoice = (label, value, allowed) => {
  if (!allowed.includes(value)) {
    throw new Error(
      `${label} must be one of: ${allowed.map((opt) => `"${opt}"`).join(", ")}`
    );
  }
  return value;
};

const sanitizeFacilities = (input = []) => {
  const values = Array.isArray(input) ? input : [input];
  const unique = Array.from(
    new Set(values.map((val) => (val || "").toString().toUpperCase()))
  );
  return unique.filter((val) => FACILITY_OPTIONS.includes(val));
};

const generatePgCode = () =>
  `PG-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(-4)}`.toUpperCase();

const serializeProperty = (property) => ({
  id: property._id.toString(),
  type: property.type,
  name: property.name || property.buildingName,
  buildingName: property.buildingName,
  block: property.block || "",
  flatNumber: property.flatNumber,
  address: {
    line1: property.address?.line1 || "",
    line2: property.address?.line2 || "",
    city: property.address?.city || "",
    state: property.address?.state || "",
    zipCode: property.address?.zipCode || "",
  },
  landmark: property.landmark || "",
  genderType: property.genderType || "COED",
  totalRooms: property.pgMetadata?.totalRooms || property.totalRooms || null,
  totalBeds: property.pgMetadata?.totalBeds || property.totalBeds || null,
  facilitiesAvailable: property.facilitiesAvailable || [],
  baseRentPerBed: property.baseRentPerBed || 0,
  notes: property.notes || "",
  createdAt: property.createdAt,
});

const ensureServicesAllowed = (services, property) => {
  const propertyFacilities = property.facilitiesAvailable || [];
  const allowedServices = sanitizeFacilities(services);
  const invalid = allowedServices.filter(
    (svc) => !propertyFacilities.includes(svc)
  );
  if (invalid.length) {
    throw new Error(
      `Services not available for this property: ${invalid.join(", ")}`
    );
  }
  return allowedServices;
};

const getAcOptionsForProperty = (property) => {
  const facilities = property?.facilitiesAvailable || [];
  const options = [];
  if (facilities.includes("AC")) {
    options.push("AC");
  }
  if (facilities.includes("NON_AC")) {
    options.push("NON_AC");
  }
  if (!options.length) {
    options.push("NON_AC");
  }
  return options;
};

const getFoodOptionsForProperty = (property) => {
  const facilities = property?.facilitiesAvailable || [];
  const options = [];
  if (facilities.includes("FOOD")) {
    options.push("WITH_FOOD");
  }
  options.push("WITHOUT_FOOD");
  return Array.from(new Set(options));
};

router.use(authenticateToken, requireOwner);

router.get("/properties", async (req, res, next) => {
  try {
    const type = req.user.role === "PG_OWNER" ? "PG" : "FLAT";
    const properties = await resolveOwnerProperties(req.user, type);
    res.json(
      properties.map((property) => ({
        id: property._id.toString(),
        buildingName: property.buildingName,
        block: property.block,
        flatNumber: property.flatNumber,
        type: property.type,
      }))
    );
  } catch (error) {
    if (error.message?.includes("must be one of")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get("/pg/properties", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const properties = await Flat.find({
      ownerId: req.user.id,
      type: "PG",
    }).sort({ createdAt: -1 });

    res.json(properties.map(serializeProperty));
  } catch (error) {
    next(error);
  }
});

router.post("/pg/properties", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const {
      name,
      addressLine1,
      addressLine2 = "",
      city,
      state,
      pincode,
      landmark = "",
      totalRooms = null,
      totalBeds = null,
      genderType = "COED",
      facilitiesAvailable = [],
      baseRentPerBed = 0,
      notes = "",
    } = req.body;

    if (!name || !addressLine1 || !city || !state || !pincode) {
      return res
        .status(400)
        .json({ error: "Name, address, city, state and pincode are required" });
    }

    const safeFacilities = sanitizeFacilities(facilitiesAvailable);
    if (!safeFacilities.length) {
      return res
        .status(400)
        .json({ error: "Select at least one available facility" });
    }

    const normalizedGender = assertChoice(
      "genderType",
      (genderType || "COED").toUpperCase(),
      GENDER_OPTIONS
    );

    const propertyDoc = await Flat.create({
      type: "PG",
      ownerId: req.user.id,
      name: name.trim(),
      buildingName: name.trim(),
      block: "",
      flatNumber: generatePgCode(),
      address: {
        line1: addressLine1.trim(),
        line2: addressLine2?.trim() || "",
        city: city.trim(),
        state: state.trim(),
        zipCode: pincode.trim(),
      },
      landmark: landmark?.trim() || "",
      totalRooms: totalRooms ? Number(totalRooms) : null,
      totalBeds: totalBeds ? Number(totalBeds) : null,
      genderType: normalizedGender,
      facilitiesAvailable: safeFacilities,
      baseRentPerBed: baseRentPerBed ? Number(baseRentPerBed) : 0,
      notes: notes?.trim() || "",
      pgMetadata: {
        totalRooms: totalRooms ? Number(totalRooms) : null,
        totalBeds: totalBeds ? Number(totalBeds) : null,
        amenities: safeFacilities,
      },
    });

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { ownerProperties: propertyDoc._id },
    });

    res.status(201).json(serializeProperty(propertyDoc));
  } catch (error) {
    if (error.message?.includes("must be one of")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch("/pg/properties/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const property = await Flat.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      type: "PG",
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      landmark,
      totalRooms,
      totalBeds,
      genderType,
      facilitiesAvailable,
      baseRentPerBed,
      notes,
    } = req.body;

    if (name) property.name = name.trim();
    if (name) property.buildingName = name.trim();
    if (addressLine1) property.address.line1 = addressLine1.trim();
    if (addressLine2 !== undefined)
      property.address.line2 = addressLine2?.trim() || "";
    if (city) property.address.city = city.trim();
    if (state) property.address.state = state.trim();
    if (pincode) property.address.zipCode = pincode.trim();
    if (landmark !== undefined) property.landmark = landmark?.trim() || "";
    if (totalRooms !== undefined)
      property.totalRooms = totalRooms ? Number(totalRooms) : null;
    if (totalBeds !== undefined)
      property.totalBeds = totalBeds ? Number(totalBeds) : null;
    if (genderType) {
      property.genderType = assertChoice(
        "genderType",
        genderType.toUpperCase(),
        GENDER_OPTIONS
      );
    }
    if (facilitiesAvailable) {
      const safeFacilities = sanitizeFacilities(facilitiesAvailable);
      if (safeFacilities.length === 0) {
        return res
          .status(400)
          .json({ error: "Select at least one available facility" });
      }
      property.facilitiesAvailable = safeFacilities;
      if (property.pgMetadata) {
        property.pgMetadata.amenities = safeFacilities;
      }
    }
    if (baseRentPerBed !== undefined)
      property.baseRentPerBed = Number(baseRentPerBed) || 0;
    if (notes !== undefined) property.notes = notes?.trim() || "";

    await property.save();

    res.json(serializeProperty(property));
  } catch (error) {
    if (error.message?.includes("must be one of")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete("/pg/properties/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const property = await Flat.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      type: "PG",
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Check if property has tenants
    const tenantCount = await PgTenantProfile.countDocuments({
      propertyId: property._id,
    });

    if (tenantCount > 0) {
      return res.status(400).json({
        error: `Cannot delete property with ${tenantCount} active tenant(s). Please remove tenants first.`,
      });
    }

    // Remove from owner's properties
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { ownerProperties: property._id },
    });

    await Flat.deleteOne({ _id: property._id });

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const match = buildOwnerMatch(req.user);
    const properties = await resolveOwnerProperties(
      req.user,
      match.type === "PG" ? "PG" : "FLAT"
    );

    const [statusAgg, categoryAgg, propertyAgg, recentComplaints] =
      await Promise.all([
        Complaint.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Complaint.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
        ]),
        Complaint.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$propertyId",
              totalComplaints: { $sum: 1 },
              openComplaints: {
                $sum: {
                  $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: "flats",
              localField: "_id",
              foreignField: "_id",
              as: "property",
            },
          },
          { $unwind: "$property" },
        ]),
        Complaint.find(match)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("flatId", "buildingName block flatNumber type")
          .populate("tenantId", "name email phone"),
      ]);

    let incomeSummary = null;
    if (match.type === "PG") {
      incomeSummary = await buildIncomeSummary(
        properties.map((prop) => prop._id),
        { month: req.query.month, year: req.query.year },
        true // isPG = true
      );
    }

    const statusMap = statusAgg.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.json({
      role: req.user.role,
      summary: {
        totalComplaints: Object.values(statusMap).reduce(
          (sum, value) => sum + value,
          0
        ),
        open: statusMap.OPEN || 0,
        inProgress: statusMap.IN_PROGRESS || 0,
        resolved: statusMap.RESOLVED || 0,
        closed: statusMap.CLOSED || 0,
      },
      byCategory: categoryAgg.map((row) => ({
        category: row._id || "Uncategorized",
        count: row.count,
      })),
      byProperty: propertyAgg.map((row) => ({
        propertyId: row.property._id.toString(),
        propertyName: `${row.property.buildingName} ${row.property.flatNumber}`,
        totalComplaints: row.totalComplaints,
        open: row.openComplaints,
      })),
      recentComplaints: recentComplaints.map(serializeComplaint),
      incomeSummary,
    });
  } catch (error) {
    if (error.message?.includes("must be one of")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get("/complaints", async (req, res, next) => {
  try {
    const {
      status,
      propertyId,
      category,
      from,
      to,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = buildOwnerMatch(req.user);

    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      filter.propertyId = new mongoose.Types.ObjectId(propertyId);
    }
    if (category && category !== "ALL") {
      filter.category = { $regex: category, $options: "i" };
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNumber = Number(page) || 1;
    const perPage = Math.min(Number(limit) || 10, 50);

    const [items, total] = await Promise.all([
      Complaint.find(filter)
        .populate("flatId", "buildingName block flatNumber type")
        .populate("tenantId", "name email phone")
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * perPage)
        .limit(perPage),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      items: items.map(serializeComplaint),
      total,
      page: pageNumber,
      limit: perPage,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/complaints/:id", async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      ...buildOwnerMatch(req.user),
    })
      .populate("flatId", "buildingName block flatNumber type")
      .populate("tenantId", "name email phone");

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(serializeComplaint(complaint));
  } catch (error) {
    next(error);
  }
});

router.patch("/complaints/:id/status", async (req, res, next) => {
  try {
    if (!ALLOWED_OWNER_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const complaint = await Complaint.findOneAndUpdate(
      {
        _id: req.params.id,
        ...buildOwnerMatch(req.user),
      },
      { status: req.body.status },
      { new: true }
    )
      .populate("flatId", "buildingName block flatNumber type")
      .populate("tenantId", "name email phone");

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(serializeComplaint(complaint));
  } catch (error) {
    next(error);
  }
});

router.post("/complaints/:id/comments", async (req, res, next) => {
  try {
    if (!req.body.message || !req.body.message.trim()) {
      return res.status(400).json({ error: "Comment message is required" });
    }

    const complaint = await Complaint.findOneAndUpdate(
      {
        _id: req.params.id,
        ...buildOwnerMatch(req.user),
      },
      {
        $push: {
          comments: {
            authorId: req.user.id,
            message: req.body.message.trim(),
          },
        },
      },
      { new: true }
    )
      .populate("flatId", "buildingName block flatNumber type")
      .populate("tenantId", "name email phone");

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(serializeComplaint(complaint));
  } catch (error) {
    next(error);
  }
});

router.get("/pg/tenants", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const properties = await resolveOwnerProperties(req.user, "PG");
    const propertyIds = properties.map((prop) => prop._id);

    if (!propertyIds.length) {
      return res.json({ items: [], total: 0 });
    }

    const tenants = await User.find({
      role: "PG_TENANT",
      assignedProperty: { $in: propertyIds },
    })
      .select("name email phone assignedProperty")
      .lean();

    const profiles = await PgTenantProfile.find({
      userId: { $in: tenants.map((tenant) => tenant._id) },
    }).lean();

    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.userId.toString()] = profile;
      return acc;
    }, {});

    const complaintCounts = await Complaint.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(req.user.id),
          type: "PG",
          tenantId: { $in: tenants.map((tenant) => tenant._id) },
          status: { $in: ["OPEN", "IN_PROGRESS"] },
        },
      },
      {
        $group: {
          _id: "$tenantId",
          count: { $sum: 1 },
        },
      },
    ]);

    const complaintMap = complaintCounts.reduce((acc, row) => {
      acc[row._id.toString()] = row.count;
      return acc;
    }, {});

    const propertyMap = properties.reduce((acc, property) => {
      acc[property._id.toString()] = property;
      return acc;
    }, {});

    const items = tenants.map((tenant) => {
      const property = propertyMap[tenant.assignedProperty?.toString()];
      const profile = profileMap[tenant._id.toString()];
      return {
        id: tenant._id.toString(),
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone || "",
        property: property
          ? {
              id: property._id.toString(),
              name:
                property.name ||
                `${property.buildingName} ${property.flatNumber}`.trim(),
            }
          : null,
        roomNumber: profile?.roomNumber || "",
        bedNumber: profile?.bedNumber || "",
        monthlyRent: profile?.monthlyRent || 0,
        moveInDate: profile?.moveInDate || null,
        servicesIncluded: profile?.servicesIncluded || [],
        startDate: profile?.startDate || null,
        status: profile?.status || "ACTIVE",
        sharingType: profile?.sharingType || SHARING_OPTIONS[0],
        acPreference: profile?.acPreference || AC_OPTIONS[0],
        foodPreference: profile?.foodPreference || FOOD_OPTIONS[0],
        openComplaints: complaintMap[tenant._id.toString()] || 0,
      };
    });

    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

router.post("/pg/tenants", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const {
      name,
      email,
      phone,
      propertyId,
      roomNumber,
      bedNumber,
      password,
      // First payment charges
      firstMonthAmount,
      securityDeposit,
      joiningFee,
      otherCharges,
      // Fixed monthly rent
      monthlyRent,
      moveInDate,
      servicesIncluded,
      startDate,
      sharingType = SHARING_OPTIONS[0],
      acPreference = AC_OPTIONS[0],
      foodPreference = FOOD_OPTIONS[0],
    } = req.body;

    if (!name || !email || !propertyId) {
      return res
        .status(400)
        .json({ error: "name, email, and propertyId are required" });
    }

    if (!firstMonthAmount || Number(firstMonthAmount) <= 0) {
      return res.status(400).json({
        error: "firstMonthAmount is required and must be greater than 0",
      });
    }

    if (!monthlyRent || Number(monthlyRent) <= 0) {
      return res
        .status(400)
        .json({ error: "monthlyRent is required and must be greater than 0" });
    }

    if (!moveInDate) {
      return res.status(400).json({ error: "moveInDate is required" });
    }

    const parsedMoveInDate = new Date(moveInDate);
    if (isNaN(parsedMoveInDate.getTime())) {
      return res.status(400).json({ error: "Invalid moveInDate format" });
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ error: "Invalid propertyId" });
    }

    const properties = await resolveOwnerProperties(req.user, "PG");
    const property = properties.find(
      (prop) => prop._id.toString() === propertyId
    );

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    let tenantUser;
    let isNewUser = false;
    let requiresPasswordSetup = false;
    let setupToken = null;

    if (existingUser) {
      // User exists - check if they already have a PG_TENANT profile
      const existingProfile = await PgTenantProfile.findOne({
        userId: existingUser._id,
      });

      if (existingProfile) {
        // Get the property they're assigned to
        const assignedProperty = await Flat.findById(
          existingProfile.propertyId
        ).lean();
        const propertyName = assignedProperty
          ? `${
              assignedProperty.name ||
              assignedProperty.buildingName ||
              "Unknown"
            } ${assignedProperty.flatNumber || ""}`
          : "a PG property";

        return res.status(400).json({
          error: `This email is already assigned to ${propertyName}. Please use a different email or contact support to transfer the tenant.`,
        });
      }

      // Check if user is already assigned to a PG property (even without profile)
      if (existingUser.assignedProperty) {
        const assignedProperty = await Flat.findById(
          existingUser.assignedProperty
        ).lean();

        if (assignedProperty && assignedProperty.type === "PG") {
          const propertyName = `${
            assignedProperty.name || assignedProperty.buildingName || "Unknown"
          } ${assignedProperty.flatNumber || ""}`;

          return res.status(400).json({
            error: `This email is already assigned to PG property: ${propertyName}. Please use a different email or contact support to transfer the tenant.`,
          });
        }
      }

      // Check if user role is PG_TENANT (they might be assigned but profile missing)
      if (existingUser.role === "PG_TENANT" && existingUser.assignedProperty) {
        const assignedProperty = await Flat.findById(
          existingUser.assignedProperty
        ).lean();

        if (assignedProperty && assignedProperty.type === "PG") {
          const propertyName = `${
            assignedProperty.name || assignedProperty.buildingName || "Unknown"
          } ${assignedProperty.flatNumber || ""}`;

          return res.status(400).json({
            error: `This email is already assigned as a PG tenant to: ${propertyName}. Please use a different email or contact support to transfer the tenant.`,
          });
        }
      }

      // User exists but not assigned to any PG - assign them to this PG
      // Update user role if needed
      if (existingUser.role !== "PG_TENANT") {
        existingUser.role = "PG_TENANT";
      }
      existingUser.assignedProperty = property._id;
      if (name) existingUser.name = name.trim();
      if (phone) existingUser.phone = phone.trim();
      await existingUser.save();

      tenantUser = existingUser;
      console.log(
        `[Add Tenant] Assigned existing user ${existingUser.email} to PG property ${property._id}`
      );
    } else {
      // New user - check if password was provided
      isNewUser = true;

      let finalPassword = null;
      let passwordHash = null;

      // Check if owner provided a password
      if (
        password &&
        typeof password === "string" &&
        password.trim().length >= 6
      ) {
        // Use provided password
        finalPassword = password.trim();
        passwordHash = await bcrypt.hash(finalPassword, 10);
        requiresPasswordSetup = false;
        console.log(
          `[Add Tenant] Using provided password for new user ${email}`
        );
      } else {
        // No valid password provided - generate temporary and require setup
        requiresPasswordSetup = true;
        const tempPassword = `Temp${Math.random().toString(36).slice(-10)}`;
        passwordHash = await bcrypt.hash(tempPassword, 10);

        // Generate password setup token (valid for 7 days)
        const jwt = (await import("jsonwebtoken")).default;
        const crypto = (await import("crypto")).default;
        const tokenId = crypto.randomBytes(16).toString("hex");
        setupToken = jwt.sign(
          {
            userId: null, // Will be set after user creation
            email: email.toLowerCase(),
            type: "password_setup",
            jti: tokenId, // JWT ID for one-time use tracking
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        console.log(
          `[Add Tenant] No password provided, generating setup token for ${email}`
        );
      }

      tenantUser = await User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || "",
        role: "PG_TENANT",
        assignedProperty: property._id,
        passwordHash,
        isActive: true,
      });

      // If password setup is required, update token with actual userId
      if (requiresPasswordSetup && setupToken) {
        const jwt = (await import("jsonwebtoken")).default;
        const crypto = (await import("crypto")).default;
        const tokenId = crypto.randomBytes(16).toString("hex");
        setupToken = jwt.sign(
          {
            userId: tenantUser._id.toString(),
            email: tenantUser.email,
            type: "password_setup",
            jti: tokenId, // JWT ID for one-time use tracking
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
      }

      console.log(
        `[Add Tenant] Created new user ${tenantUser.email}${
          requiresPasswordSetup
            ? " with password setup token"
            : " with provided password"
        }`
      );
    }

    const sharing = assertChoice(
      "sharingType",
      sharingType || SHARING_OPTIONS[0],
      SHARING_OPTIONS
    );
    const acOptionsForProperty = getAcOptionsForProperty(property);
    const acPref = assertChoice(
      "acPreference",
      acPreference || acOptionsForProperty[0],
      acOptionsForProperty
    );
    const foodOptionsForProperty = getFoodOptionsForProperty(property);
    const foodPref = assertChoice(
      "foodPreference",
      foodPreference || foodOptionsForProperty[0],
      foodOptionsForProperty
    );

    const servicesArray = ensureServicesAllowed(servicesIncluded, property);

    const fixedMonthlyRent = Number(monthlyRent);
    const firstMonthRentAmount = Number(firstMonthAmount) || 0;
    const securityDepositAmount = Number(securityDeposit) || 0;
    const joiningFeeAmount = Number(joiningFee) || 0;

    // Process other charges - filter out empty ones
    const processedOtherCharges = Array.isArray(otherCharges)
      ? otherCharges
          .filter(
            (charge) =>
              charge &&
              charge.description &&
              charge.description.trim() &&
              charge.amount &&
              Number(charge.amount) > 0
          )
          .map((charge) => ({
            description: charge.description.trim(),
            amount: Number(charge.amount),
          }))
      : [];

    const profile = await PgTenantProfile.create({
      userId: tenantUser._id,
      propertyId: property._id,
      roomNumber: roomNumber?.trim() || "",
      bedNumber: bedNumber?.trim() || "",
      monthlyRent: fixedMonthlyRent, // Fixed monthly rent for subsequent months
      firstMonthAmount: firstMonthRentAmount, // Variable first month amount
      securityDeposit: securityDepositAmount,
      joiningFee: joiningFeeAmount,
      otherCharges: processedOtherCharges,
      moveInDate: parsedMoveInDate,
      billingDueDay: 1,
      billingGraceLastDay: 5,
      lateFeePerDay: 50,
      servicesIncluded: servicesArray,
      startDate: startDate ? new Date(startDate) : null,
      status: "ACTIVE",
      sharingType: sharing,
      acPreference: acPref,
      foodPreference: foodPref,
    });

    // Create first month rent payment with all variable charges
    try {
      const firstPaymentData = createFirstMonthPayment({
        tenantId: tenantUser._id,
        ownerId: req.user.id,
        propertyId: property._id,
        moveInDate: parsedMoveInDate,
        firstMonthAmount: firstMonthRentAmount,
        securityDeposit: securityDepositAmount,
        joiningFee: joiningFeeAmount,
        otherCharges: processedOtherCharges,
        billingDueDay: 1,
        billingGraceLastDay: 5,
        lateFeePerDay: 50,
      });

      await RentPayment.create(firstPaymentData);
      const totalFirstPayment = firstPaymentData.amount;
      console.log(
        `Created first month payment for tenant ${
          tenantUser.email
        }: ₹${totalFirstPayment} (Base: ₹${firstMonthRentAmount}, Security: ₹${securityDepositAmount}, Joining: ₹${joiningFeeAmount}, Other: ₹${firstPaymentData.otherCharges.reduce(
          (sum, c) => sum + c.amount,
          0
        )})`
      );
    } catch (paymentError) {
      console.error("Failed to create first month payment:", paymentError);
      // Don't fail tenant creation if payment creation fails, but log it
    }

    const propertyAddress = formatAddress(property);

    // Get frontend URL for password setup/update links
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const passwordSetupUrl = requiresPasswordSetup
      ? `${frontendUrl}/auth/setup-password?token=${setupToken}`
      : null;

    // Generate password update token for tenant (valid for 24 hours)
    const jwt = (await import("jsonwebtoken")).default;
    const crypto = (await import("crypto")).default;
    const updateTokenId = crypto.randomBytes(16).toString("hex");
    const passwordUpdateToken = jwt.sign(
      {
        userId: tenantUser._id.toString(),
        email: tenantUser.email,
        type: "password_update",
        jti: updateTokenId, // JWT ID for one-time use tracking
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    const passwordUpdateUrl = `${frontendUrl}/auth/update-password?token=${passwordUpdateToken}`;

    await sendTenantWelcomeEmail({
      tenantName: tenantUser.name,
      propertyName: `${property.buildingName} ${property.flatNumber}`,
      propertyAddress,
      roomNumber: profile.roomNumber,
      bedNumber: profile.bedNumber,
      monthlyRent: profile.monthlyRent,
      services: profile.servicesIncluded,
      loginEmail: tenantUser.email,
      password: requiresPasswordSetup ? null : finalPassword, // Send password if provided, otherwise null
      passwordSetupUrl: passwordSetupUrl, // Send setup link if password setup required
      passwordUpdateUrl: passwordUpdateUrl, // Always include password update link
      isNewUser: isNewUser,
      sharingType: profile.sharingType,
      acPreference: profile.acPreference,
      foodPreference: profile.foodPreference,
    });

    if (tenantUser.phone) {
      let message;
      if (isNewUser) {
        if (requiresPasswordSetup) {
          message = `Hi ${tenantUser.name}, welcome to ${
            property.buildingName
          }. Room ${profile.roomNumber || "TBA"}, Bed ${
            profile.bedNumber || "TBA"
          }. Rent: ₹${Number(profile.monthlyRent || 0).toLocaleString(
            "en-IN"
          )}. Services: ${
            profile.servicesIncluded.length
              ? profile.servicesIncluded.join(", ")
              : "Standard"
          }. Sharing: ${profile.sharingType}-bed, ${profile.acPreference}, ${
            profile.foodPreference === "WITH_FOOD"
              ? "Meals included"
              : "No meals"
          }. Please check your email to set up your password and login.`;
        } else {
          message = `Hi ${tenantUser.name}, welcome to ${
            property.buildingName
          }. Room ${profile.roomNumber || "TBA"}, Bed ${
            profile.bedNumber || "TBA"
          }. Rent: ₹${Number(profile.monthlyRent || 0).toLocaleString(
            "en-IN"
          )}. Services: ${
            profile.servicesIncluded.length
              ? profile.servicesIncluded.join(", ")
              : "Standard"
          }. Sharing: ${profile.sharingType}-bed, ${profile.acPreference}, ${
            profile.foodPreference === "WITH_FOOD"
              ? "Meals included"
              : "No meals"
          }. Login with ${tenantUser.email} / ${finalPassword}.`;
        }
      } else {
        message = `Hi ${tenantUser.name}, you have been assigned to ${
          property.buildingName
        }. Room ${profile.roomNumber || "TBA"}, Bed ${
          profile.bedNumber || "TBA"
        }. Rent: ₹${Number(profile.monthlyRent || 0).toLocaleString(
          "en-IN"
        )}. Login with your existing account.`;
      }

      await sendTenantWhatsApp({
        phone: tenantUser.phone,
        message,
      });
    }

    res.status(201).json({
      tenant: {
        id: tenantUser._id.toString(),
        name: tenantUser.name,
        email: tenantUser.email,
        phone: tenantUser.phone || "",
        property: {
          id: property._id.toString(),
          name: `${property.buildingName} ${property.flatNumber}`,
        },
        roomNumber: profile.roomNumber,
        bedNumber: profile.bedNumber,
        monthlyRent: profile.monthlyRent,
        servicesIncluded: profile.servicesIncluded,
        startDate: profile.startDate,
        status: profile.status,
        sharingType: profile.sharingType,
        acPreference: profile.acPreference,
        foodPreference: profile.foodPreference,
      },
      isNewUser,
      requiresPasswordSetup,
      passwordSetupUrl: passwordSetupUrl,
      message: isNewUser
        ? requiresPasswordSetup
          ? "New tenant account created. Password setup link sent to email."
          : "New tenant account created. Login credentials sent to email."
        : "Existing user assigned to this PG property.",
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/pg/tenants/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const {
      name,
      email,
      propertyId,
      roomNumber,
      bedNumber,
      phone,
      monthlyRent,
      moveInDate,
      servicesIncluded,
      status,
      sharingType,
      acPreference,
      foodPreference,
    } = req.body;

    const tenantUser = await User.findOne({
      _id: req.params.id,
      role: "PG_TENANT",
    });

    if (!tenantUser) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const properties = await resolveOwnerProperties(req.user, "PG");
    const propertyMap = properties.reduce((acc, property) => {
      acc[property._id.toString()] = property;
      return acc;
    }, {});

    let updatedPropertyId = tenantUser.assignedProperty;

    if (propertyId) {
      if (!propertyMap[propertyId]) {
        return res
          .status(404)
          .json({ error: "Property not found for this owner" });
      }
      tenantUser.assignedProperty = propertyId;
      updatedPropertyId = propertyId;
    } else if (
      !tenantUser.assignedProperty ||
      !propertyMap[tenantUser.assignedProperty.toString()]
    ) {
      return res
        .status(400)
        .json({ error: "Tenant must remain assigned to owner's property" });
    }

    if (typeof name !== "undefined" && name?.trim()) {
      tenantUser.name = name.trim();
    }
    if (typeof email !== "undefined" && email?.trim()) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: email.trim(),
        _id: { $ne: tenantUser._id },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      tenantUser.email = email.trim();
    }
    if (typeof phone !== "undefined") {
      tenantUser.phone = phone?.trim() || "";
    }

    await tenantUser.save();

    const propertyForUpdate =
      propertyMap[
        updatedPropertyId?.toString() ||
          tenantUser.assignedProperty?.toString() ||
          ""
      ] || null;

    if (!propertyForUpdate) {
      return res
        .status(400)
        .json({ error: "Property context missing for this tenant" });
    }

    let profile = await PgTenantProfile.findOne({ userId: tenantUser._id });
    if (!profile) {
      profile = await PgTenantProfile.create({
        userId: tenantUser._id,
        propertyId: updatedPropertyId,
      });
    }

    if (propertyId) {
      profile.propertyId = propertyId;
    }
    if (typeof roomNumber !== "undefined") {
      profile.roomNumber = roomNumber?.trim() || "";
    }
    if (typeof bedNumber !== "undefined") {
      profile.bedNumber = bedNumber?.trim() || "";
    }
    if (typeof monthlyRent !== "undefined") {
      profile.monthlyRent = monthlyRent ? Number(monthlyRent) : 0;
    }
    let moveInDateUpdated = false;
    if (typeof moveInDate !== "undefined" && moveInDate) {
      const parsedMoveInDate = new Date(moveInDate);
      if (!isNaN(parsedMoveInDate.getTime())) {
        const oldMoveInDate = profile.moveInDate;
        profile.moveInDate = parsedMoveInDate;
        moveInDateUpdated =
          !oldMoveInDate ||
          oldMoveInDate.getTime() !== parsedMoveInDate.getTime();
      }
    }
    if (typeof servicesIncluded !== "undefined") {
      profile.servicesIncluded = ensureServicesAllowed(
        servicesIncluded,
        propertyForUpdate
      );
    }
    if (typeof status !== "undefined") {
      profile.status = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    }
    if (typeof sharingType !== "undefined") {
      profile.sharingType = assertChoice(
        "sharingType",
        sharingType,
        SHARING_OPTIONS
      );
    }
    const acOptionsForProperty = getAcOptionsForProperty(propertyForUpdate);
    if (typeof acPreference !== "undefined") {
      profile.acPreference = assertChoice(
        "acPreference",
        acPreference,
        acOptionsForProperty
      );
    } else if (!acOptionsForProperty.includes(profile.acPreference)) {
      profile.acPreference = acOptionsForProperty[0];
    }

    const foodOptionsForProperty = getFoodOptionsForProperty(propertyForUpdate);
    if (typeof foodPreference !== "undefined") {
      profile.foodPreference = assertChoice(
        "foodPreference",
        foodPreference,
        foodOptionsForProperty
      );
    } else if (!foodOptionsForProperty.includes(profile.foodPreference)) {
      profile.foodPreference = foodOptionsForProperty[0];
    }

    await profile.save();

    // If moveInDate was updated and monthlyRent is set, create first payment if it doesn't exist
    if (moveInDateUpdated && profile.moveInDate && profile.monthlyRent > 0) {
      try {
        const moveInMonth = profile.moveInDate.getMonth() + 1;
        const moveInYear = profile.moveInDate.getFullYear();

        console.log(
          `[Payment Creation] Checking for payment: tenant=${tenantUser.email}, month=${moveInMonth}, year=${moveInYear}, moveInDate=${profile.moveInDate}`
        );

        // Check if first payment already exists for this month/year
        const existingPayment = await RentPayment.findOne({
          tenantId: tenantUser._id,
          periodMonth: moveInMonth,
          periodYear: moveInYear,
        });

        if (!existingPayment) {
          const propertyIdToUse = updatedPropertyId || propertyForUpdate._id;
          console.log(
            `[Payment Creation] Creating payment for tenant ${tenantUser.email}, property=${propertyIdToUse}, moveInDate=${profile.moveInDate}`
          );

          const firstPaymentData = createFirstMonthPayment({
            tenantId: tenantUser._id,
            ownerId: req.user.id,
            propertyId: propertyIdToUse,
            moveInDate: profile.moveInDate,
            monthlyRent: profile.monthlyRent,
            billingDueDay: profile.billingDueDay || 1,
            billingGraceLastDay: profile.billingGraceLastDay || 5,
            lateFeePerDay: profile.lateFeePerDay || 50,
          });

          const created = await RentPayment.create(firstPaymentData);
          console.log(
            `[Payment Creation] ✅ Created payment ${created._id} for tenant ${
              tenantUser.email
            }: ₹${firstPaymentData.baseAmount}${
              firstPaymentData.isProrated ? " (prorated)" : ""
            }, dueDate=${firstPaymentData.dueDate}, status=${
              firstPaymentData.status
            }`
          );
        } else {
          console.log(
            `[Payment Creation] ⚠️ Payment already exists for tenant ${tenantUser.email}, month=${moveInMonth}, year=${moveInYear}, paymentId=${existingPayment._id}`
          );
        }
      } catch (paymentError) {
        console.error(
          "[Payment Creation] ❌ Failed to create first month payment:",
          paymentError
        );
        console.error("[Payment Creation] Error stack:", paymentError.stack);
        // Don't fail the update if payment creation fails
      }
    } else {
      console.log(
        `[Payment Creation] Skipped: moveInDateUpdated=${moveInDateUpdated}, moveInDate=${profile.moveInDate}, monthlyRent=${profile.monthlyRent}`
      );
    }

    const property = propertyForUpdate;

    res.json({
      id: tenantUser._id.toString(),
      name: tenantUser.name,
      email: tenantUser.email,
      phone: tenantUser.phone || "",
      property: property
        ? {
            id: property._id.toString(),
            name:
              property.name ||
              `${property.buildingName} ${property.flatNumber}`.trim(),
          }
        : null,
      roomNumber: profile.roomNumber || "",
      bedNumber: profile.bedNumber || "",
      monthlyRent: profile.monthlyRent || 0,
      moveInDate: profile.moveInDate || null,
      servicesIncluded: profile.servicesIncluded || [],
      status: profile.status || "ACTIVE",
      sharingType: profile.sharingType || SHARING_OPTIONS[0],
      acPreference: profile.acPreference || AC_OPTIONS[0],
      foodPreference: profile.foodPreference || FOOD_OPTIONS[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/owner/pg/tenants/:id
 * Delete a PG tenant
 */
router.delete("/pg/tenants/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({ error: "PG owner access required" });
    }

    const tenantUser = await User.findOne({
      _id: req.params.id,
      role: "PG_TENANT",
    });

    if (!tenantUser) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Verify tenant belongs to this owner
    const properties = await resolveOwnerProperties(req.user, "PG");
    const propertyIds = properties.map((p) => p._id.toString());
    const tenantPropertyId = tenantUser.assignedProperty?.toString();

    if (!tenantPropertyId || !propertyIds.includes(tenantPropertyId)) {
      return res.status(403).json({
        error: "You can only delete tenants from your own properties",
      });
    }

    // Check for pending payments
    const pendingPayments = await RentPayment.countDocuments({
      tenantId: tenantUser._id,
      status: "PENDING",
    });

    if (pendingPayments > 0) {
      return res.status(400).json({
        error: `Cannot delete tenant with ${pendingPayments} pending payment(s). Please resolve payments first.`,
      });
    }

    // Delete PgTenantProfile
    await PgTenantProfile.deleteOne({ userId: tenantUser._id });

    // Delete the user
    await User.deleteOne({ _id: tenantUser._id });

    res.json({ success: true, message: "Tenant deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/pg/payments/history
 * Get rent payment history for PG owner with filters
 */
router.get("/pg/payments/history", requireOwner, async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { propertyId, tenantId, status, from, to } = req.query;

    const match = {
      ownerId: new mongoose.Types.ObjectId(ownerId),
    };

    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      match.propertyId = new mongoose.Types.ObjectId(propertyId);
    }

    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      match.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    if (status && ["PENDING", "PAID", "FAILED", "REFUNDED"].includes(status)) {
      match.status = status;
    }

    if (from || to) {
      match.$or = [];
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          match.$or.push({ dueDate: { $gte: fromDate } });
          match.$or.push({ paidAt: { $gte: fromDate } });
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          if (!match.$or) match.$or = [];
          match.$or.push({ dueDate: { $lte: toDate } });
          match.$or.push({ paidAt: { $lte: toDate } });
        }
      }
      if (match.$or.length === 0) delete match.$or;
    }

    const payments = await RentPayment.find(match)
      .populate("propertyId", "name buildingName addressLine1 city")
      .populate("tenantId", "name email phone")
      .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 })
      .lean();

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const items = payments.map((payment) => {
      const baseAmount = payment.baseAmount || payment.amount;
      const lateFeeAmount = payment.lateFeeAmount || 0;
      const totalAmount = baseAmount + lateFeeAmount;
      return {
        id: payment._id.toString(),
        tenant: payment.tenantId
          ? {
              id: payment.tenantId._id.toString(),
              name: payment.tenantId.name,
              email: payment.tenantId.email,
              phone: payment.tenantId.phone || "",
            }
          : null,
        property: payment.propertyId
          ? {
              id: payment.propertyId._id.toString(),
              name:
                payment.propertyId.name ||
                payment.propertyId.buildingName ||
                "N/A",
              address: [
                payment.propertyId.addressLine1,
                payment.propertyId.city,
              ]
                .filter(Boolean)
                .join(", "),
            }
          : null,
        periodMonth: payment.periodMonth,
        periodYear: payment.periodYear,
        periodLabel: `${monthNames[payment.periodMonth - 1]} ${
          payment.periodYear
        }`,
        baseAmount,
        amount: baseAmount, // For backward compatibility
        lateFeeAmount,
        totalAmount,
        dueDate: payment.dueDate,
        status: payment.status,
        paidAt: payment.paidAt,
        invoicePdfUrl: payment.invoicePdfUrl,
      };
    });

    // Calculate summary
    const summary = {
      totalDue: 0,
      totalReceived: 0,
      totalPending: 0,
      totalCount: items.length,
    };

    items.forEach((payment) => {
      if (payment.status === "PAID") {
        summary.totalReceived += payment.totalAmount;
      } else if (payment.status === "PENDING") {
        summary.totalPending += payment.totalAmount;
      }
      summary.totalDue += payment.totalAmount;
    });

    res.json({ items, summary });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/pg/payments/summary
 * Get payment summary for PG owner (total due, received, pending)
 */
router.get("/pg/payments/summary", requireOwner, async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { propertyId, tenantId } = req.query;

    const match = {
      ownerId: new mongoose.Types.ObjectId(ownerId),
    };

    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      match.propertyId = new mongoose.Types.ObjectId(propertyId);
    }

    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      match.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    const payments = await RentPayment.find(match).lean();

    const summary = {
      totalDue: 0,
      totalReceived: 0,
      totalPending: 0,
      totalCount: payments.length,
    };

    payments.forEach((payment) => {
      const baseAmount = payment.baseAmount || payment.amount;
      const lateFeeAmount = payment.lateFeeAmount || 0;
      const totalAmount = baseAmount + lateFeeAmount;

      if (payment.status === "PAID") {
        summary.totalReceived += totalAmount;
      } else if (payment.status === "PENDING") {
        summary.totalPending += totalAmount;
      }
      summary.totalDue += totalAmount;
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
