import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "./client.js";
import User from "../models/User.js";
import Flat from "../models/Flat.js";
import UserFlat from "../models/UserFlat.js";
import Complaint from "../models/Complaint.js";
import Announcement from "../models/Announcement.js";
import Event from "../models/Event.js";
import EventParticipant from "../models/EventParticipant.js";
import MaintenanceInvoice from "../models/MaintenanceInvoice.js";
import MaintenancePayment from "../models/MaintenancePayment.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import RentPayment from "../models/RentPayment.js";

dotenv.config();

const ensureUser = async ({ name, email, password, role, extra = {} }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User already exists: ${email}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    isActive: true,
    ...extra,
  });
  console.log(`Created ${role.toLowerCase()} user: ${email}`);
  return user;
};

const ensureFlat = async (flatData) => {
  const existing = await Flat.findOne({
    buildingName: flatData.buildingName,
    block: flatData.block,
    flatNumber: flatData.flatNumber,
  });

  if (existing) {
    let needsSave = false;
    if (
      flatData.ownerId &&
      (!existing.ownerId ||
        existing.ownerId.toString() !== flatData.ownerId.toString())
    ) {
      existing.ownerId = flatData.ownerId;
      needsSave = true;
    }
    if (flatData.type && existing.type !== flatData.type) {
      existing.type = flatData.type;
      needsSave = true;
    }
    if (needsSave) {
      await existing.save();
    }
    return existing;
  }

  const flat = await Flat.create(flatData);
  console.log(
    `Created flat ${flatData.flatNumber} in ${flatData.buildingName}`
  );
  return flat;
};

const ensureAssignment = async ({ userId, flatId, relation, isPrimary }) => {
  const existing = await UserFlat.findOne({ userId, flatId });
  if (existing) {
    return existing;
  }

  if (isPrimary) {
    await UserFlat.updateMany({ userId }, { $set: { isPrimary: false } });
  }

  const assignment = await UserFlat.create({
    userId,
    flatId,
    relation,
    isPrimary,
  });
  console.log(`Assigned user ${userId} to flat ${flatId} (${relation})`);

  if (relation === "OWNER") {
    await Flat.findByIdAndUpdate(flatId, { ownerId: userId });
    await User.findByIdAndUpdate(userId, {
      $addToSet: { ownerProperties: flatId },
    });
  }

  return assignment;
};

