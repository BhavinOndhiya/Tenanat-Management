import express from "express";
import multer from "multer";
import fs from "fs";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import Flat from "../models/Flat.js";
import PgTenantProfile from "../models/PgTenantProfile.js";
import {
  generateEKycDocument,
  generatePgAgreementDocument,
} from "../services/documentService.js";
import {
  sendOnboardingDocumentsEmail,
  isEmailConfigured,
} from "../services/notificationService.js";

const router = express.Router();

// Configure multer for file uploads (in-memory storage for now)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.use(authenticateToken);

// Middleware to ensure user is PG_TENANT
const requirePgTenant = (req, res, next) => {
  if (req.user.role !== "PG_TENANT") {
    return res
      .status(403)
      .json({ error: "Access denied. PG_TENANT role required." });
  }
  next();
};

router.use(requirePgTenant);

/**
 * GET /api/tenant/onboarding
 * Get tenant onboarding data (property, room, rent, etc.)
 */
router.get("/onboarding", async (req, res, next) => {
  try {
    const tenantId = req.user.id;

    // Get user with onboarding status
    const user = await User.findById(tenantId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get tenant profile
    const profile = await PgTenantProfile.findOne({
      userId: tenantId,
    })
      .populate("propertyId")
      .lean();

    if (!profile) {
      return res.status(404).json({ error: "Tenant profile not found" });
    }

    const property = profile.propertyId;
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Format address
    const addressParts = [
      property.address?.line1,
      property.address?.line2,
      property.address?.city,
      property.address?.state,
      property.address?.zipCode,
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    // Get property-level defaults or use profile values
    const dueDate = property.dueDate || profile.billingDueDay || 1;
    const lastPenaltyFreeDate =
      property.lastPenaltyFreeDate || profile.billingGraceLastDay || 5;
    const lateFeePerDay = property.lateFeePerDay || profile.lateFeePerDay || 50;
    const noticePeriodMonths = property.noticePeriodMonths || 1;
    const lockInMonths = property.lockInMonths || 0;

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        onboardingStatus: user.onboardingStatus || "invited",
        kycStatus: user.kycStatus || null,
        agreementAccepted: user.agreementAccepted || false,
      },
      property: {
        id: property._id.toString(),
        name: property.name || property.buildingName || "PG Property",
        address: fullAddress,
        facilities: property.facilitiesAvailable || [],
        houseRules: property.houseRules || "",
      },
      room: {
        roomNumber: profile.roomNumber || "",
        bedNumber: profile.bedNumber || "",
      },
      financial: {
        rent: profile.monthlyRent || 0,
        deposit: profile.securityDeposit || property.defaultDeposit || 0,
        moveInDate: profile.moveInDate || null,
        dueDate,
        lastPenaltyFreeDate,
        lateFeePerDay,
        noticePeriodMonths,
        lockInMonths,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenant/ekyc
 * Mock eKYC verification (sandbox/mock implementation)
 * TODO: Replace with real KYC provider integration
 */
router.post(
  "/ekyc",
  upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const tenantId = req.user.id;
      const {
        fullName,
        dateOfBirth,
        gender,
        fatherMotherName,
        phone,
        email,
        permanentAddress,
        occupation,
        companyCollegeName,
        idType,
        idNumber,
      } = req.body;

      // Basic validation
      if (
        !fullName ||
        !dateOfBirth ||
        !gender ||
        !permanentAddress ||
        !idType ||
        !idNumber
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: fullName, dateOfBirth, gender, permanentAddress, idType, idNumber",
        });
      }

      // Check if files were uploaded (optional for mock)
      const idFrontFile = req.files?.idFront?.[0];
      const idBackFile = req.files?.idBack?.[0];
      const selfieFile = req.files?.selfie?.[0];

      // TODO: INTEGRATE REAL KYC PROVIDER HERE
      // Replace this mock implementation with actual KYC provider API calls:
      // 1. Upload files to KYC provider (e.g., Digio, Signzy, eMudhra, etc.)
      // 2. Submit form data + file references to KYC API
      // 3. Handle async webhook responses for verification status
      // 4. Store actual transaction ID and verification results
      // Example:
      // const kycResult = await kycProvider.verify({
      //   idType, idNumber, idFrontFile, idBackFile, selfieFile,
      //   personalDetails: { fullName, dateOfBirth, gender, ... }
      // });
      // Mock KYC verification delay (simulate API call)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Find user
      const user = await User.findById(tenantId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Mock successful verification
      const kycTransactionId = `TEST-${Date.now()}`;

      // Update user with KYC data
      user.onboardingStatus = "kyc_verified";
      user.kycStatus = "verified";
      user.kycTransactionId = kycTransactionId;
      user.kycVerifiedAt = new Date();

      // Update personal details if provided
      if (fullName) user.name = fullName.trim();
      if (dateOfBirth)
        user.personalDetails = {
          ...user.personalDetails,
          dateOfBirth: new Date(dateOfBirth),
        };
      if (gender) user.personalDetails = { ...user.personalDetails, gender };
      if (permanentAddress) {
        // Parse address if needed or store as string
        user.address = { ...user.address, street: permanentAddress };
      }
      if (phone) user.phone = phone.trim();
      if (occupation)
        user.personalDetails = { ...user.personalDetails, occupation };

      // Store KYC data for document generation
      user.kycData = {
        fullName: fullName.trim(),
        dateOfBirth: new Date(dateOfBirth),
        gender,
        fatherMotherName: fatherMotherName?.trim() || "",
        phone: phone?.trim() || user.phone || "",
        email: email?.trim() || user.email || "",
        permanentAddress: permanentAddress.trim(),
        occupation: occupation?.trim() || "",
        companyCollegeName: companyCollegeName?.trim() || "",
        idType,
        idNumber: idNumber.trim(),
      };

      await user.save();

      console.log(
        `[eKYC] Mock verification successful for tenant ${user.email}, transactionId: ${kycTransactionId}`
      );

      res.json({
        success: true,
        kycStatus: "verified",
        verifiedName: fullName,
        verifiedAddress: permanentAddress,
        kycTransactionId,
        onboardingStatus: user.onboardingStatus,
        message: "eKYC verification successful (mock/sandbox mode)",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tenant/agreement/preview
 * Get PG agreement preview (HTML format)
 */
router.get("/agreement/preview", async (req, res, next) => {
  try {
    const tenantId = req.user.id;

    // Get user
    const user = await User.findById(tenantId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check KYC status
    if (user.kycStatus !== "verified") {
      return res.status(400).json({
        error: "KYC verification required before viewing agreement",
      });
    }

    // Get tenant profile and property
    const profile = await PgTenantProfile.findOne({
      userId: tenantId,
    })
      .populate("propertyId")
      .populate({
        path: "propertyId",
        populate: { path: "ownerId", select: "name email phone" },
      })
      .lean();

    if (!profile || !profile.propertyId) {
      return res
        .status(404)
        .json({ error: "Tenant profile or property not found" });
    }

    const property = profile.propertyId;
    const owner = property.ownerId;

    // Format address
    const addressParts = [
      property.address?.line1,
      property.address?.line2,
      property.address?.city,
      property.address?.state,
      property.address?.zipCode,
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    // Get dates
    const moveInDate = profile.moveInDate
      ? new Date(profile.moveInDate).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBD";

    const dueDate = property.dueDate || profile.billingDueDay || 1;
    const lastPenaltyFreeDate =
      property.lastPenaltyFreeDate || profile.billingGraceLastDay || 5;
    const lateFeePerDay = property.lateFeePerDay || profile.lateFeePerDay || 50;
    const noticePeriodMonths = property.noticePeriodMonths || 1;
    const lockInMonths = property.lockInMonths || 0;

    // Generate agreement HTML
    const agreementHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PG Agreement - ${user.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      text-align: center;
      color: #333;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .section {
      margin: 20px 0;
    }
    .party {
      margin: 15px 0;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      border-top: 1px solid #333;
      padding-top: 10px;
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>PG RENTAL AGREEMENT</h1>
  
  <div class="section">
    <p><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}</p>
  </div>

  <h2>PARTIES</h2>
  <div class="party">
    <p><strong>OWNER (Lessor):</strong></p>
    <p>Name: ${owner?.name || "N/A"}</p>
    <p>Email: ${owner?.email || "N/A"}</p>
    <p>Phone: ${owner?.phone || "N/A"}</p>
  </div>

  <div class="party">
    <p><strong>TENANT (Lessee):</strong></p>
    <p>Name: ${user.name}</p>
    <p>Email: ${user.email}</p>
    <p>Phone: ${user.phone || "N/A"}</p>
    <p>KYC Verified: Yes (Transaction ID: ${user.kycTransactionId || "N/A"})</p>
  </div>

  <h2>PROPERTY DETAILS</h2>
  <div class="section">
    <p><strong>Property Name:</strong> ${
      property.name || property.buildingName || "N/A"
    }</p>
    <p><strong>Address:</strong> ${fullAddress}</p>
    <p><strong>Room Number:</strong> ${profile.roomNumber || "TBA"}</p>
    <p><strong>Bed Number:</strong> ${profile.bedNumber || "TBA"}</p>
  </div>

  <h2>FINANCIAL TERMS</h2>
  <div class="section">
    <p><strong>Monthly Rent:</strong> ₹${Number(
      profile.monthlyRent || 0
    ).toLocaleString("en-IN")}</p>
    <p><strong>Security Deposit:</strong> ₹${Number(
      profile.securityDeposit || property.defaultDeposit || 0
    ).toLocaleString("en-IN")}</p>
    <p><strong>Move-in Date:</strong> ${moveInDate}</p>
    <p><strong>Rent Due Date:</strong> ${dueDate}${getOrdinalSuffix(
      dueDate
    )} of every month</p>
    <p><strong>Last Penalty-Free Date:</strong> ${lastPenaltyFreeDate}${getOrdinalSuffix(
      lastPenaltyFreeDate
    )} of every month</p>
    <p><strong>Late Fee:</strong> ₹${lateFeePerDay} per day after penalty-free period</p>
  </div>

  <h2>TERMS & CONDITIONS</h2>
  <div class="section">
    <p><strong>Notice Period:</strong> ${noticePeriodMonths} month(s)</p>
    <p><strong>Lock-in Period:</strong> ${lockInMonths} month(s)</p>
    <p><strong>Facilities Included:</strong> ${
      (property.facilitiesAvailable || []).join(", ") || "Standard facilities"
    }</p>
  </div>

  <h2>HOUSE RULES</h2>
  <div class="section">
    <p>${
      property.houseRules ||
      "Standard house rules apply. Please maintain cleanliness and respect other tenants."
    }</p>
  </div>

  <h2>CONSENT & VERIFICATION</h2>
  <div class="section">
    <p>The Tenant hereby confirms that:</p>
    <ul>
      <li>All personal details provided are correct and verified through digital eKYC</li>
      <li>The Tenant has reviewed all PG details and agrees to the terms</li>
      <li>The Tenant authorizes the PG to verify identity using digital eKYC</li>
      <li>The Tenant agrees to abide by the PG Agreement & House Rules</li>
    </ul>
    <p><strong>This agreement is accepted digitally by the Tenant through secure OTP verification.</strong></p>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <p><strong>OWNER</strong></p>
      <p>${owner?.name || "N/A"}</p>
    </div>
    <div class="signature-box">
      <p><strong>TENANT</strong></p>
      <p>${user.name}</p>
    </div>
  </div>

  <div class="footer">
    <p>This is a digitally signed agreement. Generated on ${new Date().toLocaleString(
      "en-IN"
    )}</p>
  </div>
</body>
</html>
    `.trim();

    // Helper function for ordinal suffix
    function getOrdinalSuffix(n) {
      const j = n % 10;
      const k = n % 100;
      if (j === 1 && k !== 11) return "st";
      if (j === 2 && k !== 12) return "nd";
      if (j === 3 && k !== 13) return "rd";
      return "th";
    }

    res.setHeader("Content-Type", "text/html");
    res.send(agreementHtml);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenant/agreement/accept
 * Accept PG agreement with OTP verification (mock for now)
 */
router.post("/agreement/accept", async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const { otp, consentFlags } = req.body;

    // Find user
    const user = await User.findById(tenantId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check KYC status
    if (user.kycStatus !== "verified") {
      return res.status(400).json({
        error: "KYC verification required before accepting agreement",
      });
    }

    // Validate consent flags
    if (!consentFlags || typeof consentFlags !== "object") {
      return res.status(400).json({
        error: "Consent flags are required",
      });
    }

    const requiredConsents = [
      "personalDetailsCorrect",
      "pgDetailsAgreed",
      "kycAuthorized",
      "agreementAccepted",
    ];

    for (const consent of requiredConsents) {
      if (!consentFlags[consent]) {
        return res.status(400).json({
          error: `All consent checkboxes must be checked. Missing: ${consent}`,
        });
      }
    }

    // TODO: INTEGRATE REAL SMS OTP PROVIDER HERE
    // Replace this mock implementation with actual OTP validation:
    // 1. Generate and send OTP via SMS provider (e.g., Twilio, AWS SNS, MSG91, etc.)
    //    - Store OTP in database/cache with expiration (e.g., 5 minutes)
    //    - Send OTP to user.phone via SMS API
    // 2. Validate OTP on agreement acceptance:
    //    - Check if OTP matches stored value
    //    - Verify OTP hasn't expired
    //    - Mark OTP as used (one-time use)
    // Example:
    // const storedOtp = await OtpCache.findOne({ userId: tenantId, type: 'agreement' });
    // if (!storedOtp || storedOtp.code !== otp || storedOtp.expiresAt < new Date()) {
    //   return res.status(400).json({ error: "Invalid or expired OTP" });
    // }
    // await storedOtp.deleteOne();
    // Mock OTP validation (accept any OTP for now, or "123456" as test)
    const validOtp = otp === "123456" || otp?.length >= 4; // Accept any 4+ digit OTP for mock
    if (!otp || !validOtp) {
      return res.status(400).json({
        error: "Invalid OTP. For testing, use '123456' or any 4+ digit code.",
      });
    }

    // Update user
    user.agreementAccepted = true;
    user.agreementAcceptedAt = new Date();
    user.agreementOtpRef = `MOCK-${Date.now()}`;
    user.onboardingStatus = "completed";

    await user.save();

    console.log(
      `[Agreement] Agreement accepted by tenant ${user.email}, OTP ref: ${user.agreementOtpRef}`
    );

    // Generate PDFs and send emails
    // We'll do this synchronously to ensure it completes, but with better error handling
    let emailStatus = {
      sent: false,
      error: null,
      configured: false,
    };

    try {
      const result = await generateAndSendDocuments(user._id.toString());
      emailStatus = result || { sent: true, configured: true };
      console.log(
        `[Agreement] ✅ Documents generated and emails sent for tenant ${user.email}`
      );
    } catch (docError) {
      console.error(
        "[Agreement] ❌ Error generating/sending documents:",
        docError.message,
        docError.stack
      );
      emailStatus = {
        sent: false,
        error: docError.message,
        configured: isEmailConfigured(),
      };
      // Still return success to user, but include email status
      // The onboarding is complete even if email fails
    }

    res.json({
      success: true,
      message:
        "Agreement accepted successfully. Onboarding complete! Documents will be sent via email.",
      onboardingStatus: user.onboardingStatus,
      emailStatus: {
        sent: emailStatus.sent,
        configured: emailStatus.configured,
        error: emailStatus.error,
        message: emailStatus.configured
          ? emailStatus.sent
            ? "Documents sent successfully via email"
            : `Email failed: ${emailStatus.error || "Unknown error"}`
          : "Email not configured. Please check SMTP settings in environment variables.",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate eKYC and Agreement PDFs and send to owner and tenant
 * This is called after agreement acceptance
 */
async function generateAndSendDocuments(tenantId) {
  try {
    // Get user with all related data
    const user = await User.findById(tenantId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get tenant profile and property
    const profile = await PgTenantProfile.findOne({ userId: tenantId })
      .populate("propertyId")
      .populate({
        path: "propertyId",
        populate: { path: "ownerId", select: "name email phone" },
      })
      .lean();

    if (!profile || !profile.propertyId) {
      throw new Error("Tenant profile or property not found");
    }

    const property = profile.propertyId;
    const owner = property.ownerId;

    if (!owner) {
      throw new Error("Property owner not found");
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
      `[Documents] Generating PDFs for tenant ${user.email} (${user.name})`
    );

    // Generate eKYC document
    const ekycPdfPath = await generateEKycDocument({
      user,
      kycData,
    });

    // Generate PG Agreement document
    const agreementPdfPath = await generatePgAgreementDocument({
      user,
      property,
      owner,
      profile,
    });

    // Verify PDFs exist before proceeding
    if (!fs.existsSync(ekycPdfPath)) {
      throw new Error(`eKYC PDF not found at path: ${ekycPdfPath}`);
    }
    if (!fs.existsSync(agreementPdfPath)) {
      throw new Error(`Agreement PDF not found at path: ${agreementPdfPath}`);
    }

    console.log(
      `[Documents] PDFs generated and verified: eKYC=${ekycPdfPath}, Agreement=${agreementPdfPath}`
    );

    // Update user with document paths
    user.ekycDocumentPath = ekycPdfPath;
    user.agreementDocumentUrl = ekycPdfPath; // Also store as URL for consistency
    user.agreementDocumentPath = agreementPdfPath;
    user.kycDocumentUrl = ekycPdfPath; // Also store as URL for consistency
    await user.save();

    // Check if email is configured
    const emailConfigured = isEmailConfigured();
    if (!emailConfigured) {
      console.warn(
        "[Documents] ⚠️ Email not configured. SMTP settings missing. Documents generated but emails will not be sent."
      );
      console.warn(
        "[Documents] Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables."
      );
      // Still save document paths even if email fails
      return {
        sent: false,
        configured: false,
        error: "Email not configured. SMTP settings missing.",
      };
    }

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
        isOwner: false,
      });
      console.log(`[Documents] ✅ Email sent to tenant: ${user.email}`);
      tenantEmailSent = true;
    } catch (emailError) {
      console.error(
        `[Documents] ❌ Failed to send email to tenant ${user.email}:`,
        emailError.message
      );
      console.error("[Documents] Error stack:", emailError.stack);
      emailError = emailError.message;
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
        isOwner: true,
      });
      console.log(`[Documents] ✅ Email sent to owner: ${owner.email}`);
      ownerEmailSent = true;
    } catch (ownerEmailError) {
      console.error(
        `[Documents] ❌ Failed to send email to owner ${owner.email}:`,
        ownerEmailError.message
      );
      console.error("[Documents] Error stack:", ownerEmailError.stack);
      if (!emailError) {
        emailError = ownerEmailError.message;
      } else {
        emailError += `; Owner email failed: ${ownerEmailError.message}`;
      }
    }

    if (tenantEmailSent && ownerEmailSent) {
      console.log(
        `[Documents] ✅ Successfully generated and sent documents for tenant ${user.email}`
      );
      return {
        sent: true,
        configured: true,
        tenantEmailSent: true,
        ownerEmailSent: true,
      };
    } else {
      return {
        sent: false,
        configured: true,
        error: emailError || "Unknown error sending emails",
        tenantEmailSent,
        ownerEmailSent,
      };
    }
  } catch (error) {
    console.error("[Documents] Error in generateAndSendDocuments:", error);
    throw error;
  }
}

export default router;
