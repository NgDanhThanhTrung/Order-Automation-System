// =============================================================================
// Health Check Endpoint
// GET /api/healthz — Trả về 200 OK cho UptimeRobot / Render.com keep-alive
// =============================================================================

import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const startTime = Date.now();

  // Ping Supabase để xác nhận DB connection còn sống
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

  const totalLatencyMs = Date.now() - startTime;
  const overallStatus = dbStatus === "ok" ? "ok" : "degraded";

  const statusCode = overallStatus === "ok" ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    latencyMs: totalLatencyMs,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
    version: process.env["npm_package_version"] ?? "1.0.0",
  });
});

export default router;
