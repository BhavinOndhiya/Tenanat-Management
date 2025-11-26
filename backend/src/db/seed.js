import dotenv from "dotenv";
import bcrypt from "bcrypt";
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

dotenv.config();

const ensureUser = async ({ name, email, password, role }) => {
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

  const existingComplaints = await Complaint.countDocuments({
    userId: citizen._id,
  });

  if (existingComplaints === 0) {
    await Complaint.insertMany([
      {
        title: "Water Leakage in Kitchen",
        description:
          "Consistent leakage from the kitchen sink of flat 101 causing dampness.",
        category: "MAINTENANCE",
        status: "NEW",
        userId: citizen._id,
        flatId: flatA101._id,
      },
      {
        title: "Elevator malfunction",
        description:
          "Elevator A stops frequently between floors causing delays.",
        category: "ELEVATOR",
        status: "IN_PROGRESS",
        userId: citizen._id,
        flatId: flatA101._id,
        assignedOfficerId: officer._id,
      },
      {
        title: "Parking slot water logging",
        description: "Water logging near basement parking slot 12.",
        category: "PARKING",
        status: "RESOLVED",
        userId: citizenTwo._id,
        flatId: flatA502._id,
        assignedOfficerId: officer._id,
      },
    ]);
    console.log("Seeded sample complaints linked to flats.");
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

    console.log("Seeded sample maintenance invoices:");
    console.log(` - Pending invoice: ${openInvoice._id}`);
    console.log(` - Partially paid invoice: ${partialInvoice._id}`);
    console.log(` - Paid invoice: ${paidInvoice._id}`);
    console.log(` - Overdue invoice: ${overdueInvoice._id}`);
  } else {
    console.log("Maintenance invoices already exist, skipping billing seed.");
  }

  console.log("\nSeeding completed! Test credentials:");
  console.log("Admin    → admin@example.com / AdminPass123!");
  console.log("Officer  → officer@example.com / OfficerPass123!");
  console.log("Citizen  → citizen@example.com / CitizenPass123!");
  console.log("Citizen2 → rohan@example.com / CitizenPass123!");

  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
