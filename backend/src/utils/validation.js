/**
 * Backend validation utilities
 * Provides server-side validation functions matching frontend rules
 */

/**
 * Validates email address
 * @param {string} email - Email to validate
 * @param {boolean} gmailOnly - If true, only Gmail addresses are allowed
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateEmail(email, gmailOnly = false) {
  if (!email || typeof email !== "string" || email.trim() === "") {
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
    return { valid: true, error: null, cleaned: trimmedEmail };
  }

  // General email validation (for other forms)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  // Check email length
  if (trimmedEmail.length > 254) {
    return { valid: false, error: "Email address is too long" };
  }

  return { valid: true, error: null, cleaned: trimmedEmail };
}

/**
 * Validates phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== "string" || phone.trim() === "") {
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
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string" || password.trim() === "") {
    return {
      valid: false,
      error: "Password is required",
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password must be less than 128 characters",
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error:
        "Password must contain at least one special character (!@#$%^&*...)",
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates Aadhar number
 * @param {string} aadhar - Aadhar number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validateAadhar(aadhar) {
  if (!aadhar || typeof aadhar !== "string" || aadhar.trim() === "") {
    return { valid: false, error: "Aadhar number is required" };
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
 * Validates PAN number
 * @param {string} pan - PAN number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validatePAN(pan) {
  if (!pan || typeof pan !== "string" || pan.trim() === "") {
    return { valid: false, error: "PAN number is required" };
  }

  // Remove all spaces and convert to uppercase
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
 * Validates Driving License number
 * @param {string} dl - Driving License number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validateDrivingLicense(dl) {
  if (!dl || typeof dl !== "string" || dl.trim() === "") {
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
 * Validates Passport number
 * @param {string} passport - Passport number to validate
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validatePassport(passport) {
  if (!passport || typeof passport !== "string" || passport.trim() === "") {
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
 * @returns {object} - { valid: boolean, error: string, cleaned: string }
 */
export function validateVoterID(voterId) {
  if (!voterId || typeof voterId !== "string" || voterId.trim() === "") {
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
      if (
        !idNumber ||
        typeof idNumber !== "string" ||
        idNumber.trim().length < 5
      ) {
        return {
          valid: false,
          error: "ID number must be at least 5 characters",
        };
      }
      return { valid: true, error: null, cleaned: idNumber.trim() };
  }
}