async function main() {
  console.log("Seeding database for milestone 3...");

  await connectDB();

  const admin = await ensureUser({
    name: "Society Admin",
    email: "admin@example.com",
    password: "AdminPass123!",
    role: "ADMIN",
  });

  const officer = await ensureUser({
    name: "Operations Officer",
    email: "officer@example.com",
    password: "OfficerPass123!",
    role: "OFFICER",
  });

  const citizen = await ensureUser({
    name: "Asha Patel",
    email: "citizen@example.com",
    password: "CitizenPass123!",
    role: "CITIZEN",
  });

  const citizenTwo = await ensureUser({
    name: "Rohan Mehta",
    email: "rohan@example.com",
    password: "CitizenPass123!",
    role: "CITIZEN",
  });

  const flatOwner = await ensureUser({
    name: "Meera Shah",
    email: "flatowner@example.com",
    password: "FlatOwnerPass123!",
    role: "FLAT_OWNER",
  });

  const pgOwner = await ensureUser({
    name: "Karan Patel",
    email: "pgowner@example.com",
    password: "PgOwnerPass123!",
    role: "PG_OWNER",
    extra: {
      phone: "+91 98765 43210",
    },
  });

  const flatA101 = await ensureFlat({
    buildingName: "Skyline Residency",
    block: "A",
    flatNumber: "101",
    floor: 1,
  });

  const flatA502 = await ensureFlat({
    buildingName: "Skyline Residency",
    block: "A",
    flatNumber: "502",
    floor: 5,
  });

  const flatB204 = await ensureFlat({
    buildingName: "Lakeview Towers",
    block: "B",
    flatNumber: "204",
    floor: 2,
  });

  const flatC301 = await ensureFlat({
    buildingName: "Green Heights",
    block: "C",
    flatNumber: "301",
    floor: 3,
    type: "FLAT",
    ownerId: flatOwner._id,
  });

  const pgResidence = await ensureFlat({
    buildingName: "Sunrise PG Residency",
    block: "Main",
    flatNumber: "PG-1",
    floor: 0,
    type: "PG",
    ownerId: pgOwner._id,
    name: "Sunrise PG Residency",
    address: {
      line1: "Near Riverfront Road",
      line2: "Opp. City Mall",
      city: "Ahmedabad",
      state: "Gujarat",
      zipCode: "380015",
    },
    landmark: "Opp. City Mall",
    totalBeds: 30,
    totalRooms: 10,
    genderType: "BOYS",
    facilitiesAvailable: [
      "WIFI",
      "FOOD",
      "LAUNDRY",
      "POWER_BACKUP",
      "CCTV",
      "HOUSEKEEPING",
    ],
    baseRentPerBed: 8500,
    notes: "Breakfast & dinner included",
    pgMetadata: {
      totalBeds: 30,
      totalRooms: 10,
      amenities: [
        "WIFI",
        "FOOD",
        "LAUNDRY",
        "POWER_BACKUP",
        "CCTV",
        "HOUSEKEEPING",
      ],
    },
  });

  await ensureAssignment({
    userId: citizen._id,
    flatId: flatA101._id,
    relation: "OWNER",
    isPrimary: true,
  });

  await ensureAssignment({
    userId: citizenTwo._id,
    flatId: flatA502._id,
    relation: "OWNER",
    isPrimary: true,
  });

  await ensureAssignment({
    userId: officer._id,
    flatId: flatB204._id,
    relation: "OWNER",
    isPrimary: true,
  });

  await ensureAssignment({
    userId: flatOwner._id,
    flatId: flatC301._id,
    relation: "OWNER",
    isPrimary: true,
  });

  await ensureAssignment({
    userId: pgOwner._id,
    flatId: pgResidence._id,
    relation: "OWNER",
    isPrimary: true,
  });

  const flatTenant = await ensureUser({
    name: "Neha Verma",
    email: "tenant.flat@example.com",
    password: "TenantPass123!",
    role: "TENANT",
  });

  await ensureAssignment({
    userId: flatTenant._id,
    flatId: flatC301._id,
    relation: "TENANT",
    isPrimary: true,
  });

  const pgTenantA = await ensureUser({
    name: "Rahul Kumar",
    email: "pgtenant@example.com",
    password: "PgTenantPass123!",
    role: "PG_TENANT",
    extra: {
      assignedProperty: pgResidence._id,
      roomNumber: "R1",
      bedNumber: "B1",
    },
  });

  const pgTenantB = await ensureUser({
    name: "Sneha Rao",
    email: "pgtenant2@example.com",
    password: "PgTenantPass123!",
    role: "PG_TENANT",
    extra: {
      assignedProperty: pgResidence._id,
      roomNumber: "R2",
      bedNumber: "B2",
    },
  });

  // Set moveInDate to a date in the past (e.g., 3 months ago) so we have payment history
  const moveInDateA = new Date();
  moveInDateA.setMonth(moveInDateA.getMonth() - 3);
  moveInDateA.setDate(15); // Move-in on 15th of that month

  const moveInDateB = new Date();
  moveInDateB.setMonth(moveInDateB.getMonth() - 2);
  moveInDateB.setDate(20); // Move-in on 20th of that month

  await PgTenantProfile.findOneAndUpdate(
    { userId: pgTenantA._id },
    {
      $set: {
        propertyId: pgResidence._id,
        roomNumber: "R1",
        bedNumber: "B1",
        monthlyRent: 22000,
        moveInDate: moveInDateA,
        billingDueDay: 1,
        billingGraceLastDay: 5,
        lateFeePerDay: 50,
        servicesIncluded: ["WIFI", "FOOD", "LAUNDRY", "POWER_BACKUP"],
        startDate: moveInDateA,
        status: "ACTIVE",
        sharingType: "2",
        acPreference: "AC",
        foodPreference: "WITH_FOOD",
      },
    },
    { upsert: true }
  );

  await PgTenantProfile.findOneAndUpdate(
    { userId: pgTenantB._id },
    {
      $set: {
        propertyId: pgResidence._id,
        roomNumber: "R2",
        bedNumber: "B2",
        monthlyRent: 21000,
        moveInDate: moveInDateB,
        billingDueDay: 1,
        billingGraceLastDay: 5,
        lateFeePerDay: 50,
        servicesIncluded: ["WIFI", "HOUSEKEEPING"],
        startDate: moveInDateB,
        status: "ACTIVE",
        sharingType: "3",
        acPreference: "NON_AC",
        foodPreference: "WITHOUT_FOOD",
      },
    },
    { upsert: true }
  );

  const complaintCount = await Complaint.countDocuments();

  if (complaintCount === 0) {
    await Complaint.insertMany([
      {
        type: "FLAT",
        tenantId: flatTenant._id,
        userId: flatTenant._id,
        ownerId: flatOwner._id,
        propertyId: flatC301._id,
        flatId: flatC301._id,
        title: "Water heater not working",
        description: "The geyser in bathroom 1 has stopped heating.",
        category: "ELECTRICITY",
        priority: "HIGH",
        status: "OPEN",
        metadata: {
          tenantSnapshot: {
            name: flatTenant.name,
            email: flatTenant.email,
            phone: flatTenant.phone || "",
          },
          propertySnapshot: {
            buildingName: flatC301.buildingName,
            block: flatC301.block,
            flatNumber: flatC301.flatNumber,
            type: flatC301.type,
          },
        },
      },
      {
        type: "PG",
        tenantId: pgTenantA._id,
        userId: pgTenantA._id,
        ownerId: pgOwner._id,
        propertyId: pgResidence._id,
        flatId: pgResidence._id,
        title: "Mess food quality issue",
        description:
          "Food served this week is undercooked and causing issues for residents.",
        category: "FOOD",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        metadata: {
          tenantSnapshot: {
            name: pgTenantA.name,
            email: pgTenantA.email,
            phone: pgTenantA.phone || "",
          },
          propertySnapshot: {
            buildingName: pgResidence.buildingName,
            block: pgResidence.block,
            flatNumber: pgResidence.flatNumber,
            type: pgResidence.type,
          },
        },
      },
      {
        type: "PG",
        tenantId: pgTenantB._id,
        userId: pgTenantB._id,
        ownerId: pgOwner._id,
        propertyId: pgResidence._id,
        flatId: pgResidence._id,
        title: "WiFi connection intermittent",
        description:
          "Internet is cutting off frequently in room R2 affecting remote work.",
        category: "ELECTRICITY",
        priority: "HIGH",
        status: "OPEN",
        metadata: {
          tenantSnapshot: {
            name: pgTenantB.name,
            email: pgTenantB.email,
            phone: pgTenantB.phone || "",
          },
          propertySnapshot: {
            buildingName: pgResidence.buildingName,
            block: pgResidence.block,
            flatNumber: pgResidence.flatNumber,
            type: pgResidence.type,
          },
        },
      },
      {
        type: "PG",
        tenantId: pgTenantA._id,
        userId: pgTenantA._id,
        ownerId: pgOwner._id,
        propertyId: pgResidence._id,
        flatId: pgResidence._id,
        title: "Housekeeping skipped",
        description:
          "Rooms were not cleaned this week. Please send staff tomorrow morning.",
        category: "MAINTENANCE",
        priority: "LOW",
        status: "RESOLVED",
        metadata: {
          tenantSnapshot: {
            name: pgTenantA.name,
            email: pgTenantA.email,
            phone: pgTenantA.phone || "",
          },
          propertySnapshot: {
            buildingName: pgResidence.buildingName,
            block: pgResidence.block,
            flatNumber: pgResidence.flatNumber,
            type: pgResidence.type,
          },
        },
      },
    ]);
    console.log("Seeded sample complaints for flat and PG owners.");
  } else {
    console.log("Complaints already exist, skipping complaint seed.");
  }

  const announcementCount = await Announcement.countDocuments();
  if (announcementCount === 0) {
    await Announcement.insertMany([
      {
        title: "Water Tank Maintenance",
        body: "Water supply will be unavailable from 10 AM - 1 PM for cleaning.",
        type: "MAINTENANCE",
        targetBuilding: "Skyline Residency",
        isUrgent: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: admin._id,
      },
      {
        title: "Navratri Celebration",
        body: "Join us at the central lawn for Garba night this Friday.",
        type: "EVENT_NOTICE",
        isUrgent: false,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
      },
      {
        title: "Lift B Shutdown",
        body: "Lift B in Block A will be under repair for 48 hours.",
        type: "MAINTENANCE",
        targetBuilding: "Skyline Residency",
        isUrgent: true,
        startsAt: new Date(),
        createdBy: officer._id,
      },
    ]);
    console.log("Seeded announcements.");
  } else {
    console.log("Announcements already present, skipping.");
  }

  const eventsCount = await Event.countDocuments();
  if (eventsCount === 0) {
    const movieNight = await Event.create({
      title: "Open Air Movie Night",
      description: "Family-friendly movie screening with popcorn.",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      location: "Central Lawn",
      requiresApproval: false,
      status: "PUBLISHED",
      createdBy: admin._id,
    });

    const bloodDrive = await Event.create({
      title: "Community Blood Donation Drive",
      description: "Partnering with City Hospital. Register in advance.",
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      location: "Clubhouse Hall",
      requiresApproval: true,
      status: "PENDING",
      createdBy: citizen._id,
    });

    await EventParticipant.insertMany([
      {
        eventId: movieNight._id,
        userId: citizen._id,
        status: "GOING",
      },
      {
        eventId: movieNight._id,
        userId: citizenTwo._id,
        status: "INTERESTED",
      },
      {
        eventId: bloodDrive._id,
        userId: officer._id,
        status: "GOING",
      },
    ]);

    console.log("Seeded sample events and participants.");
  } else {
    console.log("Events already present, skipping.");
  }

  const invoiceCount = await MaintenanceInvoice.countDocuments();
  if (invoiceCount === 0) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const dueDate = (month, year) => new Date(year, month - 1, 10);

    const openInvoice = await MaintenanceInvoice.create({
      flat: flatA101._id,
      month: currentMonth,
      year: currentYear,
      amount: 2500,
      dueDate: dueDate(currentMonth, currentYear),
      status: "PENDING",
      notes: "Auto-generated during seed",
    });

    const partialInvoice = await MaintenanceInvoice.create({
      flat: flatA101._id,
      month: currentMonth - 1 <= 0 ? 12 : currentMonth - 1,
      year: currentMonth - 1 <= 0 ? currentYear - 1 : currentYear,
      amount: 2500,
      dueDate: dueDate(
        currentMonth - 1 <= 0 ? 12 : currentMonth - 1,
        currentMonth - 1 <= 0 ? currentYear - 1 : currentYear
      ),
      status: "PARTIALLY_PAID",
      notes: "Seed data example",
    });

    await MaintenancePayment.create({
      invoice: partialInvoice._id,
      paidByUser: admin._id,
      amount: 1000,
      method: "CASH",
      reference: "Seed Receipt #1001",
      paidAt: new Date(),
    });

    const paidInvoice = await MaintenanceInvoice.create({
      flat: flatA502._id,
      month: currentMonth - 1 <= 0 ? 12 : currentMonth - 1,
      year: currentMonth - 1 <= 0 ? currentYear - 1 : currentYear,
      amount: 3000,
      dueDate: dueDate(
        currentMonth - 1 <= 0 ? 12 : currentMonth - 1,
        currentMonth - 1 <= 0 ? currentYear - 1 : currentYear
      ),
      status: "PAID",
    });

    await MaintenancePayment.create({
      invoice: paidInvoice._id,
      paidByUser: admin._id,
      amount: 3000,
      method: "ONLINE",
      reference: "TXN-SEED-3000",
      paidAt: new Date(),
    });

    const overdueInvoice = await MaintenanceInvoice.create({
      flat: flatB204._id,
      month: currentMonth - 2 <= 0 ? 12 + (currentMonth - 2) : currentMonth - 2,
      year: currentMonth - 2 <= 0 ? currentYear - 1 : currentYear,
      amount: 2000,
      dueDate: new Date(currentYear, currentMonth - 3, 5),
      status: "OVERDUE",
    });

    // PG property invoices (two months: one paid, one pending)
    const pgCurrentInvoice = await MaintenanceInvoice.create({
      flat: pgResidence._id,
      month: currentMonth,
      year: currentYear,
      amount: 45000,
      dueDate: dueDate(currentMonth, currentYear),
      status: "PENDING",
      notes: "PG monthly rent collection",
    });

    const pgPreviousInvoice = await MaintenanceInvoice.create({
      flat: pgResidence._id,
      month: currentMonth - 1 <= 0 ? 12 : currentMonth - 1,
      year: currentMonth - 1 <= 0 ? currentYear - 1 : currentYear,
      amount: 44000,
      dueDate: dueDate(
        currentMonth - 1 <= 0 ? 12 : currentMonth - 1,
        currentMonth - 1 <= 0 ? currentYear - 1 : currentYear
      ),
      status: "PAID",
    });

    await MaintenancePayment.create({
      invoice: pgPreviousInvoice._id,
      paidByUser: pgOwner._id,
      amount: 44000,
      method: "BANK_TRANSFER",
      reference: "PG-RENT-PAID",
      paidAt: new Date(),
    });

    console.log("Seeded sample maintenance invoices:");
    console.log(` - Pending invoice: ${openInvoice._id}`);
    console.log(` - Partially paid invoice: ${partialInvoice._id}`);
    console.log(` - Paid invoice: ${paidInvoice._id}`);
    console.log(` - Overdue invoice: ${overdueInvoice._id}`);
    console.log(
      ` - PG invoices: ${pgCurrentInvoice._id}, ${pgPreviousInvoice._id}`
    );
  } else {
    console.log("Maintenance invoices already exist, skipping billing seed.");
  }

  // Seed Rent Payments for PG tenants
  // Delete existing rent payments to ensure clean seed
  await RentPayment.deleteMany({});
  console.log("Cleared existing rent payments for fresh seed.");

  if (pgTenantA && pgOwner && pgResidence) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Helper to get billing period dates
    const getBillingPeriod = (month, year) => {
      const start = new Date(year, month - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(year, month, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    const getDueDate = (month, year) => {
      return new Date(year, month - 1, 1);
    };

    // Last 2 months: PAID
    const lastMonth = currentMonth - 1 <= 0 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth - 1 <= 0 ? currentYear - 1 : currentYear;
    const twoMonthsAgo = lastMonth - 1 <= 0 ? 12 : lastMonth - 1;
    const twoMonthsAgoYear =
      lastMonth - 1 <= 0 ? lastMonthYear - 1 : lastMonthYear;

    // PG Tenant A - Two months ago: PAID (monthly rent: 22000) - WITH INVOICE
    const period2Ago = getBillingPeriod(twoMonthsAgo, twoMonthsAgoYear);
    const payment2Ago = await RentPayment.create({
      tenantId: pgTenantA._id,
      ownerId: pgOwner._id,
      propertyId: pgResidence._id,
      periodMonth: twoMonthsAgo,
      periodYear: twoMonthsAgoYear,
      billingPeriodStart: period2Ago.start,
      billingPeriodEnd: period2Ago.end,
      dueDate: getDueDate(twoMonthsAgo, twoMonthsAgoYear),
      baseAmount: 22000,
      amount: 22000,
      lateFeeAmount: 0,
      status: "PAID",
      paidAt: new Date(twoMonthsAgoYear, twoMonthsAgo - 1, 3),
      razorpayPaymentId: `pay_${twoMonthsAgoYear}${String(
        twoMonthsAgo
      ).padStart(2, "0")}_001`,
      isFirstMonth: false,
      isProrated: false,
    });

    // PG Tenant A - Last month: PAID WITH LATE FEE (to test late fee in invoice)
    const periodLastA = getBillingPeriod(lastMonth, lastMonthYear);
    const paymentLastA = await RentPayment.create({
      tenantId: pgTenantA._id,
      ownerId: pgOwner._id,
      propertyId: pgResidence._id,
      periodMonth: lastMonth,
      periodYear: lastMonthYear,
      billingPeriodStart: periodLastA.start,
      billingPeriodEnd: periodLastA.end,
      dueDate: getDueDate(lastMonth, lastMonthYear),
      baseAmount: 22000,
      amount: 22200, // 22000 + 200 late fee
      lateFeeAmount: 200, // 4 days late (₹50/day)
      status: "PAID",
      paidAt: new Date(lastMonthYear, lastMonth - 1, 9), // Paid on 9th (4 days late)
      razorpayPaymentId: `pay_${lastMonthYear}${String(lastMonth).padStart(
        2,
        "0"
      )}_002`,
      isFirstMonth: false,
      isProrated: false,
    });

    // Generate invoices for the paid payments
    try {
      const { generateRentInvoice } = await import(
        "../services/invoiceService.js"
      );

      // Generate invoice for two months ago payment
      console.log("📄 Generating invoice for payment 2 months ago...");
      const invoiceUrl1 = await generateRentInvoice({
        rentPayment: payment2Ago,
        property: pgResidence,
        tenant: pgTenantA,
        owner: pgOwner,
      });
      payment2Ago.invoicePdfUrl = invoiceUrl1;
      await payment2Ago.save();
      console.log(`   ✅ Invoice generated: ${invoiceUrl1}`);

      // Generate invoice for last month payment (with late fee)
      console.log(
        "📄 Generating invoice for last month payment (with late fee)..."
      );
      const invoiceUrl2 = await generateRentInvoice({
        rentPayment: paymentLastA,
        property: pgResidence,
        tenant: pgTenantA,
        owner: pgOwner,
      });
      paymentLastA.invoicePdfUrl = invoiceUrl2;
      await paymentLastA.save();
      console.log(`   ✅ Invoice generated: ${invoiceUrl2}`);
    } catch (invoiceError) {
      console.error(
        "⚠️  Error generating invoices during seed:",
        invoiceError.message
      );
      console.error("   Stack:", invoiceError.stack);
      console.log(
        "   (Invoices will be generated automatically when payments are verified)"
      );
    }

    // PG Tenant A - Current month: PENDING (THIS IS THE ONE TO TEST PAYMENT)
    const periodCurrentA = getBillingPeriod(currentMonth, currentYear);
    await RentPayment.create({
      tenantId: pgTenantA._id,
      ownerId: pgOwner._id,
      propertyId: pgResidence._id,
      periodMonth: currentMonth,
      periodYear: currentYear,
      billingPeriodStart: periodCurrentA.start,
      billingPeriodEnd: periodCurrentA.end,
      dueDate: getDueDate(currentMonth, currentYear),
      baseAmount: 22000,
      amount: 22000,
      lateFeeAmount: 0,
      status: "PENDING",
      isFirstMonth: false,
      isProrated: false,
    });

    // PG Tenant B - Last 2 months paid (monthly rent: 21000)
    if (pgTenantB) {
      const period2AgoB = getBillingPeriod(twoMonthsAgo, twoMonthsAgoYear);
      const payment2AgoB = await RentPayment.create({
        tenantId: pgTenantB._id,
        ownerId: pgOwner._id,
        propertyId: pgResidence._id,
        periodMonth: twoMonthsAgo,
        periodYear: twoMonthsAgoYear,
        billingPeriodStart: period2AgoB.start,
        billingPeriodEnd: period2AgoB.end,
        dueDate: getDueDate(twoMonthsAgo, twoMonthsAgoYear),
        baseAmount: 21000,
        amount: 21000,
        lateFeeAmount: 0,
        status: "PAID",
        paidAt: new Date(twoMonthsAgoYear, twoMonthsAgo - 1, 2),
        razorpayPaymentId: `pay_${twoMonthsAgoYear}${String(
          twoMonthsAgo
        ).padStart(2, "0")}_003`,
        isFirstMonth: false,
        isProrated: false,
      });

      const periodLastB = getBillingPeriod(lastMonth, lastMonthYear);
      await RentPayment.create({
        tenantId: pgTenantB._id,
        ownerId: pgOwner._id,
        propertyId: pgResidence._id,
        periodMonth: lastMonth,
        periodYear: lastMonthYear,
        billingPeriodStart: periodLastB.start,
        billingPeriodEnd: periodLastB.end,
        dueDate: getDueDate(lastMonth, lastMonthYear),
        baseAmount: 21000,
        amount: 21000,
        lateFeeAmount: 0,
        status: "PAID",
        paidAt: new Date(lastMonthYear, lastMonth - 1, 3),
        razorpayPaymentId: `pay_${lastMonthYear}${String(lastMonth).padStart(
          2,
          "0"
        )}_004`,
        isFirstMonth: false,
        isProrated: false,
      });

      // Generate invoice for tenant B's payment
      try {
        const { generateRentInvoice } = await import(
          "../services/invoiceService.js"
        );
        console.log("📄 Generating invoice for PG Tenant B payment...");
        const invoiceUrlB = await generateRentInvoice({
          rentPayment: payment2AgoB,
          property: pgResidence,
          tenant: pgTenantB,
          owner: pgOwner,
        });
        payment2AgoB.invoicePdfUrl = invoiceUrlB;
        await payment2AgoB.save();
        console.log(`   ✅ Invoice generated: ${invoiceUrlB}`);
      } catch (invoiceError) {
        console.error(
          "⚠️  Error generating invoice for tenant B:",
          invoiceError.message
        );
      }

      // PG Tenant B - Current month: PENDING
      const periodCurrentB = getBillingPeriod(currentMonth, currentYear);
      await RentPayment.create({
        tenantId: pgTenantB._id,
        ownerId: pgOwner._id,
        propertyId: pgResidence._id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        billingPeriodStart: periodCurrentB.start,
        billingPeriodEnd: periodCurrentB.end,
        dueDate: getDueDate(currentMonth, currentYear),
        baseAmount: 21000,
        amount: 21000,
        lateFeeAmount: 0,
        status: "PENDING",
        isFirstMonth: false,
        isProrated: false,
      });
    }

    console.log(
      "✅ Seeded rent payments for PG tenants with proper structure."
    );
    console.log(
      `   - PG Tenant A (${pgTenantA.email}): 2 PAID (1 with late fee), 1 PENDING (₹22,000/month)`
    );
    if (pgTenantB) {
      console.log(
        `   - PG Tenant B (${pgTenantB.email}): 2 PAID, 1 PENDING (₹21,000/month)`
      );
    }
    console.log("\n📄 Invoice Testing:");
    console.log(
      "   1. Login as PG Tenant: pgtenant@example.com / PgTenantPass123!"
    );
    console.log("   2. Go to Payment History (navbar or dashboard link)");
    console.log("   3. Click 'Download Invoice' on any PAID payment");
    console.log("   4. You should see the new professional invoice design!");
    console.log("   5. Check PG Owner payments page to view invoices too");
    console.log(
      "   6. One invoice includes late fee - check the line items table!"
    );
  } else {
    console.log(
      "⚠️  Missing PG tenant/owner/property data, skipping rent payment seed."
    );
  }

  console.log("\n✅ Seeding completed! Test credentials:");
  console.log("\n📋 Admin & Officers:");
  console.log("   Admin    → admin@example.com / AdminPass123!");
  console.log("   Officer  → officer@example.com / OfficerPass123!");
  console.log("\n🏠 Flat Owners & Tenants:");
  console.log("   Citizen  → citizen@example.com / CitizenPass123!");
  console.log("   Citizen2 → rohan@example.com / CitizenPass123!");
  console.log("   FlatOwner → flatowner@example.com / FlatOwnerPass123!");
  console.log("   FlatTenant → tenant.flat@example.com / TenantPass123!");
  console.log("\n🏘️  PG Owners & Tenants:");
  console.log("   PGOwner   → pgowner@example.com / PgOwnerPass123!");
  console.log("   PGTenant  → pgtenant@example.com / PgTenantPass123!");
  console.log("   PGTenant2 → pgtenant2@example.com / PgTenantPass123!");
  console.log("\n💳 Payment Testing:");
  console.log("   1. Login as: pgtenant@example.com / PgTenantPass123!");
  console.log("   2. Go to Dashboard - you should see 'Next Rent Due' card");
  console.log("   3. Click 'Pay Now' to test payment flow");
  console.log("   4. Use Razorpay test card: 4111 1111 1111 1111");
  console.log("   5. Check backend console for [Verify] and [Webhook] logs");
  console.log("   6. After payment, refresh to see updated status");

  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
