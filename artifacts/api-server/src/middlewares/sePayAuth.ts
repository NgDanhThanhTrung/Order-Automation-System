// =============================================================================
// SePay Webhook Authentication Middleware
//
// SePay gửi webhook với header:
//   Authorization: Apikey <SEPAY_WEBHOOK_TOKEN>
//
// Middleware kiểm tra token trước khi cho phép xử lý webhook.
// Dùng timing-safe comparison để chống timing attack.
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { getConfig } from "../config/index.js";
import { logger } from "../lib/logger.js";

function timingSafeStringEqual(a: string, b: string): boolean {
  // Đảm bảo cùng độ dài trước khi so sánh (nếu khác độ dài → false luôn)
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return timingSafeEqual(bufA, bufB);
}

export function sePayAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    logger.warn(
      { ip: req.ip, path: req.path },
      "[SePayAuth] Missing Authorization header",
    );
    res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Missing Authorization header",
    });
    return;
  }

  // SePay gửi dạng: "Apikey <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "apikey") {
    logger.warn(
      { ip: req.ip, path: req.path, authHeader: authHeader.substring(0, 20) },
      "[SePayAuth] Invalid Authorization header format",
    );
    res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid Authorization header format. Expected: Apikey <token>",
    });
    return;
  }

  const providedToken = parts[1] ?? "";
  const expectedToken = getConfig().sePayWebhookToken;

  if (!timingSafeStringEqual(providedToken, expectedToken)) {
    logger.warn(
      { ip: req.ip, path: req.path },
      "[SePayAuth] Invalid webhook token",
    );
    res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid webhook token",
    });
    return;
  }

  next();
}
