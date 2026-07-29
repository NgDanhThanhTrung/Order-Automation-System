// =============================================================================
// Telegram Admin Authentication Middleware
//
// Kiểm tra xem Telegram Chat ID trong request có nằm trong danh sách
// ADMIN_TELEGRAM_CHAT_IDS không. Dùng cho các endpoint admin-only.
//
// Frontend/client phải gửi header:
//   X-Telegram-Chat-Id: <chat_id>
//
// LƯU Ý: Middleware này dành cho API endpoint quản trị.
//   Với Telegram Bot callback queries, dùng hàm isAdmin() riêng.
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { getConfig } from "../config/index.js";
import { logger } from "../lib/logger.js";

export function telegramAdminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const rawChatId = req.headers["x-telegram-chat-id"];

  if (!rawChatId || typeof rawChatId !== "string") {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Missing X-Telegram-Chat-Id header",
    });
    return;
  }

  const chatId = parseInt(rawChatId, 10);

  if (isNaN(chatId)) {
    res.status(400).json({
      success: false,
      error: "Bad Request",
      message: "Invalid X-Telegram-Chat-Id header: must be a number",
    });
    return;
  }

  const { adminTelegramChatIds } = getConfig();

  if (!adminTelegramChatIds.has(chatId)) {
    logger.warn(
      { chatId, path: req.path, ip: req.ip },
      "[TelegramAdminAuth] Unauthorized access attempt",
    );
    res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "This action requires admin privileges",
    });
    return;
  }

  // Đính kèm chatId vào request để controller dùng
  (req as Request & { adminChatId: number }).adminChatId = chatId;

  next();
}

// ─────────────────────────────────────────────
// Helper: kiểm tra admin trong Telegram Bot context
// Dùng trong callback query handlers của Telegraf
// ─────────────────────────────────────────────
export function isAdminChatId(chatId: number): boolean {
  return getConfig().adminTelegramChatIds.has(chatId);
}
