import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ekycDocumentStructure } from "../documents/ekyc/structure.js";
import { agreementDocumentStructure } from "../documents/agreement/structure.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use formatters from document structures
const formatDate = ekycDocumentStructure.formatters.date;

/**
 * Generate eKYC Document PDF
 * @param {Object} params
 * @param {Object} params.user - User document (tenant)
 * @param {Object} params.kycData - KYC form data
 * @returns {Promise<string>} - File path to generated PDF
 */
export async function generateEKycDocument({ user, kycData }) {
  // Create documents directory if it doesn't exist
  const isLambda =
    process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const documentsDir = isLambda
    ? path.join("/tmp", "documents")
    : path.join(__dirname, "../../documents");

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  const fileName = `ekyc-${user._id.toString()}-${Date.now()}.pdf`;
  const filePath = path.join(documentsDir, fileName);

  // Get document structure
  const structure = ekycDocumentStructure;
  const colors = structure.colors;

  // Create PDF document
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: structure.metadata.title(user.name),
      Author: structure.metadata.author,
      Subject: structure.metadata.subject,
    },
  });

  // Pipe PDF to file
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ========== HEADER SECTION ==========
  const header = structure.header;
  doc
    .rect(0, 0, doc.page.width, header.height)
    .fillColor(header.backgroundColor)
    .fill();

  doc
    .fontSize(header.title.fontSize)
    .font(header.title.font)
    .fillColor(header.title.color)
    .text(header.title.text, 40, header.title.y, { align: "left" });

  doc
    .fontSize(header.subtitle.fontSize)
    .font(header.subtitle.font)
    .fillColor(header.subtitle.color)
    .text(header.subtitle.text, 40, header.subtitle.y, { align: "left" });

  let yPosition = 120;

  // ========== VERIFICATION STATUS ==========
  const verificationSection = structure.sections.verificationStatus;
  doc
    .fontSize(verificationSection.fontSize)
    .font(verificationSection.font)
    .fillColor(colors.primary)
    .text(verificationSection.title, 40, yPosition);

  yPosition += 25;

  doc
    .rect(40, yPosition, doc.page.width - 80, verificationSection.boxHeight)
    .fillColor(colors.lightGray)
    .fill()
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(verificationSection.verifiedFontSize)
    .font(verificationSection.font)
    .fillColor(verificationSection.verifiedColor)
    .text(verificationSection.verifiedText, 50, yPosition + 12);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(
      `Transaction ID: ${user.kycTransactionId || "N/A"}`,
      50,
      yPosition + 28
    );

  yPosition += verificationSection.boxHeight + 20;

  // ========== PERSONAL DETAILS ==========
  const personalSection = structure.sections.personalDetails;
  doc
    .fontSize(personalSection.fontSize)
    .font(personalSection.font)
    .fillColor(colors.primary)
    .text(personalSection.title, 40, yPosition);

  yPosition += 25;

  // Build personal details from structure
  const getPersonalDetailValue = (field, kycData, user) => {
    switch (field.key) {
      case "fullName":
        return kycData.fullName || user.name;
      case "dateOfBirth":
        return kycData.dateOfBirth
          ? formatDate(kycData.dateOfBirth)
          : user.personalDetails?.dateOfBirth
          ? formatDate(user.personalDetails.dateOfBirth)
          : "N/A";
      case "gender":
        return kycData.gender || user.personalDetails?.gender || "N/A";
      case "fatherMotherName":
        return kycData.fatherMotherName || "N/A";
      case "phone":
        return kycData.phone || user.phone || "N/A";
      case "email":
        return kycData.email || user.email || "N/A";
      case "permanentAddress":
        return kycData.permanentAddress || user.address?.street || "N/A";
      case "occupation":
        return kycData.occupation || user.personalDetails?.occupation || "N/A";
      case "companyCollegeName":
        return kycData.companyCollegeName || "N/A";
      default:
        return "N/A";
    }
  };

  personalSection.fields.forEach((field) => {
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = 40;
    }

    const value = getPersonalDetailValue(field, kycData, user);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.textSecondary)
      .text(field.label + ":", 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.primary)
      .text(value, 200, yPosition, {
        width: doc.page.width - 250,
        align: "left",
      });

    yPosition += 20;
  });

  yPosition += 20;

  // ========== ID DETAILS ==========
  if (yPosition > doc.page.height - 100) {
    doc.addPage();
    yPosition = 40;
  }

  const idSection = structure.sections.idDetails;
  doc
    .fontSize(idSection.fontSize)
    .font(idSection.font)
    .fillColor(colors.primary)
    .text(idSection.title, 40, yPosition);

  yPosition += 25;

  idSection.fields.forEach((field) => {
    const value = kycData[field.key] || "N/A";

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.textSecondary)
      .text(field.label + ":", 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.primary)
      .text(value, 200, yPosition, {
        width: doc.page.width - 250,
        align: "left",
      });

    yPosition += 20;
  });

  yPosition += 20;

  // ========== VERIFICATION TIMESTAMP ==========
  if (yPosition > doc.page.height - 100) {
    doc.addPage();
    yPosition = 40;
  }

  const timestampSection = structure.sections.verificationTimestamp;
  doc
    .fontSize(timestampSection.fontSize)
    .font(timestampSection.font)
    .fillColor(colors.primary)
    .text(timestampSection.title, 40, yPosition);

  yPosition += 25;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.primary)
    .text(
      `Verified At: ${
        user.kycVerifiedAt ? formatDate(user.kycVerifiedAt) : "N/A"
      }`,
      50,
      yPosition
    );

  yPosition += 20;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.primary)
    .text(`Document Generated: ${formatDate(new Date())}`, 50, yPosition);

  yPosition += 40;

  // ========== FOOTER ==========
  if (yPosition > doc.page.height - 80) {
    doc.addPage();
    yPosition = doc.page.height - 100;
  }

  const footer = structure.footer;
  structure.footer.lines.forEach((line, index) => {
    if (yPosition > doc.page.height - 60) {
      doc.addPage();
      yPosition = doc.page.height - 100;
    }

    doc
      .fontSize(footer.fontSize)
      .font(footer.font)
      .fillColor(footer.color)
      .text(line, 40, yPosition, {
        align: "center",
        width: doc.page.width - 80,
      });

    yPosition += 15;
  });

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on("finish", () => {
      console.log(`[Document] eKYC PDF generated: ${filePath}`);
      resolve(filePath);
    });
    stream.on("error", reject);
  });

  return filePath;
}

