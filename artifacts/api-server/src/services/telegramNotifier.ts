// =============================================================================
// Telegram Notifier Service — Gửi thông báo khi đơn hàng thanh toán thành công
//
// Gọi bởi webhook route qua setImmediate() (non-blocking).
// Gửi tới TẤT CẢ adminTelegramChatIds.
// Mỗi message có inline button "✅ Đã giao hàng" → callback ship:{orderId}
// =============================================================================

import { getConfig } from "../config/index.js";
import { getTelegramBot } from "../lib/telegramBot.js";
import { setOrderTelegramMessageId } from "./orderService.js";
import { logger } from "../lib/logger.js";

// ─────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────

export interface OrderPaidNotification {
  orderId: string;
  orderCode: string;
  totalAmount: number;
  amountReceived: number;
  customerName: string | null;
  customerEmail: string | null;
  telegramMessageId: number | null; // null = chưa từng gửi notification
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function buildNotificationText(n: OrderPaidNotification): string {
  const amountDiff = n.amountReceived - n.totalAmount;
  const amountNote =
    amountDiff === 0
      ? "✅ Khớp đúng"
      : amountDiff > 0
        ? `⚠️ Thừa ${formatVND(amountDiff)}`
        : `⚠️ Thiếu ${formatVND(Math.abs(amountDiff))}`;

  return (
    `💰 *THANH TOÁN MỚI* 💰\n\n` +
    `📦 Mã đơn: \`${n.orderCode}\`\n` +
    `💵 Cần thanh toán: *${formatVND(n.totalAmount)}*\n` +
    `💳 Nhận được: *${formatVND(n.amountReceived)}* — ${amountNote}\n` +
    (n.customerName  ? `👤 Khách hàng: ${n.customerName}\n`  : "") +
    (n.customerEmail ? `📧 Email: ${n.customerEmail}\n`       : "") +
    `\n🕐 ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
  );
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

/**
 * Gửi Telegram notification tới tất cả admin khi đơn được match.
 * Lưu telegram_message_id của admin đầu tiên vào order (để edit sau khi ship).
 * An toàn để gọi nhiều lần — duplicate sẽ bị catch và log.
 */
export async function notifyOrderPaid(notification: OrderPaidNotification): Promise<void> {
  const { adminTelegramChatIds } = getConfig();

  if (adminTelegramChatIds.size === 0) {
    logger.warn("[TelegramNotifier] No admin chat IDs configured — skipping notification");
    return;
  }

  let bot;
  try {
    bot = getTelegramBot();
  } catch {
    logger.warn("[TelegramNotifier] Bot not initialized — skipping notification");
    return;
  }

  const text = buildNotificationText(notification);
  const inlineKeyboard = {
    inline_keyboard: [[
      {
        text: "✅ Đã giao hàng",
        callback_data: `ship:${notification.orderId}`,
      },
    ]],
  };

  let firstMessageId: number | null = null;
  const chatIds = [...adminTelegramChatIds];

  for (const chatId of chatIds) {
    try {
      const sent = await bot.telegram.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: inlineKeyboard,
      });

      // Lưu message ID của admin đầu tiên để có thể edit sau khi ship
      if (firstMessageId === null) {
        firstMessageId = sent.message_id;
      }

      logger.info(
        { chatId, messageId: sent.message_id, orderId: notification.orderId },
        "[TelegramNotifier] Notification sent",
      );
    } catch (err) {
      logger.error(
        { err, chatId, orderId: notification.orderId },
        "[TelegramNotifier] Failed to send to chat",
      );
    }
  }

  // Lưu telegram_message_id vào orders (cho phép edit khi ship)
  if (firstMessageId !== null) {
    try {
      await setOrderTelegramMessageId(notification.orderId, firstMessageId);
    } catch (err) {
      // Non-fatal — notification đã gửi thành công, chỉ mất khả năng edit
      logger.error(
        { err, orderId: notification.orderId },
        "[TelegramNotifier] Failed to save telegram_message_id (non-fatal)",
      );
    }
  }
}
