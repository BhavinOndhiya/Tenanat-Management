import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ekycDocumentStructure } from "../documents/ekyc/structure.js";
import { agreementDocumentStructure } from "../documents/agreement/structure.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate eKYC Verification Document PDF
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

  let yPosition = header.height + 30;

  // ========== VERIFICATION STATUS ==========
  const statusSection = structure.sections.verificationStatus;
  doc
    .fontSize(statusSection.fontSize)
    .font(statusSection.font)
    .fillColor(colors.primary)
    .text(statusSection.title, 40, yPosition);

  yPosition += 20;

  doc
    .rect(40, yPosition, doc.page.width - 80, statusSection.boxHeight)
    .fillColor(colors.lightGray)
    .fill()
    .strokeColor(colors.border)
    .stroke();

  doc
    .fontSize(statusSection.verifiedFontSize)
    .font("Helvetica-Bold")
    .fillColor(statusSection.verifiedColor)
    .text(
      statusSection.verifiedText,
      50,
      yPosition + statusSection.boxHeight / 2 - 7,
      { align: "left" }
    );

  yPosition += statusSection.boxHeight + 30;

  // ========== PERSONAL DETAILS ==========
  const personalSection = structure.sections.personalDetails;
  doc
    .fontSize(personalSection.fontSize)
    .font(personalSection.font)
    .fillColor(colors.primary)
    .text(personalSection.title, 40, yPosition);

  yPosition += 20;

  doc
    .rect(40, yPosition, doc.page.width - 80, 1)
    .fillColor(colors.border)
    .fill();

  yPosition += 15;

  personalSection.fields.forEach((field) => {
    const value = kycData[field.key];
    let displayValue = "";

    if (field.key === "dateOfBirth" && value) {
      displayValue = structure.formatters.date(value);
    } else {
      displayValue = value || "N/A";
    }

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text(`${field.label}:`, 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text(displayValue, 180, yPosition);

    yPosition += 18;
  });

  yPosition += 10;

  // ========== ID DETAILS ==========
  const idSection = structure.sections.idDetails;
  doc
    .fontSize(idSection.fontSize)
    .font(idSection.font)
    .fillColor(colors.primary)
    .text(idSection.title, 40, yPosition);

  yPosition += 20;

  doc
    .rect(40, yPosition, doc.page.width - 80, 1)
    .fillColor(colors.border)
    .fill();

  yPosition += 15;

  idSection.fields.forEach((field) => {
    const value = kycData[field.key] || "N/A";

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text(`${field.label}:`, 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text(value, 180, yPosition);

    yPosition += 18;
  });

  yPosition += 20;

  // ========== VERIFICATION TIMESTAMP ==========
  const timestampSection = structure.sections.verificationTimestamp;
  doc
    .fontSize(timestampSection.fontSize)
    .font(timestampSection.font)
    .fillColor(colors.primary)
    .text(timestampSection.title, 40, yPosition);

  yPosition += 20;

  doc
    .rect(40, yPosition, doc.page.width - 80, 1)
    .fillColor(colors.border)
    .fill();

  yPosition += 15;

  const verifiedAt = user.kycVerifiedAt || new Date();
  const verifiedDate = structure.formatters.date(verifiedAt);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Verified on: ${verifiedDate}`, 50, yPosition);

  yPosition += 15;

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Transaction ID: ${user.kycTransactionId || "N/A"}`, 50, yPosition);

  yPosition += 30;

  // ========== FOOTER ==========
  const footer = structure.footer;
  const footerY = doc.page.height - 60;

  footer.lines.forEach((line, index) => {
    doc
      .fontSize(footer.fontSize)
      .font(footer.font)
      .fillColor(footer.color)
      .text(line, 40, footerY + index * 12, {
        align: "center",
        width: doc.page.width - 80,
      });
  });

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return filePath;
}

