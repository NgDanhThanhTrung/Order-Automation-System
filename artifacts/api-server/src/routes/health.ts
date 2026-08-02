// =============================================================================
// Health Check Endpoint
// GET /api/healthz — Comprehensive health check for monitoring
// Checks: Database, Cloudinary, Telegram Bot, Memory usage
// =============================================================================

import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { logger } from "../lib/logger.js";
import { getCloudinary } from "../lib/cloudinaryClient.js";
import { getTelegramBotSafe } from "../lib/telegramBot.js";
import { generateCsrfToken } from "../middlewares/csrfProtection.js";

const router: IRouter = Router();

interface ServiceHealth {
  status: "ok" | "error" | "degraded";
  latencyMs?: number;
  error?: string;
}

router.get("/healthz", async (_req, res) => {
  const startTime = Date.now();
  const services: Record<string, ServiceHealth> = {};

  // ── Database Health Check ────────────────────────────────────────────────
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = Date.now();
    const { error } = await getSupabaseClient()
      .from("products")
      .select("id")
      .limit(1)
      .maybeSingle();

    dbLatencyMs = Date.now() - dbStart;

    if (error) {
      dbStatus = "error";
      logger.warn({ error }, "[Health] DB ping failed");
    }
  } catch (err) {
    dbStatus = "error";
    logger.warn({ err }, "[Health] DB ping exception");
  }

  services.database = {
    status: dbStatus,
    latencyMs: dbLatencyMs ?? undefined,
  };

  // ── Cloudinary Health Check ──────────────────────────────────────────────
  let cloudinaryStatus: "ok" | "error" = "ok";
  let cloudinaryLatencyMs: number | null = null;

  try {
    const cloudStart = Date.now();
    // Simple API call to check Cloudinary connectivity
    const cloudinary = getCloudinary();
    await cloudinary.api.ping();
    cloudinaryLatencyMs = Date.now() - cloudStart;
  } catch (err) {
    cloudinaryStatus = "error";
    logger.warn({ err }, "[Health] Cloudinary ping failed");
  }

  services.cloudinary = {
    status: cloudinaryStatus,
    latencyMs: cloudinaryLatencyMs ?? undefined,
  };

  // ── Telegram Bot Health Check ───────────────────────────────────────────────
  let telegramStatus: "ok" | "error" = "ok";
  let telegramLatencyMs: number | null = null;

  try {
    const telegramStart = Date.now();
    const bot = getTelegramBotSafe();
    // Check if bot is initialized and can make API calls
    if (bot) {
      await bot.telegram.getMe();
      telegramLatencyMs = Date.now() - telegramStart;
    } else {
      telegramStatus = "error";
      logger.warn("[Health] Telegram bot not initialized");
    }
  } catch (err) {
    telegramStatus = "error";
    logger.warn({ err }, "[Health] Telegram bot ping failed");
  }

  services.telegram = {
    status: telegramStatus,
    latencyMs: telegramLatencyMs ?? undefined,
  };

  // ── Memory Usage Check ─────────────────────────────────────────────────────
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };

  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  let memoryStatus: "ok" | "degraded" = "ok";
  if (memoryUsagePercent > 90) {
    memoryStatus = "degraded";
    logger.warn({ memoryUsagePercent }, "[Health] High memory usage");
  }

  services.memory = {
    status: memoryStatus,
  };

  // ── Overall Status Calculation ─────────────────────────────────────────────
  const hasErrors = Object.values(services).some(s => s.status === "error");
  const hasDegraded = Object.values(services).some(s => s.status === "degraded");
  
  let overallStatus: "ok" | "degraded" | "error" = "ok";
  if (hasErrors) {
    overallStatus = "error";
  } else if (hasDegraded) {
    overallStatus = "degraded";
  }

  const totalLatencyMs = Date.now() - startTime;
  const statusCode = overallStatus === "ok" ? 200 : overallStatus === "degraded" ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    latencyMs: totalLatencyMs,
    services,
    memory: memoryUsageMB,
    version: process.env["npm_package_version"] ?? "1.0.0",
    environment: process.env["NODE_ENV"] ?? "development",
  });
});

// ── CSRF Token Endpoint ─────────────────────────────────────────────────────
router.get("/csrf-token", (_req, res) => {
  const token = generateCsrfToken();
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
});

// ── Detailed Health Check (includes more diagnostics) ───────────────────────
router.get("/healthz/detailed", async (_req, res) => {
  const startTime = Date.now();
  
  try {
    // Get detailed diagnostics
    const diagnostics = {
      process: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      environment: {
        nodeEnv: process.env["NODE_ENV"],
        port: process.env["PORT"],
        logLevel: process.env["LOG_LEVEL"],
      },
    };

    const totalLatencyMs = Date.now() - startTime;

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latencyMs: totalLatencyMs,
      diagnostics,
    });
  } catch (err) {
    logger.error({ err }, "[Health] Detailed health check failed");
    res.status(500).json({
      status: "error",
      message: "Failed to gather diagnostics",
    });
  }
});

export default router;
