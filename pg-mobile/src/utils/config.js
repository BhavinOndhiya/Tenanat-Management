/**
 * Configuration file for environment variables
 * Mirrors the web app's environment variable usage
 */

const getApiBaseUrl = () => {
  const url =
    process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, "") ||
    "https://your-api-url.com/api";

  // Warn if using default placeholder URL
  if (url === "https://your-api-url.com/api") {
    console.error(
      "⚠️ [Config] API_BASE_URL is not configured! Using placeholder URL."
    );
    console.error(
      "⚠️ [Config] Please set EXPO_PUBLIC_BACKEND_BASE_URL in your .env file"
    );
    console.error(
      "⚠️ [Config] Example: EXPO_PUBLIC_BACKEND_BASE_URL=https://awy56hfhbi.execute-api.us-east-1.amazonaws.com/api"
    );
  } else {
    console.log(`[Config] API_BASE_URL configured: ${url}`);
  }

  return url;
};

export const config = {
  // Backend API Base URL
  API_BASE_URL: getApiBaseUrl(),

  // Razorpay Key ID (used in payment flows)
  RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",

  // Google OAuth Client ID (for Google Sign-In)
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",

  // Facebook App ID (for Facebook Sign-In)
  FACEBOOK_APP_ID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "",
};
