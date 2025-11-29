import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/errorHandler.js";
import { ensureDBConnection } from "./middleware/dbConnection.js";
import apiRoutes from "./routes/index.js";
import webhookRoutes from "./routes/webhooks.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Handle OPTIONS requests FIRST - before ANY other middleware
// This is critical for serverless environments where OPTIONS must return immediately
// Must be before any route definitions or other middleware
app.use((req, res, next) => {
  // Handle OPTIONS requests immediately - don't let them go through any other middleware
  if (req.method === "OPTIONS" || req.method === "options") {
    console.log("[App] Handling OPTIONS request at Express level");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(200).send("");
  }
  next();
});

// Add CORS headers to all responses (for actual requests, not OPTIONS)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  next();
});

// CORS configuration - Allow all origins for serverless deployment
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Webhooks need raw body parsing before the global JSON parser
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure database connection before API routes
// Note: Webhooks are already defined above, so they bypass this middleware
app.use("/api", ensureDBConnection);

// Routes
app.use("/api", apiRoutes);

// Serve invoice PDFs
app.get("/api/invoices/:filename", (req, res) => {
  const filename = req.params.filename;

  // In Lambda, use /tmp (only writable directory), otherwise use project directory
  const isLambda =
    process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const invoicesDir = isLambda
    ? path.join("/tmp", "invoices")
    : path.join(__dirname, "../invoices");

  const filePath = path.join(invoicesDir, filename);

  if (!fs.existsSync(filePath)) {
    console.error(
      `[Invoice] File not found: ${filePath} (Lambda: ${!!isLambda})`
    );
    return res.status(404).json({ error: "Invoice not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  // Use 'attachment' for downloads (from email links), 'inline' for viewing in browser
  const disposition = req.query.download === "true" ? "attachment" : "inline";
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${filename}"`
  );
  res.sendFile(filePath);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
