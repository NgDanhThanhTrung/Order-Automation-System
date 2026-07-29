// =============================================================================
// Orders Routes
// POST /api/orders        — Tạo đơn hàng mới
// GET  /api/orders/:id    — Lấy chi tiết đơn hàng (polling từ frontend)
// PATCH /api/orders/:id/ship — Admin đánh dấu đã giao (protected)
// =============================================================================

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import { telegramAdminAuthMiddleware } from "../middlewares/telegramAdminAuth.js";
import { NotFoundError, ValidationError } from "../middlewares/errorHandler.js";
import { getConfig } from "../config/index.js";
import { logger } from "../lib/logger.js";
import type {
  ApiResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  Order,
  OrderDetail,
  Product,
} from "../types/index.js";

const router: IRouter = Router();

// ─────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────

const createOrderSchema = z.object({
  product_id: z.string().uuid("product_id phải là UUID hợp lệ"),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(100),
  customer_name: z.string().min(1).max(255).optional(),
  customer_email: z.string().email("Email không hợp lệ").optional(),
  customer_phone: z
    .string()
    .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ")
    .optional(),
  customer_note: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Sinh order_code duy nhất dạng: ORD + timestamp_base36 + random 4 ký tự
 * Ví dụ: ORDLKZM4A8X2
 */
function generateOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${ts}${rand}`;
}

/**
 * Sinh VietQR URL dạng img.vietqr.io
 * Không cần thư viện, không cần Canvas — pure URL template.
 */
function buildVietQrUrl(params: {
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

// ─────────────────────────────────────────────
// POST /api/orders
// ─────────────────────────────────────────────
router.post(
  "/",
  validateRequest(createOrderSchema),
  async (req: Request, res: Response) => {
    const body = req.body as CreateOrderRequest;
    const supabase = getSupabaseClient();
    const config = getConfig();

    // 1. Lấy thông tin sản phẩm
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, image_url, stock_quantity, is_active")
      .eq("id", body.product_id)
      .eq("is_active", true)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) throw new NotFoundError("Product");

    const typedProduct = product as Pick<
      Product,
      "id" | "name" | "price" | "image_url" | "stock_quantity" | "is_active"
    >;

    // 2. Kiểm tra tồn kho
    const qty = body.quantity ?? 1;
    if (typedProduct.stock_quantity < qty) {
      throw new ValidationError(
        `Sản phẩm chỉ còn ${typedProduct.stock_quantity} trong kho`,
      );
    }

    // 3. Tính tổng tiền
    const totalAmount = typedProduct.price * qty;

    // 4. Sinh order_code duy nhất (retry nếu trùng, tối đa 3 lần)
    let orderCode = "";
    let order: Order | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      orderCode = generateOrderCode();

      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert({
          order_code: orderCode,
          product_id: body.product_id,
          quantity: qty,
          total_amount: totalAmount,
          customer_name: body.customer_name ?? null,
          customer_email: body.customer_email ?? null,
          customer_phone: body.customer_phone ?? null,
          customer_note: body.customer_note ?? null,
          status: "pending",
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Unique violation on order_code → retry
        if (
          insertError.code === "23505" &&
          insertError.message.includes("order_code")
        ) {
          logger.warn(
            { attempt, orderCode },
            "[Orders] order_code collision, retrying",
          );
          continue;
        }
        throw insertError;
      }

      order = newOrder as Order;
      break;
    }

    if (!order) {
      throw new Error("Failed to generate unique order_code after 3 attempts");
    }

    // 5. Sinh VietQR URL
    const qrCodeUrl = buildVietQrUrl({
      bankId: config.bankId,
      accountNo: config.bankAccountNo,
      amount: totalAmount,
      orderCode,
      accountName: config.bankAccountName,
    });

    logger.info(
      { orderId: order.id, orderCode, totalAmount },
      "[Orders] New order created",
    );

    const response: ApiResponse<CreateOrderResponse> = {
      success: true,
      data: {
        order,
        product: {
          id: typedProduct.id,
          name: typedProduct.name,
          price: typedProduct.price,
          image_url: typedProduct.image_url,
        },
        qr_code_url: qrCodeUrl,
      },
    };

    res.status(201).json(response);
  },
);

// ─────────────────────────────────────────────
// GET /api/orders/:id
// ─────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("v_orders_detail")
    .select("*")
    .eq("order_id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotFoundError("Order");

  const response: ApiResponse<OrderDetail> = {
    success: true,
    data: data as OrderDetail,
  };

  res.json(response);
});

// ─────────────────────────────────────────────
// PATCH /api/orders/:id/ship
// Admin đánh dấu đã giao — chỉ dùng từ Telegram Bot inline button qua API
// ─────────────────────────────────────────────
router.patch(
  "/:id/ship",
  telegramAdminAuthMiddleware,
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const supabase = getSupabaseClient();

    // Kiểm tra đơn tồn tại và đang ở trạng thái paid
    const { data: existing, error: fetchError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new NotFoundError("Order");

    const existingOrder = existing as Pick<Order, "id" | "status">;

    if (existingOrder.status !== "paid") {
      throw new ValidationError(
        `Không thể đánh dấu đã giao: đơn hàng đang ở trạng thái "${existingOrder.status}"`,
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: "shipped", shipped_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info(
      { orderId: id, adminChatId: (req as Request & { adminChatId: number }).adminChatId },
      "[Orders] Order marked as shipped",
    );

    res.json({ success: true, data: updated as Order });
  },
);

export default router;
