import express from "express";
import authRoutes from "./auth.js";
import complaintRoutes from "./complaints.js";
import officerRoutes from "./officer.js";
import profileRoutes from "./profile.js";
import adminRoutes from "./admin.js";
import announcementRoutes from "./announcements.js";
import flatRoutes from "./flats.js";
import eventRoutes from "./events.js";
import billingRoutes from "./billing.js";
import tenantRoutes from "./tenants.js";
import dashboardRoutes from "./dashboard.js";
import ownerRoutes from "./owner.js";
import pgTenantRoutes from "./pgTenant.js";
import tenantOnboardingRoutes from "./tenantOnboarding.js";
import testEmailRoutes from "./testEmail.js";
import documentsRoutes from "./documents.js";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import { getNavForRole } from "../utils/roleAccess.js";

const router = express.Router();

// GET /api/me
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "name email role isActive avatarUrl assignedProperty ownerProperties onboardingStatus kycStatus agreementAccepted kycData kycImages"
      )
      .populate("assignedProperty", "buildingName block flatNumber floor type");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const navAccess = await getNavForRole(user.role);
    const assignedProperty = user.assignedProperty
      ? {
          id: user.assignedProperty._id.toString(),
          buildingName: user.assignedProperty.buildingName,
          block: user.assignedProperty.block,
          flatNumber: user.assignedProperty.flatNumber,
          floor: user.assignedProperty.floor,
          type: user.assignedProperty.type,
        }
      : null;

    // Extract KYC document info
    const kycDocumentInfo = user.kycData
      ? {
          idType: user.kycData.idType || null,
          idNumber: user.kycData.idNumber || null,
          hasIdFront: !!(
            user.kycImages?.idFrontBase64 || user.kycData.idFrontUrl
          ),
          hasIdBack: !!(user.kycImages?.idBackBase64 || user.kycData.idBackUrl),
          hasSelfie: !!(user.kycImages?.selfieBase64 || user.kycData.selfieUrl),
          // Include base64 images for viewing (only if they exist)
          idFrontBase64: user.kycImages?.idFrontBase64 || null,
          idBackBase64: user.kycImages?.idBackBase64 || null,
          selfieBase64: user.kycImages?.selfieBase64 || null,
        }
      : null;

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "CITIZEN",
      isActive: user.isActive,
      avatarUrl: user.avatarUrl || null,
      onboardingStatus: user.onboardingStatus || null,
      kycStatus: user.kycStatus || null,
      agreementAccepted: user.agreementAccepted || false,
      kycDocumentInfo,
      navAccess,
      assignedProperty,
    });
  } catch (error) {
    next(error);
  }
});

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/officer", officerRoutes);
router.use("/profile", profileRoutes);
router.use("/admin", adminRoutes);
router.use("/announcements", announcementRoutes);
router.use("/flats", flatRoutes);
router.use("/events", eventRoutes);
router.use("/billing", billingRoutes);
router.use("/tenants", tenantRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/owner", ownerRoutes);
router.use("/pg-tenant", pgTenantRoutes);
router.use("/tenant", tenantOnboardingRoutes);
router.use("/documents", documentsRoutes);
router.use("/test-email", testEmailRoutes);

export default router;
