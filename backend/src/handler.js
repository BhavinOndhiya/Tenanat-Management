import serverless from "serverless-http";
import app from "./app.js";

// Helper function to check if request is OPTIONS
const isOptionsRequest = (event) => {
  // Check HTTP API v2 format
  if (event.requestContext?.http?.method) {
    return event.requestContext.http.method.toUpperCase() === "OPTIONS";
  }
  // Check REST API format
  if (event.requestContext?.httpMethod) {
    return event.requestContext.httpMethod.toUpperCase() === "OPTIONS";
  }
  // Check direct method property
  if (event.httpMethod) {
    return event.httpMethod.toUpperCase() === "OPTIONS";
  }
  // Check routeKey (HTTP API v2)
  if (event.requestContext?.routeKey) {
    return event.requestContext.routeKey.toUpperCase().startsWith("OPTIONS");
  }
  return false;
};

// Create serverless handler once (reused across invocations)
const serverlessHandler = serverless(app, {
  binary: ["image/*", "application/pdf", "application/octet-stream"],
  request: (request, event, context) => {
    // Add any request modifications here if needed
    request.context = event.requestContext;
  },
});

// Export the serverless-wrapped Express app
// Database connection is now handled by Express middleware (dbConnection.js)
export const handler = async (event, context) => {
  // Handle OPTIONS requests FIRST - before anything else
  // This must happen before serverless-http processes the event
  if (isOptionsRequest(event)) {
    console.log("[Handler] OPTIONS request detected, returning CORS headers");
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  try {
    // For all other requests, use the serverless-http wrapper
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error("[Handler] Error processing request:", error);
    console.error("[Handler] Error stack:", error.stack);

    // Even on error, return CORS headers
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Accept, Origin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
