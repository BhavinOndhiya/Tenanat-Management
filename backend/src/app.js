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
app.get("/api/invoices/:filename", async (req, res) => {
  const filename = req.params.filename;

  // Extract payment ID from filename (format: rent-invoice-{paymentId}.pdf)
  const paymentIdMatch = filename.match(/rent-invoice-(.+)\.pdf$/);
  let pdfBuffer = null;

  // Try to get from database first (for serverless environments)
  if (paymentIdMatch) {
    try {
      const RentPayment = (await import("./models/RentPayment.js")).default;
      const payment = await RentPayment.findById(paymentIdMatch[1])
        .select("invoicePdfBase64")
        .lean();

      if (payment?.invoicePdfBase64) {
        console.log(
          `[Invoice] Serving invoice from database for payment ${paymentIdMatch[1]}`
        );
        pdfBuffer = Buffer.from(payment.invoicePdfBase64, "base64");
      }
    } catch (error) {
      console.warn(
        `[Invoice] Failed to load from database, trying file system:`,
        error.message
      );
    }
  }

  // Fallback to file system if not in database
  if (!pdfBuffer) {
    // In Lambda, use /tmp (only writable directory), otherwise use project directory
    const isLambda =
      process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const invoicesDir = isLambda
      ? path.join("/tmp", "invoices")
      : path.join(__dirname, "../invoices");

    const filePath = path.join(invoicesDir, filename);

    if (fs.existsSync(filePath)) {
      try {
        pdfBuffer = fs.readFileSync(filePath);
        console.log(`[Invoice] Serving invoice from file system: ${filePath}`);
      } catch (error) {
        console.error(`[Invoice] Failed to read file: ${filePath}`, error);
      }
    }
  }

  // If still no PDF, try to regenerate from database
  if (!pdfBuffer && paymentIdMatch) {
    try {
      const RentPayment = (await import("./models/RentPayment.js")).default;
      const payment = await RentPayment.findById(paymentIdMatch[1])
        .populate("propertyId")
        .populate("tenantId")
        .populate("ownerId")
        .lean();

      if (payment && payment.status === "PAID") {
        console.log(
          `[Invoice] Regenerating invoice for payment ${paymentIdMatch[1]}`
        );
        const { generateRentInvoice } = await import(
          "./services/invoiceService.js"
        );
        const invoiceResult = await generateRentInvoice({
          rentPayment: payment,
          property: payment.propertyId,
          tenant: payment.tenantId,
          owner: payment.ownerId,
        });

        // Update payment with base64
        await RentPayment.findByIdAndUpdate(paymentIdMatch[1], {
          invoicePdfUrl: invoiceResult.url,
          invoicePdfBase64: invoiceResult.base64,
        });

        if (invoiceResult.base64) {
          pdfBuffer = Buffer.from(invoiceResult.base64, "base64");
        }
      }
    } catch (error) {
      console.error(`[Invoice] Failed to regenerate invoice:`, error.message);
    }
  }

  if (!pdfBuffer) {
    console.error(
      `[Invoice] Invoice not found: ${filename} (tried database and file system)`
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
  res.send(pdfBuffer);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
