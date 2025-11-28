import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format currency amount for PDF (using "Rs." instead of ₹ for PDFKit compatibility)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (e.g., "Rs. 22,000")
 */
function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return "Rs. 0";
  const formatted = Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

/**
 * Generate professional invoice PDF for rent payment
 * @param {Object} params
 * @param {Object} params.rentPayment - RentPayment document
 * @param {Object} params.property - Property/Flat document
 * @param {Object} params.tenant - User document (tenant)
 * @param {Object} params.owner - User document (owner)
 * @returns {Promise<string>} - URL or path to generated PDF
 */
export async function generateRentInvoice({
  rentPayment,
  property,
  tenant,
  owner,
}) {
  const invoiceNumber = `INV-${rentPayment.periodYear}${String(
    rentPayment.periodMonth
  ).padStart(2, "0")}-${rentPayment._id.toString().slice(-6).toUpperCase()}`;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const periodLabel = `${monthNames[rentPayment.periodMonth - 1]} ${
    rentPayment.periodYear
  }`;

  // Calculate amounts
  const baseAmount = rentPayment.baseAmount || 0;
  const securityDeposit = rentPayment.securityDeposit || 0;
  const joiningFee = rentPayment.joiningFee || 0;
  const otherCharges = rentPayment.otherCharges || [];
  const otherChargesTotal = otherCharges.reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const lateFeeAmount = rentPayment.lateFeeAmount || 0;

  // Total amount calculation
  // For first month: baseAmount + securityDeposit + joiningFee + otherCharges + lateFee
  // For recurring: baseAmount + lateFee (securityDeposit, joiningFee, otherCharges should be 0)
  const totalAmount =
    baseAmount +
    securityDeposit +
    joiningFee +
    otherChargesTotal +
    lateFeeAmount;

  // Check if this is first month payment
  const isFirstMonth = rentPayment.isFirstMonth || false;

  // Get tenant profile for room/bed details
  const PgTenantProfile = (await import("../models/PgTenantProfile.js"))
    .default;
  const tenantProfile = await PgTenantProfile.findOne({
    userId: tenant._id,
  }).lean();

  // Format dates
  const billingDate = rentPayment.paidAt
    ? new Date(rentPayment.paidAt)
    : new Date();
  const dueDate = new Date(rentPayment.dueDate);
  const moveInDate = tenantProfile?.moveInDate
    ? new Date(tenantProfile.moveInDate)
    : null;

  // Create PDF document with proper margins
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Rental Invoice - ${invoiceNumber}`,
      Author: "PG Management System",
    },
  });

  // Create invoices directory if it doesn't exist
  const invoicesDir = path.join(__dirname, "../../invoices");
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const fileName = `rent-invoice-${rentPayment._id.toString()}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  // Pipe PDF to file
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Colors - Single accent color theme
  const primaryColor = "#0f172a";
  const accentColor = "#6366f1";
  const lightGray = "#f8fafc";
  const borderColor = "#e2e8f0";
  const textSecondary = "#64748b";
  const textTertiary = "#94a3b8";
  const successColor = "#10b981";

  // ========== HEADER SECTION ==========
  // Colored header background
  const headerHeight = 110;
  doc.rect(0, 0, doc.page.width, headerHeight).fillColor(accentColor).fill();

  // Left section: Title and Subtitle
  const leftSectionX = 40;
  const leftSectionY = 25;

  // Main title
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("RENTAL INVOICE", leftSectionX, leftSectionY, {
      align: "left",
      width: 240,
    });

  // Subtitle
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("rgba(255,255,255,0.85)")
    .text("PG Accommodation Billing", leftSectionX, leftSectionY + 32, {
      align: "left",
      width: 240,
    });

  // Right section: Invoice details - NO BACKGROUND BOX
  const rightSectionX = 315;
  const rightSectionY = 20;

  let currentY = rightSectionY;

  // Invoice No
  doc.fontSize(8).font("Helvetica").fillColor("#ffffff");
  doc.text("Invoice No:", rightSectionX, currentY);
  doc.font("Helvetica-Bold").fillColor("#ffffff").fontSize(9);
  doc.text(invoiceNumber, rightSectionX + 75, currentY, {
    width: 155,
    ellipsis: true,
  });

  currentY += 16;

  // Billing Date
  doc.fontSize(8).font("Helvetica").fillColor("#ffffff");
  doc.text("Billing Date:", rightSectionX, currentY);
  doc.font("Helvetica-Bold").fillColor("#ffffff").fontSize(9);
  doc.text(
    billingDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    rightSectionX + 75,
    currentY,
    { width: 155 }
  );

  currentY += 16;

  // Due Date
  doc.fontSize(8).font("Helvetica").fillColor("#ffffff");
  doc.text("Due Date:", rightSectionX, currentY);
  doc.font("Helvetica-Bold").fillColor("#ffffff").fontSize(9);
  doc.text(
    dueDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    rightSectionX + 75,
    currentY,
    { width: 155 }
  );

  currentY += 16;

  // Total Due
  doc.fontSize(8).font("Helvetica").fillColor("#ffffff");
  doc.text("Total Due:", rightSectionX, currentY);
  doc.font("Helvetica-Bold").fillColor("#ffffff").fontSize(12);
  doc.text(formatCurrency(totalAmount), rightSectionX + 75, currentY - 1, {
    width: 155,
  });

  // ========== BILL FROM / BILL TO SECTION ==========
  let yPos = headerHeight + 20;

  // Bill From (Owner) - Left column
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(accentColor)
    .text("Bill From", 40, yPos);

  // Accent underline
  doc
    .moveTo(40, yPos + 12)
    .lineTo(130, yPos + 12)
    .lineWidth(2)
    .strokeColor(accentColor)
    .stroke();

  yPos += 20;
  doc.fontSize(10).font("Helvetica").fillColor(primaryColor);
  doc.text(owner.name || "N/A", 40, yPos);
  yPos += 14;

  if (owner.phone) {
    doc
      .fontSize(9)
      .fillColor(textSecondary)
      .text(`Phone: ${owner.phone}`, 40, yPos);
    yPos += 12;
  }

  if (owner.email) {
    doc
      .fontSize(9)
      .fillColor(textSecondary)
      .text(`Email: ${owner.email}`, 40, yPos);
    yPos += 12;
  }

  // Owner address
  const ownerAddressParts = [];
  if (property.addressLine1) {
    ownerAddressParts.push(property.addressLine1);
  } else if (property.address?.line1) {
    ownerAddressParts.push(property.address.line1);
  }

  if (property.addressLine2) {
    ownerAddressParts.push(property.addressLine2);
  } else if (property.address?.line2) {
    ownerAddressParts.push(property.address.line2);
  }

  if (property.city) {
    ownerAddressParts.push(property.city);
  } else if (property.address?.city) {
    ownerAddressParts.push(property.address.city);
  }

  if (property.state) {
    ownerAddressParts.push(property.state);
  } else if (property.address?.state) {
    ownerAddressParts.push(property.address.state);
  }

  if (property.pincode) {
    ownerAddressParts.push(property.pincode);
  } else if (property.address?.zipCode) {
    ownerAddressParts.push(property.address.zipCode);
  }

  if (ownerAddressParts.length > 0) {
    doc
      .fontSize(8)
      .fillColor(textSecondary)
      .text(ownerAddressParts.join(", "), 40, yPos);
    yPos += 12;
  }

  if (property.landmark) {
    doc
      .fontSize(8)
      .fillColor(textSecondary)
      .text(`Landmark: ${property.landmark}`, 40, yPos);
    yPos += 12;
  }

  // Bill To (Tenant) - Right column
  yPos = 110 + 20;
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(accentColor)
    .text("Bill To", 300, yPos);

  // Accent underline
  doc
    .moveTo(300, yPos + 12)
    .lineTo(380, yPos + 12)
    .lineWidth(2)
    .strokeColor(accentColor)
    .stroke();

  yPos += 20;
  doc.fontSize(10).font("Helvetica").fillColor(primaryColor);
  doc.text(tenant.name || "N/A", 300, yPos);
  yPos += 14;

  if (tenant.phone) {
    doc
      .fontSize(9)
      .fillColor(textSecondary)
      .text(`Phone: ${tenant.phone}`, 300, yPos);
    yPos += 12;
  }

  if (tenant.email) {
    doc
      .fontSize(9)
      .fillColor(textSecondary)
      .text(`Email: ${tenant.email}`, 300, yPos);
    yPos += 12;
  }

  // Property/room details
  const propertyName = property.name || property.buildingName || "N/A";
  const roomBedInfo = [];
  if (tenantProfile?.roomNumber)
    roomBedInfo.push(`Room ${tenantProfile.roomNumber}`);
  if (tenantProfile?.bedNumber)
    roomBedInfo.push(`Bed ${tenantProfile.bedNumber}`);
  const roomBedLabel = roomBedInfo.length > 0 ? roomBedInfo.join(", ") : "";

  doc.fontSize(9).fillColor(primaryColor);
  doc.text(`${propertyName}`, 300, yPos);
  yPos += 12;

  if (roomBedLabel) {
    doc.fontSize(8).fillColor(textSecondary).text(`${roomBedLabel}`, 300, yPos);
    yPos += 10;
  }

  // Property full address
  const propertyAddressParts = [];
  if (property.addressLine1 || property.address?.line1) {
    propertyAddressParts.push(property.addressLine1 || property.address?.line1);
  }
  if (property.addressLine2 || property.address?.line2) {
    propertyAddressParts.push(property.addressLine2 || property.address?.line2);
  }
  const propertyCityStateZip = [
    property.city || property.address?.city,
    property.state || property.address?.state,
    property.pincode || property.address?.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
  if (propertyCityStateZip) propertyAddressParts.push(propertyCityStateZip);

  if (propertyAddressParts.length > 0) {
    doc
      .fontSize(8)
      .fillColor(textSecondary)
      .text(propertyAddressParts.join(", "), 300, yPos, { width: 255 });
    yPos += 12;
  }

  if (property.landmark) {
    doc
      .fontSize(8)
      .fillColor(textSecondary)
      .text(`Landmark: ${property.landmark}`, 300, yPos);
    yPos += 12;
  }

  // ========== PG DETAILS & RENT TERMS BOX ==========
  yPos = Math.max(yPos, 280) + 20;

  // Draw box background with accent border
  doc.rect(40, yPos, 515, 115).fillColor(lightGray).fill();

  // Top accent border
  doc
    .moveTo(40, yPos)
    .lineTo(555, yPos)
    .lineWidth(3)
    .strokeColor(accentColor)
    .stroke();

  // Box border
  doc.rect(40, yPos, 515, 115).strokeColor(borderColor).lineWidth(1).stroke();

  // Section title
  doc.fillColor(accentColor).font("Helvetica-Bold").fontSize(11);
  doc.text("PG Accommodation Details & Billing Terms", 50, yPos + 8);

  let termsY = yPos + 23;

  // Left column - PG Details
  doc.font("Helvetica-Bold").fillColor(primaryColor).fontSize(9);
  doc.text("Accommodation Details:", 50, termsY);
  doc.font("Helvetica").fillColor(textSecondary).fontSize(8);

  termsY += 10;
  if (tenantProfile?.sharingType) {
    doc.text(`Sharing: ${tenantProfile.sharingType}-sharing`, 50, termsY);
    termsY += 9;
  }
  if (tenantProfile?.acPreference) {
    const acLabel = tenantProfile.acPreference === "AC" ? "AC" : "Non-AC";
    doc.text(`Room Type: ${acLabel}`, 50, termsY);
    termsY += 9;
  }
  if (tenantProfile?.foodPreference) {
    const foodLabel =
      tenantProfile.foodPreference === "WITH_FOOD"
        ? "With Food"
        : "Without Food";
    doc.text(`Food: ${foodLabel}`, 50, termsY);
    termsY += 9;
  }
  if (
    tenantProfile?.servicesIncluded &&
    tenantProfile.servicesIncluded.length > 0
  ) {
    doc.text(
      `Services: ${tenantProfile.servicesIncluded.join(", ")}`,
      50,
      termsY,
      {
        width: 230,
      }
    );
    termsY += 9;
  }

  // Right column - Billing Terms
  termsY = yPos + 23;
  doc.font("Helvetica-Bold").fillColor(primaryColor).fontSize(9);
  doc.text("Billing Terms:", 300, termsY);
  doc.font("Helvetica").fillColor(textSecondary).fontSize(8);

  termsY += 10;
  const billingStart = new Date(rentPayment.billingPeriodStart);
  const billingEnd = new Date(rentPayment.billingPeriodEnd);
  doc.text(
    `Period: ${billingStart.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })} - ${billingEnd.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`,
    300,
    termsY,
    { width: 240 }
  );
  termsY += 9;

  doc.text(
    `Due Date: ${dueDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`,
    300,
    termsY
  );
  termsY += 9;

  if (moveInDate) {
    doc.text(
      `Move-in: ${moveInDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`,
      300,
      termsY
    );
    termsY += 9;
  }

  doc.text(
    `Grace Period: Till ${
      tenantProfile?.billingGraceLastDay || 5
    }th (no late fee)`,
    300,
    termsY
  );
  termsY += 9;

  doc.text(
    `Late Fee: Rs. ${tenantProfile?.lateFeePerDay || 50}/day after ${
      tenantProfile?.billingGraceLastDay || 5
    }th`,
    300,
    termsY
  );

  // ========== LINE ITEMS TABLE ==========
  yPos += 130;

  const tableStartY = yPos;
  const col1X = 40;
  const col2X = 380;
  const col3X = 420;
  const col4X = 480;

  // Header background
  doc.rect(col1X, tableStartY, 515, 28).fillColor(accentColor).fill();

  // Header text
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#ffffff")
    .text("Description", col1X + 10, tableStartY + 9)
    .text("Qty", col2X, tableStartY + 9, { width: 40, align: "center" })
    .text("Price", col3X, tableStartY + 9, { width: 60, align: "right" })
    .text("Total", col4X, tableStartY + 9, { width: 75, align: "right" });

  // Table rows
  let rowY = tableStartY + 28;
  let rowIndex = 0;

  const addLineItem = (description, quantity, price, total) => {
    if (rowIndex % 2 === 0) {
      doc.rect(col1X, rowY, 515, 30).fillColor(lightGray).fill();
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(primaryColor)
      .text(description, col1X + 10, rowY + 10, { width: 330 })
      .text(quantity, col2X, rowY + 10, { width: 40, align: "center" })
      .text(formatCurrency(price), col3X, rowY + 10, {
        width: 60,
        align: "right",
      })
      .text(formatCurrency(total), col4X, rowY + 10, {
        width: 75,
        align: "right",
      });

    rowY += 30;
    rowIndex++;
  };

  addLineItem(
    `Rent for ${periodLabel}${roomBedLabel ? ` – ${roomBedLabel}` : ""}`,
    "1",
    baseAmount,
    baseAmount
  );

  if (securityDeposit > 0) {
    addLineItem("Security Deposit", "1", securityDeposit, securityDeposit);
  }

  if (joiningFee > 0) {
    addLineItem("Joining Fee", "1", joiningFee, joiningFee);
  }

  if (otherCharges.length > 0) {
    otherCharges.forEach((charge, index) => {
      const amount = Number(charge.amount) || 0;
      if (amount > 0) {
        addLineItem(
          charge.description || `Other Charge ${index + 1}`,
          "1",
          amount,
          amount
        );
      }
    });
  }

  // Row: Late Fee (if applicable)
  if (lateFeeAmount > 0) {
    const graceEndDate = new Date(
      rentPayment.periodYear,
      rentPayment.periodMonth - 1,
      5
    );
    graceEndDate.setHours(23, 59, 59, 999);
    const paymentDate = rentPayment.paidAt
      ? new Date(rentPayment.paidAt)
      : new Date();
    const lateDays =
      paymentDate > graceEndDate
        ? Math.ceil((paymentDate - graceEndDate) / (1000 * 60 * 60 * 24))
        : 0;

    addLineItem(
      `Late Fee${lateDays > 0 ? ` (${lateDays} day(s))` : ""}`,
      lateDays > 0 ? lateDays.toString() : "1",
      lateFeeAmount,
      lateFeeAmount
    );
  }

  // Table bottom border
  doc
    .moveTo(col1X, rowY)
    .lineTo(col1X + 515, rowY)
    .strokeColor(borderColor)
    .lineWidth(1)
    .stroke();

  // ========== TOTALS SECTION ==========
  const totalsStartY = rowY + 15;
  const totalsBoxWidth = 200;
  const totalsBoxX = col4X - totalsBoxWidth + 75;

  // Subtotal (base amount only)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(textSecondary)
    .text("Subtotal:", totalsBoxX, totalsStartY, {
      width: 100,
      align: "right",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(primaryColor)
    .text(formatCurrency(baseAmount), col4X, totalsStartY, {
      width: 75,
      align: "right",
    });

  let totalsCurrentY = totalsStartY + 15;

  // Security Deposit (first month only)
  if (securityDeposit > 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(textSecondary)
      .text("Security Deposit:", totalsBoxX, totalsCurrentY, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(primaryColor)
      .text(formatCurrency(securityDeposit), col4X, totalsCurrentY, {
        width: 75,
        align: "right",
      });
    totalsCurrentY += 15;
  }

  // Joining Fee (first month only)
  if (joiningFee > 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(textSecondary)
      .text("Joining Fee:", totalsBoxX, totalsCurrentY, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(primaryColor)
      .text(formatCurrency(joiningFee), col4X, totalsCurrentY, {
        width: 75,
        align: "right",
      });
    totalsCurrentY += 15;
  }

  // Other Charges Total (first month only)
  if (otherChargesTotal > 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(textSecondary)
      .text("Other Charges:", totalsBoxX, totalsCurrentY, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(primaryColor)
      .text(formatCurrency(otherChargesTotal), col4X, totalsCurrentY, {
        width: 75,
        align: "right",
      });
    totalsCurrentY += 15;
  }

  // Late Fee
  if (lateFeeAmount > 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(textSecondary)
      .text("Late Fee:", totalsBoxX, totalsCurrentY, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(primaryColor)
      .text(formatCurrency(lateFeeAmount), col4X, totalsCurrentY, {
        width: 75,
        align: "right",
      });
    totalsCurrentY += 15;
  }

  // Tax
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(textSecondary)
    .text("Tax:", totalsBoxX, totalsCurrentY, {
      width: 100,
      align: "right",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(primaryColor)
    .text(formatCurrency(0), col4X, totalsCurrentY, {
      width: 75,
      align: "right",
    });

  // Total - Highlighted box
  const totalY = totalsCurrentY + 20;

  const totalBoxWidth = totalsBoxWidth + 85;
  doc
    .rect(totalsBoxX - 10, totalY - 5, totalBoxWidth, 32)
    .fillColor(accentColor)
    .fill();

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#ffffff")
    .text("Total:", totalsBoxX, totalY + 6, { width: 100, align: "right" });
  doc.text(formatCurrency(totalAmount), col4X, totalY + 6, {
    width: 75,
    align: "right",
  });

  // ========== PAYMENT DETAILS SECTION ==========
  let paymentY = totalY + 50;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(accentColor)
    .text("Payment Details", 40, paymentY);

  // Accent underline
  doc
    .moveTo(40, paymentY + 12)
    .lineTo(170, paymentY + 12)
    .lineWidth(2)
    .strokeColor(accentColor)
    .stroke();

  paymentY += 18;
  doc.font("Helvetica").fontSize(9).fillColor(primaryColor);

  doc.text("Paid Via: Razorpay", 40, paymentY);
  paymentY += 12;

  if (rentPayment.status === "PAID" && rentPayment.razorpayPaymentId) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(textSecondary)
      .text(
        `Razorpay Payment ID: ${rentPayment.razorpayPaymentId}`,
        40,
        paymentY
      );
    paymentY += 10;
  }

  doc.font("Helvetica").fontSize(9).fillColor(primaryColor);
  doc.text(`Payment Status: ${rentPayment.status}`, 40, paymentY);
  paymentY += 12;

  if (rentPayment.status === "PAID" && rentPayment.paidAt) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(textSecondary)
      .text(
        `Payment Date: ${billingDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        40,
        paymentY
      );
    paymentY += 10;
  } else if (rentPayment.status === "PENDING") {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#dc2626")
      .text(
        "⚠ Please complete payment by 5th to avoid late fees.",
        40,
        paymentY
      );
    paymentY += 10;
  }

  // ========== TERMS & CONDITIONS (SECOND PAGE) ==========
  doc.addPage();

  // Background band to keep branding consistent with site palette
  doc.rect(0, 0, doc.page.width, 120).fillColor(accentColor).fill();

  const termsTitleY = 48;
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor("#ffffff")
    .text("Terms & Conditions", 40, termsTitleY);

  doc
    .font("Helvetica")
    .fontSize(16)
    .fillColor("rgba(255,255,255,0.9)")
    .text("Payment Guidelines & Policy", 40, termsTitleY + 32);

  let termsPageY = termsTitleY + 80;

  const terms = [
    "Rent is due on the 1st of every month with a grace period until the 5th.",
    `A late fee of Rs. ${
      tenantProfile?.lateFeePerDay || 50
    } per day applies after the 5th until payment is received.`,
    "Digital payments must be completed through the tenant portal or Razorpay link shared over email/SMS.",
    "Please report any discrepancies within 48 hours of receiving this invoice.",
    "This invoice is system-generated and valid without signature.",
  ];

  if (securityDeposit > 0) {
    terms.splice(
      2,
      0,
      `${formatCurrency(
        securityDeposit
      )} security deposit will be adjusted against damages and refunded at checkout as per agreement.`
    );
  }

  if (otherChargesTotal > 0) {
    terms.splice(
      3,
      0,
      "Additional service charges reflect opt-in services such as food, laundry or maintenance add-ons selected by the tenant."
    );
  }

  doc.font("Helvetica").fontSize(14).fillColor(primaryColor);
  const termsWidth = doc.page.width - 80;

  terms.forEach((term) => {
    doc.text(`• ${term}`, 40, termsPageY, {
      width: termsWidth,
      lineGap: 6,
    });
    termsPageY += doc.heightOfString(`• ${term}`, {
      width: termsWidth,
      lineGap: 6,
    });
    termsPageY += 14;
  });

  // ========== SIGNATURE LINE ==========
  const signatureY = doc.page.height - 140;
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(accentColor)
    .text("Authorized Signatory", 40, signatureY);
  doc
    .font("Helvetica")
    .fontSize(14)
    .fillColor(primaryColor)
    .text("PG Owner / Landlord", 40, signatureY + 26);

  // ========== FOOTER ==========
  doc
    .fontSize(11)
    .fillColor(textSecondary)
    .text(
      "Keep this invoice for your records. Reach out to support@streamivus.com for billing assistance.",
      doc.page.width / 2,
      doc.page.height - 60,
      { align: "center" }
    );

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  // Return URL
  const publicUrl = `/api/invoices/${fileName}`;
  return publicUrl;
}
