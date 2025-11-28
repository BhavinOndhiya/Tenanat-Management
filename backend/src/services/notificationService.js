import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure dotenv is loaded
if (!process.env.DOTENV_LOADED) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  dotenv.config({ path: path.join(__dirname, "../../.env") });
  process.env.DOTENV_LOADED = "true";
}

const {
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  EMAIL_FROM_EMAIL,
  EMAIL_FROM_NAME = "Streamivus",
} = process.env;

const fromEmailAddress =
  SMTP_FROM || EMAIL_FROM_EMAIL || SMTP_USER || "no-reply@streamivus.com";

const fromEmail = `"${EMAIL_FROM_NAME}" <${fromEmailAddress}>`;

// Debug logging
if (!process.env.EMAIL_CONFIG_LOGGED) {
  console.log("[EMAIL CONFIG] Checking SMTP configuration...");
  console.log(
    "[EMAIL CONFIG] SMTP_HOST:",
    SMTP_HOST ? `✅ Set (${SMTP_HOST})` : "❌ Missing"
  );
  console.log(
    "[EMAIL CONFIG] SMTP_USER:",
    SMTP_USER ? `✅ Set (${SMTP_USER})` : "❌ Missing"
  );
  console.log(
    "[EMAIL CONFIG] SMTP_PASS:",
    SMTP_PASS && SMTP_PASS !== "YOUR_EMAIL_PASSWORD"
      ? "✅ Set (hidden)"
      : "❌ Missing or placeholder"
  );
  console.log("[EMAIL CONFIG] From:", fromEmail);
  process.env.EMAIL_CONFIG_LOGGED = "true";
}

const hasValidPassword =
  SMTP_PASS &&
  SMTP_PASS !== "YOUR_EMAIL_PASSWORD" &&
  SMTP_PASS.trim().length > 0;

const transporter =
  SMTP_HOST && SMTP_USER && hasValidPassword
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    : null;

