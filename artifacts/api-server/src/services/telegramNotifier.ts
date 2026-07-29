// =============================================================================
// Telegram Notifier Service — Stub cho Phase 4
//
// File này là "bridge" để webhook route có thể gọi ngay,
// Implementation đầy đủ sẽ được viết ở Phân đoạn 4 (Telegram Bot Engine).
// =============================================================================

import { logger } from "../lib/logger.js";

export interface OrderPaidNotification {
  orderId: string;
  orderCode: string;
  totalAmount: number;
  amountReceived: number;
  customerName: string | null;
  customerEmail: string | null;
  telegramMessageId: number | null;
}

/**
 * Gửi thông báo Telegram khi đơn hàng được thanh toán.
 * Stub — sẽ được implement đầy đủ ở Phân đoạn 4.
 */
export async function notifyOrderPaid(
  notification: OrderPaidNotification,
): Promise<void> {
  // Phase 4 sẽ replace nội dung hàm này bằng Telegraf bot calls.
  logger.info(
    {
      orderId: notification.orderId,
      orderCode: notification.orderCode,
      amountReceived: notification.amountReceived,
    },
    "[TelegramNotifier] Order paid — notification queued (stub, see Phase 4)",
  );
}
