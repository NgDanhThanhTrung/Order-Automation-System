// =============================================================================
// Rate Limiting Middleware
// 
// Protect API endpoints from abuse and DDoS attacks using express-rate-limit
// Different limits for different endpoint types
// =============================================================================

import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger.js";

// ─────────────────────────────────────────────
// General API rate limiter (for most endpoints)
// ─────────────────────────────────────────────
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path, method: req.method },
      "[RateLimiter] Rate limit exceeded",
    );
    res.status(429).json({
      success: false,
      error: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later",
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/api/healthz";
  },
});

// ─────────────────────────────────────────────
// Strict rate limiter for order creation (prevent abuse)
// ─────────────────────────────────────────────
export const orderCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 orders per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      "[RateLimiter] Order creation rate limit exceeded",
    );
    res.status(429).json({
      success: false,
      error: "TOO_MANY_ORDERS",
      message: "Too many order creation attempts. Please try again later.",
    });
  },
});

// ─────────────────────────────────────────────
// Strict rate limiter for webhook (prevent spam)
// ─────────────────────────────────────────────
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 webhooks per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      "[RateLimiter] Webhook rate limit exceeded",
    );
    res.status(429).json({
      success: false,
      error: "TOO_MANY_WEBHOOKS",
      message: "Webhook rate limit exceeded",
    });
  },
});

// ─────────────────────────────────────────────
// Lenient rate limiter for read operations (products, orders)
// ─────────────────────────────────────────────
export const readRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      "[RateLimiter] Read rate limit exceeded",
    );
    res.status(429).json({
      success: false,
      error: "TOO_MANY_REQUESTS",
      message: "Too many read requests, please try again later",
    });
  },
});

// ─────────────────────────────────────────────
// Admin rate limiter (more restrictive for admin operations)
// ─────────────────────────────────────────────
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      "[RateLimiter] Admin rate limit exceeded",
    );
    res.status(429).json({
      success: false,
      error: "TOO_MANY_ADMIN_REQUESTS",
      message: "Too many admin requests, please try again later",
    });
  },
});