/**
 * Generate PG Rental Agreement Document PDF
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
  const primaryColor = colors.primary;
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

  let yPosition = header.height + 30;

  // ========== PARTIES SECTION ==========
  const partiesSection = structure.sections.parties;
  doc
    .fontSize(partiesSection.fontSize)
    .font(partiesSection.font)
    .fillColor(primaryColor)
    .text(partiesSection.title, 40, yPosition);

  yPosition += 25;

  // Owner details
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(partiesSection.ownerLabel, 50, yPosition);

  yPosition += 15;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Name: ${owner.name || "N/A"}`, 60, yPosition);

  yPosition += 15;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Email: ${owner.email || "N/A"}`, 60, yPosition);

  yPosition += 15;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Phone: ${owner.phone || "N/A"}`, 60, yPosition);

  yPosition += 25;

  // Tenant details
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(partiesSection.tenantLabel, 50, yPosition);

  yPosition += 15;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Name: ${user.name || "N/A"}`, 60, yPosition);

  yPosition += 15;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Email: ${user.email || "N/A"}`, 60, yPosition);

  yPosition += 15;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(`Phone: ${user.phone || "N/A"}`, 60, yPosition);

  yPosition += 30;

  // ========== PROPERTY DETAILS ==========
  if (yPosition > doc.page.height - 200) {
    doc.addPage();
    yPosition = 40;
  }

  const propertySection = structure.sections.propertyDetails;
  doc
    .fontSize(propertySection.fontSize)
    .font(propertySection.font)
    .fillColor(primaryColor)
    .text(propertySection.title, 40, yPosition);

  yPosition += 25;

  const propertyName = property.name || property.buildingName || "PG Property";
  const addressParts = [
    property.address?.line1,
    property.address?.line2,
    property.address?.city,
    property.address?.state,
    property.address?.zipCode,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ") || "Address not specified";

  propertySection.fields.forEach((field) => {
    let value = "";
    if (field.key === "propertyName") {
      value = propertyName;
    } else if (field.key === "address") {
      value = fullAddress;
    } else if (field.key === "roomNumber") {
      value = profile?.roomNumber || user.roomNumber || "N/A";
    } else if (field.key === "bedNumber") {
      value = profile?.bedNumber || user.bedNumber || "N/A";
    }

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text(`${field.label}:`, 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text(value, 180, yPosition);

    yPosition += 18;
  });

  yPosition += 20;

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
  const monthlyRent = profile?.rent || property.defaultRent || 0;
  const securityDeposit = profile?.deposit || property.defaultDeposit || 0;
  const moveInDate = profile?.moveInDate
    ? new Date(profile.moveInDate)
    : new Date();

  const financialFields = structure.sections.financialTerms.fields;
  financialFields.forEach((field) => {
    let value = "";
    if (field.key === "monthlyRent") {
      value = formatters.currency(monthlyRent);
    } else if (field.key === "securityDeposit") {
      value = formatters.currency(securityDeposit);
    } else if (field.key === "moveInDate") {
      value = formatters.date(moveInDate);
    } else if (field.key === "rentDueDate") {
      value = `${dueDate}${formatters.ordinalSuffix(dueDate)} of every month`;
    } else if (field.key === "lastPenaltyFreeDate") {
      value = `${lastPenaltyFreeDate}${formatters.ordinalSuffix(
        lastPenaltyFreeDate
      )} of every month`;
    } else if (field.key === "lateFee") {
      value = `Rs. ${lateFeePerDay} per day after due date`;
    } else if (field.key === "noticePeriod") {
      value = `${noticePeriodMonths} month${
        noticePeriodMonths !== 1 ? "s" : ""
      }`;
    } else if (field.key === "lockInPeriod") {
      value =
        lockInMonths > 0
          ? `${lockInMonths} month${lockInMonths !== 1 ? "s" : ""}`
          : "No lock-in period";
    }

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text(`${field.label}:`, 50, yPosition);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text(value, 180, yPosition);

    yPosition += 18;
  });

  yPosition += 20;

  // ========== FACILITIES ==========
  if (yPosition > doc.page.height - 200) {
    doc.addPage();
    yPosition = 40;
  }

  const facilitiesSection = structure.sections.facilities;
  doc
    .fontSize(facilitiesSection.fontSize)
    .font(facilitiesSection.font)
    .fillColor(primaryColor)
    .text(facilitiesSection.title, 40, yPosition);

  yPosition += 25;

  const facilities = property.facilitiesAvailable || property.amenities || [];
  if (facilities.length > 0) {
    facilities.forEach((facility, index) => {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(colors.textSecondary)
        .text(`• ${facility}`, 50, yPosition);

      yPosition += 15;
    });
  } else {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text("Standard PG facilities included", 50, yPosition);

    yPosition += 15;
  }

  yPosition += 15;

  // ========== HOUSE RULES ==========
  if (yPosition > doc.page.height - 200) {
    doc.addPage();
    yPosition = 40;
  }

  const houseRulesSection = structure.sections.houseRules;
  doc
    .fontSize(houseRulesSection.fontSize)
    .font(houseRulesSection.font)
    .fillColor(primaryColor)
    .text(houseRulesSection.title, 40, yPosition);

  yPosition += 25;

  const houseRules = property.houseRules || houseRulesSection.defaultText;
  const rulesLines = houseRules.split("\n").filter((line) => line.trim());

  rulesLines.forEach((line) => {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text(line.trim(), 50, yPosition, {
        width: doc.page.width - 100,
        align: "left",
      });

    yPosition += 15;
  });

  yPosition += 20;

  // ========== CONSENT & VERIFICATION ==========
  if (yPosition > doc.page.height - 200) {
    doc.addPage();
    yPosition = 40;
  }

  const consentSection = structure.sections.consent;
  doc
    .fontSize(consentSection.fontSize)
    .font(consentSection.font)
    .fillColor(primaryColor)
    .text(consentSection.title, 40, yPosition);

  yPosition += 25;

  consentSection.items.forEach((item) => {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.textSecondary)
      .text(item, 50, yPosition, {
        width: doc.page.width - 100,
        align: "left",
      });

    yPosition += 18;
  });

  yPosition += 15;

  doc
    .fontSize(9)
    .font("Helvetica-Italic")
    .fillColor(colors.textSecondary)
    .text(consentSection.statement, 50, yPosition, {
      width: doc.page.width - 100,
      align: "left",
    });

  yPosition += 30;

  // ========== SIGNATURES ==========
  if (yPosition > doc.page.height - 200) {
    doc.addPage();
    yPosition = 40;
  }

  const signaturesSection = structure.sections.signatures;
  doc
    .fontSize(signaturesSection.fontSize)
    .font(signaturesSection.font)
    .fillColor(primaryColor)
    .text(signaturesSection.title, 40, yPosition);

  yPosition += 30;

  const signatureBoxWidth = (doc.page.width - 100) / 2;

  // Owner signature box
  doc
    .rect(50, yPosition, signatureBoxWidth, signaturesSection.boxHeight)
    .strokeColor(colors.border)
    .stroke();

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(signaturesSection.ownerLabel, 60, yPosition + 10);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(owner.name || "Owner", 60, yPosition + 30);

  // Tenant signature box
  doc
    .rect(
      50 + signatureBoxWidth + 20,
      yPosition,
      signatureBoxWidth,
      signaturesSection.boxHeight
    )
    .strokeColor(colors.border)
    .stroke();

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(
      signaturesSection.tenantLabel,
      60 + signatureBoxWidth + 20,
      yPosition + 10
    );

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(user.name || "Tenant", 60 + signatureBoxWidth + 20, yPosition + 30);

  const agreementAcceptedAt = user.agreementAcceptedAt || new Date();
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(colors.textSecondary)
    .text(
      `E-signed on: ${formatters.date(agreementAcceptedAt)}`,
      60 + signatureBoxWidth + 20,
      yPosition + 50
    );

  yPosition += signaturesSection.boxHeight + 30;

  // ========== FOOTER ==========
  const footer = structure.footer;
  const footerY = doc.page.height - 60;

  footer.lines.forEach((line, index) => {
    const footerText = line.replace("{date}", formatters.date(new Date()));
    doc
      .fontSize(footer.fontSize)
      .font(footer.font)
      .fillColor(footer.color)
      .text(footerText, 40, footerY + index * 12, {
        align: "center",
        width: doc.page.width - 80,
      });
  });

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return filePath;
}

/**
 * Generate Reference Document PDF (KYC Images for Owner)
 * This PDF contains the uploaded ID front, ID back, and selfie images
 */
