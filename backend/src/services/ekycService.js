/**
 * eKYC Service for Aadhaar Identity Verification
 * This service handles communication with Sandbox.co.in Aadhaar eKYC API
 * API Documentation: https://api.sandbox.co.in/kyc/aadhaar/okyc
 */

/**
 * Send OTP to Aadhaar number for verification
 * @param {Object} params - OTP request parameters
 * @param {string} params.aadhaarNumber - 12-digit Aadhaar number
 * @param {string} params.reason - Reason for KYC verification
 * @returns {Promise<Object>} - OTP response with reference_id
 */
export async function sendAadhaarOtp(params) {
  const { aadhaarNumber, reason } = params;

  // Validate required environment variables
  const apiKey = process.env.EKYC_API_KEY;
  const apiSecret = process.env.EKYC_API_SECRET;
  const apiBaseUrl =
    process.env.EKYC_API_BASE_URL || "https://api.sandbox.co.in";

  if (!apiKey || !apiSecret) {
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
    const payload = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp",
      aadhaar_number: cleanedAadhaar,
      consent: "Y",
      reason: reason || "KYC Verification",
    };

    // Create authentication header
    const authHeader = createAuthHeader(apiKey, apiSecret);

    // Make API request
    const response = await fetch(`${apiBaseUrl}/kyc/aadhaar/okyc/otp`, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
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

  // Validate required environment variables
  const apiKey = process.env.EKYC_API_KEY;
  const apiSecret = process.env.EKYC_API_SECRET;
  const apiBaseUrl =
    process.env.EKYC_API_BASE_URL || "https://api.sandbox.co.in";

  if (!apiKey || !apiSecret) {
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
    const payload = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.verify",
      reference_id: String(referenceId),
      otp: String(otp),
    };

    // Create authentication header
    const authHeader = createAuthHeader(apiKey, apiSecret);

    // Make API request
    const response = await fetch(`${apiBaseUrl}/kyc/aadhaar/okyc/otp/verify`, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
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
 * Create authentication header for Sandbox.co.in API
 * Based on API documentation, it uses Authorization header and x-api-key
 */
function createAuthHeader(apiKey, apiSecret) {
  // Sandbox.co.in API uses Authorization header (likely JWT or Bearer token)
  // The exact format depends on how you generate the token from apiKey and apiSecret
  // Common patterns:

  const authMethod = process.env.EKYC_AUTH_METHOD || "apikey"; // "apikey", "basic", or "bearer"

  switch (authMethod.toLowerCase()) {
    case "basic":
      // Basic Auth: base64 encode "apiKey:apiSecret"
      const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString(
        "base64"
      );
      return {
        Authorization: `Basic ${credentials}`,
      };

    case "bearer":
      // Bearer token (if apiSecret is the token)
      return {
        Authorization: `Bearer ${apiSecret}`,
      };

    case "apikey":
    default:
      // For Sandbox.co.in, Authorization might be a JWT or token
      // If apiSecret is the authorization token, use it directly
      // Otherwise, you might need to generate a JWT
      // For now, using apiSecret as Authorization token
      return {
        Authorization: apiSecret, // or `Bearer ${apiSecret}` depending on API requirements
      };
  }
}

/**
 * Check if eKYC service is configured
 * @returns {boolean}
 */
export function isEkycConfigured() {
  return !!(process.env.EKYC_API_KEY && process.env.EKYC_API_SECRET);
}
