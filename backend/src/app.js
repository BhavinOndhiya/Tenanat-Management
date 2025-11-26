import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";
import webhookRoutes from "./routes/webhooks.js";

const app = express();

// Middleware
app.use(cors());

// Webhooks need raw body parsing before the global JSON parser
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", apiRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
