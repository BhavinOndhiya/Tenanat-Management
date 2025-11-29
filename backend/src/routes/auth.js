import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getNavForRole } from "../utils/roleAccess.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    const navAccess = await getNavForRole(user.role);
    await user.populate(
      "assignedProperty",
      "buildingName block flatNumber floor type"
    );
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

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "CITIZEN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || "CITIZEN",
        isActive: user.isActive,
        navAccess,
        assignedProperty,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Generate JWT token
    const navAccess = await getNavForRole(user.role);
    await user.populate(
      "assignedProperty",
      "buildingName block flatNumber floor type"
    );
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

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "CITIZEN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || "CITIZEN",
        isActive: user.isActive,
        navAccess,
        assignedProperty,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/setup-password
 * Set password for new tenant (using token from email)
 */
router.post("/setup-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (decoded.type !== "password_setup") {
      return res.status(400).json({ error: "Invalid token type" });
    }

    // Find user by email or userId
    const user = decoded.userId
      ? await User.findById(decoded.userId)
      : await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is a PG_TENANT
    if (user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Password setup is only available for PG tenants",
      });
    }

    // Check if token has already been used
    const tokenId = decoded.jti || decoded.id || token.substring(0, 20); // Use jti if available, otherwise use first 20 chars
    if (user.usedPasswordTokens && user.usedPasswordTokens.includes(tokenId)) {
      return res.status(400).json({
        error:
          "This password setup link has already been used. Password was already changed. Please use the login page or request a new password reset link.",
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    user.passwordHash = passwordHash;
    if (!user.usedPasswordTokens) {
      user.usedPasswordTokens = [];
    }
    user.usedPasswordTokens.push(tokenId);
    // Keep only last 50 used tokens to prevent array from growing too large
    if (user.usedPasswordTokens.length > 50) {
      user.usedPasswordTokens = user.usedPasswordTokens.slice(-50);
    }

    // For tenants, set onboarding status to kyc_pending
    if (user.role === "PG_TENANT") {
      user.onboardingStatus = "kyc_pending";
    }

    await user.save();

    console.log(
      `[Password Setup] Password set successfully for user ${user.email}`
    );

    // Generate JWT token for auto-login
    const authToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "CITIZEN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Determine redirect path based on role and onboarding status
    let redirectTo = "/dashboard";
    if (user.role === "PG_TENANT" && user.onboardingStatus !== "completed") {
      redirectTo = "/tenant/onboarding";
    }

    res.json({
      success: true,
      message: "Password set successfully. You can now login.",
      token: authToken,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
      redirectTo,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/verify-setup-token
 * Verify if password setup token is valid
 */
router.get("/verify-setup-token", async (req, res, next) => {
  try {
    const { token } = req.query;

    console.log("[Verify Setup Token] Request received");

    if (!token) {
      console.error("[Verify Setup Token] ❌ Token missing");
      return res.status(400).json({
        valid: false,
        error: "Token is required",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("[Verify Setup Token] Token decoded:", {
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type,
        jti: decoded.jti,
      });
    } catch (error) {
      console.error(
        "[Verify Setup Token] ❌ Token verification failed:",
        error.message
      );
      return res.status(400).json({
        valid: false,
        error: "Invalid or expired token",
      });
    }

    if (decoded.type !== "password_setup") {
      console.error(
        "[Verify Setup Token] ❌ Invalid token type:",
        decoded.type
      );
      return res.status(400).json({
        valid: false,
        error: "Invalid token type",
      });
    }

    // Find user
    const user = decoded.userId
      ? await User.findById(decoded.userId)
      : await User.findOne({ email: decoded.email });

    if (!user) {
      console.error("[Verify Setup Token] ❌ User not found:", {
        userId: decoded.userId,
        email: decoded.email,
      });
      return res.status(404).json({
        valid: false,
        error: "User not found",
      });
    }

    console.log(
      "[Verify Setup Token] User found:",
      user.email,
      "Role:",
      user.role
    );

    // Check if user is a PG_TENANT
    if (user.role !== "PG_TENANT") {
      console.error(
        "[Verify Setup Token] ❌ User is not PG_TENANT:",
        user.role
      );
      return res.status(403).json({
        valid: false,
        error: "Password setup is only available for PG tenants",
      });
    }

    // Check if token has already been used
    const tokenId = decoded.jti || decoded.id || token.substring(0, 20);
    if (user.usedPasswordTokens && user.usedPasswordTokens.includes(tokenId)) {
      console.error("[Verify Setup Token] ❌ Token already used:", tokenId);
      return res.status(400).json({
        valid: false,
        error:
          "This password setup link has already been used. Password was already changed. Please use the login page or request a new password reset link.",
      });
    }

    console.log("[Verify Setup Token] ✅ Token is valid for user:", user.email);
    res.json({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("[Verify Setup Token] ❌ Unexpected error:", error);
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset link (with rate limiting: 3 attempts per 24 hours)
 */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Check if user is a PG_TENANT
    if (user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Password reset is only available for PG tenants",
      });
    }

    // Rate limiting: Check attempts in last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter attempts in last 24 hours
    const recentAttempts = (user.passwordResetAttempts || []).filter(
      (attempt) => new Date(attempt.timestamp) >= twentyFourHoursAgo
    );

    if (recentAttempts.length >= 3) {
      return res.status(429).json({
        error:
          "You have exceeded the maximum password reset attempts (3 per 24 hours). Please contact your PG owner to reset your password.",
        contactOwner: true,
      });
    }

    // Generate password reset token (valid for 24 hours)
    const crypto = (await import("crypto")).default;
    const tokenId = crypto.randomBytes(16).toString("hex");
    const resetToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        type: "password_reset",
        jti: tokenId, // JWT ID for one-time use tracking
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Add attempt to user record
    if (!user.passwordResetAttempts) {
      user.passwordResetAttempts = [];
    }
    user.passwordResetAttempts.push({ timestamp: now });
    // Keep only last 10 attempts to prevent array from growing too large
    if (user.passwordResetAttempts.length > 10) {
      user.passwordResetAttempts = user.passwordResetAttempts.slice(-10);
    }
    await user.save();

    // Get frontend URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      console.error("[Password Reset] FRONTEND_URL not configured");
      return res.status(500).json({
        error: "Server configuration error. Please contact support.",
      });
    }
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      const { sendPasswordResetEmail, isEmailConfigured } = await import(
        "../services/notificationService.js"
      );

      // Check if email is configured before attempting to send
      if (!isEmailConfigured()) {
        console.error(
          "[Password Reset] ❌ SMTP not configured. Cannot send password reset email."
        );
        console.error("[Password Reset] SMTP Configuration Status:", {
          SMTP_HOST: process.env.SMTP_HOST ? "✅ Set" : "❌ Missing",
          SMTP_USER: process.env.SMTP_USER ? "✅ Set" : "❌ Missing",
          SMTP_PASS: process.env.SMTP_PASS ? "✅ Set (hidden)" : "❌ Missing",
          FRONTEND_URL: frontendUrl ? "✅ Set" : "❌ Missing",
        });
        return res.status(500).json({
          error:
            "Email service is not configured. Please contact your administrator.",
        });
      }

      const emailResult = await sendPasswordResetEmail({
        tenantName: user.name,
        tenantEmail: user.email,
        resetUrl,
      });

      if (!emailResult) {
        console.error(
          "[Password Reset] ❌ Email service returned false - email not sent"
        );
        return res.status(500).json({
          error:
            "Failed to send password reset email. Please try again later or contact support.",
        });
      }

      console.log(
        `[Password Reset] ✅ Password reset email sent successfully to ${user.email}`
      );
    } catch (emailError) {
      console.error("[Password Reset] ❌ Failed to send email:", emailError);
      console.error("[Password Reset] Error details:", {
        message: emailError.message,
        stack: emailError.stack,
        name: emailError.name,
      });
      return res.status(500).json({
        error:
          "Failed to send password reset email. Please try again later or contact support.",
        details:
          process.env.NODE_ENV === "development"
            ? emailError.message
            : undefined,
      });
    }

    console.log(
      `[Password Reset] Reset link sent to ${user.email} (attempt ${
        recentAttempts.length + 1
      }/3)`
    );

    res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (decoded.type !== "password_reset") {
      return res.status(400).json({ error: "Invalid token type" });
    }

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is a PG_TENANT
    if (user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Password reset is only available for PG tenants",
      });
    }

    // Check if token has already been used
    const tokenId = decoded.jti || decoded.id || token.substring(0, 20); // Use jti if available, otherwise use first 20 chars
    if (user.usedPasswordTokens && user.usedPasswordTokens.includes(tokenId)) {
      return res.status(400).json({
        error:
          "This password reset link has already been used. Password was already changed. Please use the login page or request a new password reset link.",
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password, mark token as used, and clear reset attempts
    user.passwordHash = passwordHash;
    user.passwordResetAttempts = [];
    if (!user.usedPasswordTokens) {
      user.usedPasswordTokens = [];
    }
    user.usedPasswordTokens.push(tokenId);
    // Keep only last 50 used tokens to prevent array from growing too large
    if (user.usedPasswordTokens.length > 50) {
      user.usedPasswordTokens = user.usedPasswordTokens.slice(-50);
    }

    // For tenants, set onboarding status to kyc_pending
    if (user.role === "PG_TENANT") {
      user.onboardingStatus = "kyc_pending";
    }

    await user.save();

    console.log(
      `[Password Reset] Password reset successfully for user ${user.email}`
    );

    // Generate JWT token for auto-login
    const authToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "CITIZEN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Determine redirect path based on role and onboarding status
    let redirectTo = "/dashboard";
    if (user.role === "PG_TENANT" && user.onboardingStatus !== "completed") {
      redirectTo = "/tenant/onboarding";
    }

    res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
      token: authToken,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
      redirectTo,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/update-password
 * Update password using token from email (for PG tenants)
 */
router.post("/update-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (decoded.type !== "password_update") {
      return res.status(400).json({ error: "Invalid token type" });
    }

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is a PG_TENANT
    if (user.role !== "PG_TENANT") {
      return res.status(403).json({
        error: "Password update is only available for PG tenants",
      });
    }

    // Check if token has already been used
    const tokenId = decoded.jti || decoded.id || token.substring(0, 20); // Use jti if available, otherwise use first 20 chars
    if (user.usedPasswordTokens && user.usedPasswordTokens.includes(tokenId)) {
      return res.status(400).json({
        error:
          "This password update link has already been used. Password was already changed. Please use the login page or request a new password reset link.",
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    user.passwordHash = passwordHash;
    if (!user.usedPasswordTokens) {
      user.usedPasswordTokens = [];
    }
    user.usedPasswordTokens.push(tokenId);
    // Keep only last 50 used tokens to prevent array from growing too large
    if (user.usedPasswordTokens.length > 50) {
      user.usedPasswordTokens = user.usedPasswordTokens.slice(-50);
    }

    // For tenants, set onboarding status to kyc_pending if not already completed
    if (user.role === "PG_TENANT" && user.onboardingStatus !== "completed") {
      user.onboardingStatus = "kyc_pending";
    }

    await user.save();

    console.log(
      `[Password Update] Password updated successfully for user ${user.email}`
    );

    // Generate JWT token for auto-login
    const authToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "CITIZEN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Determine redirect path based on role and onboarding status
    let redirectTo = "/dashboard";
    if (user.role === "PG_TENANT" && user.onboardingStatus !== "completed") {
      redirectTo = "/tenant/onboarding";
    }

    res.json({
      success: true,
      message: "Password updated successfully.",
      token: authToken,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
      redirectTo,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
