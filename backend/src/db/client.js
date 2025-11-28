import mongoose from "mongoose";

// Cache the connection to reuse in serverless environments
let cachedConnection = null;

const connectDB = async () => {
  // If connection exists and is ready, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // If connection exists but not ready, return the promise
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    // Configure mongoose for serverless
    mongoose.set("strictQuery", false);

    // Connection options optimized for serverless
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    // Disable mongoose buffering globally (must be set before connect)
    mongoose.set("bufferCommands", false);

    cachedConnection = mongoose.connect(process.env.DATABASE_URL, options);

    const conn = await cachedConnection;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      cachedConnection = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      cachedConnection = null;
    });

    return cachedConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    cachedConnection = null;

    // In serverless, don't exit process - let Lambda handle it
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.LAMBDA_TASK_ROOT
    ) {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;
