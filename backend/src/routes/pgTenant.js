import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import RentPayment from "../models/RentPayment.js";
import Flat from "../models/Flat.js";
import User from "../models/User.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import getRazorpayClient from "../lib/razorpayClient.js";
import { generateRentInvoice } from "../services/invoiceService.js";
import {
  calculateLateFee,
  createFirstMonthPayment,
} from "../services/rentBillingService.js";
import {
  sendPaymentReceiptToTenant,
  sendPaymentReceiptToOwner,
} from "../services/notificationService.js";

const router = express.Router();

router.use(authenticateToken);

// Middleware to ensure user is PG_TENANT
const requirePgTenant = (req, res, next) => {
  if (req.user.role !== "PG_TENANT") {
    return res
      .status(403)
      .json({ error: "Access denied. PG_TENANT role required." });
  }
  next();
};

router.use(requirePgTenant);

/**
 * GET /api/pg-tenant/profile
 * Get PG tenant profile details including room, bed, property info
 */
router.get("/profile", async (req, res, next) => {
  try {
    const tenantId = req.user.id;

    const profile = await PgTenantProfile.findOne({
      userId: tenantId,
    })
      .populate(
        "propertyId",
        "name buildingName addressLine1 addressLine2 city state pincode landmark facilitiesAvailable genderType"
      )
      .lean();

    if (!profile) {
      return res.status(404).json({ error: "PG tenant profile not found" });
    }

    const property = profile.propertyId;
    res.json({
      roomNumber: profile.roomNumber || "",
      bedNumber: profile.bedNumber || "",
      monthlyRent: profile.monthlyRent || 0,
      servicesIncluded: profile.servicesIncluded || [],
      sharingType: profile.sharingType || "1",
      acPreference: profile.acPreference || "AC",
      foodPreference: profile.foodPreference || "WITH_FOOD",
      moveInDate: profile.moveInDate || null,
      status: profile.status || "ACTIVE",
      property: property
        ? {
            id: property._id.toString(),
            name: property.name || property.buildingName || "N/A",
            buildingName: property.buildingName || "",
            address: {
              line1: property.addressLine1 || "",
              line2: property.addressLine2 || "",
              city: property.city || "",
              state: property.state || "",
              pincode: property.pincode || "",
              landmark: property.landmark || "",
            },
            facilitiesAvailable: property.facilitiesAvailable || [],
            genderType: property.genderType || "COED",
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pg-tenant/payments/next-due
 * Get the next due rent payment for the current tenant
 */
router.get("/payments/next-due", async (req, res, next) => {
  try {
    const tenantId = req.user.id;

    // Get tenant profile to check moveInDate
    let profile = await PgTenantProfile.findOne({
      userId: tenantId,
    }).lean();

    // If tenant has moveInDate but no payment exists, create it
    if (profile && profile.moveInDate && profile.monthlyRent > 0) {
      const moveInDate = new Date(profile.moveInDate);
      const moveInMonth = moveInDate.getMonth() + 1;
      const moveInYear = moveInDate.getFullYear();

      const existingPayment = await RentPayment.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        periodMonth: moveInMonth,
        periodYear: moveInYear,
      });

      if (!existingPayment) {
        // Create first payment
        try {
          const tenantUser = await User.findById(tenantId).lean();

          if (tenantUser && profile.propertyId) {
            const property = await Flat.findById(profile.propertyId).lean();
            if (property && property.ownerId) {
              console.log(
                `[Next-Due] Auto-creating payment for tenant ${tenantUser.email}, property=${property._id}, owner=${property.ownerId}`
              );

              const firstPaymentData = createFirstMonthPayment({
                tenantId: tenantUser._id,
                ownerId: property.ownerId,
                propertyId: profile.propertyId,
                moveInDate,
                monthlyRent: profile.monthlyRent,
                billingDueDay: profile.billingDueDay || 1,
                billingGraceLastDay: profile.billingGraceLastDay || 5,
                lateFeePerDay: profile.lateFeePerDay || 50,
              });

              const created = await RentPayment.create(firstPaymentData);
              console.log(
                `[Next-Due] ✅ Auto-created payment ${created._id} for tenant ${
                  tenantUser.email
                }: ₹${firstPaymentData.baseAmount}${
                  firstPaymentData.isProrated ? " (prorated)" : ""
                }, dueDate=${firstPaymentData.dueDate}, status=${
                  firstPaymentData.status
                }`
              );
            } else {
              console.log(
                `[Next-Due] ⚠️ Cannot create payment: property=${
                  profile.propertyId
                }, propertyFound=${!!property}, ownerId=${property?.ownerId}`
              );
            }
          } else {
            console.log(
              `[Next-Due] ⚠️ Cannot create payment: tenantUser=${!!tenantUser}, propertyId=${
                profile.propertyId
              }`
            );
          }
        } catch (createError) {
          console.error(
            "[Next-Due] ❌ Failed to auto-create payment:",
            createError
          );
          console.error("[Next-Due] Error stack:", createError.stack);
          // Continue to check for existing payments
        }
      } else {
        console.log(
          `[Next-Due] Payment already exists for month=${moveInMonth}, year=${moveInYear}, paymentId=${existingPayment._id}, status=${existingPayment.status}`
        );
      }
    } else {
      console.log(
        `[Next-Due] No profile or missing data: profile=${!!profile}, moveInDate=${
          profile?.moveInDate
        }, monthlyRent=${profile?.monthlyRent}`
      );
    }

    // Find the earliest PENDING payment
    const allPayments = await RentPayment.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
    })
      .sort({ dueDate: 1 })
      .lean();

    console.log(
      `[Next-Due] Found ${allPayments.length} total payments for tenant ${tenantId}`
    );
    allPayments.forEach((p) => {
      console.log(
        `  - Payment ${p._id}: month=${p.periodMonth}, year=${
          p.periodYear
        }, status=${p.status}, dueDate=${p.dueDate}, amount=${
          p.amount || p.baseAmount
        }`
      );
    });

    const nextDue = await RentPayment.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: "PENDING",
    })
      .populate(
        "propertyId",
        "name buildingName addressLine1 addressLine2 city state pincode"
      )
      .sort({ dueDate: 1 })
      .lean();

    if (!nextDue) {
      console.log(`[Next-Due] No PENDING payment found for tenant ${tenantId}`);
      return res.json({
        hasDue: false,
        message: "No pending payments",
      });
    }

    console.log(
      `[Next-Due] Found next due payment: ${nextDue._id}, month=${
        nextDue.periodMonth
      }, year=${nextDue.periodYear}, dueDate=${nextDue.dueDate}, amount=${
        nextDue.baseAmount || nextDue.amount
      }`
    );

    // Use the profile already fetched above, or fetch if not available
    if (!profile) {
      profile = await PgTenantProfile.findOne({
        userId: tenantId,
      }).lean();
    }

    const billingGraceLastDay = profile?.billingGraceLastDay || 5;
    const lateFeePerDay = profile?.lateFeePerDay || 50;

    // Calculate dynamic late fee if payment is pending and past grace period
    let currentLateFee = 0;
    if (nextDue.status === "PENDING") {
      const today = new Date();
      currentLateFee = calculateLateFee(
        today,
        nextDue.periodYear,
        nextDue.periodMonth,
        billingGraceLastDay,
        lateFeePerDay
      );
    } else {
      currentLateFee = nextDue.lateFeeAmount || 0;
    }

    // Use baseAmount if available, otherwise fall back to amount
    const baseAmount = nextDue.baseAmount || nextDue.amount;
    const totalAmount = baseAmount + currentLateFee;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const graceEndDate = new Date(
      nextDue.periodYear,
      nextDue.periodMonth - 1,
      billingGraceLastDay
    );
    graceEndDate.setHours(23, 59, 59, 999);

    const isOverdue = today > graceEndDate;

    res.json({
      hasDue: true,
      paymentId: nextDue._id.toString(),
      property: {
        id: nextDue.propertyId._id.toString(),
        name:
          nextDue.propertyId.name || nextDue.propertyId.buildingName || "N/A",
        address: [
          nextDue.propertyId.addressLine1,
          nextDue.propertyId.addressLine2,
          nextDue.propertyId.city,
          nextDue.propertyId.state,
          nextDue.propertyId.pincode,
        ]
          .filter(Boolean)
          .join(", "),
      },
      periodMonth: nextDue.periodMonth,
      periodYear: nextDue.periodYear,
      billingPeriodStart: nextDue.billingPeriodStart,
      billingPeriodEnd: nextDue.billingPeriodEnd,
      dueDate: nextDue.dueDate,
      baseAmount,
      amount: baseAmount, // For backward compatibility
      lateFeeAmount: currentLateFee,
      totalAmount,
      status: nextDue.status,
      isOverdue,
      billingDueDay: 1,
      billingGraceLastDay,
      lateFeePerDay,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pg-tenant/payments/:paymentId/create-order
 * Create Razorpay order for rent payment
 */
router.post("/payments/:paymentId/create-order", async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ error: "Invalid payment ID" });
    }

    const payment = await RentPayment.findOne({
      _id: paymentId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: "PENDING",
    }).lean();

    if (!payment) {
      return res.status(404).json({
        error: "Payment not found or already processed",
      });
    }

    let razorpayClient;
    try {
      razorpayClient = getRazorpayClient();
    } catch (error) {
      return res.status(500).json({
        error: "Online payments are not configured. Please contact support.",
      });
    }

    // Recalculate late fee at payment time
    const profile = await PgTenantProfile.findOne({
      userId: tenantId,
    }).lean();

    const billingGraceLastDay = profile?.billingGraceLastDay || 5;
    const lateFeePerDay = profile?.lateFeePerDay || 50;

    const paymentDate = new Date();
    const currentLateFee = calculateLateFee(
      paymentDate,
      payment.periodYear,
      payment.periodMonth,
      billingGraceLastDay,
      lateFeePerDay
    );

    const baseAmount = payment.baseAmount || payment.amount;
    const totalAmount = baseAmount + currentLateFee;

    // Update payment with current late fee before creating order
    await RentPayment.updateOne(
      { _id: paymentId },
      {
        $set: {
          lateFeeAmount: currentLateFee,
          amount: totalAmount, // Update for backward compatibility
        },
      }
    );

    const currency = process.env.RAZORPAY_CURRENCY || "INR";

    // For test mode, use smaller amount if configured (helps with test account limits)
    const isTestMode =
      process.env.RAZORPAY_KEY_ID?.includes("test") ||
      process.env.NODE_ENV !== "production";
    let amountInPaise = Math.round(totalAmount * 100);

    // In test mode, if amount is too high, use a test amount (₹100 = 10000 paise)
    // This helps avoid "limit exceed" errors in Razorpay test accounts
    // You can also set RAZORPAY_TEST_AMOUNT env var to override (in paise)
    const testAmountOverride = process.env.RAZORPAY_TEST_AMOUNT
      ? parseInt(process.env.RAZORPAY_TEST_AMOUNT, 10)
      : null;

    if (isTestMode) {
      if (testAmountOverride && testAmountOverride > 0) {
        console.log(
          `[Create Order] Test mode: Using configured test amount ₹${
            testAmountOverride / 100
          } instead of ₹${totalAmount}`
        );
        amountInPaise = testAmountOverride;
      } else if (amountInPaise > 100000) {
        // If more than ₹1000
        console.log(
          `[Create Order] Test mode: Using test amount ₹100 instead of ₹${totalAmount} to avoid limits`
        );
        amountInPaise = 10000; // ₹100 in paise
      }
    }

    console.log(
      `[Create Order] Creating Razorpay order: amount=${amountInPaise} paise (₹${
        amountInPaise / 100
      }), currency=${currency}, testMode=${isTestMode}, originalAmount=₹${totalAmount}`
    );

    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `rent_${payment._id}`,
        notes: {
          paymentId: payment._id.toString(),
          tenantId: tenantId,
          propertyId: payment.propertyId.toString(),
          periodMonth: payment.periodMonth,
          periodYear: payment.periodYear,
          originalAmount: totalAmount, // Store original amount in notes
          isTestPayment:
            isTestMode && amountInPaise < Math.round(totalAmount * 100),
        },
      });

      console.log(`[Create Order] ✅ Order created: ${order.id}`);

      // Update payment with order ID
      await RentPayment.updateOne(
        { _id: paymentId },
        { razorpayOrderId: order.id }
      );

      res.status(201).json({
        orderId: order.id,
        amount: totalAmount, // Original amount (for display)
        amountInPaise, // Actual amount sent to Razorpay (may be reduced in test mode)
        currency,
        paymentId: payment._id.toString(),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        isTestPayment:
          isTestMode && amountInPaise < Math.round(totalAmount * 100),
        originalAmount: totalAmount, // Always include original amount
      });
    } catch (razorpayError) {
      console.error("[Create Order] Razorpay API error:", razorpayError);
      console.error(
        "[Create Order] Error details:",
        razorpayError.error || razorpayError
      );

      // If it's a limit/amount error and we're in test mode, suggest using test amount
      const errorMsg =
        razorpayError.error?.description || razorpayError.message || "";
      if (
        errorMsg.includes("limit") ||
        errorMsg.includes("exceed") ||
        errorMsg.includes("maximum")
      ) {
        return res.status(400).json({
          error: "Razorpay test account limit exceeded",
          message: `Test payment amount (₹${totalAmount}) exceeds Razorpay test account limits. The system will automatically use ₹100 for testing. Please try again.`,
          suggestion:
            "Set RAZORPAY_TEST_AMOUNT=10000 in your .env file to use ₹100 for all test payments",
        });
      }

      throw razorpayError; // Re-throw for default error handling
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pg-tenant/payments/:paymentId/verify
 * Manually verify payment status with Razorpay (fallback if webhook fails)
 */
router.post("/payments/:paymentId/verify", async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ error: "Invalid payment ID" });
    }

    const payment = await RentPayment.findOne({
      _id: paymentId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (!payment.razorpayOrderId) {
      return res.status(400).json({ error: "No Razorpay order ID found" });
    }

    // Check payment status with Razorpay
    const razorpayClient = getRazorpayClient();
    try {
      console.log(`[Verify] Fetching order: ${payment.razorpayOrderId}`);
      const order = await razorpayClient.orders.fetch(payment.razorpayOrderId);
      console.log(
        `[Verify] Order status: ${order.status}, amount_paid: ${order.amount_paid}, amount_due: ${order.amount_due}, amount: ${order.amount}`
      );

      const payments = await razorpayClient.orders.fetchPayments(
        payment.razorpayOrderId
      );
      console.log(`[Verify] Payments found: ${payments.items?.length || 0}`);
      if (payments.items && payments.items.length > 0) {
        payments.items.forEach((p, idx) => {
          console.log(
            `[Verify] Payment ${idx}: id=${p.id}, status=${p.status}, amount=${p.amount}, captured=${p.captured}`
          );
        });
      }

      // Check if order is paid - multiple ways to verify
      // 1. Order status is "paid"
      // 2. amount_paid equals or exceeds amount
      // 3. There's a captured payment
      const hasCapturedPayment =
        payments.items &&
        payments.items.some(
          (p) => p.status === "captured" || p.captured === true
        );
      const isOrderPaid =
        order.status === "paid" ||
        (order.amount_paid && order.amount_paid >= order.amount);
      const isPaid = isOrderPaid || hasCapturedPayment;

      console.log(
        `[Verify] Payment check: isOrderPaid=${isOrderPaid}, hasCapturedPayment=${hasCapturedPayment}, isPaid=${isPaid}`
      );

      if (isPaid && payments.items && payments.items.length > 0) {
        // Find the captured payment, or use the first one
        const paymentEntity =
          payments.items.find(
            (p) => p.status === "captured" || p.captured === true
          ) || payments.items[0];
        console.log(
          `[Verify] Using payment entity: ${paymentEntity.id}, status: ${paymentEntity.status}, captured: ${paymentEntity.captured}`
        );

        if (payment.status !== "PAID") {
          // Update payment status
          // Use captured_at if available, otherwise created_at, otherwise now
          const paidAtDate = paymentEntity.captured_at
            ? new Date(Number(paymentEntity.captured_at) * 1000)
            : paymentEntity.created_at
            ? new Date(Number(paymentEntity.created_at) * 1000)
            : new Date();

          console.log(
            `[Verify] Updating payment ${payment._id} to PAID, paidAt: ${paidAtDate}`
          );

          // Get tenant profile for billing settings
          const profile = await PgTenantProfile.findOne({
            userId: payment.tenantId,
          }).lean();

          const billingGraceLastDay = profile?.billingGraceLastDay || 5;
          const lateFeePerDay = profile?.lateFeePerDay || 50;

          // Calculate final late fee
          const finalLateFee = calculateLateFee(
            paidAtDate,
            payment.periodYear,
            payment.periodMonth,
            billingGraceLastDay,
            lateFeePerDay
          );

          const baseAmount = payment.baseAmount || payment.amount;
          const otherChargesTotal = Array.isArray(payment.otherCharges)
            ? payment.otherCharges.reduce(
                (sum, charge) => sum + (Number(charge.amount) || 0),
                0
              )
            : 0;
          const fixedChargesTotal =
            (payment.securityDeposit || 0) +
            (payment.joiningFee || 0) +
            otherChargesTotal;
          const finalTotalAmount =
            baseAmount + fixedChargesTotal + finalLateFee;

          // Check if this was a test payment (order notes might have original amount)
          // For now, use the calculated amount as it should be correct
          console.log(
            `[Verify] Updating payment: baseAmount=${baseAmount}, lateFee=${finalLateFee}, total=${finalTotalAmount}`
          );

          payment.status = "PAID";
          payment.razorpayPaymentId = paymentEntity.id;
          payment.paidAt = paidAtDate;
          payment.lateFeeAmount = finalLateFee;
          payment.amount = finalTotalAmount;
          payment.baseAmount = baseAmount; // Ensure baseAmount is set
          await payment.save();
          console.log(
            `[Verify] ✅ Payment ${payment._id} saved with status PAID, invoiceUrl will be generated next`
          );

          // Generate invoice if not already generated
          if (!payment.invoicePdfUrl) {
            try {
              const [property, tenant, owner] = await Promise.all([
                Flat.findById(payment.propertyId),
                User.findById(payment.tenantId),
                User.findById(payment.ownerId),
              ]);

              if (property && tenant && owner) {
                console.log(
                  `[Verify] Generating invoice for payment ${payment._id}...`
                );
                const invoiceUrl = await generateRentInvoice({
                  rentPayment: payment,
                  property,
                  tenant,
                  owner,
                });
                console.log(`[Verify] Invoice generated: ${invoiceUrl}`);
                payment.invoicePdfUrl = invoiceUrl;
                await payment.save();
                console.log(
                  `[Verify] ✅ Payment ${payment._id} updated with invoice URL`
                );

                // Send payment receipt emails to both tenant and owner
                try {
                  const frontendUrl =
                    process.env.FRONTEND_URL ||
                    "https://tenanat-management.vercel.app";

                  const monthNames = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];
                  const periodLabel = `${monthNames[payment.periodMonth - 1]} ${
                    payment.periodYear
                  }`;
                  const invoiceNumber = `INV-${payment.periodYear}${String(
                    payment.periodMonth
                  ).padStart(2, "0")}-${payment._id
                    .toString()
                    .slice(-6)
                    .toUpperCase()}`;

                  // Send to tenant
                  await sendPaymentReceiptToTenant({
                    tenantName: tenant.name,
                    ownerName: owner.name,
                    propertyName:
                      property.name || property.buildingName || "PG Property",
                    invoiceNumber,
                    periodLabel,
                    totalAmount: payment.amount,
                    baseAmount: payment.baseAmount || 0,
                    securityDeposit: payment.securityDeposit || 0,
                    joiningFee: payment.joiningFee || 0,
                    otherCharges: payment.otherCharges || [],
                    lateFeeAmount: payment.lateFeeAmount || 0,
                    paidAt: payment.paidAt || new Date(),
                    invoiceUrl,
                    tenantEmail: tenant.email,
                  });

                  // Send to owner
                  await sendPaymentReceiptToOwner({
                    ownerName: owner.name,
                    tenantName: tenant.name,
                    tenantEmail: tenant.email,
                    propertyName:
                      property.name || property.buildingName || "PG Property",
                    invoiceNumber,
                    periodLabel,
                    totalAmount: payment.amount,
                    baseAmount: payment.baseAmount || 0,
                    securityDeposit: payment.securityDeposit || 0,
                    joiningFee: payment.joiningFee || 0,
                    otherCharges: payment.otherCharges || [],
                    lateFeeAmount: payment.lateFeeAmount || 0,
                    paidAt: payment.paidAt || new Date(),
                    invoiceUrl,
                    ownerEmail: owner.email,
                  });

                  console.log(
                    `[Verify] ✅ Payment receipt emails sent to tenant and owner`
                  );
                } catch (emailError) {
                  console.error(
                    "[Verify] Failed to send payment receipt emails:",
                    emailError
                  );
                  // Don't fail the verification if email sending fails
                }
              } else {
                console.error(
                  `[Verify] Missing data: property=${!!property}, tenant=${!!tenant}, owner=${!!owner}`
                );
              }
            } catch (invoiceError) {
              console.error(
                "Failed to generate invoice during verification:",
                invoiceError
              );
            }
          }

          console.log(`[Verify] ✅ Payment verified and updated to PAID`);
          return res.json({
            verified: true,
            status: "PAID",
            message: "Payment verified and updated",
            invoiceUrl: payment.invoicePdfUrl,
          });
        } else {
          console.log(`[Verify] Payment already marked as PAID`);

          // If payment is already PAID but emails might not have been sent, try sending them
          if (payment.invoicePdfUrl) {
            try {
              const [property, tenant, owner] = await Promise.all([
                Flat.findById(payment.propertyId),
                User.findById(payment.tenantId),
                User.findById(payment.ownerId),
              ]);

              if (property && tenant && owner) {
                const monthNames = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];
                const periodLabel = `${monthNames[payment.periodMonth - 1]} ${
                  payment.periodYear
                }`;
                const invoiceNumber = `INV-${payment.periodYear}${String(
                  payment.periodMonth
                ).padStart(2, "0")}-${payment._id
                  .toString()
                  .slice(-6)
                  .toUpperCase()}`;

                // Send to tenant
                await sendPaymentReceiptToTenant({
                  tenantName: tenant.name,
                  ownerName: owner.name,
                  propertyName:
                    property.name || property.buildingName || "PG Property",
                  invoiceNumber,
                  periodLabel,
                  totalAmount: payment.amount,
                  baseAmount: payment.baseAmount || 0,
                  securityDeposit: payment.securityDeposit || 0,
                  joiningFee: payment.joiningFee || 0,
                  otherCharges: payment.otherCharges || [],
                  lateFeeAmount: payment.lateFeeAmount || 0,
                  paidAt: payment.paidAt || new Date(),
                  invoiceUrl: payment.invoicePdfUrl,
                  tenantEmail: tenant.email,
                });

                // Send to owner
                await sendPaymentReceiptToOwner({
                  ownerName: owner.name,
                  tenantName: tenant.name,
                  tenantEmail: tenant.email,
                  propertyName:
                    property.name || property.buildingName || "PG Property",
                  invoiceNumber,
                  periodLabel,
                  totalAmount: payment.amount,
                  baseAmount: payment.baseAmount || 0,
                  securityDeposit: payment.securityDeposit || 0,
                  joiningFee: payment.joiningFee || 0,
                  otherCharges: payment.otherCharges || [],
                  lateFeeAmount: payment.lateFeeAmount || 0,
                  paidAt: payment.paidAt || new Date(),
                  invoiceUrl: payment.invoicePdfUrl,
                  ownerEmail: owner.email,
                });

                console.log(
                  `[Verify] ✅ Payment receipt emails sent (payment already PAID)`
                );
              }
            } catch (emailError) {
              console.error(
                "[Verify] Failed to send payment receipt emails (payment already PAID):",
                emailError
              );
            }
          }

          return res.json({
            verified: true,
            status: "PAID",
            message: "Payment already marked as paid",
            invoiceUrl: payment.invoicePdfUrl,
          });
        }
      } else {
        console.log(
          `[Verify] ⚠️ Payment not yet captured. Order status: ${order.status}, amount_paid: ${order.amount_paid}/${order.amount}`
        );
        return res.json({
          verified: false,
          status: payment.status,
          message: "Payment not yet captured",
          orderStatus: order.status,
          amountPaid: order.amount_paid,
          amountDue: order.amount_due,
        });
      }
    } catch (razorpayError) {
      console.error("[Verify] Razorpay API error:", razorpayError);
      console.error(
        "[Verify] Error details:",
        razorpayError.error || razorpayError
      );
      return res.status(500).json({
        error: "Failed to verify payment with Razorpay",
        details:
          razorpayError.error?.description ||
          razorpayError.message ||
          "Unknown error",
      });
    }
  } catch (error) {
    console.error("[Verify] Unexpected error:", error);
    next(error);
  }
});

