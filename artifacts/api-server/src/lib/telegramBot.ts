// =============================================================================
// Telegram Bot — Telegraf singleton + lifecycle helpers
//
// Dùng Long Polling (không cần webhook URL riêng) — phù hợp với Render.com.
// Tất cả bot logic (commands, callbacks, handlers) đăng ký vào instance này.
// =============================================================================

// Fix: Telegraf@4 + node-fetch@2 + Node.js 18+ AbortSignal incompatibility.
// node-fetch@2 checks `signal instanceof AbortSignal` using its own polyfill class,
// but Telegraf creates AbortController from the native Node.js global (different class).
// Overriding globalThis.AbortController with the polyfill makes both sides use the same class.
import { AbortController as PolyfillAbortController } from "abort-controller";
(globalThis as unknown as Record<string, unknown>).AbortController = PolyfillAbortController;

import { Telegraf, type Context } from "telegraf";
import { getConfig } from "../config/index.js";
import { logger } from "./logger.js";

// ─────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────

let _bot: Telegraf | null = null;

/**
 * Khởi tạo bot (chỉ gọi một lần khi bootstrap).
 * Không start polling — gọi startTelegramBot() sau khi đăng ký handlers.
 */
export function initTelegramBot(): Telegraf {
  if (_bot) return _bot;
  const { telegramBotToken } = getConfig();
  _bot = new Telegraf(telegramBotToken);
  logger.info("[TelegramBot] Instance created");
  return _bot;
}

/**
 * Lấy bot instance đã khởi tạo.
 * Throw nếu chưa gọi initTelegramBot().
 */
export function getTelegramBot(): Telegraf {
  if (!_bot) {
    throw new Error("[TelegramBot] Bot not initialized — call initTelegramBot() first");
  }
  return _bot;
}

/**
 * Lấy bot instance đã khởi tạo (return null nếu chưa init).
 * Dùng cho health check.
 */
export function getTelegramBotSafe(): Telegraf | null {
  return _bot;
}

/**
 * Bắt đầu Long Polling (non-blocking — chạy trong background).
 * Hàm này không await vòng lặp, chỉ log lỗi nếu crash.
 */
export function startTelegramBot(): void {
  const bot = getTelegramBot();

  bot.launch({ dropPendingUpdates: true }).catch((err: unknown) => {
    // Lỗi polling KHÔNG crash process — log để xem
    logger.error({ err }, "[TelegramBot] Polling crashed");
  });

  logger.info("[TelegramBot] Long polling started (dropPendingUpdates=true)");
}

/**
 * Dừng bot gracefully (gọi trong SIGTERM/SIGINT handler).
 */
export async function stopTelegramBot(): Promise<void> {
  if (!_bot) return;
  try {
    _bot.stop("SIGTERM");
    logger.info("[TelegramBot] Polling stopped");
  } catch (err) {
    logger.warn({ err }, "[TelegramBot] Error stopping bot (ignored)");
  }
}

// ─────────────────────────────────────────────
// Re-export Context type để các file khác dùng
// ─────────────────────────────────────────────
export type { Context };
