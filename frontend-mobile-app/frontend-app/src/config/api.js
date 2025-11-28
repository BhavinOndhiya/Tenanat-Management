/**
 * API Configuration
 *
 * This file centralizes API endpoint configuration.
 * Change the API_BASE_URL here to switch between environments.
 */

// Serverless (Production) API endpoint
const SERVERLESS_API_URL =
  "https://4rig7aawdl.execute-api.us-east-1.amazonaws.com/api";

// Local development API endpoint
const LOCAL_API_URL = "http://localhost:3000/api";

// Choose which API to use
// Set to true to use serverless, false to use localhost
const USE_SERVERLESS = true;

// Export the active API base URL
export const API_BASE_URL = USE_SERVERLESS
  ? SERVERLESS_API_URL
  : __DEV__
  ? LOCAL_API_URL
  : SERVERLESS_API_URL;

// Export individual URLs for reference
export const API_URLS = {
  SERVERLESS: SERVERLESS_API_URL,
  LOCAL: LOCAL_API_URL,
};

// Log which API is being used (only in development)
if (__DEV__) {
  console.log(`🌐 Using API: ${API_BASE_URL}`);
}
