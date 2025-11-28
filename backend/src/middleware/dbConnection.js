import mongoose from "mongoose";
import connectDB from "../db/client.js";

// Cache connection promise to avoid multiple connection attempts
let connectionPromise = null;

// Middleware to ensure database is connected before processing requests
export const ensureDBConnection = async (req, res, next) => {
  try {
    // If already connected, proceed immediately
    if (mongoose.connection.readyState === 1) {
      return next();
    }

    // If connection is in progress, wait for it
    if (connectionPromise) {
      await connectionPromise;
      return next();
    }

    // Start new connection
    connectionPromise = connectDB();
    await connectionPromise;
    console.log("Database connection established");
    connectionPromise = null; // Reset after successful connection
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    connectionPromise = null; // Reset on error so we can retry
    return res.status(500).json({
      error: "Database connection failed",
      message: error.message,
    });
  }
};
