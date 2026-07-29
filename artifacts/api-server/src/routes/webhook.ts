// =============================================================================
// SePay Webhook Route
// POST /api/webhook/sepay — Tiếp nhận biến động số dư từ SePay
//
// Luồng xử lý:
//   1. sePayAuthMiddleware: kiểm tra Authorization: Apikey <token>
//   2. validateRequest: Zod validation payload
//   3. Gọi Supabase RPC process_sepay_webhook (atomic + idempotent)
//   4. Nếu matched → notifyOrderPaid() non-blocking (Telegram Phase 4)
//   5. Trả về 200 OK ngay — SePay timeout ~30s, không nên giữ connection
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
// Zod validation — khớp với SePayWebhookPayload
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
        amountOut: payload.amountOut,
        content: payload.content?.substring(0, 60),
        bank: payload.bankBrandName,
        account: payload.accountNumber,
      },
      "[Webhook/SePay] Event received",
    );

    // ── Gọi Stored Procedure nguyên tử ──────────────────────────────────────
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "process_sepay_webhook",
      {
        p_sepay_transaction_id: payload.id,
        p_bank_brand_name:      payload.bankBrandName,
        p_account_number:       payload.accountNumber,
        p_transaction_date:     (() => {
          // SePay gửi dạng "2024-01-15 10:30:00" (không có timezone)
          // Parse và convert sang ISO 8601
          const raw = payload.transactionDate;
          const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })(),
        p_amount_in:            payload.amountIn ?? 0,
        p_amount_out:           payload.amountOut ?? 0,
        p_accumulated:          payload.accumulated ?? null,
        p_transaction_content:  payload.content ?? "",
        p_reference_code:       payload.referenceCode ?? null,
        p_body:                 req.body as Record<string, unknown>,
      },
    );

    if (rpcError) {
      logger.error(
        { err: rpcError, txId: payload.id },
        "[Webhook/SePay] RPC process_sepay_webhook error",
      );
      // Trả 200 để SePay không retry liên tục, nhưng log lỗi để xử lý thủ công
      res.status(200).json({ success: false, message: "Processing error — logged for review" });
      return;
    }

    const result = rpcData as WebhookProcessResult;

    logger.info(
      {
        txId:     payload.id,
        status:   result.status,
        orderId:  result.order_id,
        matched:  result.success,
      },
      `[Webhook/SePay] Processed: ${result.status}`,
    );

    // ── Trigger Telegram notification (non-blocking) ─────────────────────────
    if (result.success && result.status === "matched" && result.order_id) {
      // setImmediate để trả response ngay, notification gửi sau
      setImmediate(async () => {
        try {
          const { notifyOrderPaid } = await import("../services/telegramNotifier.js");
          await notifyOrderPaid({
            orderId:           result.order_id!,
            orderCode:         result.order_code         ?? "",
            totalAmount:       result.total_amount        ?? 0,
            amountReceived:    result.amount_received     ?? 0,
            customerName:      result.customer_name       ?? null,
            customerEmail:     result.customer_email      ?? null,
            telegramMessageId: result.telegram_message_id ?? null,
          });
        } catch (err) {
          // Lỗi notification KHÔNG được crash process
          logger.error(
            { err, orderId: result.order_id },
            "[Webhook/SePay] Telegram notification failed (non-fatal)",
          );
        }
      });
    }

    // ── Trả về kết quả cho SePay ─────────────────────────────────────────────
    // SePay chỉ cần 200 OK — bất kể matched/unmatched/duplicate
    res.status(200).json({
      success: result.success,
      status:  result.status,
      message: result.message,
      ...(result.order_id ? { order_id: result.order_id } : {}),
    });
  },
);

export default router;
