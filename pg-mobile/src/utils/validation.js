/**
 * Validation utilities for forms
 * Mirrors the web app validation logic
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

  // General email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  return { valid: true, error: null };
}

export function isValidGmail(email) {
  if (!email || email.trim() === "") {
    return false;
  }
  const gmailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_+-]){2,}@gmail\.com$/;
  return gmailRegex.test(email.trim().toLowerCase());
}

export function validatePhone(phone) {
  if (!phone || phone.trim() === "") {
    return { valid: false, error: "Phone number is required" };
  }

  const digitsOnly = phone.replace(/\D/g, "");

  let phoneNumber = digitsOnly;
  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    phoneNumber = digitsOnly.substring(2);
  } else if (digitsOnly.startsWith("91") && digitsOnly.length === 13) {
    phoneNumber = digitsOnly.substring(2);
  }

  if (phoneNumber.length !== 10) {
    return {
      valid: false,
      error: "Enter a valid 10-digit mobile number",
    };
  }

  const mobileRegex = /^[6-9][0-9]{9}$/;
  if (!mobileRegex.test(phoneNumber)) {
    return {
      valid: false,
      error: "Mobile number must start with 6, 7, 8, or 9",
    };
  }

  return { valid: true, error: null, cleaned: phoneNumber };
}

export function isValidMobile(phone) {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  const mobileRegex = /^[6-9][0-9]{9}$/;
  return mobileRegex.test(digitsOnly);
}

export function formatPhone(phone) {
  if (!phone) return "";

  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.startsWith("91") && digitsOnly.length >= 12) {
    const withoutCountryCode = digitsOnly.substring(2);
    if (withoutCountryCode.length === 10) {
      return `+91 ${withoutCountryCode.substring(
        0,
        5
      )} ${withoutCountryCode.substring(5)}`;
    }
  }

  if (digitsOnly.length === 10) {
    return `${digitsOnly.substring(0, 5)} ${digitsOnly.substring(5)}`;
  }

  return digitsOnly;
}

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

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
      strength: "weak",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
      strength: "weak",
    };
  }

  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
      strength: "weak",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error:
        "Password must contain at least one special character (!@#$%^&*...)",
      strength: "weak",
    };
  }

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

export function validateAadhar(aadhar) {
  if (!aadhar || aadhar.trim() === "") {
    return { valid: false, error: "Aadhaar number is required" };
  }

  const digitsOnly = aadhar.replace(/\D/g, "");

  if (digitsOnly.length !== 12) {
    return {
      valid: false,
      error: "Aadhaar number must be exactly 12 digits (1234 5678 9012)",
    };
  }

  if (!/^[0-9]{12}$/.test(digitsOnly)) {
    return {
      valid: false,
      error: "Aadhaar number must contain only digits",
    };
  }

  return { valid: true, error: null, cleaned: digitsOnly };
}

export function formatAadhar(aadhar) {
  if (!aadhar) return "";
  const digits = aadhar.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function isValidAadhaar(value) {
  if (!value) return false;
  const digits = value.replace(/\s/g, "");
  return /^[0-9]{12}$/.test(digits);
}

export function validatePAN(pan) {
  if (!pan || pan.trim() === "") {
    return { valid: false, error: "PAN number is required" };
  }

  const cleaned = pan.replace(/\s/g, "").toUpperCase();

  if (cleaned.length !== 10) {
    return {
      valid: false,
      error: "PAN number must be exactly 10 characters (e.g., ABCDE1234F)",
    };
  }

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

export function formatPAN(pan) {
  if (!pan) return "";
  return pan.replace(/\s/g, "").toUpperCase().slice(0, 10);
}

export function isValidPAN(value) {
  if (!value) return false;
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned);
}

export function validateDrivingLicense(dl) {
  if (!dl || dl.trim() === "") {
    return { valid: false, error: "Driving License number is required" };
  }

  const cleaned = dl.replace(/[\s-]/g, "").toUpperCase();

  if (cleaned.length < 10 || cleaned.length > 16) {
    return {
      valid: false,
      error: "Driving License number must be between 10-16 characters",
    };
  }

  if (!/^[A-Z0-9]{10,16}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Driving License must contain only letters and digits",
    };
  }

  return { valid: true, error: null, cleaned };
}

export function isValidDL(value) {
  if (!value) return false;
  const cleaned = value.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{10,16}$/.test(cleaned);
}

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

export function getPasswordGuidelines() {
  return "Password must be at least 8 characters long and contain:\n• At least one uppercase letter (A-Z)\n• At least one lowercase letter (a-z)\n• At least one number (0-9)\n• At least one special character (!@#$%^&*...)";
}

export function getEmailGuidelines(gmailOnly = false) {
  if (gmailOnly) {
    return "Enter a valid Gmail address (example@gmail.com)";
  }
  return "Please enter a valid email address (e.g., yourname@example.com)";
}

export function getPhoneGuidelines() {
  return "Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g., 9876543210)";
}

export function getAadharGuidelines() {
  return "Enter your 12-digit Aadhar number (e.g., 1234 5678 9012). Spaces will be added automatically.";
}

export function getPANGuidelines() {
  return "Enter your 10-character PAN number (e.g., ABCDE1234F). Format: 5 letters, 4 digits, 1 letter.";
}
