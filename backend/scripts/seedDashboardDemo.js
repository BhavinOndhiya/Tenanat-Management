import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../src/db/client.js";
import User from "../src/models/User.js";
import Flat from "../src/models/Flat.js";
import UserFlat from "../src/models/UserFlat.js";
import Tenant from "../src/models/Tenant.js";
import MaintenanceInvoice from "../src/models/MaintenanceInvoice.js";
import MaintenancePayment from "../src/models/MaintenancePayment.js";
import {
  PAYMENT_SOURCE,
  PAYMENT_STATE,
} from "../src/services/billingPaymentService.js";

dotenv.config();

const ownerEmail =
  process.env.DASHBOARD_DEMO_OWNER_EMAIL || "owner.dashboard@example.com";
const ownerPassword =
  process.env.DASHBOARD_DEMO_OWNER_PASSWORD || "OwnerDemoPass123!";

const demoBuildings = ["Aurora PG", "Harbor View PG"];
const tenantSeeds = [
  { name: "Priya Nair", email: "tenant1.dashboard@example.com" },
  { name: "Rahul Sen", email: "tenant2.dashboard@example.com" },
  { name: "Ishita Sharma", email: "tenant3.dashboard@example.com" },
  { name: "Varun Iyer", email: "tenant4.dashboard@example.com" },
  { name: "Sneha Kapoor", email: "tenant5.dashboard@example.com" },
];

const ensureUser = async ({ name, email, password, role = "CITIZEN" }) => {
  let user = await User.findOne({ email });
  if (user) {
    return user;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  user = await User.create({
    name,
    email,
    passwordHash,
    role,
    isActive: true,
  });
  return user;
};

const cleanupDemoData = async (ownerId) => {
  const flats = await Flat.find({ buildingName: { $in: demoBuildings } })
    .select("_id")
    .lean();
  const flatIds = flats.map((flat) => flat._id);

  if (flatIds.length) {
    const invoices = await MaintenanceInvoice.find({
      flat: { $in: flatIds },
    })
      .select("_id")
      .lean();
    const invoiceIds = invoices.map((invoice) => invoice._id);

    if (invoiceIds.length) {
      await MaintenancePayment.deleteMany({ invoice: { $in: invoiceIds } });
      await MaintenanceInvoice.deleteMany({ _id: { $in: invoiceIds } });
    }

    await Tenant.deleteMany({ flatId: { $in: flatIds } });
    await UserFlat.deleteMany({ flatId: { $in: flatIds }, userId: ownerId });
    await Flat.deleteMany({ _id: { $in: flatIds } });
  }

  await User.deleteMany({
    email: { $in: tenantSeeds.map((seed) => seed.email) },
  });
};

const addMonths = (base, months) => {
  const date = new Date(base);
  date.setMonth(date.getMonth() + months);
  return date;
};

const seedDashboardDemo = async () => {
  const owner = await ensureUser({
    name: "Dashboard Owner",
    email: ownerEmail,
    password: ownerPassword,
  });

  await cleanupDemoData(owner._id);

  const sampleFlats = [
    { buildingName: "Aurora PG", block: "A", flatNumber: "101", floor: 1 },
    { buildingName: "Aurora PG", block: "A", flatNumber: "102", floor: 1 },
    { buildingName: "Aurora PG", block: "B", flatNumber: "201", floor: 2 },
    {
      buildingName: "Harbor View PG",
      block: "North",
      flatNumber: "12",
      floor: 3,
    },
    {
      buildingName: "Harbor View PG",
      block: "South",
      flatNumber: "22",
      floor: 2,
    },
  ];

  const flats = await Flat.insertMany(sampleFlats);

  const ownerAssignments = flats.map((flat, index) => ({
    userId: owner._id,
    flatId: flat._id,
    relation: "OWNER",
    isPrimary: index === 0,
  }));
  await UserFlat.insertMany(ownerAssignments);

  const tenantUsers = [];
  for (const seed of tenantSeeds) {
    const tenantUser = await ensureUser({
      name: seed.name,
      email: seed.email,
      password: "TenantDemoPass123!",
    });
    tenantUsers.push(tenantUser);
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
  const followingMonthStart = new Date(currentYear, currentMonth + 2, 1);

  const tenantsPlan = [
    {
      flatId: flats[0]._id,
      tenantUser: tenantUsers[0],
      rentAmount: 12000,
      rentDueDate: 5,
      leaseStartDate: addMonths(now, -6),
      leaseEndDate: null,
      contactPhone: "+91-90000-00001",
    },
    {
      flatId: flats[1]._id,
      tenantUser: tenantUsers[1],
      rentAmount: 11500,
      rentDueDate: 10,
      leaseStartDate: new Date(currentYear, currentMonth, 3),
      leaseEndDate: null,
      contactPhone: "+91-90000-00002",
    },
    {
      flatId: flats[2]._id,
      tenantUser: tenantUsers[2],
      rentAmount: 13000,
      rentDueDate: 12,
      leaseStartDate: addMonths(now, -10),
      leaseEndDate: new Date(currentYear, currentMonth + 1, 15),
      contactPhone: "+91-90000-00003",
    },
    {
      flatId: flats[3]._id,
      tenantUser: tenantUsers[3],
      rentAmount: 12500,
      rentDueDate: 8,
      leaseStartDate: nextMonthStart,
      leaseEndDate: null,
      contactPhone: "+91-90000-00004",
    },
    {
      flatId: flats[4]._id,
      tenantUser: tenantUsers[4],
      rentAmount: 11800,
      rentDueDate: 6,
      leaseStartDate: followingMonthStart,
      leaseEndDate: null,
      contactPhone: "+91-90000-00005",
    },
  ];

  const tenants = await Tenant.insertMany(
    tenantsPlan.map(({ tenantUser, ...tenant }) => ({
      ...tenant,
      tenantUserId: tenantUser._id,
      ownerId: owner._id,
      roomType: "NON_AC",
      foodIncluded: false,
      roomNumber: "",
      sharing: 1,
      isActive: true,
      contactEmail: tenantUser.email,
      notes: "Dashboard demo tenant",
    }))
  );

  const invoices = await MaintenanceInvoice.insertMany(
    flats.slice(0, 3).map((flat, index) => ({
      flat: flat._id,
      month: currentMonth + 1,
      year: currentYear,
      amount: 9000 + index * 1500,
      dueDate: new Date(currentYear, currentMonth, 5 + index * 2),
      status: "PAID",
      notes: "Dashboard demo invoice",
    }))
  );

  const payments = await Promise.all(
    invoices.map((invoice, index) =>
      MaintenancePayment.create({
        invoice: invoice._id,
        paidByUser: owner._id,
        amount: invoice.amount,
        method: "ONLINE",
        reference: `DEMO-TXN-${index + 1}`,
        paidAt: new Date(),
        state: PAYMENT_STATE.APPROVED,
        source: PAYMENT_SOURCE.ADMIN,
      })
    )
  );

  return {
    flats: flats.length,
    tenants: tenants.length,
    invoices: invoices.length,
    payments: payments.length,
    ownerEmail: owner.email,
  };
};

const run = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Check your environment variables."
      );
    }

    await connectDB();
    const result = await seedDashboardDemo();

    console.log(
      `✅ Seeded ${result.flats} properties, ${result.tenants} tenants, ${result.invoices} invoices, ${result.payments} collections for ${result.ownerEmail}.`
    );
  } catch (error) {
    console.error("❌ Failed to seed dashboard demo data:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
