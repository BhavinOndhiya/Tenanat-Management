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

// Handle preflight OPTIONS requests explicitly
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.status(200).end();
});

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
