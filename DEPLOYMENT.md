# 🚀 Order Automation System - Deployment Guide

Hệ thống bán hàng tự động hóa thanh toán & quản lý đơn hàng với kiến trúc Full-Stack: Express + TypeScript, Supabase, VietQR, Telegram Bot, Cloudinary.

---

## 📋 Tổng quan hệ thống

### Backend (Node.js/Express + TypeScript)
- **RESTful APIs**: Products, Orders, Webhook SePay, Reports
- **Health Check**: `/api/healthz` cho UptimeRobot/Render keep-alive
- **Webhook**: SePay integration với Atomic RPC Lock
- **Cron Job**: Auto-cancel đơn pending quá 20 phút
- **Telegram Bot**: Long polling với Telegraf

### Frontend (Vite + React + Wouter)
- **Product Listing**: Grid layout responsive
- **Checkout**: Form validation với React Hook Form + Zod
- **Order Tracking**: Real-time polling, countdown timer
- **Admin Reports**: Search, filter, bill image preview
- **VietQR Integration**: API công khai tối ưu bundle size

### Database (Supabase PostgreSQL)
- **4 Tables**: products, orders, payment_transactions, payment_reports
- **Stored Procedures**: process_sepay_webhook (atomic), auto_cancel_expired_orders
- **RLS Policies**: Security cho từng role
- **Views**: v_orders_detail, v_daily_revenue

### External Services
- **SePay**: Webhook nhận biến động số dư
- **VietQR**: API công khai sinh mã QR động
- **Cloudinary**: Stream upload bill images
- **Telegram Bot**: Notifications & admin commands
- **UptimeRobot**: Health check keep-alive

---

## 🔧 Prerequisites Checklist

- [ ] Node.js 18+ và pnpm installed
- [ ] Supabase project đã tạo
- [ ] Telegram Bot đã tạo qua @BotFather
- [ ] Cloudinary account (Free tier)
- [ ] SePay merchant account
- [ ] Git repository initialized

---

## 📦 Phase 1: Local Development Setup

### 1.1 Clone Repository & Install Dependencies

```bash
git clone <your-repo-url>
cd Order-Automation-System

# Install dependencies
pnpm install
```

### 1.2 Configure Environment Variables

Copy file `.env.example` và tạo `.env`:

```bash
cp .env.example .env
```

Điền các giá trị thực tế vào `.env`:

```env
# Server
PORT=5000
NODE_ENV=development
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SePay
SEPAY_WEBHOOK_TOKEN=your_sepay_webhook_secret_token_here

# Bank / VietQR
BANK_ID=MB
BANK_ACCOUNT_NO=0123456789
BANK_ACCOUNT_NAME=NGUYEN VAN A

# Telegram
TELEGRAM_BOT_TOKEN=1234567890:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_TELEGRAM_CHAT_IDS=123456789

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here
CLOUDINARY_UPLOAD_FOLDER=payment_reports

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BANK_ID=MB
NEXT_PUBLIC_BANK_ACCOUNT_NO=0123456789
NEXT_PUBLIC_BANK_ACCOUNT_NAME=NGUYEN VAN A

# Cron
CRON_AUTO_CANCEL_EXPR=* * * * *
CRON_ENABLED=true
```

### 1.3 Apply Supabase Migration

**Option A - Supabase Dashboard (easiest)**

1. Mở project tại <https://supabase.com/dashboard>
2. Đi đến **SQL Editor → New query**
3. Paste toàn bộ nội dung file `supabase/migrations/00001_init_schema.sql`
4. Click **Run**

**Option B - Supabase CLI**

```bash
# Install CLI (nếu chưa có)
npm install -g supabase

# Link đến project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push
```

**Verify migration:**

```sql
-- Trong Supabase SQL Editor, chạy:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Kết quả: products, orders, payment_transactions, payment_reports
```

### 1.4 Start Local Development

```bash
# Terminal 1: Start Backend API Server
cd artifacts/api-server
pnpm run dev

# Terminal 2: Start Frontend Storefront
cd artifacts/storefront
pnpm run dev
```

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173
- **Health Check**: http://localhost:5000/api/healthz

---

## 🚀 Phase 2: Production Deployment

### 2.1 Deploy Backend API Server (Render.com)

**Tạo Web Service trên Render:**