/**
 * Generate PG Rental Agreement PDF with e-signature
 * @param {Object} params
 * @param {Object} params.user - User document (tenant)
 * @param {Object} params.property - Property/Flat document
 * @param {Object} params.owner - User document (owner)
 * @param {Object} params.profile - PgTenantProfile document
 * @returns {Promise<string>} - File path to generated PDF
 */
export async function generatePgAgreementDocument({
  user,
  property,
  owner,
  profile,
}) {
  // Get document structure
  const structure = agreementDocumentStructure;
  const colors = structure.colors;
  const formatters = structure.formatters;

  // Create documents directory if it doesn't exist
  const isLambda =
    process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const documentsDir = isLambda
    ? path.join("/tmp", "documents")
    : path.join(__dirname, "../../documents");

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  const fileName = `pg-agreement-${user._id.toString()}-${Date.now()}.pdf`;
  const filePath = path.join(documentsDir, fileName);

  // Create PDF document
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: structure.metadata.title(user.name),
      Author: structure.metadata.author,
      Subject: structure.metadata.subject,
    },
  });

  // Pipe PDF to file
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ========== HEADER SECTION ==========
  const header = structure.header;
  doc
    .rect(0, 0, doc.page.width, header.height)
    .fillColor(header.backgroundColor)
    .fill();

  doc
    .fontSize(header.title.fontSize)
    .font(header.title.font)
    .fillColor(header.title.color)
    .text(header.title.text, 40, header.title.y, {
      align: "center",
      width: doc.page.width - 80,
    });

  doc
    .fontSize(header.subtitle.fontSize)
    .font(header.subtitle.font)
    .fillColor(header.subtitle.color)
    .text(header.subtitle.text, 40, header.subtitle.y, {
      align: "center",
      width: doc.page.width - 80,
    });

  let yPosition = 120;

  // ========== PARTIES ==========
  const partiesSection = structure.sections.parties;
  doc
    .fontSize(partiesSection.fontSize)
    .font(partiesSection.font)
    .fillColor(colors.primary)
    .text(partiesSection.title, 40, yPosition);

  yPosition += 25;

  // Owner section
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(partiesSection.ownerLabel, 50, yPosition);

  yPosition += 18;

  partiesSection.fields.forEach((field) => {
    const value = owner?.[field] || (field === "phone" ? null : "N/A");
    if (value) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(colors.primary)
        .text(
          `${field.charAt(0).toUpperCase() + field.slice(1)}: ${value}`,
          60,
          yPosition
        );

      yPosition += 15;
    }
  });

  yPosition += 10;

  // Tenant section
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(partiesSection.tenantLabel, 50, yPosition);

  yPosition += 18;

  partiesSection.fields.forEach((field) => {
    const value = user[field] || (field === "phone" ? null : "N/A");
    if (value) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(colors.primary)
        .text(
          `${field.charAt(0).toUpperCase() + field.slice(1)}: ${value}`,
          60,
          yPosition
        );

      yPosition += 15;
    }
  });

  yPosition += 20;

  // ========== PROPERTY DETAILS ==========
  if (yPosition > doc.page.height - 150) {
    doc.addPage();
    yPosition = 40;
  }

  const propertySection = structure.sections.propertyDetails;
  doc
    .fontSize(propertySection.fontSize)
    .font(propertySection.font)
    .fillColor(colors.primary)
    .text(propertySection.title, 40, yPosition);

  yPosition += 25;

  const addressParts = [
    property.address?.line1,
    property.address?.line2,
    property.address?.city,
    property.address?.state,
    property.address?.zipCode,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  // Build property details from structure
  const getPropertyDetailValue = (field) => {
    switch (field.key) {
      case "propertyName":
        return property.name || property.buildingName || "N/A";
      case "address":
        return fullAddress || "N/A";
      case "roomNumber":
        return profile?.roomNumber || "TBA";
      case "bedNumber":
        return profile?.bedNumber || "TBA";
      default:
        return "N/A";
    }
  };

  propertySection.fields.forEach((field) => {
    const value = getPropertyDetailValue(field);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.textSecondary)
      .text(field.label + ":", 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.primary)
      .text(value, 200, yPosition, {
        width: doc.page.width - 250,
        align: "left",
      });

    yPosition += 18;
  });

  yPosition += 15;

  // ========== FINANCIAL TERMS ==========
  if (yPosition > doc.page.height - 200) {
    doc.addPage();
    yPosition = 40;
  }

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("FINANCIAL TERMS", 40, yPosition);

  yPosition += 25;

  // Calculate financial values
  const dueDate = property.dueDate || profile?.billingDueDay || 1;
  const lastPenaltyFreeDate =
    property.lastPenaltyFreeDate || profile?.billingGraceLastDay || 5;
  const lateFeePerDay = property.lateFeePerDay || profile?.lateFeePerDay || 50;
  const noticePeriodMonths = property.noticePeriodMonths || 1;
  const lockInMonths = property.lockInMonths || 0;

  const financialSection = structure.sections.financialTerms;

  // Build financial terms from structure
  const getFinancialTermValue = (field) => {
    switch (field.key) {
      case "monthlyRent":
        return formatters.currency(profile?.monthlyRent || 0);
      case "securityDeposit":
        return formatters.currency(
          profile?.securityDeposit || property.defaultDeposit || 0
        );
      case "moveInDate":
        return profile?.moveInDate
          ? formatters.date(profile.moveInDate)
          : "TBD";
      case "rentDueDate":
        return `${dueDate}${formatters.ordinalSuffix(dueDate)} of every month`;
      case "lastPenaltyFreeDate":
        return `${lastPenaltyFreeDate}${formatters.ordinalSuffix(
          lastPenaltyFreeDate
        )} of every month`;
      case "lateFee":
        return `Rs. ${lateFeePerDay} per day after penalty-free period`;
      case "noticePeriod":
        return `${noticePeriodMonths} month(s)`;
      case "lockInPeriod":
        return `${lockInMonths} month(s)`;
      default:
        return "N/A";
    }
  };

  financialSection.fields.forEach((field) => {
    const value = getFinancialTermValue(field);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.textSecondary)
      .text(field.label + ":", 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.primary)
      .text(value, 200, yPosition, {
        width: doc.page.width - 250,
        align: "left",
      });

    yPosition += 18;
  });

  yPosition += 15;

  // ========== FACILITIES & HOUSE RULES ==========
  if (yPosition > doc.page.height - 150) {
    doc.addPage();
    yPosition = 40;
  }

  const facilitiesSection = structure.sections.facilities;
  doc
    .fontSize(facilitiesSection.fontSize)
    .font(facilitiesSection.font)
    .fillColor(colors.primary)
    .text(facilitiesSection.title, 40, yPosition);

  yPosition += 25;

  const facilities =
    property.facilitiesAvailable && property.facilitiesAvailable.length > 0
      ? property.facilitiesAvailable.join(", ")
      : "Standard facilities";

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.primary)
    .text(facilities, 50, yPosition, {
      width: doc.page.width - 100,
      align: "left",
    });

  yPosition += 30;

  if (yPosition > doc.page.height - 100) {
    doc.addPage();
    yPosition = 40;
  }

  const houseRulesSection = structure.sections.houseRules;
  doc
    .fontSize(houseRulesSection.fontSize)
    .font(houseRulesSection.font)
    .fillColor(colors.primary)
    .text(houseRulesSection.title, 40, yPosition);

  yPosition += 25;

  const houseRules = property.houseRules || houseRulesSection.defaultText;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.primary)
    .text(houseRules, 50, yPosition, {
      width: doc.page.width - 100,
      align: "left",
    });

  yPosition += 50;

  // ========== CONSENT & VERIFICATION ==========
  if (yPosition > doc.page.height - 150) {
    doc.addPage();
    yPosition = 40;
  }

  const consentSection = structure.sections.consent;
  doc
    .fontSize(consentSection.fontSize)
    .font(consentSection.font)
    .fillColor(colors.primary)
    .text(consentSection.title, 40, yPosition);

  yPosition += 25;

  consentSection.items.forEach((text) => {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.primary)
      .text(text, 50, yPosition, {
        width: doc.page.width - 100,
        align: "left",
      });

    yPosition += 18;
  });

  yPosition += 20;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(consentSection.statement, 50, yPosition, {
      width: doc.page.width - 100,
      align: "left",
    });

  yPosition += 40;

  // ========== SIGNATURES ==========
  if (yPosition > doc.page.height - 120) {
    doc.addPage();
    yPosition = 40;
  }

  const signaturesSection = structure.sections.signatures;
  doc
    .fontSize(signaturesSection.fontSize)
    .font(signaturesSection.font)
    .fillColor(colors.primary)
    .text(signaturesSection.title, 40, yPosition);

  yPosition += 30;

  // Owner signature box
  const signatureBoxWidth = (doc.page.width - 120) / 2;
  const signatureBoxHeight = signaturesSection.boxHeight;

  doc
    .rect(50, yPosition, signatureBoxWidth, signatureBoxHeight)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(
      signaturesSection.ownerLabel,
      50 + signatureBoxWidth / 2,
      yPosition + 10,
      {
        align: "center",
        width: signatureBoxWidth,
      }
    );

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(owner?.name || "N/A", 50 + signatureBoxWidth / 2, yPosition + 30, {
      align: "center",
      width: signatureBoxWidth,
    });

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(
      `Date: ${formatters.date(new Date())}`,
      50 + signatureBoxWidth / 2,
      yPosition + 50,
      {
        align: "center",
        width: signatureBoxWidth,
      }
    );

  // Tenant signature box
  const tenantBoxX = 50 + signatureBoxWidth + 20;

  doc
    .rect(tenantBoxX, yPosition, signatureBoxWidth, signatureBoxHeight)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(
      signaturesSection.tenantLabel,
      tenantBoxX + signatureBoxWidth / 2,
      yPosition + 10,
      {
        align: "center",
        width: signatureBoxWidth,
      }
    );

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(user.name, tenantBoxX + signatureBoxWidth / 2, yPosition + 30, {
      align: "center",
      width: signatureBoxWidth,
    });

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(
      `E-Signed: ${
        user.agreementAcceptedAt
          ? formatters.date(user.agreementAcceptedAt)
          : formatters.date(new Date())
      }`,
      tenantBoxX + signatureBoxWidth / 2,
      yPosition + 50,
      {
        align: "center",
        width: signatureBoxWidth,
      }
    );

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(colors.success)
    .text(
      `OTP Verified: ${user.agreementOtpRef || "N/A"}`,
      tenantBoxX + signatureBoxWidth / 2,
      yPosition + 65,
      {
        align: "center",
        width: signatureBoxWidth,
      }
    );

  yPosition += signatureBoxHeight + 30;

  // ========== FOOTER ==========
  if (yPosition > doc.page.height - 60) {
    doc.addPage();
    yPosition = doc.page.height - 80;
  }

  const footer = structure.footer;
  footer.lines.forEach((line, index) => {
    const processedLine = line.replace("{date}", formatters.date(new Date()));

    doc
      .fontSize(footer.fontSize)
      .font(footer.font)
      .fillColor(footer.color)
      .text(processedLine, 40, yPosition, {
        align: "center",
        width: doc.page.width - 80,
      });

    yPosition += 15;
  });

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on("finish", () => {
      console.log(`[Document] PG Agreement PDF generated: ${filePath}`);
      resolve(filePath);
    });
    stream.on("error", reject);
  });

  return filePath;
}
