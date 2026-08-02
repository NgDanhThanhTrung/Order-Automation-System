// =============================================================================
// Test Webhook Endpoint
// Endpoint để test webhook processing giống hệ thống SePay
// Dùng cho mục đích test và development
// =============================================================================

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { logger } from "../lib/logger.js";
import { getWebhookRetryQueue } from "../lib/webhookRetryQueue.js";
import { parseSePayDateWithFallback, formatDateToISO } from "../lib/dateParser.js";
import type { WebhookProcessResult } from "../types/index.js";

const router: IRouter = Router();

// Schema giống hệ thống SePay webhook
const testWebhookSchema = z.object({
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
// POST /api/webhook/test
// Endpoint test webhook - không cần authentication
// ─────────────────────────────────────────────
router.post("/test", async (req: Request, res: Response) => {
  const payload = req.body;
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
    "[Webhook/Test] Test webhook received",
  );

  // Validate payload
  const validationResult = testWebhookSchema.safeParse(payload);
  if (!validationResult.success) {
    logger.warn(
      { errors: validationResult.error.issues },
      "[Webhook/Test] Invalid payload",
    );
    res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: validationResult.error.issues,
    });
    return;
  }

  const validPayload = validationResult.data;

  // Safe date parsing
  let transactionDateISO: string;
  try {
    const parsedDate = parseSePayDateWithFallback(validPayload.transactionDate);
    transactionDateISO = formatDateToISO(parsedDate);
  } catch (dateError) {
    logger.error(
      { err: dateError, txId: validPayload.id, dateString: validPayload.transactionDate },
      "[Webhook/Test] Invalid transaction date format",
    );
    transactionDateISO = new Date().toISOString();
  }

  // ── Gọi Stored Procedure nguyên tử ──────────────────────────────────────
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "process_sepay_webhook",
    {
      p_sepay_transaction_id: validPayload.id,
      p_bank_brand_name:      validPayload.bankBrandName,
      p_account_number:       validPayload.accountNumber,
      p_transaction_date:     transactionDateISO,
      p_amount_in:            validPayload.amountIn ?? 0,
      p_amount_out:           validPayload.amountOut ?? 0,
      p_accumulated:          validPayload.accumulated ?? null,
      p_transaction_content:  validPayload.content ?? "",
      p_reference_code:       validPayload.referenceCode ?? null,
      p_body:                 req.body as Record<string, unknown>,
    },
  );

  if (rpcError) {
    logger.error(
      { err: rpcError, txId: validPayload.id },
      "[Webhook/Test] RPC process_sepay_webhook error",
    );
    
    // Add to retry queue cho transient failures
    const retryQueue = getWebhookRetryQueue();
    const isTransient = 
      rpcError.code === '503' || 
      rpcError.code === '504' ||
      rpcError.message?.toLowerCase().includes('timeout') ||
      rpcError.message?.toLowerCase().includes('connection');
    
    if (isTransient) {
      retryQueue.enqueue(String(validPayload.id), req.body, rpcError.message);
      res.status(202).json({ 
        success: false, 
        message: "Processing error - queued for retry",
        retryId: String(validPayload.id)
      });
    } else {
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
      txId:     validPayload.id,
      status:   result.status,
      orderId:  result.order_id,
      matched:  result.success,
    },
    `[Webhook/Test] Processed: ${result.status}`,
  );

  // ── Trigger Telegram notification (non-blocking) ─────────────────────────
  if (result.success && result.status === "matched" && result.order_id) {
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
        logger.error(
          { err, orderId: result.order_id },
          "[Webhook/Test] Telegram notification failed (non-fatal)",
        );
      }
    });
  }

  // ── Trả về kết quả ─────────────────────────────────────────────
  res.status(200).json({
    success: result.success,
    status:  result.status,
    message: result.message,
    ...(result.order_id ? { order_id: result.order_id } : {}),
  });
});

// ─────────────────────────────────────────────
// GET /api/webhook/test/info
// Endpoint để lấy thông tin cấu hình webhook test
// ─────────────────────────────────────────────
router.get("/test/info", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      endpoint: "/api/webhook/test",
      method: "POST",
      description: "Test webhook endpoint - processes payments like SePay webhook",
      authentication: "None (for testing purposes)",
      requestBody: {
        id: "number (transaction ID)",
        bankBrandName: "string (e.g., MB, VCB)",
        accountNumber: "string (your account number)",
        transactionDate: "string (format: YYYY-MM-DD HH:mm:ss)",
        amountIn: "number (amount received)",
        amountOut: "number (amount sent)",
        content: "string (transaction content - order code)",
        transferType: "enum ('in' or 'out')",
      },
      example: {
        id: 123456789,
        bankBrandName: "MB",
        accountNumber: "56002005032008",
        transactionDate: "2026-08-02 10:30:00",
        amountIn: 500000,
        amountOut: 0,
        content: "ORDLKZM4A8X2",
        transferType: "in"
      },
      notes: [
        "This endpoint processes payments exactly like the SePay webhook",
        "No authentication required for testing",
        "Stock will be deducted when order is matched",
        "Telegram notifications will be sent",
        "Use this for testing payment flow without SePay"
      ]
    }
  });
});

export default router;