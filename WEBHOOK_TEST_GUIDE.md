# 🧪 Webhook Test Guide - Order Automation System

## 📋 Tổng quan

Hệ thống đã được cấu hình với thông tin ngân hàng của bạn:
- **Chủ tài khoản**: Nguyễn Danh Thành Trung
- **Ngân hàng**: MB (Quân đội)
- **Số tài khoản**: 56002005032008

Endpoint test webhook đã được thêm để phục vụ mục đích test và development.

## 🔗 Endpoints

### 1. Test Webhook Endpoint
**URL**: `POST /api/webhook/test`

Endpoint này hoạt động **giống hệ thống** với SePay webhook nhưng **không cần authentication**, giúp bạn dễ dàng test quy trình thanh toán.

#### Cách sử dụng:

```bash
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "bankBrandName": "MB",
    "accountNumber": "56002005032008",
    "transactionDate": "2026-08-02 10:30:00",
    "amountIn": 500000,
    "amountOut": 0,
    "content": "ORDLKZM4A8X2",
    "transferType": "in"
  }'
```

#### Request Parameters:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| id | number | ✅ | Transaction ID | 123456789 |
| bankBrandName | string | ✅ | Bank code | MB |
| accountNumber | string | ✅ | Account number | 56002005032008 |
| transactionDate | string | ✅ | Transaction date (YYYY-MM-DD HH:mm:ss) | 2026-08-02 10:30:00 |
| amountIn | number | ✅ | Amount received | 500000 |
| amountOut | number | ✅ | Amount sent | 0 |
| content | string | ❌ | Transaction content (order code) | ORDLKZM4A8X2 |
| transferType | enum | ✅ | Transfer type (in/out) | in |
| accumulated | number | ❌ | Account balance | 1000000 |
| referenceCode | string | ❌ | Reference code | REF123 |
| description | string | ❌ | Description | Test payment |

### 2. Test Webhook Info Endpoint
**URL**: `GET /api/webhook/test/info`

Endpoint này cung cấp thông tin hướng dẫn sử dụng test webhook.

```bash
curl http://localhost:5000/api/webhook/test/info
```

## 🧪 Test Scenarios

### Scenario 1: Test thanh toán thành công (Order matched)

1. **Tạo đơn hàng mới** qua frontend hoặc API:
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "product_id": "your-product-id",
    "quantity": 1,
    "customer_name": "Nguyễn Danh Thành Trung",
    "customer_email": "trung@example.com",
    "customer_phone": "0912345678"
  }'
```

2. **Lấy order_code** từ response (ví dụ: `ORDLKZM4A8X2`)

3. **Gửi test webhook** với order_code trong content:
```bash
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 999999999,
    "bankBrandName": "MB",
    "accountNumber": "56002005032008",
    "transactionDate": "2026-08-02 10:30:00",
    "amountIn": 500000,
    "amountOut": 0,
    "content": "ORDLKZM4A8X2",
    "transferType": "in"
  }'
```

4. **Kết quả**:
- Đơn hàng sẽ chuyển sang trạng thái `paid`
- Tồn kho sẽ được trừ tự động
- Telegram bot sẽ gửi notification
- Transaction sẽ được lưu vào database

### Scenario 2: Test thanh toán không khớp (Unmatched)

Gửi webhook với content không khớp bất kỳ order nào:
```bash
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 888888888,
    "bankBrandName": "MB",
    "accountNumber": "56002005032008",
    "transactionDate": "2026-08-02 10:30:00",
    "amountIn": 100000,
    "amountOut": 0,
    "content": "UNKNOWN_ORDER",
    "transferType": "in"
  }'
```

**Kết quả**:
- Transaction sẽ được lưu với status `unmatched`
- Không có order nào được cập nhật
- Telegram notification không được gửi

### Scenario 3: Test duplicate transaction

Gửi cùng transaction ID hai lần:
```bash
# First call
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"id": 777777777, "bankBrandName": "MB", "accountNumber": "56002005032008", "transactionDate": "2026-08-02 10:30:00", "amountIn": 300000, "amountOut": 0, "content": "TEST123", "transferType": "in"}'

