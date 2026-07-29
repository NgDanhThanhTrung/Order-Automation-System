// =============================================================================
// Server Entry Point
// Khởi động: Cloudinary → Cron → HTTP server → Telegram Bot (Phase 4)
// Graceful shutdown khi nhận SIGTERM / SIGINT
// =============================================================================

import app from "./app.js";
import { logger } from "./lib/logger.js";
import { getConfig } from "./config/index.js";
import { initCloudinary } from "./lib/cloudinaryClient.js";
import { startAutoCancelCron, stopAutoCancelCron } from "./jobs/autoCancelCron.js";

// ─────────────────────────────────────────────
// Validate config TRƯỚC KHI làm bất cứ điều gì
// Throw rõ ràng nếu thiếu env var bắt buộc
// ─────────────────────────────────────────────
const config = getConfig();

// ─────────────────────────────────────────────
// Bootstrap services
// ─────────────────────────────────────────────

// 1. Cloudinary SDK
initCloudinary();
logger.info("[Bootstrap] Cloudinary initialized");

// 2. Auto-cancel cron job
startAutoCancelCron();

// ─────────────────────────────────────────────
// Start HTTP server
// ─────────────────────────────────────────────
const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "[Bootstrap] Server listening");
  logger.info("[Bootstrap] Available routes:");
  logger.info("  GET  /api/healthz");
  logger.info("  GET  /api/products");
  logger.info("  GET  /api/products/:id");
  logger.info("  POST /api/orders");
  logger.info("  GET  /api/orders/:id");
  logger.info("  POST /api/webhook/sepay");
  logger.info("  GET  /api/reports  (admin)");
  logger.info("  GET  /api/reports/orders  (admin)");
  logger.info("  GET  /api/reports/order/:orderId  (admin)");
});

server.on("error", (err) => {
  logger.error({ err }, "[Bootstrap] Server error");
  process.exit(1);
});

// ─────────────────────────────────────────────
// Graceful Shutdown
// Render.com gửi SIGTERM trước khi kill process
// ─────────────────────────────────────────────
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "[Shutdown] Graceful shutdown initiated");

  // 1. Dừng nhận request mới
  server.close(() => {
    logger.info("[Shutdown] HTTP server closed");
  });

  // 2. Dừng cron job
  stopAutoCancelCron();

  // 3. Phase 4: dừng Telegram bot polling (sẽ thêm sau)
  // await stopTelegramBot();

  // Cho 5 giây để requests đang xử lý hoàn thành
  await new Promise((resolve) => setTimeout(resolve, 5000));

  logger.info("[Shutdown] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Uncaught errors — log và exit (PM2/systemd sẽ restart)
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "[Process] Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "[Process] Unhandled promise rejection");
  process.exit(1);
});