// ============ MODERN EMAIL WRAPPER TEMPLATE ============
const emailWrapper = (content, year = new Date().getFullYear()) => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Streamivus - PG Management</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f3f4f6;
    }
    
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      display: block;
    }
    
    a {
      text-decoration: none;
    }
    
    .btn {
      display: inline-block;
      padding: 14px 32px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background-color: #6366f1;
      color: #ffffff !important;
    }
    
    .btn-primary:hover {
      background-color: #4f46e5;
    }
    
    @media only screen and (max-width: 600px) {
      .wrapper {
        width: 100% !important;
      }
      .content {
        padding: 20px !important;
      }
      .mobile-padding {
        padding: 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #f3f4f6;">
  
  <div style="display: none; max-height: 0; overflow: hidden;">
    Streamivus - Your Premier PG Management Platform
  </div>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      STREAMIVUS
                    </h1>
                    <p style="margin: 6px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.85); letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500;">
                      Premium PG Management
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td class="content" style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                
                <!-- Support Info -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #111827;">
                      Need Help?
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                      <a href="mailto:support@streamivus.com" style="color: #6366f1; text-decoration: none; font-weight: 500;">support@streamivus.com</a>
                      <span style="color: #d1d5db; margin: 0 6px;">•</span>
                      <a href="tel:+919876543210" style="color: #6366f1; text-decoration: none; font-weight: 500;">+91 98765 43210</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Social Links -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="#" style="color: #6b7280; font-size: 12px; text-decoration: none; font-weight: 500;">Facebook</a>
                        </td>
                        <td style="color: #d1d5db; padding: 0 4px;">•</td>
                        <td style="padding: 0 8px;">
                          <a href="#" style="color: #6b7280; font-size: 12px; text-decoration: none; font-weight: 500;">LinkedIn</a>
                        </td>
                        <td style="color: #d1d5db; padding: 0 4px;">•</td>
                        <td style="padding: 0 8px;">
                          <a href="#" style="color: #6b7280; font-size: 12px; text-decoration: none; font-weight: 500;">Instagram</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Copyright -->
                <tr>
                  <td align="center" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p style="margin: 0 0 8px; font-size: 11px; color: #9ca3af;">
                      © ${year} Streamivus. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 11px;">
                      <a href="#" style="color: #6366f1; text-decoration: none;">Privacy Policy</a>
                      <span style="color: #d1d5db; margin: 0 6px;">•</span>
                      <a href="#" style="color: #6366f1; text-decoration: none;">Terms of Service</a>
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`;

// ============ TENANT WELCOME EMAIL ============
const buildTenantWelcomeEmail = ({
  tenantName,
  propertyName,
  propertyAddress,
  roomNumber,
  bedNumber,
  monthlyRent,
  services,
  sharingType,
  acPreference,
  foodPreference,
  loginEmail,
  password,
  passwordSetupUrl,
  passwordUpdateUrl,
  isNewUser = false,
  propertyManagerName,
  propertyManagerPhone,
  checkInDate,
}) => {
  const servicesList =
    services && services.length > 0
      ? services.join(", ")
      : "Standard PG Services";

  const content = `
    <!-- Greeting -->
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.3;">
      Welcome to ${propertyName}! 🎉
    </h2>
    <p style="margin: 0 0 32px; font-size: 14px; color: #6b7280;">
      Your accommodation is ready. Let's get you settled in.
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
      Hi <strong style="color: #111827;">${tenantName}</strong>,
    </p>
    
    <p style="margin: 0 0 32px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      We're excited to welcome you to the Streamivus family! Your room is ready at <strong style="color: #111827;">${propertyName}</strong>. Below you'll find all the important details about your stay and your account credentials.
    </p>
    
    <!-- Allotment Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 12px; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px;">
            📍 Your Allotment
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Property Address</p>
                <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.5;">
                  ${propertyAddress || "Will be shared shortly"}
                </p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 16px 0 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right: 24px;">
                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Room</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">
                        ${roomNumber || "TBA"}
                      </p>
                    </td>
                    <td style="padding-right: 24px;">
                      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Bed</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">
                        ${bedNumber || "TBA"}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Check-in Date</p>
                <p style="margin: 0; font-size: 14px; color: #111827;">
                  ${
                    checkInDate
                      ? new Date(checkInDate).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "To be confirmed"
                  }
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Rent Details Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 12px; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">
            💰 Rent & Services
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Monthly Rent</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #10b981;">
                  ₹${Number(monthlyRent || 0).toLocaleString("en-IN")}
                </p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 16px 0 8px;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Package Details</p>
                <p style="margin: 0; font-size: 14px; color: #374151;">
                  ${sharingType || "1"}-Bed Sharing • ${
    acPreference || "AC"
  } • ${foodPreference === "WITHOUT_FOOD" ? "Without Meals" : "With Meals"}
                </p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Included Services</p>
                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                  ${servicesList}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Login Credentials Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 12px; font-weight: 600; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">
            🔐 Login Credentials
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Email Address</p>
                <p style="margin: 0; padding: 12px; background-color: #fffbeb; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; color: #92400e; font-weight: 600;">
                  ${loginEmail}
                </p>
              </td>
            </tr>
            
            ${
              isNewUser && passwordSetupUrl && !password
                ? `
            <tr>
              <td style="padding: 16px 0 8px;">
                <p style="margin: 0 0 16px; font-size: 13px; color: #78350f; line-height: 1.6;">
                  You need to set up a secure password to access your account.
                </p>
                <a href="${passwordSetupUrl}" class="btn btn-primary" style="background-color: #6366f1; color: #ffffff; display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  Set Up Password →
                </a>
                <p style="margin: 16px 0 0; font-size: 12px; color: #92400e;">
                  ⏱ This link expires in 7 days
                </p>
              </td>
            </tr>
            `
                : password
                ? `
            <tr>
              <td style="padding: 16px 0 8px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Temporary Password</p>
                <p style="margin: 0; padding: 12px; background-color: #fffbeb; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; color: #92400e; font-weight: 600;">
                  ${password}
                </p>
                <p style="margin: 12px 0 0; font-size: 12px; color: #92400e;">
                  🔒 Please change this password after your first login
                </p>
              </td>
            </tr>
            `
                : `
            <tr>
              <td style="padding: 16px 0 0;">
                <p style="margin: 0; font-size: 13px; color: #78350f;">
                  Use your existing account credentials to log in.
                </p>
              </td>
            </tr>
            `
            }
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Property Manager Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #eff6ff; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px;">
            👤 Your Property Manager
          </p>
          <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">
            ${propertyManagerName || "PG Manager"}
          </p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            📞 <a href="tel:${propertyManagerPhone}" style="color: #6366f1; text-decoration: none; font-weight: 500;">${
    propertyManagerPhone || "Contact details in portal"
  }</a>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Important Notes -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px;">
            📋 Important Notes
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #7f1d1d; line-height: 1.8;">
            <li style="margin-bottom: 6px;">Keep your login credentials confidential</li>
            <li style="margin-bottom: 6px;">Complete your profile within 24 hours</li>
            <li style="margin-bottom: 6px;">Submit required documents through the portal</li>
            <li style="margin-bottom: 6px;">Report issues immediately to your manager</li>
            <li>Review house rules in your dashboard</li>
          </ul>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <a href="${
            process.env.FRONTEND_URL || "https://app.streamivus.com"
          }/dashboard" class="btn btn-primary" style="background-color: #6366f1; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            Access Your Dashboard →
          </a>
        </td>
      </tr>
    </table>
    
    <!-- Closing -->
    <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      We're here to make your stay comfortable and hassle-free. If you have any questions or need assistance, don't hesitate to reach out.
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #111827;">
      Warm regards,<br>
      <strong>The Streamivus Team</strong>
    </p>
  `;

  return emailWrapper(content);
};

// ============ PAYMENT RECEIPT EMAIL ============
const buildPaymentReceiptEmail = ({
  tenantName,
  propertyName,
  invoiceNumber,
  periodLabel,
  totalAmount,
  baseAmount,
  securityDeposit,
  joiningFee,
  otherCharges,
  lateFeeAmount,
  paidAt,
  invoiceUrl,
  nextPaymentDueDate,
  paymentMethod,
}) => {
  // Use backend URL for invoice downloads since invoices are served from backend
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    process.env.FRONTEND_URL?.replace(":5173", ":3000") ||
    "http://localhost:3000";
  const fullInvoiceUrl = invoiceUrl
    ? invoiceUrl.startsWith("http")
      ? invoiceUrl
      : `${backendUrl}${invoiceUrl}${
          invoiceUrl.includes("?") ? "&" : "?"
        }download=true`
    : null;

  const chargesBreakdown = [];
  if (baseAmount > 0) {
    chargesBreakdown.push({ label: "Monthly Rent", amount: baseAmount });
  }
  if (securityDeposit > 0) {
    chargesBreakdown.push({
      label: "Security Deposit",
      amount: securityDeposit,
    });
  }
  if (joiningFee > 0) {
    chargesBreakdown.push({ label: "Joining Fee", amount: joiningFee });
  }
  if (otherCharges && otherCharges.length > 0) {
    otherCharges.forEach((charge) => {
      if (charge.amount > 0) {
        chargesBreakdown.push({
          label: charge.description,
          amount: charge.amount,
        });
      }
    });
  }
  if (lateFeeAmount > 0) {
    chargesBreakdown.push({ label: "Late Fee", amount: lateFeeAmount });
  }

  const content = `
    <!-- Success Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: #d1fae5; padding: 8px 16px; border-radius: 20px; display: inline-block;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">
            ✓ Payment Successful
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Heading -->
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.3;">
      Payment Receipt
    </h2>
    <p style="margin: 0 0 32px; font-size: 14px; color: #6b7280;">
      Invoice #${invoiceNumber}
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
      Hi <strong style="color: #111827;">${tenantName}</strong>,
    </p>
    
    <p style="margin: 0 0 32px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      Your payment for <strong style="color: #111827;">${periodLabel}</strong> has been successfully received. Thank you for your timely payment!
    </p>
    
    <!-- Payment Summary Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 32px 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 1px;">
            Amount Paid
          </p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff;">
            ₹${Number(totalAmount).toLocaleString("en-IN")}
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Payment Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 12px; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px;">
            Payment Information
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding: 12px 12px 12px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Property</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${propertyName}</p>
              </td>
              <td width="50%" style="padding: 12px 0 12px 12px; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Period</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${periodLabel}</p>
              </td>
            </tr>
            
            <tr>
              <td width="50%" style="padding: 12px 12px 12px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Date & Time</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
                  ${new Date(paidAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </td>
              <td width="50%" style="padding: 12px 0 12px 12px; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Payment Method</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
                  ${paymentMethod || "Online Transfer"}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Breakdown -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 20px 24px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px;">
            Payment Breakdown
          </p>
        </td>
      </tr>
      
      ${chargesBreakdown
        .map(
          (charge) => `
      <tr>
        <td style="padding: 16px 24px; border-bottom: 1px solid #e5e7eb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin: 0; font-size: 14px; color: #374151;">${
                  charge.label
                }</p>
              </td>
              <td align="right">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
                  ₹${Number(charge.amount).toLocaleString("en-IN")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `
        )
        .join("")}
      
      <tr>
        <td style="padding: 20px 24px; background-color: #f9fafb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin: 0; font-size: 15px; font-weight: 700; color: #111827;">Total</p>
              </td>
              <td align="right">
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #6366f1;">
                  ₹${Number(totalAmount).toLocaleString("en-IN")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    ${
      nextPaymentDueDate
        ? `
    <!-- Next Payment -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase;">
            📅 Next Payment Due
          </p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #78350f;">
            ${new Date(nextPaymentDueDate).toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </td>
      </tr>
    </table>
    `
        : ""
    }
    
    ${
      fullInvoiceUrl
        ? `
    <!-- Download Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <a href="${fullInvoiceUrl}" class="btn btn-primary" style="background-color: #6366f1; color: #ffffff; display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            📥 Download Invoice PDF
          </a>
        </td>
      </tr>
    </table>
    `
        : ""
    }
    
    <!-- Closing -->
    <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      Your account is in good standing. If you have any questions about this payment, please don't hesitate to contact us.
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #111827;">
      Best regards,<br>
      <strong>The Streamivus Team</strong>
    </p>
  `;

  return emailWrapper(content);
};

// ============ PASSWORD RESET EMAIL ============
const buildPasswordResetEmail = ({ tenantName, resetUrl, resetToken }) => {
  const content = `
    <!-- Icon -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); width: 56px; height: 56px; border-radius: 12px; text-align: center; vertical-align: middle;">
          <p style="margin: 0; font-size: 28px; line-height: 56px;">🔐</p>
        </td>
      </tr>
    </table>
    
    <!-- Heading -->
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.3;">
      Reset Your Password
    </h2>
    <p style="margin: 0 0 32px; font-size: 14px; color: #6b7280;">
      Secure your account with a new password
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
      Hi <strong style="color: #111827;">${tenantName}</strong>,
    </p>
    
    <p style="margin: 0 0 32px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      We received a request to reset your Streamivus account password. Click the button below to create a new password. This link is valid for <strong style="color: #111827;">24 hours</strong>.
    </p>
    
    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <a href="${resetUrl}" class="btn" style="background-color: #ef4444; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            Reset My Password →
          </a>
        </td>
      </tr>
    </table>
    
    <!-- Link Alternative -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
            Or copy and paste this link:
          </p>
          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 11px; color: #6366f1; word-break: break-all; line-height: 1.5;">
            ${resetUrl}
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Security Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #991b1b;">
            ⚠️ Security Notice
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #7f1d1d; line-height: 1.8;">
            <li style="margin-bottom: 6px;">This link expires in 24 hours</li>
            <li style="margin-bottom: 6px;">Never share this link with anyone</li>
            <li style="margin-bottom: 6px;">We'll never ask for your password</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
        </td>
      </tr>
    </table>
    
    <!-- Closing -->
    <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      If you're having trouble accessing your account, please reply to this email or contact us at <a href="mailto:support@streamivus.com" style="color: #6366f1; text-decoration: none; font-weight: 500;">support@streamivus.com</a>.
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #111827;">
      Best regards,<br>
      <strong>The Streamivus Security Team</strong>
    </p>
  `;

  return emailWrapper(content);
};

// ============ OWNER PAYMENT NOTIFICATION ============
const buildOwnerPaymentNotificationEmail = ({
  ownerName,
  tenantName,
  tenantEmail,
  propertyName,
  invoiceNumber,
  periodLabel,
  totalAmount,
  baseAmount,
  securityDeposit,
  joiningFee,
  otherCharges,
  lateFeeAmount,
  paidAt,
  invoiceUrl,
}) => {
  // Use backend URL for invoice downloads since invoices are served from backend
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    process.env.FRONTEND_URL?.replace(":5173", ":3000") ||
    "http://localhost:3000";
  const fullInvoiceUrl = invoiceUrl
    ? invoiceUrl.startsWith("http")
      ? invoiceUrl
      : `${backendUrl}${invoiceUrl}${
          invoiceUrl.includes("?") ? "&" : "?"
        }download=true`
    : null;

  const content = `
    <!-- Success Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: #d1fae5; padding: 8px 16px; border-radius: 20px; display: inline-block;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">
            ✓ Payment Received
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Heading -->
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.3;">
      💰 Rent Payment Received
    </h2>
    <p style="margin: 0 0 32px; font-size: 14px; color: #6b7280;">
      Invoice #${invoiceNumber}
    </p>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
      Hi <strong style="color: #111827;">${ownerName}</strong>,
    </p>
    
    <p style="margin: 0 0 32px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      Good news! You've received a rent payment from your tenant. Here are the details:
    </p>
    
    <!-- Amount Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 32px 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 1px;">
            Amount Received
          </p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff;">
            ₹${Number(totalAmount).toLocaleString("en-IN")}
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Tenant Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 12px; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px;">
            Tenant Information
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Tenant Name</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${tenantName}</p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Email Address</p>
                <p style="margin: 0; font-size: 13px; color: #6366f1; font-weight: 500;">${tenantEmail}</p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Property</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${propertyName}</p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Period</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${periodLabel}</p>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0 0;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Payment Date</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
                  ${new Date(paidAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center">
          <a href="${frontendUrl}/owner/dashboard" class="btn btn-primary" style="background-color: #6366f1; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            View Owner Dashboard →
          </a>
        </td>
      </tr>
    </table>
    
    <!-- Closing -->
    <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.7;">
      Keep track of all payments and manage your property efficiently through your Streamivus owner dashboard.
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #111827;">
      Best regards,<br>
      <strong>The Streamivus Team</strong>
    </p>
  `;

  return emailWrapper(content);
};

// ============ EXPORT FUNCTIONS ============
export const sendTenantWelcomeEmail = async (payload) => {
  if (!transporter) {
    console.log("[EMAIL] Transporter not configured. Skipping welcome email.");
    return;
  }

  try {
    const html = buildTenantWelcomeEmail(payload);
    const info = await transporter.sendMail({
      from: fromEmail,
      to: payload.loginEmail,
      subject: `Welcome to ${payload.propertyName} - Your Streamivus Account`,
      html,
    });

    console.log(
      `[EMAIL] ✅ Welcome email sent to ${payload.loginEmail}. ID: ${info.messageId}`
    );
  } catch (error) {
    console.error("[EMAIL] ❌ Failed to send welcome email:", error.message);
  }
};

export const sendPaymentReceiptToTenant = async (payload) => {
  if (!transporter) {
    console.log(
      "[EMAIL] Transporter not configured. Skipping payment receipt."
    );
    return;
  }

  try {
    const html = buildPaymentReceiptEmail(payload);
    const info = await transporter.sendMail({
      from: fromEmail,
      to: payload.tenantEmail,
      subject: `Payment Receipt - Invoice #${payload.invoiceNumber} | Streamivus`,
      html,
    });

    console.log(
      `[EMAIL] ✅ Payment receipt sent to tenant ${payload.tenantEmail}. ID: ${info.messageId}`
    );
  } catch (error) {
    console.error(
      "[EMAIL] ❌ Failed to send payment receipt to tenant:",
      error.message
    );
  }
};

export const sendPasswordResetEmail = async (payload) => {
  if (!transporter) {
    console.error(
      "[EMAIL] ❌ Transporter not configured. Cannot send password reset email."
    );
    console.error("[EMAIL] SMTP configuration check:", {
      SMTP_HOST: SMTP_HOST ? "✅ Set" : "❌ Missing",
      SMTP_USER: SMTP_USER ? "✅ Set" : "❌ Missing",
      SMTP_PASS: hasValidPassword ? "✅ Set" : "❌ Missing or invalid",
    });
    return false;
  }

  try {
    const html = buildPasswordResetEmail(payload);
    const info = await transporter.sendMail({
      from: fromEmail,
      to: payload.tenantEmail,
      subject: "Password Reset Request - Streamivus",
      html,
    });

    console.log(
      `[EMAIL] ✅ Password reset email sent to ${payload.tenantEmail}. ID: ${info.messageId}`
    );
    return true;
  } catch (error) {
    console.error(
      "[EMAIL] ❌ Failed to send password reset email:",
      error.message
    );
    console.error("[EMAIL] Error stack:", error.stack);
    return false;
  }
};

export const sendPaymentReceiptToOwner = async (payload) => {
  if (!transporter) {
    console.log(
      "[EMAIL] Transporter not configured. Skipping owner notification."
    );
    return;
  }

  try {
    const html = buildOwnerPaymentNotificationEmail(payload);
    const info = await transporter.sendMail({
      from: fromEmail,
      to: payload.ownerEmail,
      subject: `Payment Received - ₹${Number(
        payload.totalAmount
      ).toLocaleString("en-IN")} from ${payload.tenantName} | Streamivus`,
      html,
    });

    console.log(
      `[EMAIL] ✅ Payment notification sent to owner ${payload.ownerEmail}. ID: ${info.messageId}`
    );
  } catch (error) {
    console.error(
      "[EMAIL] ❌ Failed to send payment notification to owner:",
      error.message
    );
  }
};

// ============ WHATSAPP NOTIFICATION (CONSOLE ONLY) ============
export const sendTenantWhatsApp = async ({ phone, message }) => {
  console.log("\n[WHATSAPP] 📱 WhatsApp Message");
  console.log("=".repeat(60));
  console.log(`To: ${phone || "N/A"}`);
  console.log(`Message: ${message || "N/A"}`);
  console.log("=".repeat(60));
  console.log(
    "Note: WhatsApp integration not implemented. Message logged to console.\n"
  );
};
