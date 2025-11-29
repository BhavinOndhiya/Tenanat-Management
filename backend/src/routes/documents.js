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

    // eKYC Document
    if (user.ekycDocumentPath || user.kycDocumentUrl) {
      const ekycPath = user.ekycDocumentPath || user.kycDocumentUrl;
      documents.push({
        type: "ekyc",
        name: "eKYC Verification Document",
        path: ekycPath,
        available: fs.existsSync(ekycPath),
        generatedAt: user.kycVerifiedAt || null,
      });
    }

    // Agreement Document
    if (user.agreementDocumentPath || user.agreementDocumentUrl) {
      const agreementPath =
        user.agreementDocumentPath || user.agreementDocumentUrl;
      documents.push({
        type: "agreement",
        name: "PG Rental Agreement",
        path: agreementPath,
        available: fs.existsSync(agreementPath),
        generatedAt: user.agreementAcceptedAt || null,
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

    let filePath = null;
    let fileName = "";

    if (type === "ekyc") {
      filePath = user.ekycDocumentPath || user.kycDocumentUrl;
      fileName = `eKYC-${user.name.replace(/\s+/g, "-")}.pdf`;
    } else if (type === "agreement") {
      filePath = user.agreementDocumentPath || user.agreementDocumentUrl;
      fileName = `PG-Agreement-${user.name.replace(/\s+/g, "-")}.pdf`;
    }

    if (!filePath) {
      return res.status(404).json({
        error: `${type === "ekyc" ? "eKYC" : "Agreement"} document not found`,
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: `Document file not found at path: ${filePath}`,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
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

      if (tenant.ekycDocumentPath || tenant.kycDocumentUrl) {
        const ekycPath = tenant.ekycDocumentPath || tenant.kycDocumentUrl;
        documents.push({
          type: "ekyc",
          name: "eKYC Verification Document",
          path: ekycPath,
          available: fs.existsSync(ekycPath),
          generatedAt: tenant.kycVerifiedAt || null,
        });
      }

      if (tenant.agreementDocumentPath || tenant.agreementDocumentUrl) {
        const agreementPath =
          tenant.agreementDocumentPath || tenant.agreementDocumentUrl;
        documents.push({
          type: "agreement",
          name: "PG Rental Agreement",
          path: agreementPath,
          available: fs.existsSync(agreementPath),
          generatedAt: tenant.agreementAcceptedAt || null,
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
        "name email phone onboardingStatus kycDocumentUrl agreementDocumentUrl ekycDocumentPath agreementDocumentPath kycVerifiedAt agreementAcceptedAt"
      )
      .lean();

    const tenantsWithDocuments = profiles
      .map((profile) => {
        const tenant = profile.userId;
        if (!tenant) return null;

        const hasDocuments =
          tenant.ekycDocumentPath ||
          tenant.kycDocumentUrl ||
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

    let filePath = null;
    let fileName = "";

    if (type === "ekyc") {
      filePath = tenant.ekycDocumentPath || tenant.kycDocumentUrl;
      fileName = `eKYC-${tenant.name.replace(/\s+/g, "-")}.pdf`;
    } else if (type === "agreement") {
      filePath = tenant.agreementDocumentPath || tenant.agreementDocumentUrl;
      fileName = `PG-Agreement-${tenant.name.replace(/\s+/g, "-")}.pdf`;
    }

    if (!filePath) {
      return res.status(404).json({
        error: `${type === "ekyc" ? "eKYC" : "Agreement"} document not found`,
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: `Document file not found at path: ${filePath}`,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
