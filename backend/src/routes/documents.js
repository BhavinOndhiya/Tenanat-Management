import express from "express";
import fs from "fs";
import path from "path";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import Flat from "../models/Flat.js";
import {
  generateEKycDocument,
  generatePgAgreementDocument,
} from "../services/documentService.js";
import {
  sendOnboardingDocumentsEmail,
  isEmailConfigured,
} from "../services/notificationService.js";

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/documents/my-documents
 * Get current user's documents (for PG_TENANT)
 */
router.get("/my-documents", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Access denied. PG_TENANT role required.",
      });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const documents = [];

    // eKYC Document - check if base64 is stored (persistent) or path exists
    if (
      user.ekycDocumentBase64 ||
      user.ekycDocumentPath ||
      user.kycDocumentUrl
    ) {
      const hasBase64 = !!user.ekycDocumentBase64;
      const ekycPath = user.ekycDocumentPath || user.kycDocumentUrl;
      const pathExists = ekycPath && fs.existsSync(ekycPath);

      documents.push({
        type: "ekyc",
        name: "eKYC Verification Document",
        available: hasBase64 || pathExists,
        generatedAt: user.documentsGeneratedAt || user.kycVerifiedAt || null,
      });
    }

    // Agreement Document - check if base64 is stored (persistent) or path exists
    if (
      user.agreementDocumentBase64 ||
      user.agreementDocumentPath ||
      user.agreementDocumentUrl
    ) {
      const hasBase64 = !!user.agreementDocumentBase64;
      const agreementPath =
        user.agreementDocumentPath || user.agreementDocumentUrl;
      const pathExists = agreementPath && fs.existsSync(agreementPath);

      documents.push({
        type: "agreement",
        name: "PG Rental Agreement",
        available: hasBase64 || pathExists,
        generatedAt:
          user.documentsGeneratedAt || user.agreementAcceptedAt || null,
      });
    }

    res.json({
      documents,
      user: {
        name: user.name,
        email: user.email,
        onboardingStatus: user.onboardingStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/download/:type
 * Download a document (ekyc or agreement) for current user
 */
router.get("/download/:type", async (req, res, next) => {
  try {
    const { type } = req.params; // 'ekyc' or 'agreement'

    if (req.user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Access denied. PG_TENANT role required.",
      });
    }

    if (!["ekyc", "agreement"].includes(type)) {
      return res.status(400).json({ error: "Invalid document type" });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let pdfBuffer = null;
    let fileName = "";

    if (type === "ekyc") {
      fileName = `eKYC-${user.name.replace(/\s+/g, "-")}.pdf`;
      // Prefer base64 (persistent), fallback to file path
      if (user.ekycDocumentBase64) {
        pdfBuffer = Buffer.from(user.ekycDocumentBase64, "base64");
      } else {
        const filePath = user.ekycDocumentPath || user.kycDocumentUrl;
        if (filePath && fs.existsSync(filePath)) {
          pdfBuffer = fs.readFileSync(filePath);
        }
      }
    } else if (type === "agreement") {
      fileName = `PG-Agreement-${user.name.replace(/\s+/g, "-")}.pdf`;
      // Prefer base64 (persistent), fallback to file path
      if (user.agreementDocumentBase64) {
        pdfBuffer = Buffer.from(user.agreementDocumentBase64, "base64");
      } else {
        const filePath =
          user.agreementDocumentPath || user.agreementDocumentUrl;
        if (filePath && fs.existsSync(filePath)) {
          pdfBuffer = fs.readFileSync(filePath);
        }
      }
    }

    if (!pdfBuffer) {
      return res.status(404).json({
        error: `${
          type === "ekyc" ? "eKYC" : "Agreement"
        } document not found or not generated yet`,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/tenant-documents
 * Get all tenant documents (for PG_OWNER)
 */
router.get("/tenant-documents", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_OWNER") {
      return res.status(403).json({
        error: "Access denied. PG_OWNER role required.",
      });
    }

    const { tenantId } = req.query;

    // If tenantId is provided, get that specific tenant's documents
    if (tenantId) {
      const tenant = await User.findById(tenantId).lean();
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Verify tenant belongs to owner's property
      const profile = await PgTenantProfile.findOne({
        userId: tenantId,
      })
        .populate("propertyId")
        .lean();

      if (!profile || !profile.propertyId) {
        return res.status(404).json({
          error: "Tenant profile not found",
        });
      }

      // Check if owner owns this property
      if (
        profile.propertyId.ownerId?.toString() !== req.user.id &&
        req.user.role !== "ADMIN"
      ) {
        return res.status(403).json({
          error: "Access denied. Tenant does not belong to your property.",
        });
      }

      const documents = [];

      if (
        tenant.ekycDocumentBase64 ||
        tenant.ekycDocumentPath ||
        tenant.kycDocumentUrl
      ) {
        const hasBase64 = !!tenant.ekycDocumentBase64;
        const ekycPath = tenant.ekycDocumentPath || tenant.kycDocumentUrl;
        const pathExists = ekycPath && fs.existsSync(ekycPath);

        documents.push({
          type: "ekyc",
          name: "eKYC Verification Document",
          available: hasBase64 || pathExists,
          generatedAt:
            tenant.documentsGeneratedAt || tenant.kycVerifiedAt || null,
        });
      }

      if (
        tenant.agreementDocumentBase64 ||
        tenant.agreementDocumentPath ||
        tenant.agreementDocumentUrl
      ) {
        const hasBase64 = !!tenant.agreementDocumentBase64;
        const agreementPath =
          tenant.agreementDocumentPath || tenant.agreementDocumentUrl;
        const pathExists = agreementPath && fs.existsSync(agreementPath);

        documents.push({
          type: "agreement",
          name: "PG Rental Agreement",
          available: hasBase64 || pathExists,
          generatedAt:
            tenant.documentsGeneratedAt || tenant.agreementAcceptedAt || null,
        });
      }

      return res.json({
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone || "",
          onboardingStatus: tenant.onboardingStatus,
        },
        documents,
      });
    }

    // If no tenantId, get all tenants for this owner
    const ownerProperties = await Flat.find({
      ownerId: req.user.id,
      type: "PG",
    })
      .select("_id")
      .lean();

    const propertyIds = ownerProperties.map((p) => p._id);

    const profiles = await PgTenantProfile.find({
      propertyId: { $in: propertyIds },
    })
      .populate(
        "userId",
        "name email phone onboardingStatus kycDocumentUrl agreementDocumentUrl ekycDocumentPath agreementDocumentPath ekycDocumentBase64 agreementDocumentBase64 documentsGenerated documentsGeneratedAt kycVerifiedAt agreementAcceptedAt"
      )
      .lean();

    const tenantsWithDocuments = profiles
      .map((profile) => {
        const tenant = profile.userId;
        if (!tenant) return null;

        const hasDocuments =
          tenant.ekycDocumentBase64 ||
          tenant.ekycDocumentPath ||
          tenant.kycDocumentUrl ||
          tenant.agreementDocumentBase64 ||
          tenant.agreementDocumentPath ||
          tenant.agreementDocumentUrl;

        return {
          id: tenant._id.toString(),
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone || "",
          onboardingStatus: tenant.onboardingStatus,
          hasDocuments: !!hasDocuments,
          property: {
            id: profile.propertyId?.toString(),
            name: profile.propertyId?.name || profile.propertyId?.buildingName,
          },
        };
      })
      .filter(Boolean);

    res.json({
      tenants: tenantsWithDocuments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/tenant/:tenantId/download/:type
 * Download a specific tenant's document (for PG_OWNER)
 */
router.get("/tenant/:tenantId/download/:type", async (req, res, next) => {
  try {
    const { tenantId, type } = req.params;

    if (req.user.role !== "PG_OWNER" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Access denied. PG_OWNER or ADMIN role required.",
      });
    }

    if (!["ekyc", "agreement"].includes(type)) {
      return res.status(400).json({ error: "Invalid document type" });
    }

    const tenant = await User.findById(tenantId).lean();
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Verify tenant belongs to owner's property (unless admin)
    if (req.user.role !== "ADMIN") {
      const profile = await PgTenantProfile.findOne({
        userId: tenantId,
      })
        .populate("propertyId")
        .lean();

      if (!profile || !profile.propertyId) {
        return res.status(404).json({
          error: "Tenant profile not found",
        });
      }

      if (profile.propertyId.ownerId?.toString() !== req.user.id) {
        return res.status(403).json({
          error: "Access denied. Tenant does not belong to your property.",
        });
      }
    }

    let pdfBuffer = null;
    let fileName = "";

    if (type === "ekyc") {
      fileName = `eKYC-${tenant.name.replace(/\s+/g, "-")}.pdf`;
      // Prefer base64 (persistent), fallback to file path
      if (tenant.ekycDocumentBase64) {
        pdfBuffer = Buffer.from(tenant.ekycDocumentBase64, "base64");
      } else {
        const filePath = tenant.ekycDocumentPath || tenant.kycDocumentUrl;
        if (filePath && fs.existsSync(filePath)) {
          pdfBuffer = fs.readFileSync(filePath);
        }
      }
    } else if (type === "agreement") {
      fileName = `PG-Agreement-${tenant.name.replace(/\s+/g, "-")}.pdf`;
      // Prefer base64 (persistent), fallback to file path
      if (tenant.agreementDocumentBase64) {
        pdfBuffer = Buffer.from(tenant.agreementDocumentBase64, "base64");
      } else {
        const filePath =
          tenant.agreementDocumentPath || tenant.agreementDocumentUrl;
        if (filePath && fs.existsSync(filePath)) {
          pdfBuffer = fs.readFileSync(filePath);
        }
      }
    }

    if (!pdfBuffer) {
      return res.status(404).json({
        error: `${
          type === "ekyc" ? "eKYC" : "Agreement"
        } document not found or not generated yet`,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents/generate
 * Generate documents for current user (for PG_TENANT who completed onboarding)
 */
router.post("/generate", async (req, res, next) => {
  try {
    if (req.user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Access denied. PG_TENANT role required.",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if onboarding is completed
    if (user.onboardingStatus !== "completed") {
      return res.status(400).json({
        error: "Onboarding must be completed before generating documents.",
      });
    }

    // Check if documents already exist
    if (
      user.documentsGenerated &&
      (user.ekycDocumentBase64 || user.agreementDocumentBase64)
    ) {
      return res.status(400).json({
        error:
          "Documents already generated. Use the download option to access them.",
      });
    }

    // Get tenant profile and property
    const profile = await PgTenantProfile.findOne({ userId: req.user.id })
      .populate("propertyId")
      .populate({
        path: "propertyId",
        populate: { path: "ownerId", select: "name email phone" },
      })
      .lean();

    if (!profile || !profile.propertyId) {
      return res.status(404).json({
        error:
          "Tenant profile or property not found. Please contact your PG owner.",
      });
    }

    const property = profile.propertyId;
    const owner = property.ownerId;

    if (!owner) {
      return res.status(404).json({
        error: "Property owner not found.",
      });
    }

    // Get KYC data from user
    const kycData = user.kycData || {
      fullName: user.name,
      dateOfBirth: user.personalDetails?.dateOfBirth,
      gender: user.personalDetails?.gender,
      fatherMotherName: "",
      phone: user.phone,
      email: user.email,
      permanentAddress: user.address?.street || "",
      occupation: user.personalDetails?.occupation || "",
      companyCollegeName: "",
      idType: "AADHAAR",
      idNumber: "",
    };

    console.log(
      `[Documents] Regenerating PDFs for tenant ${user.email} (${user.name})`
    );

    // Generate eKYC document
    console.log("[Documents] Starting eKYC document generation...");
    const ekycPdfPath = await generateEKycDocument({
      user,
      kycData,
    });
    console.log(`[Documents] eKYC PDF generated at: ${ekycPdfPath}`);

    // Generate PG Agreement document
    console.log("[Documents] Starting Agreement document generation...");
    const agreementPdfPath = await generatePgAgreementDocument({
      user,
      property,
      owner,
      profile,
    });
    console.log(`[Documents] Agreement PDF generated at: ${agreementPdfPath}`);

    // Verify PDFs exist before proceeding
    if (!fs.existsSync(ekycPdfPath)) {
      console.error(
        `[Documents] ❌ eKYC PDF not found at path: ${ekycPdfPath}`
      );
      throw new Error(`eKYC PDF not found at path: ${ekycPdfPath}`);
    }
    if (!fs.existsSync(agreementPdfPath)) {
      console.error(
        `[Documents] ❌ Agreement PDF not found at path: ${agreementPdfPath}`
      );
      throw new Error(`Agreement PDF not found at path: ${agreementPdfPath}`);
    }

    // Read PDFs into memory and store as base64
    console.log("[Documents] Reading PDFs into memory for storage...");
    const ekycPdfBuffer = fs.readFileSync(ekycPdfPath);
    const agreementPdfBuffer = fs.readFileSync(agreementPdfPath);

    const ekycBase64 = ekycPdfBuffer.toString("base64");
    const agreementBase64 = agreementPdfBuffer.toString("base64");

    // Update user with document paths AND base64 content
    user.ekycDocumentPath = ekycPdfPath;
    user.agreementDocumentPath = agreementPdfPath;
    user.ekycDocumentBase64 = ekycBase64;
    user.agreementDocumentBase64 = agreementBase64;
    user.documentsGenerated = true;
    user.documentsGeneratedAt = new Date();
    await user.save();

    console.log(
      `[Documents] PDFs stored in database: eKYC=${ekycBase64.length} bytes, Agreement=${agreementBase64.length} bytes`
    );

    // Check if email is configured
    const emailConfigured = isEmailConfigured();
    let emailStatus = {
      sent: false,
      configured: emailConfigured,
      error: null,
    };

    if (emailConfigured) {
      // Send emails to both owner and tenant
      const propertyName =
        property.name || property.buildingName || "PG Property";

      let tenantEmailSent = false;
      let ownerEmailSent = false;
      let emailError = null;

      // Send to tenant
      console.log(
        `[Documents] Attempting to send email to tenant: ${user.email}`
      );
      try {
        await sendOnboardingDocumentsEmail({
          recipientEmail: user.email,
          recipientName: user.name,
          tenantName: user.name,
          propertyName,
          ekycPdfPath,
          agreementPdfPath,
          ekycPdfBuffer,
          agreementPdfBuffer,
          isOwner: false,
        });
        console.log(`[Documents] ✅ Email sent to tenant: ${user.email}`);
        tenantEmailSent = true;
      } catch (tenantEmailError) {
        console.error(
          `[Documents] ❌ Failed to send email to tenant ${user.email}:`,
          tenantEmailError.message
        );
        emailError = tenantEmailError.message;
      }

      // Send to owner
      console.log(
        `[Documents] Attempting to send email to owner: ${owner.email}`
      );
      try {
        await sendOnboardingDocumentsEmail({
          recipientEmail: owner.email,
          recipientName: owner.name,
          tenantName: user.name,
          propertyName,
          ekycPdfPath,
          agreementPdfPath,
          ekycPdfBuffer,
          agreementPdfBuffer,
          isOwner: true,
        });
        console.log(`[Documents] ✅ Email sent to owner: ${owner.email}`);
        ownerEmailSent = true;
      } catch (ownerEmailError) {
        console.error(
          `[Documents] ❌ Failed to send email to owner ${owner.email}:`,
          ownerEmailError.message
        );
        if (!emailError) {
          emailError = ownerEmailError.message;
        } else {
          emailError += `; Owner email failed: ${ownerEmailError.message}`;
        }
      }

      emailStatus = {
        sent: tenantEmailSent && ownerEmailSent,
        configured: true,
        tenantEmailSent,
        ownerEmailSent,
        error: emailError,
      };
    } else {
      emailStatus.error = "Email not configured. SMTP settings missing.";
    }

    res.json({
      success: true,
      message: "Documents generated successfully!",
      emailStatus: {
        ...emailStatus,
        message: emailStatus.configured
          ? emailStatus.sent
            ? "Documents sent successfully via email"
            : `Email partially sent. ${emailStatus.error || "Unknown error"}`
          : "Email not configured. Documents generated but not sent.",
      },
    });
  } catch (error) {
    console.error("[Documents] Error generating documents:", error);
    next(error);
  }
});

export default router;
