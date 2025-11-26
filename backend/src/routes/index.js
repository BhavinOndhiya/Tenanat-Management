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
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// GET /api/me
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email role isActive avatarUrl"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "CITIZEN",
      isActive: user.isActive,
      avatarUrl: user.avatarUrl || null,
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

export default router;
