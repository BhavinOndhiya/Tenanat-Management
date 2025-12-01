/**
 * Test Email Route
 * Use this to verify your SMTP configuration is working
 *
 * GET /api/test-email?to=your-email@example.com
 */

import express from "express";
import { sendTenantWelcomeEmail } from "../services/notificationService.js";

const router = express.Router();

router.get("/test-email", async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({
        error: "Please provide 'to' query parameter with your email address",
        example: "/api/test-email?to=your-email@example.com",
      });
    }

    console.log(`[Test Email] Sending test email to ${to}...`);

    // Send a test welcome email
    await sendTenantWelcomeEmail({
      tenantName: "Test User",
      propertyName: "Test PG Property",
      propertyAddress: "123 Test Street, Test City, Test State 123456",
      roomNumber: "101",
      bedNumber: "A",
      monthlyRent: 15000,
      services: ["WiFi", "AC", "Food"],
      loginEmail: to,
      password: "TestPassword123",
      passwordSetupUrl: null,
      isNewUser: false,
      sharingType: "2",
      acPreference: "AC",
      foodPreference: "WITH_FOOD",
    });

    res.json({
      success: true,
      message: `Test email sent to ${to}. Please check your inbox (and spam folder).`,
      note: "If you don't receive the email, check your SMTP configuration in .env file",
    });
  } catch (error) {
    console.error("[Test Email] Error:", error);
    res.status(500).json({
      error: "Failed to send test email",
      details: error.message,
      check:
        "Verify your SMTP credentials in .env file (SMTP_HOST, SMTP_USER, SMTP_PASS)",
    });
  }
});

export default router;

