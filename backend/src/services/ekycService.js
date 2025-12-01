/**
 * eKYC Service for Aadhaar Identity Verification
 * This service handles communication with Sandbox.co.in Aadhaar eKYC API
 * API Documentation: https://api.sandbox.co.in/kyc/aadhaar/okyc
 *
 * Authentication Flow:
 * 1. Call /authenticate endpoint with API Key and Secret to get access token
 * 2. Use access token (without Bearer prefix) in Authorization header for API calls
 * 3. Access token is valid for 24 hours
 */

// Cache for access token (with expiration)
let accessTokenCache = {
  token: null,
  expiresAt: null,
};

/**
 * Authenticate with Sandbox.co.in API and get access token
 * Access token is cached and reused until expiration (24 hours)
 * @returns {Promise<string>} - Access token
 */
async function getAccessToken() {
  const apiKey = process.env.EKYC_API_KEY;
  const apiSecret = process.env.EKYC_API_SECRET;
  const apiBaseUrl =
    process.env.EKYC_API_BASE_URL || "https://api.sandbox.co.in";
  const apiVersion = process.env.EKYC_API_VERSION || "2.0";

  if (!apiKey || !apiSecret) {
    throw new Error(
      "eKYC API credentials not configured. Please set EKYC_API_KEY and EKYC_API_SECRET environment variables."
    );
  }

  // Check if we have a valid cached token
  if (
    accessTokenCache.token &&
    accessTokenCache.expiresAt &&
    Date.now() < accessTokenCache.expiresAt
  ) {
    console.log("[eKYC Service] Using cached access token");
    return accessTokenCache.token;
  }

  try {
    console.log("[eKYC Service] Authenticating to get access token...");

    const response = await fetch(`${apiBaseUrl}/authenticate`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
        "x-api-version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {
          error: `Authentication failed with status ${response.status}`,
          message: response.statusText,
        };
      }

      console.error("[eKYC Service] Authentication error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });

      throw new Error(
        errorData.error ||
          errorData.message ||
          `Authentication failed: ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result || result.code !== 200 || !result.data?.access_token) {
      throw new Error(
        result.message || "Failed to get access token from authentication API"
      );
    }

    const accessToken = result.data.access_token;

    // Cache the token (valid for 24 hours, but we'll refresh after 23 hours to be safe)
    accessTokenCache = {
      token: accessToken,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23 hours in milliseconds
    };

    console.log("[eKYC Service] Access token obtained and cached");

    return accessToken;
  } catch (error) {
    console.error("[eKYC Service] Authentication error:", error);
    throw new Error(
      `Failed to authenticate with Sandbox.co.in API: ${error.message}`
    );
  }
}

/**
 * Send OTP to Aadhaar number for verification
 * @param {Object} params - OTP request parameters
 * @param {string} params.aadhaarNumber - 12-digit Aadhaar number
 * @param {string} params.reason - Reason for KYC verification
 * @returns {Promise<Object>} - OTP response with reference_id
 */
export async function sendAadhaarOtp(params) {
  const { aadhaarNumber, reason } = params;

  // Get API configuration
  const apiKey = process.env.EKYC_API_KEY;
  const apiBaseUrl =
    process.env.EKYC_API_BASE_URL || "https://api.sandbox.co.in";
  const apiVersion = process.env.EKYC_API_VERSION || "2.0";

  if (!apiKey) {
    throw new Error(
      "eKYC API credentials not configured. Please set EKYC_API_KEY and EKYC_API_SECRET environment variables."
    );
  }

  // Validate required parameters
  if (!aadhaarNumber) {
    throw new Error("Aadhaar number is required");
  }

  // Clean Aadhaar number (remove spaces and non-digits)
  const cleanedAadhaar = aadhaarNumber.replace(/\D/g, "");

  if (cleanedAadhaar.length !== 12) {
    throw new Error("Aadhaar number must be exactly 12 digits");
  }

  try {
    // Prepare request payload
    // Note: @entity must be exactly "in.co.sandbox.kyc.aadhaar.okyc.otp.request" for OTP request
    const payload = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
      aadhaar_number: cleanedAadhaar,
      consent: "Y",
      reason: reason || "KYC Verification",
    };

    // Log payload for debugging (without sensitive data)
    console.log("[eKYC Service] Send OTP payload:", {
      "@entity": payload["@entity"],
      aadhaar_number_length: payload.aadhaar_number?.length,
      consent: payload.consent,
      hasReason: !!payload.reason,
    });

    // Get access token (will authenticate if needed)
    const accessToken = await getAccessToken();

    // Log request details (without sensitive data) for debugging
    console.log("[eKYC Service] Sending OTP request:", {
      url: `${apiBaseUrl}/kyc/aadhaar/okyc/otp`,
      hasAccessToken: !!accessToken,
    });

    // Prepare headers
    // Note: Access token is used directly without Bearer prefix per Sandbox.co.in docs
    const headers = {
      Authorization: accessToken, // No Bearer prefix!
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-api-version": apiVersion,
    };

    // Make API request
    const response = await fetch(`${apiBaseUrl}/kyc/aadhaar/okyc/otp`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `API request failed with status ${response.status}`,
      }));
      throw new Error(
        errorData.error ||
          errorData.message ||
          `eKYC API error: ${response.statusText}`
      );
    }

    const result = await response.json();

    // Validate response structure
    if (!result || result.code !== 200) {
      throw new Error(result.message || "Failed to send OTP to Aadhaar number");
    }

    return {
      success: true,
      referenceId: result.data?.reference_id,
      transactionId: result.transaction_id,
      message: result.data?.message || "OTP sent successfully",
      rawResponse: result,
    };
  } catch (error) {
    console.error("[eKYC Service] Send OTP error:", error);

    // Re-throw with more context
    if (
      error.message.includes("eKYC API") ||
      error.message.includes("Failed to send OTP")
    ) {
      throw error;
    }

    throw new Error(`Failed to send OTP to Aadhaar number: ${error.message}`);
  }
}

/**
 * Verify OTP and get Aadhaar details
 * @param {Object} params - OTP verification parameters
 * @param {string} params.referenceId - Reference ID from OTP request
 * @param {string} params.otp - OTP received on Aadhaar registered mobile
 * @returns {Promise<Object>} - Verified Aadhaar details
 */
export async function verifyAadhaarOtp(params) {
  const { referenceId, otp } = params;

  // Get API configuration
  const apiKey = process.env.EKYC_API_KEY;
  const apiBaseUrl =
    process.env.EKYC_API_BASE_URL || "https://api.sandbox.co.in";
  const apiVersion = process.env.EKYC_API_VERSION || "2.0";

  if (!apiKey) {
    throw new Error(
      "eKYC API credentials not configured. Please set EKYC_API_KEY and EKYC_API_SECRET environment variables."
    );
  }

  // Validate required parameters
  if (!referenceId || !otp) {
    throw new Error("Reference ID and OTP are required");
  }

  try {
    // Prepare request payload
    // According to API v2.0 docs, verify endpoint uses "in.co.sandbox.kyc.aadhaar.okyc.request"
    const payload = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
      reference_id: String(referenceId),
      otp: String(otp),
    };

    // Log payload for debugging (without sensitive data)
    console.log("[eKYC Service] Verify OTP payload:", {
      "@entity": payload["@entity"],
      hasReferenceId: !!payload.reference_id,
      hasOtp: !!payload.otp,
      referenceIdLength: payload.reference_id?.length,
      otpLength: payload.otp?.length,
    });

    // Get access token (will authenticate if needed)
    const accessToken = await getAccessToken();

    // Prepare headers
    // Note: Access token is used directly without Bearer prefix per Sandbox.co.in docs
    const headers = {
      Authorization: accessToken, // No Bearer prefix!
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-api-version": apiVersion,
    };

    // Make API request
    const response = await fetch(`${apiBaseUrl}/kyc/aadhaar/okyc/otp/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {
          error: `API request failed with status ${response.status}`,
          message: response.statusText,
        };
      }

      // Log the full error for debugging
      console.error("[eKYC Service] API Error Response (Verify):", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });

      // Extract error message from various possible response formats
      const errorMessage =
        errorData.error ||
        errorData.message ||
        errorData.data?.message ||
        `eKYC API error: ${response.statusText}`;

      throw new Error(errorMessage);
    }

    const result = await response.json();

    // Validate response structure
    if (!result || result.code !== 200) {
      throw new Error(result.message || "Failed to verify OTP");
    }

    const data = result.data;

    // Check if verification was successful
    if (data.status !== "VALID") {
      throw new Error(data.message || "Aadhaar verification failed");
    }

    // Return standardized result
    return {
      success: true,
      verified: true,
      transactionId: result.transaction_id,
      referenceId: data.reference_id,
      status: data.status,
      message: data.message || "Aadhaar verification successful",
      // Verified Aadhaar details
      verifiedName: data.name,
      verifiedDob: data.date_of_birth,
      verifiedGender: data.gender,
      verifiedAddress: data.full_address,
      verifiedAddressDetails: data.address,
      careOf: data.care_of,
      yearOfBirth: data.year_of_birth,
      mobileHash: data.mobile_hash,
      emailHash: data.email_hash,
      photo: data.photo, // Base64 encoded photo
      shareCode: data.share_code,
      rawResponse: result, // Include raw response for debugging
    };
  } catch (error) {
    console.error("[eKYC Service] Verify OTP error:", error);

    // Re-throw with more context
    if (
      error.message.includes("eKYC API") ||
      error.message.includes("Failed to verify") ||
      error.message.includes("Aadhaar verification failed")
    ) {
      throw error;
    }

    throw new Error(`Aadhaar eKYC verification failed: ${error.message}`);
  }
}

