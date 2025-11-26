import crypto from "crypto";
import express from "express";
import MaintenancePayment from "../models/MaintenancePayment.js";
import {
  PAYMENT_STATE,
  recalculateInvoiceTotals,
} from "../services/billingPaymentService.js";

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

      if (!gatewayOrderId) {
        return res.status(200).json({ message: "No order reference found" });
      }

      const paymentRecord = await MaintenancePayment.findOne({
        gatewayOrderId,
      });

      if (!paymentRecord) {
        return res.status(200).json({ message: "Payment record not found" });
      }

      const isFailureEvent =
        eventType === "payment.failed" || paymentEntity?.status === "failed";

      if (isFailureEvent && paymentRecord.state !== PAYMENT_STATE.APPROVED) {
        paymentRecord.state = PAYMENT_STATE.FAILED;
        paymentRecord.gatewayPaymentId =
          paymentEntity?.id || paymentRecord.gatewayPaymentId;
        await paymentRecord.save();
        return res.json({ received: true });
      }

      const isSuccessEvent =
        ["payment.captured", "order.paid"].includes(eventType) ||
        paymentEntity?.status === "captured";

      if (isSuccessEvent) {
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
        return res.json({ received: true });
      }

      return res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
