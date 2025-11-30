/**
 * Validation utilities for forms
 * Provides validation functions and formatting helpers
 */

/**
 * Validates email address (Gmail only for KYC)
 * @param {string} email - Email to validate
 * @param {boolean} gmailOnly - If true, only Gmail addresses are allowed
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateEmail(email, gmailOnly = false) {
  if (!email || email.trim() === "") {
    return { valid: false, error: "Email is required" };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Gmail-only validation for KYC
  if (gmailOnly) {
    const gmailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_+-]){2,}@gmail\.com$/;
    if (!gmailRegex.test(trimmedEmail)) {
      return {
        valid: false,
        error: "Enter a valid Gmail address (example@gmail.com)",
      };
    }
    return { valid: true, error: null };
  }

  // General email validation (for other forms)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
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

  const domain = trimmedEmail.split("@")[1]?.toLowerCase();
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
 * Validates Gmail address specifically
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function isValidGmail(email) {
  if (!email || email.trim() === "") {
    return false;
  }
  const gmailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_+-]){2,}@gmail\.com$/;
  return gmailRegex.test(email.trim().toLowerCase());
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

  // Indian phone number should be exactly 10 digits
  if (phoneNumber.length !== 10) {
    return {
      valid: false,
      error: "Enter a valid 10-digit mobile number",
    };
  }

  // Check if it starts with valid Indian mobile prefix (6, 7, 8, 9)
  const mobileRegex = /^[6-9][0-9]{9}$/;
  if (!mobileRegex.test(phoneNumber)) {
    return {
      valid: false,
      error: "Mobile number must start with 6, 7, 8, or 9",
    };
  }

  return { valid: true, error: null, cleaned: phoneNumber };
}

/**
 * Validates mobile number (strict Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - true if valid
 */
export function isValidMobile(phone) {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  const mobileRegex = /^[6-9][0-9]{9}$/;
  return mobileRegex.test(digitsOnly);
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
 * Validates Aadhaar number
 * @param {string} aadhar - Aadhaar number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validateAadhar(aadhar) {
  if (!aadhar || aadhar.trim() === "") {
    return { valid: false, error: "Aadhaar number is required" };
  }

  // Remove all spaces and non-digit characters
  const digitsOnly = aadhar.replace(/\D/g, "");

  // Aadhaar must be exactly 12 digits
  if (digitsOnly.length !== 12) {
    return {
      valid: false,
      error: "Aadhaar number must be exactly 12 digits (1234 5678 9012)",
    };
  }

  // Validate with regex
  if (!/^[0-9]{12}$/.test(digitsOnly)) {
    return {
      valid: false,
      error: "Aadhaar number must contain only digits",
    };
  }

  return { valid: true, error: null, cleaned: digitsOnly };
}

/**
 * Formats Aadhaar number for display (adds spaces after every 4 digits)
 * @param {string} aadhar - Aadhaar number to format
 * @returns {string} - Formatted Aadhaar number (1234 5678 9012)
 */
export function formatAadhar(aadhar) {
  if (!aadhar) return "";

  // Keep only digits
  const digits = aadhar.replace(/\D/g, "").slice(0, 12);

  // Group into 4-4-4
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/**
 * Validates Aadhaar number (exactly 12 digits)
 * @param {string} value - Aadhaar number to validate
 * @returns {boolean} - true if valid
 */
export function isValidAadhaar(value) {
  if (!value) return false;
  const digits = value.replace(/\s/g, "");
  return /^[0-9]{12}$/.test(digits);
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
 * Formats PAN number for display (uppercase, no spaces)
 * @param {string} pan - PAN number to format
 * @returns {string} - Formatted PAN number (uppercase, no spaces)
 */
export function formatPAN(pan) {
  if (!pan) return "";
  // Remove all spaces and convert to uppercase
  return pan.replace(/\s/g, "").toUpperCase().slice(0, 10);
}

/**
 * Validates PAN number (exactly 10 characters: AAAAA9999A)
 * @param {string} value - PAN number to validate
 * @returns {boolean} - true if valid
 */
export function isValidPAN(value) {
  if (!value) return false;
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned);
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

  const cleaned = dl.replace(/[\s-]/g, "").toUpperCase();

  // Indian DL format varies by state, 10-16 characters
  if (cleaned.length < 10 || cleaned.length > 16) {
    return {
      valid: false,
      error: "Driving License number must be between 10-16 characters",
    };
  }

  // Only letters and digits allowed
  if (!/^[A-Z0-9]{10,16}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Driving License must contain only letters and digits",
    };
  }

  return { valid: true, error: null, cleaned };
}

/**
 * Validates Driving License number (generic India format)
 * @param {string} value - Driving License number to validate
 * @returns {boolean} - true if valid
 */
export function isValidDL(value) {
  if (!value) return false;
  const cleaned = value.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{10,16}$/.test(cleaned);
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
 * @param {boolean} gmailOnly - If true, returns Gmail-specific guidelines
 * @returns {string} - Email guidelines
 */
export function getEmailGuidelines(gmailOnly = false) {
  if (gmailOnly) {
    return "Enter a valid Gmail address (example@gmail.com)";
  }
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
