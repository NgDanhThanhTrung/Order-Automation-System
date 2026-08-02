// =============================================================================
// Webhook Retry Queue
// 
// In-memory queue for failed webhook processing with exponential backoff
// Provides retry mechanism for transient failures
// =============================================================================

import { logger } from "./logger.js";

interface QueuedWebhook {
  id: string;
  payload: unknown;
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
}

class WebhookRetryQueue {
  private queue: Map<string, QueuedWebhook> = new Map();
  private maxRetries = 3;
  private baseDelayMs = 1000; // 1 second
  private maxDelayMs = 60000; // 1 minute
  private processing = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Check queue every 10 seconds for items ready to retry
    this.checkInterval = setInterval(() => {
      this.processQueue();
    }, 10000);
  }

  /**
   * Add webhook to retry queue
   */
  enqueue(id: string, payload: unknown, error: string): void {
    const webhook: QueuedWebhook = {
      id,
      payload,
      attempts: 1,
      nextRetryAt: Date.now() + this.calculateDelay(1),
      lastError: error,
    };

    this.queue.set(id, webhook);
    logger.warn(
      { webhookId: id, error },
      "[WebhookRetry] Webhook added to retry queue (attempt 1)",
    );
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, attempt - 1),
      this.maxDelayMs,
    );
    // Add some jitter to avoid thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Process queue items that are ready for retry
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    const now = Date.now();
    const readyItems = Array.from(this.queue.values()).filter(
      item => item.nextRetryAt <= now && item.attempts < this.maxRetries,
    );

    if (readyItems.length === 0) return;

    this.processing = true;

    try {
      for (const item of readyItems) {
        logger.info(
          { webhookId: item.id, attempt: item.attempts },
          "[WebhookRetry] Processing retry",
        );

        // Import dynamically to avoid circular dependency
        const { processSePayWebhook } = await import("../routes/webhook.js");
        
        try {
          // Attempt to reprocess the webhook
          await processSePayWebhook(item.payload);
          
          // Success - remove from queue
          this.queue.delete(item.id);
          logger.info(
            { webhookId: item.id, attempt: item.attempts },
            "[WebhookRetry] Webhook successfully reprocessed",
          );
        } catch (error) {
          // Failed - increment attempts and reschedule
          item.attempts++;
          item.lastError = error instanceof Error ? error.message : String(error);
          
          if (item.attempts >= this.maxRetries) {
            // Max retries reached - remove and log
            this.queue.delete(item.id);
            logger.error(
              { webhookId: item.id, attempts: item.attempts, error: item.lastError },
              "[WebhookRetry] Webhook failed after max retries - manual review required",
            );
          } else {
            // Schedule next retry
            item.nextRetryAt = Date.now() + this.calculateDelay(item.attempts);
            this.queue.set(item.id, item);
            logger.warn(
              { webhookId: item.id, attempt: item.attempts, nextRetryAt: new Date(item.nextRetryAt).toISOString() },
              "[WebhookRetry] Webhook retry failed, scheduling next attempt",
            );
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, "[WebhookRetry] Error processing retry queue");
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue status for monitoring
   */
  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.size,
      processing: this.processing,
    };
  }

  /**
   * Remove webhook from queue (e.g., after manual processing)
   */
  remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Clear all queued webhooks (use with caution)
   */
  clear(): void {
    const count = this.queue.size;
    this.queue.clear();
    logger.info({ count }, "[WebhookRetry] Queue cleared");
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info("[WebhookRetry] Retry queue shutdown");
  }
}

// Singleton instance
let _instance: WebhookRetryQueue | null = null;

export function getWebhookRetryQueue(): WebhookRetryQueue {
  if (!_instance) {
    _instance = new WebhookRetryQueue();
  }
  return _instance;
}

export function resetWebhookRetryQueue(): void {
  if (_instance) {
    _instance.shutdown();
    _instance = null;
  }
}

// Process webhook payload by calling the RPC directly
export async function processSePayWebhook(payload: unknown): Promise<void> {
  const { getSupabaseClient } = await import("./supabaseClient.js");
  const { parseSePayDateWithFallback, formatDateToISO } = await import("./dateParser.js");
  const supabase = getSupabaseClient();
  
  const p = payload as SePayWebhookPayload;
  
  // Safe date parsing
  let transactionDateISO: string;
  try {
    const parsedDate = parseSePayDateWithFallback(p.transactionDate);
    transactionDateISO = formatDateToISO(parsedDate);
  } catch (dateError) {
    logger.error(
      { err: dateError, txId: p.id, dateString: p.transactionDate },
      "[WebhookRetry] Invalid transaction date format",
    );
    transactionDateISO = new Date().toISOString();
  }
  
  const { data, error } = await supabase.rpc("process_sepay_webhook", {
    p_sepay_transaction_id: p.id,
    p_bank_brand_name: p.bankBrandName,
    p_account_number: p.accountNumber,
    p_transaction_date: transactionDateISO,
    p_amount_in: p.amountIn ?? 0,
    p_amount_out: p.amountOut ?? 0,
    p_accumulated: p.accumulated ?? null,
    p_transaction_content: p.content ?? "",
    p_reference_code: p.referenceCode ?? null,
    p_body: payload as Record<string, unknown>,
  });

  if (error) {
    throw error;
  }

  // If webhook was successfully processed, trigger notification
  const result = data as WebhookProcessResult;
  if (result.success && result.status === "matched" && result.order_id) {
    setImmediate(async () => {
      try {
        const { notifyOrderPaid } = await import("../services/telegramNotifier.js");
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
        // Notification errors are non-fatal
        logger.error(
          { err, orderId: result.order_id },
          "[WebhookRetry] Telegram notification failed (non-fatal)",
        );
      }
    });
  }
}

// Import types for the function
interface SePayWebhookPayload {
  id: number;
  bankBrandName: string;
  accountNumber: string;
  transactionDate: string;
  amountIn: number;
  amountOut: number;
  accumulated?: number | null;
  content?: string;
  referenceCode?: string | null;
}

interface WebhookProcessResult {
  success: boolean;
  status: string;
  message: string;
  order_id?: string;
  order_code?: string;
  total_amount?: number;
  amount_received?: number;
  customer_name?: string | null;
  customer_email?: string | null;
  telegram_message_id?: number | null;
}