/**
 * Validation utilities for forms
 * Provides validation functions and formatting helpers
 */

/**
 * Validates email address
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateEmail(email) {
  if (!email || email.trim() === "") {
    return { valid: false, error: "Email is required" };
  }

  // Email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  // Check for common email providers
  const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
    "rediffmail.com",
    "mail.com",
    "aol.com",
    "live.com",
    "msn.com",
    "yandex.com",
    "zoho.com",
    "gmx.com",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && !allowedDomains.includes(domain)) {
    // Allow custom domains but warn
    const customDomainRegex =
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!customDomainRegex.test(domain)) {
      return { valid: false, error: "Please enter a valid email domain" };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validatePhone(phone) {
  if (!phone || phone.trim() === "") {
    return { valid: false, error: "Phone number is required" };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, "");

  // Check if it starts with +91 or 91 (country code)
  let phoneNumber = digitsOnly;
  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    phoneNumber = digitsOnly.substring(2);
  } else if (digitsOnly.startsWith("91") && digitsOnly.length === 13) {
    phoneNumber = digitsOnly.substring(2);
  }

  // Indian phone number should be 10 digits
  if (phoneNumber.length !== 10) {
    return {
      valid: false,
      error: "Phone number must be 10 digits (e.g., 9876543210)",
    };
  }

  // Check if it starts with valid Indian mobile prefix (6, 7, 8, 9)
  const firstDigit = phoneNumber[0];
  if (!["6", "7", "8", "9"].includes(firstDigit)) {
    return {
      valid: false,
      error: "Phone number must start with 6, 7, 8, or 9",
    };
  }

  return { valid: true, error: null, cleaned: phoneNumber };
}

/**
 * Formats phone number for display (adds spaces)
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return "";

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // Handle +91 prefix
  if (digitsOnly.startsWith("91") && digitsOnly.length >= 12) {
    const withoutCountryCode = digitsOnly.substring(2);
    if (withoutCountryCode.length === 10) {
      return `+91 ${withoutCountryCode.substring(
        0,
        5
      )} ${withoutCountryCode.substring(5)}`;
    }
  }

  // Format 10-digit number: XXXX XXXXX
  if (digitsOnly.length === 10) {
    return `${digitsOnly.substring(0, 5)} ${digitsOnly.substring(5)}`;
  }

  return digitsOnly;
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, error: string, strength: string }
 */
export function validatePassword(password) {
  if (!password || password.trim() === "") {
    return {
      valid: false,
      error: "Password is required",
      strength: "weak",
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
      strength: "weak",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password must be less than 128 characters",
      strength: "weak",
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
      strength: "weak",
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
      strength: "weak",
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
      strength: "weak",
    };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error:
        "Password must contain at least one special character (!@#$%^&*...)",
      strength: "weak",
    };
  }

  // Calculate strength
  let strength = "medium";
  if (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    strength = "strong";
  }

  return { valid: true, error: null, strength };
}

/**
 * Validates Aadhar number
 * @param {string} aadhar - Aadhar number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validateAadhar(aadhar) {
  if (!aadhar || aadhar.trim() === "") {
    return { valid: false, error: "Aadhar number is required" };
  }

  // Remove all spaces and non-digit characters
  const digitsOnly = aadhar.replace(/\D/g, "");

  // Aadhar must be exactly 12 digits
  if (digitsOnly.length !== 12) {
    return {
      valid: false,
      error: "Aadhar number must be exactly 12 digits",
    };
  }

  // Aadhar should not start with 0 or 1
  if (digitsOnly[0] === "0" || digitsOnly[0] === "1") {
    return {
      valid: false,
      error: "Aadhar number cannot start with 0 or 1",
    };
  }

  // Check for invalid patterns (all same digits)
  if (/^(\d)\1{11}$/.test(digitsOnly)) {
    return {
      valid: false,
      error: "Aadhar number cannot be all the same digit",
    };
  }

  return { valid: true, error: null, cleaned: digitsOnly };
}

/**
 * Formats Aadhar number for display (adds spaces after every 4 digits)
 * @param {string} aadhar - Aadhar number to format
 * @returns {string} - Formatted Aadhar number (XXXX XXXX XXXX)
 */
export function formatAadhar(aadhar) {
  if (!aadhar) return "";

  // Remove all non-digit characters
  const digitsOnly = aadhar.replace(/\D/g, "");

  // Limit to 12 digits
  const limited = digitsOnly.substring(0, 12);

  // Format as XXXX XXXX XXXX
  if (limited.length <= 4) {
    return limited;
  } else if (limited.length <= 8) {
    return `${limited.substring(0, 4)} ${limited.substring(4)}`;
  } else {
    return `${limited.substring(0, 4)} ${limited.substring(
      4,
      8
    )} ${limited.substring(8)}`;
  }
}

/**
 * Validates PAN number
 * @param {string} pan - PAN number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validatePAN(pan) {
  if (!pan || pan.trim() === "") {
    return { valid: false, error: "PAN number is required" };
  }

  // Remove all spaces
  const cleaned = pan.replace(/\s/g, "").toUpperCase();

  // PAN must be exactly 10 characters
  if (cleaned.length !== 10) {
    return {
      valid: false,
      error: "PAN number must be exactly 10 characters (e.g., ABCDE1234F)",
    };
  }

  // PAN format: 5 letters, 4 digits, 1 letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleaned)) {
    return {
      valid: false,
      error:
        "Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)",
    };
  }

  return { valid: true, error: null, cleaned };
}

/**
 * Formats PAN number for display (uppercase, adds space)
 * @param {string} pan - PAN number to format
 * @returns {string} - Formatted PAN number
 */
