// =============================================================================
// API Documentation Route
// Serves Swagger UI for interactive API documentation
// =============================================================================

import { Router, type IRouter } from "express";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const router: IRouter = Router();

// Load Swagger JSON file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerJsonPath = path.join(__dirname, "../swagger.json");

let swaggerDocument: any;
try {
  const jsonContent = readFileSync(swaggerJsonPath, "utf8");
  swaggerDocument = JSON.parse(jsonContent);
} catch (error) {
  console.error("Failed to load swagger.json:", error);
  swaggerDocument = {
    openapi: "3.0.3",
    info: {
      title: "Order Automation System API",
      version: "1.0.0",
    },
    paths: {},
  };
}

// Serve Swagger UI
router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: "Order Automation System API Documentation",
  customCss: ".swagger-ui .topbar { display: none }",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "none",
    filter: true,
    showRequestDuration: true,
  },
}));

export default router;