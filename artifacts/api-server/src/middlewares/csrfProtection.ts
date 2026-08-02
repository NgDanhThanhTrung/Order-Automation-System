// =============================================================================
// CSRF Protection Middleware
// 
// Basic CSRF protection for state-changing operations
// Since this system uses token-based auth (not cookie-based sessions),
// CSRF is less critical but still provides defense in depth
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Simple CSRF check for state-changing operations
 * Verifies that requests have a custom header that attackers can't set
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for webhooks (they use API key auth)
  if (req.path.startsWith("/api/webhook")) {
    return next();
  }

  // Skip CSRF for GET requests (they're read-only)
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  // Skip CSRF for requests from same origin (basic check)
  const origin = req.headers["origin"];
  const host = req.headers["host"];
  
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost === host) {
      return next();
    }
  }

  // Check for custom CSRF header
  // Frontend should send: X-CSRF-Token: csrf-token
  const csrfToken = req.headers["x-csrf-token"];
  
  if (!csrfToken) {
    logger.warn(
      { ip: req.ip, path: req.path, method: req.method },
      "[CSRF] Missing CSRF token",
    );
    res.status(403).json({
      success: false,
      error: "CSRF_TOKEN_MISSING",
      message: "CSRF protection: missing X-CSRF-Token header",
    });
    return;
  }

  // Basic validation: token should not be empty
  if (typeof csrfToken !== "string" || csrfToken.trim().length === 0) {
    logger.warn(
      { ip: req.ip, path: req.path, method: req.method },
      "[CSRF] Invalid CSRF token",
    );
    res.status(403).json({
      success: false,
      error: "CSRF_TOKEN_INVALID",
      message: "CSRF protection: invalid X-CSRF-Token header",
    });
    return;
  }

  // In production, you'd validate this against a server-generated token
  // For this system, we use a simpler approach since we have other auth mechanisms
  // The token serves as a basic protection against simple CSRF attacks
  
  next();
}

/**
 * Generate CSRF token for the frontend
 */
export function generateCsrfToken(): string {
  // Simple random token generation
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}