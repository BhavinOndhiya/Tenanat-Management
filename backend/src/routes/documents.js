import express from "express";
import fs from "fs";
import path from "path";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import Flat from "../models/Flat.js";

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

export default router;
