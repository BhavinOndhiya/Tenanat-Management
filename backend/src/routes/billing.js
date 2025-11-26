import crypto from "crypto";
import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import MaintenancePayment from "../models/MaintenancePayment.js";
import UserFlat from "../models/UserFlat.js";
import Flat from "../models/Flat.js";
import getRazorpayClient from "../lib/razorpayClient.js";
import {
  PAYMENT_GATEWAY,
  PAYMENT_SOURCE,
  PAYMENT_STATE,
  recalculateInvoiceTotals,
  sumApprovedPaymentsByInvoice,
} from "../services/billingPaymentService.js";

const router = express.Router();

router.use(authenticateToken);

const resolveUserFlatIds = async (userId) => {
  const assignments = await UserFlat.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select("flatId")
    .lean();

  if (assignments.length > 0) {
    return assignments.map((assignment) => assignment.flatId);
  }

  const flat = await Flat.findOne({ owner: userId }).select("_id").lean();
  if (flat) {
    return [flat._id];
  }

  return [];
};

router.get("/my-invoices", async (req, res, next) => {
  try {
    const { status, month, year, page = 1, pageSize = 20 } = req.query;
    const flatIds = await resolveUserFlatIds(req.user.id);

    if (flatIds.length === 0) {
      return res.json({
        items: [],
        page: 1,
        pageSize,
        total: 0,
      });
    }

    const query = { flat: { $in: flatIds } };

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

router.get("/my-invoices/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const flatIds = await resolveUserFlatIds(req.user.id);

    if (flatIds.length === 0) {
      return res.status(403).json({ error: "No flats linked to this user" });
    }

    const invoice = await MaintenanceInvoice.findOne({
      _id: id,
      flat: { $in: flatIds },
    }).lean();

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

router.post("/my-invoices/:id/create-order", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const flatIds = await resolveUserFlatIds(req.user.id);

    if (flatIds.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not have any flats linked to your account" });
    }

    const invoice = await MaintenanceInvoice.findOne({
      _id: id,
      flat: { $in: flatIds },
    }).lean();

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const recalculated = await recalculateInvoiceTotals(invoice._id);
    const outstanding = recalculated?.outstanding ?? invoice.amount;

    if (outstanding <= 0) {
      return res.status(400).json({ error: "Invoice is already settled" });
    }

    let amountToPay = outstanding;

    if (typeof amount !== "undefined" && amount !== null) {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res
          .status(400)
          .json({ error: "Amount must be a positive number" });
      }
      amountToPay = Math.min(parsedAmount, outstanding);
    }

    if (amountToPay <= 0) {
      return res.status(400).json({ error: "Nothing left to pay for invoice" });
    }

    let razorpayClient;
    try {
      razorpayClient = getRazorpayClient();
    } catch (error) {
      return res.status(500).json({
        error: "Online payments are not configured. Please contact support.",
      });
    }

    const currency = process.env.RAZORPAY_CURRENCY || "INR";
    const amountInPaise = Math.round(amountToPay * 100);

    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `invoice_${invoice._id}`,
      notes: {
        invoiceId: invoice._id.toString(),
        userId: req.user.id,
        flatId: invoice.flat.toString(),
      },
    });

    const paymentRecord = await MaintenancePayment.create({
      invoice: invoice._id,
      paidByUser: req.user.id,
      amount: amountToPay,
      method: "ONLINE",
      reference: order.receipt,
      paidAt: null,
      gateway: PAYMENT_GATEWAY.RAZORPAY,
      gatewayOrderId: order.id,
      state: PAYMENT_STATE.PENDING,
      source: PAYMENT_SOURCE.GATEWAY,
    });

    res.status(201).json({
      orderId: order.id,
      amount: amountToPay,
      amountInPaise,
      currency,
      invoiceId: invoice._id.toString(),
      paymentId: paymentRecord._id.toString(),
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-payment", async (req, res, next) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } =
      req.body || {};

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({
        error:
          "razorpayPaymentId, razorpayOrderId and razorpaySignature are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res
        .status(500)
        .json({ error: "Payment gateway secret is not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const payment = await MaintenancePayment.findOne({
      gatewayOrderId: razorpayOrderId,
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    if (payment.paidByUser.toString() !== req.user.id) {
      return res.status(403).json({
        error: "You are not authorized to verify this payment",
      });
    }

    if (payment.state === PAYMENT_STATE.APPROVED) {
      const totals = await recalculateInvoiceTotals(payment.invoice);
      return res.json({
        message: "Payment already verified",
        invoiceId: payment.invoice.toString(),
        totalPaid: totals?.totalPaid ?? payment.amount,
        outstanding: totals?.outstanding ?? 0,
        invoiceStatus: totals?.invoice.status,
      });
    }

    payment.gatewayPaymentId = razorpayPaymentId;
    payment.gatewaySignature = razorpaySignature;
    payment.state = PAYMENT_STATE.APPROVED;
    payment.paidAt = payment.paidAt || new Date();

    await payment.save();

    const totals = await recalculateInvoiceTotals(payment.invoice);

    res.json({
      message: "Payment verified successfully",
      invoiceId: payment.invoice.toString(),
      totalPaid: totals?.totalPaid ?? payment.amount,
      outstanding: totals?.outstanding ?? 0,
      invoiceStatus: totals?.invoice.status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
