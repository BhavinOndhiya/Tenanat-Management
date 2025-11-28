import serverless from "serverless-http";
import app from "./app.js";

// Export the serverless-wrapped Express app
// Database connection is now handled by Express middleware (dbConnection.js)
export const handler = serverless(app, {
  binary: ["image/*", "application/pdf", "application/octet-stream"],
  request: (request, event, context) => {
    // Add any request modifications here if needed
    request.context = event.requestContext;
  },
});
