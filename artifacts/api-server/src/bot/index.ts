// =============================================================================
// Bot Bootstrap — Đăng ký tất cả handlers rồi start polling
//
// Thứ tự quan trọng:
//   1. initTelegramBot()   — tạo Telegraf instance
//   2. registerBotCommands() — đăng ký /commands + callbacks
//   3. registerPhotoHandler() — đăng ký photo upload handler
//   4. startTelegramBot()  — bắt đầu long polling
// =============================================================================

export { initTelegramBot, startTelegramBot, stopTelegramBot } from "../lib/telegramBot.js";
export { registerBotCommands } from "./commands.js";
export { registerPhotoHandler } from "./photoHandler.js";

import { initTelegramBot, startTelegramBot } from "../lib/telegramBot.js";
import { registerBotCommands } from "./commands.js";
import { registerPhotoHandler } from "./photoHandler.js";
import { logger } from "../lib/logger.js";

/**
 * Khởi tạo và start bot trong một lệnh duy nhất.
 * Gọi trong index.ts sau khi HTTP server đã listen.
 */
export function bootstrapTelegramBot(): void {
  initTelegramBot();
  registerBotCommands();
  registerPhotoHandler();
  startTelegramBot();
  logger.info("[Bootstrap] Telegram bot started");
}