1. Đi đến [Render Dashboard](https://dashboard.render.com)
2. Click **New → Web Service**
3. Connect Git repository
4. Configure settings:

| Setting | Value |
|---------|-------|
| **Name** | order-automation-api |
| **Environment** | Node |
| **Build Command** | `cd artifacts/api-server && pnpm install && pnpm run build` |
| **Start Command** | `cd artifacts/api-server && pnpm run start` |
| **Health Check Path** | `/api/healthz` |

5. **Add Environment Variables** (từ `.env.example`):
   - `PORT=5000`
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SEPAY_WEBHOOK_TOKEN`
   - `BANK_ID`
   - `BANK_ACCOUNT_NO`
   - `BANK_ACCOUNT_NAME`
   - `TELEGRAM_BOT_TOKEN`
   - `ADMIN_TELEGRAM_CHAT_IDS`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_UPLOAD_FOLDER=payment_reports`
   - `CRON_AUTO_CANCEL_EXPR=* * * * *`
   - `CRON_ENABLED=true`

6. Click **Deploy Web Service**

**Lưu URL sau khi deploy:** `https://order-automation-api.onrender.com`

### 2.2 Deploy Frontend Storefront (Vercel)

**Tạo Project trên Vercel:**

1. Đi đến [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New → Project**
3. Import Git repository
4. Configure settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `artifacts/storefront` |
| **Build Command** | `pnpm install && pnpm run build` |
| **Output Directory** | `dist` |

5. **Add Environment Variables**:
   - `VITE_PUBLIC_API_URL=https://order-automation-api.onrender.com/api`
   - `VITE_PUBLIC_SUPABASE_URL` (từ backend)
   - `VITE_PUBLIC_SUPABASE_ANON_KEY` (từ backend)
   - `VITE_PUBLIC_BANK_ID` (từ backend)
   - `VITE_PUBLIC_BANK_ACCOUNT_NO` (từ backend)
   - `VITE_PUBLIC_BANK_ACCOUNT_NAME` (từ backend)

6. Click **Deploy**

**Lưu URL sau khi deploy:** `https://order-automation.vercel.app`

### 2.3 Configure External Services

#### **SePay Webhook**

1. Đăng nhập vào [SePay Dashboard](https://sepay.vn/dashboard)
2. Đi đến **Cài đặt → Webhook** (hoặc **Tích hợp API**)
3. Configure:
   - **Webhook URL**: `https://order-automation-api.onrender.com/api/webhook/sepay`
   - **Secret Token**: (giống `SEPAY_WEBHOOK_TOKEN` trong backend)
4. Enable webhook và save

**Test webhook:**

```bash
curl -X POST https://order-automation-api.onrender.com/api/webhook/sepay \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey <SEPAY_WEBHOOK_TOKEN>" \
  -d '{
    "id": 123456789,
    "bankBrandName": "MB",
    "accountNumber": "0123456789",
    "transactionDate": "2026-01-15 10:30:00",
    "amountIn": 500000,
    "amountOut": 0,
    "content": "ORDTEST123",
    "transferType": "in"
  }'
```

#### **Telegram Bot**

1. Bot đã được tạo via @BotFather → `TELEGRAM_BOT_TOKEN`
2. Lấy Chat ID admin:
   - Message [@userinfobot](https://t.me/userinfobot)
   - Hoặc [@getidsbot](https://t.me/getidsbot)
3. Cập nhật `ADMIN_TELEGRAM_CHAT_IDS` trong Render environment variables
4. Test bot: Chat với bot và lệnh `/start`, `/help`

#### **Cloudinary**

1. Đăng ký [Cloudinary](https://cloudinary.com) (Free tier)
2. Lấy credentials từ **Dashboard → Settings → API Keys**:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Update trong Render environment variables
4. Test upload bằng Telegram bot: Gửi ảnh kèm caption test

#### **UptimeRobot (Health Check)**

1. Đăng ký [UptimeRobot](https://uptimerobot.com)
2. Tạo New Monitor:
   - **Monitor Type**: HTTPS
   - **URL**: `https://order-automation-api.onrender.com/api/healthz`
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: Email/webhook
3. Lưu monitor

---

## ✅ Phase 3: Post-Deployment Verification

### 3.1 Smoke Tests

```bash
BASE=https://order-automation-api.onrender.com

# 1. Health check
curl -s $BASE/api/healthz | jq .
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# 2. List products
curl -s $BASE/api/products | jq '.data | length'
# Expected: > 0 (seed data)

# 3. Get product detail
curl -s $BASE/api/products/<product-id> | jq '.data.name'
# Expected: "Khóa học Node.js Fullstack..."

# 4. Create test order
curl -s -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "<product-id>",
    "quantity": 1,
    "customer_name": "Test User",
    "customer_email": "test@example.com",
    "customer_phone": "0912345678"
  }' | jq .
# Expected: {"success":true,"data":{"order":{...},"product":{...},"qr_code_url":"..."}}

# 5. Check order status
curl -s $BASE/api/orders/<order-id> | jq '.data.order_status'
# Expected: "pending"
```

### 3.2 Frontend Tests

1. Mở frontend URL: `https://order-automation.vercel.app`
2. Test flow:
   - ✅ Product listing hiển thị
   - ✅ Click "Mua ngay" → checkout page
   - ✅ Điền form → tạo đơn thành công
   - ✅ Redirect đến order status page
   - ✅ QR code hiển thị
   - ✅ Countdown timer chạy
   - ✅ Copy order code hoạt động

### 3.3 Telegram Bot Tests

1. Chat với bot:
   - `/start` → Welcome message
   - `/help` → Commands list
   - `/orders` → Recent orders
   - `/stats` → Today's revenue
   - `/report` → Upload instructions
2. Gửi ảnh test:
   - Upload bill photo
   - Check Cloudinary URL được trả về
3. Test webhook:
   - Tạo order thật qua frontend
   - Chuyển khoản với nội dung là order_code
   - Bot nhận notification với inline keyboard
   - Click "Đã giao hàng" → status update

### 3.4 Webhook Tests

1. Simulate SePay webhook:
   ```bash
   curl -X POST https://order-automation-api.onrender.com/api/webhook/sepay \
     -H "Content-Type: application/json" \
     -H "Authorization: Apikey <SEPAY_WEBHOOK_TOKEN>" \
     -d '{
       "id": 999999999,
       "bankBrandName": "MB",
       "accountNumber": "0123456789",
       "transactionDate": "2026-01-15 10:30:00",
       "amountIn": 499000,
       "amountOut": 0,
       "content": "ORDTEST123",
       "transferType": "in"
     }'
   ```
2. Check logs trên Render Dashboard
3. Verify order status update (nếu khớp)

---

## 🔍 Phase 4: Monitoring & Maintenance

### 4.1 Log Monitoring

**Render Dashboard:**
- View real-time logs
- Check error logs
- Monitor resource usage

**Telegram Bot Logs:**
- Check bot startup logs
- Monitor webhook processing
- Track notification failures

### 4.2 Database Monitoring

**Supabase Dashboard:**
- Real-time query performance
- Storage usage
- API rate limits
- Backup status

### 4.3 Cloudinary Monitoring

**Cloudinary Dashboard:**
- Storage usage (Free tier: 25GB)
- Bandwidth usage (Free tier: 25GB/tháng)
- API calls limit
- Asset management

### 4.4 Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Orders stuck in `pending` | SePay webhook not configured | Check webhook URL & token |
| Telegram bot not responding | Bot token invalid or wrong chat ID | Verify `TELEGRAM_BOT_TOKEN` & `ADMIN_TELEGRAM_CHAT_IDS` |
| QR code not loading | VietQR API down or wrong format | Check VietQR API status, verify URL format |
| Auto-cancel not working | Cron job not started or RPC missing | Check logs for "Cron job started", verify migration |
| Cloudinary upload failed | Invalid credentials or file too large | Check API keys, verify file size < 10MB |
| Database connection failed | Supabase URL or keys invalid | Verify `SUPABASE_URL` and keys in environment variables |
| Render service sleeping | No health check traffic | UptimeRobot keep-alive configured |

---

## 📝 Phase 5: Security Checklist

- [ ] Database RLS policies enabled
- [ ] Service role key never exposed to frontend
- [ ] SePay webhook token kept secret
- [ ] Telegram bot token never committed
- [ ] Cloudinary API secret protected
- [ ] Admin chat IDs validated
- [ ] HTTPS enforced in production
- [ ] CORS configured properly
- [ ] Rate limiting considered (future)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Supabase)
- [ ] XSS prevention (React escape)

---

## 🔄 Phase 6: Backup & Disaster Recovery

### 6.1 Database Backups

**Supabase:**
- Automatic daily backups
- Point-in-time recovery (7 days retention)
- Manual backup before major changes

### 6.2 Cloudinary Backups

- Assets stored in Cloudinary
- Download important bill images periodically
- Consider backup plan for critical assets

### 6.3 Configuration Backups

- Keep `.env.example` updated
- Document all environment variables
- Version control configuration changes

---

## 📚 Phase 7: Additional Resources

### Documentation Links
- [Supabase Docs](https://supabase.com/docs)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [SePay API Docs](https://docs.sepay.vn)
- [VietQR API](https://vietqr.io/document/api)
- [Telegraf Docs](https://telegraf.js.org)
- [Cloudinary Docs](https://cloudinary.com/documentation)

### Support
- GitHub Issues: `<your-repo-url>/issues`
- Email: `<your-support-email>`
- Telegram: `<your-support-bot>`

---

## 🎯 Quick Reference Commands

```bash
# Local development
pnpm install
pnpm run dev          # Backend
cd artifacts/storefront && pnpm run dev  # Frontend

# Build
pnpm run build        # Full project
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/storefront run build

# Database
supabase db push      # Apply migrations
supabase db diff      # View migration diff

# Deployment
git push origin main   # Trigger auto-deploy
# Manual deploy via Render/Vercel dashboards

# Testing
curl https://<api-url>/api/healthz
curl https://<api-url>/api/products
```

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2026-07-30  
**System Version**: Production-Ready
