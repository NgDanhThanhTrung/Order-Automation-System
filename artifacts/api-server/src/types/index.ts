// =============================================================================
// Domain TypeScript Interfaces
// Khớp 1-1 với schema PostgreSQL trong 00001_init_schema.sql
// =============================================================================

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";
export type TransactionStatus = "matched" | "unmatched" | "duplicate";

// ─────────────────────────────────────────────
// DOMAIN MODELS (DB rows)
// ─────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // VND
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface Order {
  id: string;
  order_code: string;
  product_id: string;
  quantity: number;
  total_amount: number; // VND
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_note: string | null;
  status: OrderStatus;
  payment_content: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
  telegram_message_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  sepay_transaction_id: number;
  order_id: string | null;
  bank_brand_name: string | null;
  account_number: string | null;
  transaction_date: string;
  amount_in: number;
  amount_out: number;
  accumulated: number | null;
  transaction_content: string | null;
  reference_code: string | null;
  body: Record<string, unknown>;
  status: TransactionStatus;
  processed_at: string;
  created_at: string;
}

export interface PaymentReport {
  id: string;
  order_id: string | null;
  transaction_id: string | null;
  bill_image_url: string;
  cloudinary_public_id: string;
  uploaded_by_telegram_id: number | null;
  note: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// JOIN VIEWS
// ─────────────────────────────────────────────

export interface OrderDetail {
  order_id: string;
  order_code: string;
  order_status: OrderStatus;
  total_amount: number;
  quantity: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_content: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
  order_created_at: string;
  product_id: string;
  product_name: string;
  product_price: number;
  transaction_id: string | null;
  sepay_transaction_id: number | null;
  paid_amount: number | null;
  transaction_date: string | null;
  bank_brand_name: string | null;
  transaction_status: TransactionStatus | null;
  report_id: string | null;
  bill_image_url: string | null;
  report_created_at: string | null;
}

// ─────────────────────────────────────────────
// API REQUEST PAYLOADS
// ─────────────────────────────────────────────

export interface CreateOrderRequest {
  product_id: string;
  quantity: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_note?: string;
}

export interface CreateOrderResponse {
  order: Order;
  product: Pick<Product, "id" | "name" | "price" | "image_url">;
  qr_code_url: string; // VietQR URL
}

// ─────────────────────────────────────────────
// SEPAY WEBHOOK PAYLOAD
// Tài liệu: https://docs.sepay.vn/webhook.html
// ─────────────────────────────────────────────

export interface SePayWebhookPayload {
  id: number; // sepay_transaction_id
  bankBrandName: string; // Tên ngân hàng (MB, VCB...)
  accountNumber: string; // Số tài khoản
  transactionDate: string; // "2024-01-15 10:30:00"
  amountIn: number; // Tiền vào (VND)
  amountOut: number; // Tiền ra (VND)
  accumulated: number; // Số dư tích lũy
  code: string | null; // Mã tham chiếu từ SePay
  subCode: string | null;
  content: string; // Nội dung chuyển khoản
  transferType: "in" | "out";
  referenceCode: string | null;
  description: string;
}

// ─────────────────────────────────────────────
// STORED PROCEDURE RESULT
// Kết quả trả về từ process_sepay_webhook RPC
// ─────────────────────────────────────────────

export interface WebhookProcessResult {
  success: boolean;
  status: "matched" | "unmatched" | "duplicate" | "error";
  message: string;
  transaction_id: string | null;
  order_id: string | null;
  order_code?: string;
  total_amount?: number;
  amount_received?: number;
  customer_name?: string | null;
  customer_email?: string | null;
  telegram_message_id?: number | null;
  sqlstate?: string;
}

// ─────────────────────────────────────────────
// TELEGRAM BOT TYPES
// ─────────────────────────────────────────────

export interface TelegramOrderNotification {
  order: Order;
  product: Pick<Product, "id" | "name" | "price">;
  amount_received: number;
}

// ─────────────────────────────────────────────
// CLOUDINARY UPLOAD RESULT
// ─────────────────────────────────────────────

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

// ─────────────────────────────────────────────
// API RESPONSE WRAPPER
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
