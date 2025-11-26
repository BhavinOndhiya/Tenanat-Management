import mongoose from "mongoose";
import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import BillingReminderLog from "../models/BillingReminderLog.js";
import UserFlat from "../models/UserFlat.js";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatMonthYear = (invoice) =>
  `${invoice.month}`.padStart(2, "0") + "/" + invoice.year;

const buildReminderMessage = (invoice) => {
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString()
    : "N/A";
  return `Maintenance Reminder: Invoice ${formatMonthYear(
    invoice
  )} is due on ${dueDate}. Amount: ${formatCurrency(
    invoice.amount
  )}. Please log in to the portal to view details.`;
};

export const sendEmailReminder = async (user, invoice) => {
  if (!user.email) {
    throw new Error("User has no email configured");
  }

  const message = buildReminderMessage(invoice);
  const webhook = process.env.EMAIL_WEBHOOK_URL;

  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject: "Society Maintenance Reminder",
          message,
        }),
      });
      return true;
    } catch (error) {
      throw new Error(
        `Email provider error for ${user.email}: ${error.message}`
      );
    }
  }

  console.log(`[BillingReminder] Email → ${user.email}: ${message}`);
  return true;
};

export const sendWhatsAppReminder = async (user, invoice) => {
  const number = user.whatsappNumber || user.phoneNumber;
  if (!number) {
    throw new Error("User has no WhatsApp number configured");
  }

  const message = buildReminderMessage(invoice);
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (apiUrl && apiKey) {
    try {
      await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: number,
          message,
        }),
      });
      return true;
    } catch (error) {
      throw new Error(
        `WhatsApp provider error for ${number}: ${error.message}`
      );
    }
  }

  console.log(`[BillingReminder] WhatsApp → ${number}: ${message}`);
  return true;
};

export const findInvoicesRequiringReminders = async (daysBeforeDue = 0) => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Number(daysBeforeDue || 0));
  end.setHours(23, 59, 59, 999);

  const invoices = await MaintenanceInvoice.find({
    status: { $ne: "PAID" },
    dueDate: { $gte: start, $lte: end },
  })
    .populate("flat", "buildingName block flatNumber")
    .lean();

  return invoices;
};

export const logReminder = async ({
  invoiceId,
  userId,
  channel,
  status,
  error,
}) => {
  await BillingReminderLog.create({
    invoice: invoiceId,
    user: userId,
    channel,
    status,
    error,
  });
};

export const reminderAlreadySentToday = async (invoiceId, userId) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const existing = await BillingReminderLog.findOne({
    invoice: new mongoose.Types.ObjectId(invoiceId),
    user: new mongoose.Types.ObjectId(userId),
    sentAt: { $gte: start, $lte: end },
  });

  return !!existing;
};

export const getResidentsForFlat = async (flatId) => {
  const assignments = await UserFlat.find({
    flatId: new mongoose.Types.ObjectId(flatId),
  })
    .populate(
      "userId",
      "name email phone phoneNumber whatsappNumber preferredBillingChannel"
    )
    .lean();

  return assignments.map((assignment) => assignment.userId).filter(Boolean);
};
