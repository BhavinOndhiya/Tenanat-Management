import crypto from "crypto";
import express from "express";
import MaintenancePayment from "../models/MaintenancePayment.js";
import RentPayment from "../models/RentPayment.js";
import {
  PAYMENT_STATE,
  recalculateInvoiceTotals,
} from "../services/billingPaymentService.js";
import { generateRentInvoice } from "../services/invoiceService.js";
import User from "../models/User.js";
import Flat from "../models/Flat.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import { calculateLateFee } from "../services/rentBillingService.js";
import {
  sendPaymentReceiptToTenant,
  sendPaymentReceiptToOwner,
} from "../services/notificationService.js";

const router = express.Router();

router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        return res
          .status(500)
          .json({ error: "Webhook secret is not configured" });
      }

      const signature = req.headers["x-razorpay-signature"];
      if (!signature) {
        return res.status(400).json({ error: "Missing Razorpay signature" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const payload = JSON.parse(req.body.toString("utf8"));
      const eventType = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const gatewayOrderId =
        paymentEntity?.order_id ||
        orderEntity?.id ||
        payload.payload?.payment?.entity?.order_id;

      // Fetch full order details if we have order ID (to get notes with original amount)
      let fullOrderEntity = orderEntity;
      if (gatewayOrderId && !orderEntity?.notes) {
        try {
          const razorpayClient = (
            await import("../lib/razorpayClient.js")
          ).default();
          fullOrderEntity = await razorpayClient.orders.fetch(gatewayOrderId);
        } catch (fetchError) {
          console.warn(
            "[Webhook] Could not fetch order details:",
            fetchError.message
          );
        }
      }

      console.log(`[Webhook] Received event: ${eventType}`);
      console.log(`[Webhook] Gateway Order ID: ${gatewayOrderId}`);
      console.log(`[Webhook] Payment Entity ID: ${paymentEntity?.id}`);
      console.log(`[Webhook] Payment Status: ${paymentEntity?.status}`);

      if (!gatewayOrderId) {
        console.error("[Webhook] No order reference found in payload");
        return res.status(200).json({ message: "No order reference found" });
      }

      // Check for MaintenancePayment first
      let paymentRecord = await MaintenancePayment.findOne({
        gatewayOrderId,
      });

      let isRentPayment = false;
      if (!paymentRecord) {
        // Check for RentPayment
        paymentRecord = await RentPayment.findOne({
          razorpayOrderId: gatewayOrderId,
        });
        isRentPayment = !!paymentRecord;
        if (paymentRecord) {
          console.log(
            `[Webhook] Found RentPayment: ${paymentRecord._id}, current status: ${paymentRecord.status}`
          );
        }
      } else {
        console.log(`[Webhook] Found MaintenancePayment: ${paymentRecord._id}`);
      }

      if (!paymentRecord) {
        console.error(
          `[Webhook] Payment record not found for order ID: ${gatewayOrderId}`
        );
        return res.status(200).json({ message: "Payment record not found" });
      }

      const isFailureEvent =
        eventType === "payment.failed" || paymentEntity?.status === "failed";

      if (isFailureEvent) {
        if (isRentPayment) {
          if (paymentRecord.status !== "PAID") {
            paymentRecord.status = "FAILED";
            paymentRecord.razorpayPaymentId =
              paymentEntity?.id || paymentRecord.razorpayPaymentId;
            await paymentRecord.save();
          }
        } else {
          if (paymentRecord.state !== PAYMENT_STATE.APPROVED) {
            paymentRecord.state = PAYMENT_STATE.FAILED;
            paymentRecord.gatewayPaymentId =
              paymentEntity?.id || paymentRecord.gatewayPaymentId;
            await paymentRecord.save();
          }
        }
        return res.json({ received: true });
      }

      const isSuccessEvent =
        ["payment.captured", "order.paid"].includes(eventType) ||
        paymentEntity?.status === "captured";

      if (isSuccessEvent) {
        console.log(
          `[Webhook] Processing success event for ${
            isRentPayment ? "RentPayment" : "MaintenancePayment"
          }`
        );
        if (isRentPayment) {
          console.log(
            `[Webhook] RentPayment current status: ${paymentRecord.status}, will update to PAID`
          );
          if (paymentRecord.status !== "PAID") {
            // Calculate final late fee based on actual payment date
            const paidAtDate =
              paymentEntity?.captured_at && Number(paymentEntity?.captured_at)
                ? new Date(Number(paymentEntity.captured_at) * 1000)
                : new Date();

            // Get tenant profile for billing settings
            const profile = await PgTenantProfile.findOne({
              userId: paymentRecord.tenantId,
            }).lean();

            const billingGraceLastDay = profile?.billingGraceLastDay || 5;
            const lateFeePerDay = profile?.lateFeePerDay || 50;

            // Calculate final late fee
            const finalLateFee = calculateLateFee(
              paidAtDate,
              paymentRecord.periodYear,
              paymentRecord.periodMonth,
              billingGraceLastDay,
              lateFeePerDay
            );

            const baseAmount = paymentRecord.baseAmount || paymentRecord.amount;
            const otherChargesTotal = Array.isArray(paymentRecord.otherCharges)
              ? paymentRecord.otherCharges.reduce(
                  (sum, charge) => sum + (Number(charge.amount) || 0),
                  0
                )
              : 0;
            const fixedChargesTotal =
              (paymentRecord.securityDeposit || 0) +
              (paymentRecord.joiningFee || 0) +
              otherChargesTotal;
            const finalTotalAmount =
              baseAmount + fixedChargesTotal + finalLateFee;

            // If this was a test payment with reduced amount, use the original amount from notes
            // The order notes contain the original amount
            const orderNotes =
              fullOrderEntity?.notes || orderEntity?.notes || {};
            const originalAmount = orderNotes.originalAmount
              ? Number(orderNotes.originalAmount)
              : null;

            if (originalAmount && originalAmount !== finalTotalAmount) {
              console.log(
                `[Webhook] Test payment detected: Using original amount ₹${originalAmount} instead of calculated ₹${finalTotalAmount}`
              );
            }

            paymentRecord.status = "PAID";
            paymentRecord.razorpayPaymentId = paymentEntity?.id;
            paymentRecord.razorpaySignature = paymentEntity?.id
              ? signature
              : null;
            paymentRecord.paidAt = paidAtDate;
            paymentRecord.lateFeeAmount = finalLateFee;
            // Use original amount if it was a test payment, otherwise use calculated total
            paymentRecord.amount = originalAmount || finalTotalAmount;
            paymentRecord.baseAmount = baseAmount; // Ensure baseAmount is set
            await paymentRecord.save();

            // Generate invoice PDF
            try {
              const [property, tenant, owner] = await Promise.all([
                Flat.findById(paymentRecord.propertyId),
                User.findById(paymentRecord.tenantId),
                User.findById(paymentRecord.ownerId),
              ]);

              if (property && tenant && owner) {
                console.log(
                  `[Webhook] Generating invoice for payment ${paymentRecord._id}, tenant ${tenant.email}, amount ${finalTotalAmount}`
                );
                const invoiceResult = await generateRentInvoice({
                  rentPayment: paymentRecord,
                  property,
                  tenant,
                  owner,
                });
                console.log(
                  `[Webhook] Invoice generated: ${invoiceResult.url}`
                );
                paymentRecord.invoicePdfUrl = invoiceResult.url;
                paymentRecord.invoicePdfBase64 = invoiceResult.base64; // Store base64 for serverless
                await paymentRecord.save();
                console.log(
                  `[Webhook] Payment record updated with invoice URL`
                );

                // Send payment receipt emails to both tenant and owner
                try {
                  const frontendUrl =
                    process.env.FRONTEND_URL ||
                    "https://tenanat-management.vercel.app";

                  // Generate password update token for tenant (valid for 24 hours)
                  const jwt = (await import("jsonwebtoken")).default;
                  const crypto = (await import("crypto")).default;
                  const updateTokenId = crypto.randomBytes(16).toString("hex");
                  const passwordUpdateToken = jwt.sign(
                    {
                      userId: tenant._id.toString(),
                      email: tenant.email,
                      type: "password_update",
                      jti: updateTokenId, // JWT ID for one-time use tracking
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: "24h" }
                  );
                  const passwordUpdateUrl = `${frontendUrl}/auth/update-password?token=${passwordUpdateToken}`;

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
                  const periodLabel = `${
                    monthNames[paymentRecord.periodMonth - 1]
                  } ${paymentRecord.periodYear}`;
                  const invoiceNumber = `INV-${
                    paymentRecord.periodYear
                  }${String(paymentRecord.periodMonth).padStart(
                    2,
                    "0"
                  )}-${paymentRecord._id.toString().slice(-6).toUpperCase()}`;

                  // Send to tenant
                  await sendPaymentReceiptToTenant({
                    tenantName: tenant.name,
                    ownerName: owner.name,
                    propertyName:
                      property.name || property.buildingName || "PG Property",
                    invoiceNumber,
                    periodLabel,
                    totalAmount: paymentRecord.amount,
                    baseAmount: paymentRecord.baseAmount || 0,
                    securityDeposit: paymentRecord.securityDeposit || 0,
                    joiningFee: paymentRecord.joiningFee || 0,
                    otherCharges: paymentRecord.otherCharges || [],
                    lateFeeAmount: paymentRecord.lateFeeAmount || 0,
                    paidAt: paymentRecord.paidAt || new Date(),
                    invoiceUrl: invoiceResult.url,
                    passwordUpdateUrl,
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
                    totalAmount: paymentRecord.amount,
                    baseAmount: paymentRecord.baseAmount || 0,
                    securityDeposit: paymentRecord.securityDeposit || 0,
                    joiningFee: paymentRecord.joiningFee || 0,
                    otherCharges: paymentRecord.otherCharges || [],
                    lateFeeAmount: paymentRecord.lateFeeAmount || 0,
                    paidAt: paymentRecord.paidAt || new Date(),
                    invoiceUrl: invoiceResult.url,
                    ownerEmail: owner.email,
                  });

                  console.log(
                    `[Webhook] ✅ Payment receipt emails sent to tenant and owner`
                  );
                } catch (emailError) {
                  console.error(
                    "[Webhook] Failed to send payment receipt emails:",
                    emailError
                  );
                  // Don't fail the webhook if email sending fails
                }
              } else {
                console.error(
                  `[Webhook] Missing data for invoice generation: property=${!!property}, tenant=${!!tenant}, owner=${!!owner}`
                );
              }
            } catch (invoiceError) {
              console.error(
                "[Webhook] Failed to generate rent invoice:",
                invoiceError
              );
              console.error(
                "[Webhook] Invoice error stack:",
                invoiceError.stack
              );
              // Don't fail the webhook if invoice generation fails
            }
          }
        } else {
          if (paymentRecord.state !== PAYMENT_STATE.APPROVED) {
            paymentRecord.state = PAYMENT_STATE.APPROVED;
            paymentRecord.gatewayPaymentId =
              paymentEntity?.id || paymentRecord.gatewayPaymentId;
            paymentRecord.paidAt =
              paymentEntity?.captured_at && Number(paymentEntity?.captured_at)
                ? new Date(Number(paymentEntity.captured_at) * 1000)
                : new Date();
            await paymentRecord.save();
            await recalculateInvoiceTotals(paymentRecord.invoice);
          }
        }
        return res.json({ received: true });
      }

      return res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
