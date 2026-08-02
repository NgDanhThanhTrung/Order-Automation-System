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
import { telegramAdminAuthMiddleware } from "../middlewares/telegramAdminAuth.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import { logger } from "../lib/logger.js";
import { webhookRateLimiter } from "../middlewares/rateLimiter.js";
import { sanitizeBody } from "../middlewares/inputSanitizer.js";
import { getWebhookRetryQueue } from "../lib/webhookRetryQueue.js";
import { parseSePayDateWithFallback, formatDateToISO } from "../lib/dateParser.js";
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
  webhookRateLimiter,
  sePayAuthMiddleware,
  validateRequest(sePayWebhookSchema),
  async (req: Request, res: Response) => {
    const payload = req.body as SePayWebhookPayload;
    const supabase = getSupabaseClient();

    // Sanitize transaction content to prevent XSS in admin dashboard
    if (payload.content) {
      payload.content = payload.content.trim().substring(0, 255);
    }

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
    // Safe date parsing with validation
    let transactionDateISO: string;
    try {
      const parsedDate = parseSePayDateWithFallback(payload.transactionDate);
      transactionDateISO = formatDateToISO(parsedDate);
    } catch (dateError) {
      logger.error(
        { err: dateError, txId: payload.id, dateString: payload.transactionDate },
        "[Webhook/SePay] Invalid transaction date format",
      );
      // Use current time as fallback but log the issue
      transactionDateISO = new Date().toISOString();
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "process_sepay_webhook",
      {
        p_sepay_transaction_id: payload.id,
        p_bank_brand_name:      payload.bankBrandName,
        p_account_number:       payload.accountNumber,
        p_transaction_date:     transactionDateISO,
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
      
      // Add to retry queue for transient failures
      const retryQueue = getWebhookRetryQueue();
      const isTransient = 
        rpcError.code === '503' || // Service unavailable
        rpcError.code === '504' || // Gateway timeout
        rpcError.message?.toLowerCase().includes('timeout') ||
        rpcError.message?.toLowerCase().includes('connection');
      
      if (isTransient) {
        retryQueue.enqueue(String(payload.id), req.body, rpcError.message);
        res.status(202).json({ 
          success: false, 
          message: "Processing error - queued for retry",
          retryId: String(payload.id)
        });
      } else {
        // For non-transient errors, return 200 to prevent SePay retry
        res.status(200).json({ 
          success: false, 
          message: "Processing error — logged for manual review" 
        });
      }
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

// ─────────────────────────────────────────────
// GET /api/webhook/retry-status  — Admin only
// ─────────────────────────────────────────────
router.get("/retry-status", telegramAdminAuthMiddleware, async (_req: Request, res: Response) => {
  const retryQueue = getWebhookRetryQueue();
  const status = retryQueue.getStatus();
  
  res.json({
    success: true,
    data: {
      pendingWebhooks: status.pending,
      processing: status.processing,
      maxRetries: 3,
    },
  });
});

export default router;