export function formatPAN(pan) {
  if (!pan) return "";

  // Remove all spaces and convert to uppercase
  const cleaned = pan.replace(/\s/g, "").toUpperCase();

  // Limit to 10 characters
  const limited = cleaned.substring(0, 10);

  // Format as ABCDE 1234 F
  if (limited.length <= 5) {
    return limited;
  } else if (limited.length <= 9) {
    return `${limited.substring(0, 5)} ${limited.substring(5)}`;
  } else {
    return `${limited.substring(0, 5)} ${limited.substring(
      5,
      9
    )} ${limited.substring(9)}`;
  }
}

/**
 * Validates Driving License number
 * @param {string} dl - Driving License number to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateDrivingLicense(dl) {
  if (!dl || dl.trim() === "") {
    return { valid: false, error: "Driving License number is required" };
  }

  const cleaned = dl.replace(/\s/g, "").toUpperCase();

  // Indian DL format varies by state, but generally 15-16 characters
  // Common format: XX-YYYYYYYYYY or similar
  if (cleaned.length < 10 || cleaned.length > 20) {
    return {
      valid: false,
      error: "Driving License number must be between 10-20 characters",
    };
  }

  return { valid: true, error: null, cleaned };
}

/**
 * Validates Passport number
 * @param {string} passport - Passport number to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validatePassport(passport) {
  if (!passport || passport.trim() === "") {
    return { valid: false, error: "Passport number is required" };
  }

  const cleaned = passport.replace(/\s/g, "").toUpperCase();

  // Indian passport format: A1234567 (1 letter + 7 digits) or similar
  if (cleaned.length < 6 || cleaned.length > 12) {
    return {
      valid: false,
      error: "Passport number must be between 6-12 characters",
    };
  }

  return { valid: true, error: null, cleaned };
}

/**
 * Validates Voter ID number
 * @param {string} voterId - Voter ID number to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateVoterID(voterId) {
  if (!voterId || voterId.trim() === "") {
    return { valid: false, error: "Voter ID number is required" };
  }

  const cleaned = voterId.replace(/\s/g, "").toUpperCase();

  // Voter ID format varies, but generally alphanumeric, 10-15 characters
  if (cleaned.length < 8 || cleaned.length > 15) {
    return {
      valid: false,
      error: "Voter ID number must be between 8-15 characters",
    };
  }

  return { valid: true, error: null, cleaned };
}

/**
 * Validates ID number based on ID type
 * @param {string} idType - Type of ID (AADHAAR, PAN, DL, etc.)
 * @param {string} idNumber - ID number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validateIDNumber(idType, idNumber) {
  if (!idType || !idNumber) {
    return { valid: false, error: "ID type and number are required" };
  }

  switch (idType.toUpperCase()) {
    case "AADHAAR":
      return validateAadhar(idNumber);
    case "PAN":
      return validatePAN(idNumber);
    case "DL":
      return validateDrivingLicense(idNumber);
    case "PASSPORT":
      return validatePassport(idNumber);
    case "VOTER_ID":
      return validateVoterID(idNumber);
    default:
      if (idNumber.trim().length < 5) {
        return {
          valid: false,
          error: "ID number must be at least 5 characters",
        };
      }
      return { valid: true, error: null, cleaned: idNumber.trim() };
  }
}

/**
 * Formats ID number based on ID type
 * @param {string} idType - Type of ID
 * @param {string} idNumber - ID number to format
 * @returns {string} - Formatted ID number
 */
export function formatIDNumber(idType, idNumber) {
  if (!idType || !idNumber) return idNumber || "";

  switch (idType.toUpperCase()) {
    case "AADHAAR":
      return formatAadhar(idNumber);
    case "PAN":
      return formatPAN(idNumber);
    default:
      return idNumber;
  }
}

/**
 * Gets password guidelines text
 * @returns {string} - Password guidelines
 */
export function getPasswordGuidelines() {
  return "Password must be at least 8 characters long and contain:\n• At least one uppercase letter (A-Z)\n• At least one lowercase letter (a-z)\n• At least one number (0-9)\n• At least one special character (!@#$%^&*...)";
}

/**
 * Gets email guidelines text
 * @returns {string} - Email guidelines
 */
export function getEmailGuidelines() {
  return "Please enter a valid email address (e.g., yourname@example.com)";
}

/**
 * Gets phone guidelines text
 * @returns {string} - Phone guidelines
 */
export function getPhoneGuidelines() {
  return "Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g., 9876543210)";
}

/**
 * Gets Aadhar guidelines text
 * @returns {string} - Aadhar guidelines
 */
export function getAadharGuidelines() {
  return "Enter your 12-digit Aadhar number (e.g., 1234 5678 9012). Spaces will be added automatically.";
}

/**
 * Gets PAN guidelines text
 * @returns {string} - PAN guidelines
 */
export function getPANGuidelines() {
  return "Enter your 10-character PAN number (e.g., ABCDE1234F). Format: 5 letters, 4 digits, 1 letter.";
}
