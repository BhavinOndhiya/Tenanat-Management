/**
 * Cleanup script to delete rent payments older than 1 year
 * This should be run annually (e.g., via cron job on Jan 1st)
 *
 * Usage: node src/scripts/cleanupOldPayments.js
 */

import mongoose from "mongoose";
import RentPayment from "../models/RentPayment.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }
  await mongoose.connect(mongoUri);
  console.log("MongoDB Connected");
}

async function cleanupOldPayments() {
  try {
    await connectDB();
    console.log("Connected to database");

    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 1; // Delete payments older than 1 year

    console.log(
      `Cleaning up rent payments older than ${cutoffYear} (before year ${currentYear})...`
    );

    // Delete payments from years before the cutoff
    const result = await RentPayment.deleteMany({
      periodYear: { $lt: currentYear },
    });

    console.log(
      `✅ Cleanup completed: Deleted ${result.deletedCount} payment records from years before ${currentYear}`
    );

    // Also delete any payments that are more than 1 year old based on createdAt
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const resultByDate = await RentPayment.deleteMany({
      createdAt: { $lt: oneYearAgo },
    });

    console.log(
      `✅ Additional cleanup: Deleted ${resultByDate.deletedCount} payment records older than 1 year (by date)`
    );

    const totalDeleted = result.deletedCount + resultByDate.deletedCount;
    console.log(`✅ Total deleted: ${totalDeleted} payment records`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run cleanup
cleanupOldPayments();
