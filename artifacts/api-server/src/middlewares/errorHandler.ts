// =============================================================================
// Global Error Handler Middleware
// Phải đặt CUỐI CÙNG trong app.use() chain (sau tất cả routes).
// Express 5 tự forward async errors, không cần next(err) thủ công.
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// Extend Error để hỗ trợ HTTP status code
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
    // Giữ stack trace đúng (ES5 target)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

// ─────────────────────────────────────────────
// Not Found handler — đặt TRƯỚC errorHandler
// ─────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
}

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // AppError: lỗi có chủ đích, biết HTTP status
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        { err, path: req.path, method: req.method },
        "[ErrorHandler] Server error",
      );
    } else {
      logger.warn(
        { statusCode: err.statusCode, message: err.message, path: req.path },
        "[ErrorHandler] Client error",
      );
    }

    res.status(err.statusCode).json({
      success: false,
      error: err.code ?? "ERROR",
      message: err.message,
    });
    return;
  }

  // Zod validation error (từ express middleware hoặc manual parse)
  if (err instanceof Error && err.name === "ZodError") {
    logger.warn({ err, path: req.path }, "[ErrorHandler] Validation error");
    res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      // @ts-expect-error ZodError has .issues
      details: (err as { issues: unknown[] }).issues,
    });
    return;
  }

  // SyntaxError từ JSON.parse (malformed JSON body)
  if (err instanceof SyntaxError && "status" in err) {
    res.status(400).json({
      success: false,
      error: "INVALID_JSON",
      message: "Invalid JSON in request body",
    });
    return;
  }

  // Unknown errors
  logger.error(
    { err, path: req.path, method: req.method },
    "[ErrorHandler] Unhandled error",
  );

  const isDev = process.env.NODE_ENV !== "production";

  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
}
