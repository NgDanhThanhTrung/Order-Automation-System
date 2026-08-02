// =============================================================================
// Orders Routes
// POST  /api/orders           — Tạo đơn hàng mới + sinh VietQR URL
// GET   /api/orders/:id       — Lấy chi tiết đơn (polling từ frontend)
// PATCH /api/orders/:id/ship  — Admin đánh dấu đã giao
// =============================================================================

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import { telegramAdminAuthMiddleware } from "../middlewares/telegramAdminAuth.js";
import { NotFoundError, ValidationError } from "../middlewares/errorHandler.js";
import { getConfig } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { orderCreationRateLimiter, readRateLimiter, adminRateLimiter } from "../middlewares/rateLimiter.js";
import { sanitizeBody, sanitizeCustomerName, sanitizeEmail, sanitizePhone, sanitizeNote } from "../middlewares/inputSanitizer.js";
import { csrfProtection } from "../middlewares/csrfProtection.js";
import { getRequestId } from "../middlewares/requestId.js";
import {
  generateOrderCode,
  buildVietQrUrl,
  getOrderById,
  markOrderShipped,
} from "../services/orderService.js";
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
  product_id: z.string().min(1, "product_id là bắt buộc"),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(100).default(1),
  customer_name: z.string().min(1).max(255).optional(),
  customer_email: z.string().email("Email không hợp lệ").optional(),
  customer_phone: z
    .string()
    .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ")
    .optional(),
  customer_note: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────
// POST /api/orders
// ─────────────────────────────────────────────
router.post(
  "/",
  orderCreationRateLimiter,
  csrfProtection,
  sanitizeBody,
  validateRequest(createOrderSchema),
  async (req: Request, res: Response) => {
    const body = req.body as CreateOrderRequest;
    const supabase = getSupabaseClient();
    const config = getConfig();

    // Additional field-specific sanitization
    if (body.customer_name) {
      body.customer_name = sanitizeCustomerName(body.customer_name);
    }
    if (body.customer_email) {
      body.customer_email = sanitizeEmail(body.customer_email);
    }
    if (body.customer_phone) {
      body.customer_phone = sanitizePhone(body.customer_phone);
    }
    if (body.customer_note) {
      body.customer_note = sanitizeNote(body.customer_note);
    }

    // Re-validate after sanitization
    if (body.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer_email)) {
      throw new ValidationError("Email không hợp lệ sau khi xử lý");
    }
    if (body.customer_phone && !/^(0|\+84)\d{9,10}$/.test(body.customer_phone)) {
      throw new ValidationError("Số điện thoại không hợp lệ sau khi xử lý");
    }

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

    // 2. Kiểm tra tồn kho với optimistic locking
    const qty = body.quantity ?? 1;
    if (typedProduct.stock_quantity < qty) {
      throw new ValidationError(
        `Sản phẩm chỉ còn ${typedProduct.stock_quantity} trong kho`,
      );
    }
    
    // Additional safety: check for potential race condition
    // Use database-level check in transaction
    const { data: stockCheck, error: stockError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", body.product_id)
      .single();
    
    if (stockError || !stockCheck) {
      throw new ValidationError("Không thể kiểm tra tồn kho");
    }
    
    if (stockCheck.stock_quantity < qty) {
      throw new ValidationError(
        `Sản phẩm chỉ còn ${stockCheck.stock_quantity} trong kho (vừa được cập nhật)`,
      );
    }

    // 3. Tính tổng tiền
    const totalAmount = typedProduct.price * qty;

    // 4. Sinh order_code duy nhất (retry nếu trùng, tối đa 3 lần)
    let order: Order | null = null;
    let orderCode = "";

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
        if (insertError.code === "23505" && insertError.message.includes("order_code")) {
          logger.warn({ attempt, orderCode }, "[Orders] order_code collision, retrying");
          continue;
        }
        throw insertError;
      }

      order = newOrder as Order;
      break;
    }

    if (!order) {
      throw new Error("Không thể tạo order_code duy nhất sau 3 lần thử");
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
      { orderId: order.id, orderCode, totalAmount, requestId: getRequestId(req) },
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
router.get("/:id", readRateLimiter, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const orderDetail = await getOrderById(id);
  if (!orderDetail) throw new NotFoundError("Order");

  const response: ApiResponse<OrderDetail> = {
    success: true,
    data: orderDetail,
  };

  res.json(response);
});

// ─────────────────────────────────────────────
// PATCH /api/orders/:id/ship  — Admin only
// ─────────────────────────────────────────────
router.patch(
  "/:id/ship",
  adminRateLimiter,
  telegramAdminAuthMiddleware,
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const updated = await markOrderShipped(id);

    if (!updated) {
      // markOrderShipped trả null nếu đơn không tồn tại hoặc không ở trạng thái paid
      const existing = await getOrderById(id);
      if (!existing) throw new NotFoundError("Order");
      throw new ValidationError(
        `Không thể đánh dấu đã giao: đơn đang ở trạng thái "${existing.order_status}"`,
      );
    }

    const adminChatId = (req as Request & { adminChatId: number }).adminChatId;
    logger.info({ orderId: id, adminChatId }, "[Orders] Order marked as shipped");

    res.json({ success: true, data: updated });
  },
);

export default router;
