import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import UserFlat from "../models/UserFlat.js";
import Tenant from "../models/Tenant.js";
import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import MaintenancePayment from "../models/MaintenancePayment.js";
import { PAYMENT_STATE } from "../services/billingPaymentService.js";

const router = express.Router();

const getMonthBounds = (baseDate, offset = 0) => {
  const start = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + offset,
    1
  );
  const end = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + offset + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { start, end };
};

const sumCollectionsForFlats = async (flatIds, rangeStart, rangeEnd) => {
  if (!flatIds.length) {
    return 0;
  }

  const invoiceCollection =
    MaintenanceInvoice.collection?.collectionName || "maintenanceinvoices";

  const totals = await MaintenancePayment.aggregate([
    {
      $match: {
        state: PAYMENT_STATE.APPROVED,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $lookup: {
        from: invoiceCollection,
        localField: "invoice",
        foreignField: "_id",
        as: "invoice",
      },
    },
    { $unwind: "$invoice" },
    {
      $match: {
        "invoice.flat": { $in: flatIds },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return totals[0]?.total || 0;
};

const sumExpensesForMonth = async (flatIds, monthNumber, yearNumber) => {
  if (!flatIds.length) {
    return 0;
  }

  const totals = await MaintenanceInvoice.aggregate([
    {
      $match: {
        flat: { $in: flatIds },
        month: monthNumber,
        year: yearNumber,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return totals[0]?.total || 0;
};

const calculateRentImpact = async (ownerId, monthStart, monthEnd) => {
  const [moveOut, moveIn, rentTotals] = await Promise.all([
    Tenant.countDocuments({
      ownerId,
      isActive: true,
      leaseEndDate: { $ne: null, $gte: monthStart, $lte: monthEnd },
    }),
    Tenant.countDocuments({
      ownerId,
      isActive: true,
      leaseStartDate: { $gte: monthStart, $lte: monthEnd },
    }),
    Tenant.aggregate([
      {
        $match: {
          ownerId,
          isActive: true,
          leaseStartDate: { $lte: monthEnd },
          $or: [{ leaseEndDate: null }, { leaseEndDate: { $gte: monthStart } }],
        },
      },
      {
        $group: {
          _id: null,
          totalRent: { $sum: "$rentAmount" },
        },
      },
    ]),
  ]);

  return {
    amount: rentTotals[0]?.totalRent || 0,
    moveOut,
    moveIn,
  };
};

router.get("/owner-summary", authenticateToken, async (req, res, next) => {
  try {
    const now = new Date();
    const isAdmin = req.user.role === "ADMIN";
    const requestedOwnerId =
      isAdmin && req.query.ownerId ? req.query.ownerId : req.user.id;

    if (!mongoose.Types.ObjectId.isValid(requestedOwnerId)) {
      return res.status(400).json({ error: "Invalid owner id" });
    }

    const ownerObjectId = new mongoose.Types.ObjectId(requestedOwnerId);

    if (!isAdmin && requestedOwnerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this summary" });
    }

    const [owner, ownerAssignments] = await Promise.all([
      User.findById(ownerObjectId).select("name email").lean(),
      UserFlat.find({
        userId: ownerObjectId,
        relation: "OWNER",
      })
        .select("flatId")
        .lean(),
    ]);

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const flatIds = [
      ...new Set(
        ownerAssignments
          .map((assignment) => assignment.flatId?.toString())
          .filter(Boolean)
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const { start: currentMonthStart, end: currentMonthEnd } = getMonthBounds(
      now,
      0
    );
    const { start: nextMonthStart, end: nextMonthEnd } = getMonthBounds(now, 1);
    const { start: followingStart, end: followingEnd } = getMonthBounds(now, 2);
    const today = new Date();

    const activeTenantFilter = {
      ownerId: ownerObjectId,
      isActive: true,
      leaseStartDate: { $lte: today },
      $or: [{ leaseEndDate: null }, { leaseEndDate: { $gte: today } }],
    };

    const newTenantFilter = {
      ownerId: ownerObjectId,
      isActive: true,
      leaseStartDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
    };

    const [
      totalTenants,
      newTenants,
      totalCollection,
      totalExpenses,
      nextMonthRentImpact,
      followingMonthRentImpact,
    ] = await Promise.all([
      Tenant.countDocuments(activeTenantFilter),
      Tenant.countDocuments(newTenantFilter),
      sumCollectionsForFlats(flatIds, currentMonthStart, currentMonthEnd),
      sumExpensesForMonth(flatIds, now.getMonth() + 1, now.getFullYear()),
      calculateRentImpact(ownerObjectId, nextMonthStart, nextMonthEnd),
      calculateRentImpact(ownerObjectId, followingStart, followingEnd),
    ]);

    const totalBeds = Math.max(flatIds.length, totalTenants);
    const occupiedBeds = totalTenants;
    const vacantBeds = Math.max(totalBeds - occupiedBeds, 0);

    res.json({
      ownerName: owner.name || owner.email || "Owner",
      month: now.toLocaleString("en-US", { month: "short" }),
      year: now.getFullYear(),
      totalCollection,
      totalExpenses,
      profitLoss: totalCollection - totalExpenses,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      totalTenants,
      newTenants,
      nextMonthRentImpact,
      followingMonthRentImpact,
    });
  } catch (error) {
    console.error("Failed to load owner dashboard summary", error);
    next({
      status: 500,
      message: "Failed to load dashboard summary",
      cause: error,
    });
  }
});

export default router;