/**
 * Complete Aadhaar verification flow (send OTP + verify OTP in one call)
 * This is a convenience method that combines both steps
 * @param {Object} params - Verification parameters
 * @param {string} params.aadhaarNumber - 12-digit Aadhaar number
 * @param {string} params.otp - OTP received on Aadhaar registered mobile
 * @param {string} params.reason - Reason for KYC verification
 * @returns {Promise<Object>} - Verification result
 */
export async function verifyAadhaarIdentity(params) {
  const { aadhaarNumber, otp, reason } = params;

  if (!aadhaarNumber || !otp) {
    throw new Error("Aadhaar number and OTP are required");
  }

  // Step 1: Send OTP (if referenceId not provided, we need to send OTP first)
  // Note: In a real flow, OTP should be sent first, then verified separately
  // This method assumes OTP was already sent and we're just verifying
  // For a complete flow, use sendAadhaarOtp() first, then verifyAadhaarOtp()

  throw new Error(
    "Please use sendAadhaarOtp() first to get referenceId, then use verifyAadhaarOtp() with the referenceId and OTP"
  );
}

/**
 * Clear the cached access token (useful for testing or forced refresh)
 */
export function clearAccessTokenCache() {
  accessTokenCache = {
    token: null,
    expiresAt: null,
  };
}

/**
 * Check if eKYC service is configured
 * @returns {boolean}
 */
export function isEkycConfigured() {
  return !!(process.env.EKYC_API_KEY && process.env.EKYC_API_SECRET);
}
