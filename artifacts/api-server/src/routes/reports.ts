// =============================================================================
// Payment Reports Routes (Admin only)
// GET  /api/reports          — Danh sách báo cáo tra soát
// GET  /api/reports/:orderId — Báo cáo theo đơn hàng
//
// Upload bill ảnh được xử lý qua Telegram Bot (/report command)
// và lưu vào bảng payment_reports — không cần upload qua REST API.
// =============================================================================

import { Router, type IRouter, type Request, type Response } from "express";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { telegramAdminAuthMiddleware } from "../middlewares/telegramAdminAuth.js";
import { NotFoundError } from "../middlewares/errorHandler.js";
import type { ApiResponse, PaymentReport, OrderDetail } from "../types/index.js";

const router: IRouter = Router();

// Tất cả report routes đều yêu cầu admin auth
router.use(telegramAdminAuthMiddleware);

// ─────────────────────────────────────────────
// GET /api/reports
// ─────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();

  // Query params
  const page = Math.max(1, parseInt((req.query as Record<string, string>)["page"] ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query as Record<string, string>)["limit"] ?? "20", 10)));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("payment_reports")
    .select(
      `
      *,
      orders (
        id, order_code, status, total_amount, customer_name, customer_email
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  res.json({
    success: true,
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
});

// ─────────────────────────────────────────────
// GET /api/reports/orders — Danh sách đơn đầy đủ cho admin
// ─────────────────────────────────────────────
router.get("/orders", async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();

  const page = Math.max(1, parseInt((req.query as Record<string, string>)["page"] ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query as Record<string, string>)["limit"] ?? "20", 10)));
  const offset = (page - 1) * limit;
  const status = (req.query as Record<string, string>)["status"];

  let query = supabase
    .from("v_orders_detail")
    .select("*", { count: "exact" })
    .order("order_created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("order_status", status);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  res.json({
    success: true,
    data: (data ?? []) as OrderDetail[],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
});

// ─────────────────────────────────────────────
// GET /api/reports/order/:orderId — Reports của 1 đơn hàng
// ─────────────────────────────────────────────
router.get("/order/:orderId", async (req: Request, res: Response) => {
  const { orderId } = req.params as { orderId: string };
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("payment_reports")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new NotFoundError("Payment reports for this order");
  }

  const response: ApiResponse<PaymentReport[]> = {
    success: true,
    data: data as PaymentReport[],
  };

  res.json(response);
});

export default router;
