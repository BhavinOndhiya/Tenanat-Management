import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import MaintenancePayment from "../models/MaintenancePayment.js";

export const PAYMENT_STATE = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  FAILED: "FAILED",
});

export const PAYMENT_SOURCE = Object.freeze({
  ADMIN: "ADMIN",
  CITIZEN: "CITIZEN",
  GATEWAY: "GATEWAY",
});

export const PAYMENT_GATEWAY = Object.freeze({
  RAZORPAY: "RAZORPAY",
});

export const sumApprovedPaymentsByInvoice = async (invoiceIds = []) => {
  if (!invoiceIds.length) {
    return {};
  }

  const totals = await MaintenancePayment.aggregate([
    {
      $match: {
        invoice: { $in: invoiceIds },
        state: PAYMENT_STATE.APPROVED,
      },
    },
    {
      $group: {
        _id: "$invoice",
        totalPaid: { $sum: "$amount" },
      },
    },
  ]);

  return totals.reduce((acc, entry) => {
    acc[entry._id.toString()] = entry.totalPaid;
    return acc;
  }, {});
};

const determineInvoiceStatus = (invoice, totalPaid) => {
  if (totalPaid >= invoice.amount) {
    return "PAID";
  }

  if (totalPaid > 0) {
    return "PARTIALLY_PAID";
  }

  const now = new Date();
  if (invoice.dueDate && invoice.dueDate < now) {
    return "OVERDUE";
  }

  return "PENDING";
};

export const recalculateInvoiceTotals = async (invoiceId) => {
  const invoice = await MaintenanceInvoice.findById(invoiceId);
  if (!invoice) {
    return null;
  }

  const totalsMap = await sumApprovedPaymentsByInvoice([invoice._id]);
  const totalPaid = totalsMap[invoice._id.toString()] || 0;
  const outstanding = Math.max(invoice.amount - totalPaid, 0);
  const newStatus = determineInvoiceStatus(invoice, totalPaid);

  if (invoice.status !== newStatus) {
    invoice.status = newStatus;
    await invoice.save();
  }

  return { invoice, totalPaid, outstanding };
};
