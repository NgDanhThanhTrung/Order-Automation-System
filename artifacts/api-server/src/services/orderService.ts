// =============================================================================
// Order Service — Business logic tái sử dụng cho orders
// Tập trung tất cả DB queries liên quan đến orders vào một nơi.
// =============================================================================

import { getSupabaseClient } from "../lib/supabaseClient.js";
import { logger } from "../lib/logger.js";
import type { Order, OrderDetail, Product } from "../types/index.js";

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

/**
 * Lấy đơn hàng theo ID (join đầy đủ từ view v_orders_detail)
 */
export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("v_orders_detail")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, orderId }, "[OrderService] getOrderById error");
    throw error;
  }

  return data as OrderDetail | null;
}

/**
 * Lấy đơn hàng raw (bảng orders, không join) theo ID
 */
export async function getRawOrderById(orderId: string): Promise<Order | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, orderId }, "[OrderService] getRawOrderById error");
    throw error;
  }

  return data as Order | null;
}

/**
 * Lấy đơn hàng raw theo order_code
 */
export async function getOrderByCode(orderCode: string): Promise<Order | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_code", orderCode)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, orderCode }, "[OrderService] getOrderByCode error");
    throw error;
  }

  return data as Order | null;
}

/**
 * Lấy sản phẩm theo ID (kèm kiểm tra is_active)
 */
export async function getActiveProduct(
  productId: string,
): Promise<Pick<Product, "id" | "name" | "price" | "image_url" | "stock_quantity"> | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, image_url, stock_quantity")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, productId }, "[OrderService] getActiveProduct error");
    throw error;
  }

  return data as Pick<Product, "id" | "name" | "price" | "image_url" | "stock_quantity"> | null;
}

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

/**
 * Cập nhật Telegram message ID sau khi bot gửi notification
 * (dùng để editMessageReplyMarkup khi đơn shipped)
 */
export async function setOrderTelegramMessageId(
  orderId: string,
  telegramMessageId: number,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({ telegram_message_id: telegramMessageId })
    .eq("id", orderId);

  if (error) {
    logger.error(
      { err: error, orderId, telegramMessageId },
      "[OrderService] setOrderTelegramMessageId error",
    );
    throw error;
  }
}

/**
 * Đánh dấu đơn đã giao
 */
export async function markOrderShipped(orderId: string): Promise<Order | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      shipped_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "paid") // Chỉ ship được đơn đang ở trạng thái paid
    .select()
    .maybeSingle();

  if (error) {
    logger.error({ err: error, orderId }, "[OrderService] markOrderShipped error");
    throw error;
  }

  if (data) {
    logger.info({ orderId }, "[OrderService] Order marked as shipped");
  }

  return data as Order | null;
}

/**
 * Hủy đơn hàng (thủ công hoặc auto-cancel)
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<Order | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending") // Chỉ hủy đơn pending
    .select()
    .maybeSingle();

  if (error) {
    logger.error({ err: error, orderId, reason }, "[OrderService] cancelOrder error");
    throw error;
  }

  if (data) {
    logger.info({ orderId, reason }, "[OrderService] Order cancelled");
  }

  return data as Order | null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Sinh order_code duy nhất dạng: ORD + timestamp_base36 + random 4 ký tự
 * Ví dụ: ORDLKZM4A8X2
 */
export function generateOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${ts}${rand}`;
}

/**
 * Sinh VietQR URL (img.vietqr.io — không cần thư viện, không cần Canvas)
 * Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png
 *         ?amount={AMOUNT}&addInfo={ORDER_CODE}&accountName={NAME}
 */
export function buildVietQrUrl(params: {
  bankId: string;
  accountNo: string;
  amount: number;
  orderCode: string;
  accountName: string;
}): string {
  const { bankId, accountNo, amount, orderCode, accountName } = params;
  const encodedContent = encodeURIComponent(orderCode);
  const encodedName = encodeURIComponent(accountName);
  return (
    `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png` +
    `?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`
  );
}
