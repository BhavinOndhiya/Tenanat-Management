import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/profile - Get user profile
router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-passwordHash -__v")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return a clean, serializable object
    res.json({
      id: user._id.toString(),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
      role: user.role || "",
      address: user.address || {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      maritalStatus: user.maritalStatus || "",
      familyDetails: user.familyDetails || {
        spouseName: "",
        children: [],
        otherMembers: [],
      },
      personalDetails: user.personalDetails || {
        occupation: "",
        dateOfBirth: "",
        gender: "",
      },
      onboardingStatus: user.onboardingStatus || null,
      kycStatus: user.kycStatus || null,
      agreementAccepted: user.agreementAccepted || false,
    });
  } catch (error) {
    console.error("[Profile GET] Error:", error);
    next(error);
  }
});

// PATCH /api/profile - Update user profile
router.patch("/", async (req, res, next) => {
  try {
    const {
      name,
      phone,
      avatarUrl,
      address,
      maritalStatus,
      familyDetails,
      personalDetails,
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (address) updateData.address = address;
    if (maritalStatus) updateData.maritalStatus = maritalStatus;
    if (familyDetails) updateData.familyDetails = familyDetails;
    if (personalDetails) updateData.personalDetails = personalDetails;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-passwordHash -__v");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