/**
 * GET /api/pg-tenant/payments/statistics
 * Get payment statistics for the current tenant (current year only)
 */
router.get("/payments/statistics", async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const currentYear = new Date().getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Get all payments for current year only
    const payments = await RentPayment.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      periodYear: currentYear,
    }).lean();

    const stats = {
      totalPayments: payments.length,
      paidPayments: payments.filter((p) => p.status === "PAID").length,
      pendingPayments: payments.filter((p) => p.status === "PENDING").length,
      totalPaid: 0,
      totalPending: 0,
      totalLateFees: 0,
      monthsPaid: [],
      monthsPending: [],
    };

    payments.forEach((payment) => {
      const baseAmount = payment.baseAmount || payment.amount;
      const lateFeeAmount = payment.lateFeeAmount || 0;
      const totalAmount = baseAmount + lateFeeAmount;

      if (payment.status === "PAID") {
        stats.totalPaid += totalAmount;
        stats.totalLateFees += lateFeeAmount;
        stats.monthsPaid.push({
          month: payment.periodMonth,
          year: payment.periodYear,
          amount: totalAmount,
          paidAt: payment.paidAt,
        });
      } else if (payment.status === "PENDING") {
        stats.totalPending += totalAmount;
        stats.monthsPending.push({
          month: payment.periodMonth,
          year: payment.periodYear,
          amount: totalAmount,
          dueDate: payment.dueDate,
        });
      }
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pg-tenant/payments/history
 * Get paginated payment history for the tenant (current year only, with filters)
 */
router.get("/payments/history", async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const skip = (page - 1) * limit;
    const filter = req.query.filter; // 'last5', 'lastMonth', 'all' (default: current year only)

    const currentYear = new Date().getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Build query - always restrict to current tenant
    const query = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };

    // Apply filters
    if (filter === "last5") {
      // Get last 5 entries (no pagination, just limit to 5)
      const payments = await RentPayment.find(query)
        .populate("propertyId", "name buildingName")
        .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 })
        .limit(5)
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
          periodMonth: payment.periodMonth,
          periodYear: payment.periodYear,
          periodLabel: `${monthNames[payment.periodMonth - 1]} ${
            payment.periodYear
          }`,
          property: {
            id: payment.propertyId._id.toString(),
            name:
              payment.propertyId.name ||
              payment.propertyId.buildingName ||
              "N/A",
          },
          baseAmount,
          amount: baseAmount,
          lateFeeAmount,
          totalAmount,
          dueDate: payment.dueDate,
          status: payment.status,
          paidAt: payment.paidAt,
          invoicePdfUrl: payment.invoicePdfUrl,
        };
      });

      return res.json({
        items,
        page: 1,
        limit: 5,
        total: payments.length,
        totalPages: 1,
        filter: "last5",
      });
    } else if (filter === "lastMonth") {
      // Get last month's payments
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const lastMonthYear =
        now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      query.periodMonth = lastMonth;
      query.periodYear = lastMonthYear;
    } else {
      // Default: current year only (receipts saved for a year)
      query.periodYear = currentYear;
    }

    const [total, payments] = await Promise.all([
      RentPayment.countDocuments(query),
      RentPayment.find(query)
        .populate("propertyId", "name buildingName")
        .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

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
        periodMonth: payment.periodMonth,
        periodYear: payment.periodYear,
        periodLabel: `${monthNames[payment.periodMonth - 1]} ${
          payment.periodYear
        }`,
        property: {
          id: payment.propertyId._id.toString(),
          name:
            payment.propertyId.name || payment.propertyId.buildingName || "N/A",
        },
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

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filter: filter || "currentYear",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pg-tenant/payments/:paymentId/generate-invoice
 * Manually generate invoice for a paid payment (if missing)
 */
router.post("/payments/:paymentId/generate-invoice", async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.user.id;

    // Find payment and verify it belongs to this tenant
    const payment = await RentPayment.findOne({
      _id: paymentId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: "PAID", // Only generate invoice for paid payments
    });

    if (!payment) {
      return res.status(404).json({
        error: "Payment not found or not eligible for invoice generation",
      });
    }

    // If invoice already exists, return it
    if (payment.invoicePdfUrl) {
      return res.json({
        success: true,
        invoiceUrl: payment.invoicePdfUrl,
        message: "Invoice already exists",
      });
    }

    // Fetch required data
    const [property, tenant, owner] = await Promise.all([
      Flat.findById(payment.propertyId),
      User.findById(payment.tenantId),
      User.findById(payment.ownerId),
    ]);

    if (!property || !tenant || !owner) {
      return res.status(400).json({
        error: "Missing required data for invoice generation",
        details: {
          property: !!property,
          tenant: !!tenant,
          owner: !!owner,
        },
      });
    }

    console.log(
      `[Generate Invoice] Generating invoice for payment ${payment._id}...`
    );

    // Generate invoice
    const invoiceUrl = await generateRentInvoice({
      rentPayment: payment,
      property,
      tenant,
      owner,
    });

    // Update payment with invoice URL
    payment.invoicePdfUrl = invoiceUrl;
    await payment.save();

    console.log(
      `[Generate Invoice] ✅ Invoice generated: ${invoiceUrl} for payment ${payment._id}`
    );

    res.json({
      success: true,
      invoiceUrl,
      message: "Invoice generated successfully",
    });
  } catch (error) {
    console.error("[Generate Invoice] Error:", error);
    next(error);
  }
});

export default router;
