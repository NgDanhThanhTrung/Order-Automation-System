// =============================================================================
// Bot Admin Guard — Middleware Telegraf kiểm tra quyền admin
//
// Chỉ cho phép các Chat ID nằm trong ADMIN_TELEGRAM_CHAT_IDS thực thi lệnh.
// Áp dụng cho cả private DM và group (kiểm tra from.id).
// =============================================================================

import type { Context } from "telegraf";
import { getConfig } from "../config/index.js";
import { logger } from "../lib/logger.js";

/**
 * Telegraf middleware: cho phép tiếp tục nếu sender là admin.
 * Gọi ctx.reply() với thông báo lỗi nếu không phải admin — không next().
 */
export async function adminGuard(
  ctx: Context,
  next: () => Promise<void>,
): Promise<void> {
  const { adminTelegramChatIds } = getConfig();
  const fromId = ctx.from?.id;

  if (!fromId || !adminTelegramChatIds.has(fromId)) {
    logger.warn(
      { fromId, chatId: ctx.chat?.id },
      "[BotAdminGuard] Unauthorized access attempt",
    );
    await ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
    return;
  }

  return next();
}

/**
 * Helper: kiểm tra chat ID có phải admin không (dùng ngoài middleware).
 */
export function isAdminChatId(chatId: number): boolean {
  return getConfig().adminTelegramChatIds.has(chatId);
}
