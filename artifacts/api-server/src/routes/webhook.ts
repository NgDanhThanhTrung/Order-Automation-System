// =============================================================================
// SePay Webhook Route
// POST /api/webhook/sepay — Tiếp nhận biến động số dư từ SePay
//
// Luồng xử lý:
//   1. sePayAuthMiddleware kiểm tra Authorization: Apikey <token>
//   2. Validate payload
//   3. Gọi Supabase RPC process_sepay_webhook (atomic + idempotent)
//   4. Nếu matched → gọi Telegram Bot gửi notification (async, không block response)
//   5. Trả về 200 OK nhanh nhất có thể (SePay timeout ~30s)
// =============================================================================

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { sePayAuthMiddleware } from "../middlewares/sePayAuth.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import { logger } from "../lib/logger.js";
import type { SePayWebhookPayload, WebhookProcessResult } from "../types/index.js";

const router: IRouter = Router();

// ─────────────────────────────────────────────
// Zod validation cho SePay payload
// ─────────────────────────────────────────────
const sePayWebhookSchema = z.object({
  id: z.number().int().positive("Transaction ID phải là số nguyên dương"),
  bankBrandName: z.string().min(1),
  accountNumber: z.string().min(1),
  transactionDate: z.string().min(1),
  amountIn: z.number().min(0),
  amountOut: z.number().min(0),
  accumulated: z.number().optional().nullable(),
  code: z.string().nullable().optional(),
  subCode: z.string().nullable().optional(),
  content: z.string().default(""),
  transferType: z.enum(["in", "out"]),
  referenceCode: z.string().nullable().optional(),
  description: z.string().default(""),
});

// ─────────────────────────────────────────────
// POST /api/webhook/sepay
// ─────────────────────────────────────────────
router.post(
  "/sepay",
  sePayAuthMiddleware,
  validateRequest(sePayWebhookSchema),
  async (req: Request, res: Response) => {
    const payload = req.body as SePayWebhookPayload;
    const supabase = getSupabaseClient();

    logger.info(
      {
        txId: payload.id,
        amountIn: payload.amountIn,
        content: payload.content,
        bank: payload.bankBrandName,
      },
      "[Webhook] SePay event received",
    );

    // Gọi Stored Procedure nguyên tử
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "process_sepay_webhook",
      {
        p_sepay_transaction_id: payload.id,
        p_bank_brand_name: payload.bankBrandName,
        p_account_number: payload.accountNumber,
        p_transaction_date: new Date(payload.transactionDate).toISOString(),
        p_amount_in: payload.amountIn,
        p_amount_out: payload.amountOut,
        p_accumulated: payload.accumulated ?? null,
        p_transaction_content: payload.content,
        p_reference_code: payload.referenceCode ?? null,
        p_body: req.body as Record<string, unknown>,
      },
    );

    if (rpcError) {
      logger.error(
        { err: rpcError, txId: payload.id },
        "[Webhook] RPC process_sepay_webhook error",
      );
      // Trả 200 để SePay không retry liên tục, nhưng log lỗi
      res.status(200).json({ success: false, message: "Processing error logged" });
      return;
    }

    const result = rpcData as WebhookProcessResult;

    logger.info(
      {
        status: result.status,
        orderId: result.order_id,
        txId: payload.id,
      },
      `[Webhook] Processed: ${result.status}`,
    );

    // Nếu khớp đơn → trigger Telegram notification (non-blocking)
    // Telegram bot module sẽ được import ở Phase 4, dùng dynamic import để tránh circular
    if (result.success && result.status === "matched" && result.order_id) {
      setImmediate(async () => {
        try {
          // Dynamic import để tránh circular dependency và cho phép khởi động
          // Telegram bot độc lập với webhook handler
          const { notifyOrderPaid } = await import(
            "../services/telegramNotifier.js"
          );
          await notifyOrderPaid({
            orderId: result.order_id!,
            orderCode: result.order_code ?? "",
            totalAmount: result.total_amount ?? 0,
            amountReceived: result.amount_received ?? 0,
            customerName: result.customer_name ?? null,
            customerEmail: result.customer_email ?? null,
            telegramMessageId: result.telegram_message_id ?? null,
          });
        } catch (err) {
          // Lỗi notification không ảnh hưởng đến flow chính
          logger.error(
            { err, orderId: result.order_id },
            "[Webhook] Telegram notification failed",
          );
        }
      });
    }

    // SePay chỉ cần nhận 200 OK
    res.status(200).json({
      success: result.success,
      status: result.status,
      message: result.message,
      ...(result.order_id ? { order_id: result.order_id } : {}),
    });
  },
);

export default router;
