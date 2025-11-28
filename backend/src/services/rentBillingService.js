/**
 * Rent Billing Service
 * Handles proration, late fee calculation, and billing period logic
 */

/**
 * Calculate first month rent (prorated if move-in is after 5th)
 * @param {Date} moveInDate - Tenant's move-in date
 * @param {number} monthlyRent - Full month rent amount
 * @returns {Object} { baseAmount, isProrated, daysStaying, daysInMonth }
 */
export function calculateFirstMonthRent(moveInDate, monthlyRent) {
  const joinDay = moveInDate.getDate();
  const year = moveInDate.getFullYear();
  const month = moveInDate.getMonth();

  // Get total days in the move-in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let baseAmount;
  let isProrated = false;
  let daysStaying = daysInMonth;

  if (joinDay >= 1 && joinDay <= 5) {
    // Full rent if move-in between 1st and 5th
    baseAmount = monthlyRent;
    daysStaying = daysInMonth;
  } else {
    // Prorated if move-in is 6th or later
    daysStaying = daysInMonth - joinDay + 1;
    baseAmount = Math.round((daysStaying / daysInMonth) * monthlyRent);
    isProrated = true;
  }

  return {
    baseAmount,
    isProrated,
    daysStaying,
    daysInMonth,
  };
}

/**
 * Calculate late fee based on payment date vs grace period
 * @param {Date} paymentDate - Date of payment (or today for pending)
 * @param {number} periodYear - Billing period year
 * @param {number} periodMonth - Billing period month (1-12)
 * @param {number} graceLastDay - Last day of grace period (default 5)
 * @param {number} lateFeePerDay - Late fee per day (default 50)
 * @returns {number} Late fee amount
 */
export function calculateLateFee(
  paymentDate,
  periodYear,
  periodMonth,
  graceLastDay = 5,
  lateFeePerDay = 50
) {
  // Grace period ends at end of day on graceLastDay
  const graceEndDate = new Date(periodYear, periodMonth - 1, graceLastDay);
  graceEndDate.setHours(23, 59, 59, 999);

  // If payment is before or on grace end date, no late fee
  if (paymentDate <= graceEndDate) {
    return 0;
  }

  // Calculate days late (rounded up)
  const diffTime = paymentDate - graceEndDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays * lateFeePerDay;
}

/**
 * Get billing period start and end dates for a given month/year
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Object} { start, end }
 */
export function getBillingPeriod(year, month) {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month, 0); // Last day of month
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get due date for a billing period (1st of the month)
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Date} Due date (1st of month)
 */
export function getDueDate(year, month) {
  const dueDate = new Date(year, month - 1, 1);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate;
}

/**
 * Create first month rent payment (with variable charges: security deposit, joining fee, other charges)
 * @param {Object} params
 * @param {Object} params.tenantId - Tenant user ID
 * @param {Object} params.ownerId - Owner user ID
 * @param {Object} params.propertyId - Property ID
 * @param {Date} params.moveInDate - Move-in date
 * @param {number} params.firstMonthAmount - Variable amount for first month (rent portion)
 * @param {number} params.securityDeposit - Security deposit (optional, default 0)
 * @param {number} params.joiningFee - Joining fee (optional, default 0)
 * @param {Array} params.otherCharges - Other optional charges [{description, amount}] (optional)
 * @param {number} params.billingDueDay - Due day (default 1)
 * @param {number} params.billingGraceLastDay - Grace last day (default 5)
 * @param {number} params.lateFeePerDay - Late fee per day (default 50)
 * @returns {Object} RentPayment data
 */
