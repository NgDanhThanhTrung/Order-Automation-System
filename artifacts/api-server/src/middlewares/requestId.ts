// =============================================================================
// Request ID Tracking Middleware
// 
// Generates unique request IDs for tracing and debugging
// Adds X-Request-ID header to all responses
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Generate or retrieve request ID from headers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request ID is already provided by client
  const existingRequestId = req.headers["x-request-id"] as string | undefined;
  
  // Generate new ID if not provided
  const requestId = existingRequestId || randomUUID();
  
  // Attach to request object for use in handlers
  (req as Request & { requestId: string }).requestId = requestId;
  
  // Add to response headers
  res.setHeader("X-Request-ID", requestId);
  
  next();
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string {
  return (req as Request & { requestId?: string }).requestId || "unknown";
}