# Second call (same id)
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"id": 777777777, "bankBrandName": "MB", "accountNumber": "56002005032008", "transactionDate": "2026-08-02 10:30:00", "amountIn": 300000, "amountOut": 0, "content": "TEST123", "transferType": "in"}'
```

**Kết quả**:
- Lần đầu: Xử lý bình thường
- Lần thứ hai: Trả về status `duplicate` (idempotent)

## 🔍 Xác Nhả Kết Quả

### Kiểm tra database:
```sql
-- Kiểm tra đơn hàng
SELECT * FROM orders WHERE order_code = 'ORDLKZM4A8X2';

-- Kiểm tra transaction
SELECT * FROM payment_transactions WHERE sepay_transaction_id = 999999999;

-- Kiểm tra tồn kho
SELECT * FROM products WHERE id = 'your-product-id';
```

### Kiểm tra API:
```bash
# Lấy chi tiết đơn hàng
curl http://localhost:5000/api/orders/{order-id}

# Kiểm tra webhook retry queue
curl http://localhost:5000/api/webhook/retry-status
```

### Kiểm tra logs:
- Kiểm tra console output của server
- Kiểm tra Telegram bot notifications
- Kiểm tra database logs trong Supabase dashboard

## 🎯 Use Cases

### 1. Development & Testing
- Test quy trình thanh toán mà không cần SePay
- Test edge cases (duplicate, unmatched, invalid data)
- Test Telegram notifications
- Test stock management

### 2. Manual Payment Processing
- Xử lý thanh toán thủ công khi webhook SePay không hoạt động
- Re-process failed transactions từ retry queue
- Testing với các bank khác không hỗ trợ SePay

### 3. Integration Testing
- Test integration với các hệ thống khác
- Load testing webhook processing
- Test rate limiting và error handling

## ⚠️ Lưu Ý Quan Trọng

1. **Security**: Endpoint test webhook không có authentication, chỉ dùng cho development/testing. KHÔNG enable trong production mà không có proper security.

2. **Idempotency**: Endpoint test webhook vẫn có idempotency (duplicate transaction ID sẽ bị bỏ qua).

3. **Stock Management**: Test webhook cũng kích hoạt triggers trừ tồn kho giống hệ thống SePay webhook.

4. **Telegram Notifications**: Test webhook cũng gửi Telegram notifications giống hệ thống SePay webhook.

5. **Retry Queue**: Test webhook cũng sử dụng retry queue cho transient failures.

## 🔧 Configuration

Để enable/disable test webhook trong production, bạn có thể:

1. **Comment out route** trong `src/routes/index.ts`:
```typescript
// router.use("/webhook", webhookTestRouter); // Comment out this line
```

2. **Add environment check**:
```typescript
if (process.env.NODE_ENV === 'development') {
  router.use("/webhook", webhookTestRouter);
}
```

3. **Add authentication** (nếu cần dùng trong production):
```typescript
// Add test auth middleware
router.use("/webhook/test", testAuthMiddleware, webhookTestRouter);
```

## 📞 Troubleshooting

### Webhook không hoạt động:
1. Kiểm tra server đang chạy: `curl http://localhost:5000/api/healthz`
2. Kiểm tra logs có error không
3. Verify database connection
4. Kiểm tra Supabase RPC function `process_sepay_webhook` tồn tại

### Transaction không khớp order:
1. Kiểm tra order_code trong content có đúng không
2. Kiểm tra order còn trong trạng thái `pending` không
3. Kiểm tra order chưa hết hạn (expires_at > NOW)
4. Kiểm tra amount >= total_amount

### Stock không được trừ:
1. Kiểm tra trigger `trg_deduct_stock_on_payment` đã được tạo
2. Kiểm tra sufficient stock trước khi thanh toán
3. Review database logs cho trigger errors

### Telegram không nhận notification:
1. Kiểm tra TELEGRAM_BOT_TOKEN đúng không
2. Kiểm tra ADMIN_TELEGRAM_CHAT_IDS đúng không
3. Kiểm tra bot đã được start không
4. Review Telegram bot logs