export function createFirstMonthPayment({
  tenantId,
  ownerId,
  propertyId,
  moveInDate,
  firstMonthAmount = 0,
  securityDeposit = 0,
  joiningFee = 0,
  otherCharges = [],
  billingDueDay = 1,
  billingGraceLastDay = 5,
  lateFeePerDay = 50,
}) {
  const year = moveInDate.getFullYear();
  const month = moveInDate.getMonth() + 1;
  const joinDay = moveInDate.getDate();

  // Base amount is the first month rent (variable amount entered by owner)
  const baseAmount = Number(firstMonthAmount) || 0;

  // Calculate total of other charges
  const otherChargesTotal = Array.isArray(otherCharges)
    ? otherCharges.reduce(
        (sum, charge) => sum + (Number(charge.amount) || 0),
        0
      )
    : 0;

  // Billing period: from move-in date to end of month
  const billingPeriodStart = new Date(moveInDate);
  billingPeriodStart.setHours(0, 0, 0, 0);

  const billingPeriodEnd = new Date(year, month, 0); // Last day of month
  billingPeriodEnd.setHours(23, 59, 59, 999);

  // Due date: For first month, use move-in date if after 1st, otherwise 1st
  let dueDate;
  if (joinDay >= 1 && joinDay <= 5) {
    // If move-in is 1-5, due date is 1st of that month
    dueDate = new Date(year, month - 1, billingDueDay);
  } else {
    // If move-in is 6th or later, due date is move-in date (immediate)
    dueDate = new Date(moveInDate);
  }
  dueDate.setHours(0, 0, 0, 0);

  // No late fee initially
  const lateFeeAmount = 0;

  // Total amount = baseAmount (first month rent) + securityDeposit + joiningFee + otherCharges + lateFee
  const totalAmount =
    baseAmount +
    Number(securityDeposit) +
    Number(joiningFee) +
    otherChargesTotal +
    lateFeeAmount;

  return {
    tenantId,
    ownerId,
    propertyId,
    periodMonth: month,
    periodYear: year,
    billingPeriodStart,
    billingPeriodEnd,
    dueDate,
    baseAmount,
    amount: totalAmount, // Total amount including all charges
    securityDeposit: Number(securityDeposit) || 0,
    joiningFee: Number(joiningFee) || 0,
    otherCharges: Array.isArray(otherCharges)
      ? otherCharges.filter((c) => c.description && c.amount)
      : [],
    lateFeeAmount,
    status: "PENDING",
    isFirstMonth: true,
    isProrated: false, // No longer using proration, owner enters exact amount
  };
}

/**
 * Create recurring monthly rent payment
 * @param {Object} params
 * @param {Object} params.tenantId - Tenant user ID
 * @param {Object} params.ownerId - Owner user ID
 * @param {Object} params.propertyId - Property ID
 * @param {number} params.month - Month (1-12)
 * @param {number} params.year - Year
 * @param {number} params.monthlyRent - Full month rent
 * @param {number} params.billingDueDay - Due day (default 1)
 * @param {number} params.billingGraceLastDay - Grace last day (default 5)
 * @param {number} params.lateFeePerDay - Late fee per day (default 50)
 * @param {Date} params.calculateLateFeeAsOf - Date to calculate late fee as of (default: today)
 * @returns {Object} RentPayment data
 */
export function createRecurringMonthPayment({
  tenantId,
  ownerId,
  propertyId,
  month,
  year,
  monthlyRent,
  billingDueDay = 1,
  billingGraceLastDay = 5,
  lateFeePerDay = 50,
  calculateLateFeeAsOf = new Date(),
}) {
  const { start: billingPeriodStart, end: billingPeriodEnd } = getBillingPeriod(
    year,
    month
  );
  const dueDate = getDueDate(year, month);

  // Base amount is always full rent for recurring months
  const baseAmount = monthlyRent;

  // Calculate late fee if payment is pending and past grace period
  const lateFeeAmount = calculateLateFee(
    calculateLateFeeAsOf,
    year,
    month,
    billingGraceLastDay,
    lateFeePerDay
  );

  const totalAmount = baseAmount + lateFeeAmount;

  return {
    tenantId,
    ownerId,
    propertyId,
    periodMonth: month,
    periodYear: year,
    billingPeriodStart,
    billingPeriodEnd,
    dueDate,
    baseAmount,
    amount: baseAmount, // For backward compatibility
    lateFeeAmount,
    status: "PENDING",
    isFirstMonth: false,
    isProrated: false,
  };
}