export async function generateReferenceDocument({ user }) {
  // Create documents directory if it doesn't exist
  const isLambda =
    process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const documentsDir = isLambda
    ? path.join("/tmp", "documents")
    : path.join(__dirname, "../../documents");

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  const fileName = `reference-${user._id.toString()}-${Date.now()}.pdf`;
  const filePath = path.join(documentsDir, fileName);

  // Create PDF document
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `KYC Reference Documents - ${user.name}`,
      Author: "PG Management System",
      Subject: "Tenant KYC Uploaded Documents Reference",
    },
  });

  // Pipe PDF to file
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Colors
  const primaryColor = "#0f172a";
  const accentColor = "#6366f1";
  const textSecondary = "#64748b";
  const borderColor = "#e2e8f0";

  // ========== HEADER ==========
  doc.rect(0, 0, doc.page.width, 80).fillColor(accentColor).fill();

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("KYC REFERENCE DOCUMENTS", 40, 30, {
      align: "center",
      width: doc.page.width - 80,
    });

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("rgba(255, 255, 255, 0.9)")
    .text(`Tenant: ${user.name}`, 40, 60, {
      align: "center",
      width: doc.page.width - 80,
    });

  let yPosition = 100;

  // Check if images exist
  const hasIdFront = user.kycImages?.idFrontBase64;
  const hasIdBack = user.kycImages?.idBackBase64;
  const hasSelfie = user.kycImages?.selfieBase64;

  if (!hasIdFront && !hasIdBack && !hasSelfie) {
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor(textSecondary)
      .text("No uploaded documents available.", 40, yPosition, {
        align: "center",
        width: doc.page.width - 80,
      });
    doc.end();
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
    return filePath;
  }

  // Image dimensions
  const imageWidth = doc.page.width - 80;
  const imageHeight = 200;
  const maxImageWidth = imageWidth;
  const maxImageHeight = imageHeight;

  // ========== ID FRONT ==========
  if (hasIdFront) {
    if (yPosition > doc.page.height - 250) {
      doc.addPage();
      yPosition = 40;
    }

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("ID Front", 40, yPosition);

    yPosition += 20;

    try {
      const imageBuffer = Buffer.from(user.kycImages.idFrontBase64, "base64");
      doc.image(imageBuffer, 40, yPosition, {
        fit: [maxImageWidth, maxImageHeight],
        align: "center",
      });
      yPosition += imageHeight + 20;
    } catch (error) {
      console.error("[Reference Doc] Error adding ID front image:", error);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(textSecondary)
        .text("ID Front image could not be displayed", 40, yPosition);
      yPosition += 30;
    }
  }

  // ========== ID BACK ==========
  if (hasIdBack) {
    if (yPosition > doc.page.height - 250) {
      doc.addPage();
      yPosition = 40;
    }

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("ID Back", 40, yPosition);

    yPosition += 20;

    try {
      const imageBuffer = Buffer.from(user.kycImages.idBackBase64, "base64");
      doc.image(imageBuffer, 40, yPosition, {
        fit: [maxImageWidth, maxImageHeight],
        align: "center",
      });
      yPosition += imageHeight + 20;
    } catch (error) {
      console.error("[Reference Doc] Error adding ID back image:", error);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(textSecondary)
        .text("ID Back image could not be displayed", 40, yPosition);
      yPosition += 30;
    }
  }

  // ========== SELFIE ==========
  if (hasSelfie) {
    if (yPosition > doc.page.height - 250) {
      doc.addPage();
      yPosition = 40;
    }

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("Selfie", 40, yPosition);

    yPosition += 20;

    try {
      const imageBuffer = Buffer.from(user.kycImages.selfieBase64, "base64");
      doc.image(imageBuffer, 40, yPosition, {
        fit: [maxImageWidth, maxImageHeight],
        align: "center",
      });
      yPosition += imageHeight + 20;
    } catch (error) {
      console.error("[Reference Doc] Error adding selfie image:", error);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(textSecondary)
        .text("Selfie image could not be displayed", 40, yPosition);
      yPosition += 30;
    }
  }

  // ========== FOOTER ==========
  const footerY = doc.page.height - 40;
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(textSecondary)
    .text(
      "This document contains uploaded KYC images for reference purposes only.",
      40,
      footerY,
      {
        align: "center",
        width: doc.page.width - 80,
      }
    );

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return filePath;
}
