// =============================================================================
// Auto-Cancel Cron Job
//
// Mỗi phút (configurable), gọi Supabase RPC `auto_cancel_expired_orders()`
// để tự động hủy các đơn pending đã quá 20 phút mà không thanh toán.
//
// Thiết kế:
//   - Gọi RPC thay vì UPDATE trực tiếp → logic cancel nằm trong DB
//   - Dùng setTimout wrapper để tránh concurrent runs nếu query chậm
//   - Graceful shutdown khi process nhận SIGTERM
// =============================================================================

import cron from "node-cron";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { getConfig } from "../config/index.js";
import { logger } from "../lib/logger.js";

let _cronTask: cron.ScheduledTask | null = null;
let _isRunning = false; // Mutex: tránh concurrent execution

/**
 * Thực thi auto-cancel một lần (tái sử dụng trong unit tests hoặc manual trigger)
 */
export async function runAutoCancelOnce(): Promise<number> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("auto_cancel_expired_orders");

  if (error) {
    logger.error({ err: error }, "[AutoCancel] RPC error");
    throw error;
  }

  const cancelledCount = (data as number) ?? 0;

  if (cancelledCount > 0) {
    logger.info(
      { cancelledCount },
      `[AutoCancel] Auto-cancelled ${cancelledCount} expired order(s)`,
    );
  }

  return cancelledCount;
}

/**
 * Khởi động cron job.
 * Gọi một lần khi server start.
 */
export function startAutoCancelCron(): void {
  const config = getConfig();

  if (!config.cronEnabled) {
    logger.info("[AutoCancel] Cron disabled (CRON_ENABLED=false)");
    return;
  }

  if (_cronTask) {
    logger.warn("[AutoCancel] Cron already started, skipping");
    return;
  }

  // Validate cron expression trước khi schedule
  if (!cron.validate(config.cronAutoCancelExpr)) {
    logger.error(
      { expr: config.cronAutoCancelExpr },
      "[AutoCancel] Invalid cron expression — cron not started",
    );
    return;
  }

  _cronTask = cron.schedule(
    config.cronAutoCancelExpr,
    async () => {
      // Mutex: bỏ qua tick nếu lần trước chưa xong (DB chậm, backpressure)
      if (_isRunning) {
        logger.warn("[AutoCancel] Previous run still in progress, skipping tick");
        return;
      }

      _isRunning = true;
      const startMs = Date.now();

      try {
        await runAutoCancelOnce();
      } catch (err) {
        logger.error({ err }, "[AutoCancel] Cron tick error");
      } finally {
        _isRunning = false;
        const elapsed = Date.now() - startMs;

        if (elapsed > 5000) {
          logger.warn(
            { elapsedMs: elapsed },
            "[AutoCancel] Cron tick took unusually long",
          );
        }
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Ho_Chi_Minh", // UTC+7
    },
  );

  logger.info(
    { expr: config.cronAutoCancelExpr },
    "[AutoCancel] Cron job started",
  );
}

/**
 * Dừng cron job (graceful shutdown)
 */
export function stopAutoCancelCron(): void {
  if (_cronTask) {
    _cronTask.stop();
    _cronTask = null;
    logger.info("[AutoCancel] Cron job stopped");
  }
}
