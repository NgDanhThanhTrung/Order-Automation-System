# Automated Payment & Order Management System

Hệ thống bán hàng tự động hóa thanh toán tích hợp VietQR, SePay webhook, Telegram Bot Admin, và Cloudinary bill upload.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port từ workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: Xem `.env.example` để biết tất cả biến môi trường cần thiết

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Backend**: Express 5 + TypeScript (artifacts/api-server)
- **Database**: Supabase PostgreSQL + stored procedures (RPC)
- **Payment**: SePay webhook + VietQR dynamic QR
- **Notifications**: Telegraf (Telegram Bot, Long Polling)
- **Storage**: Cloudinary (stream upload, no disk temp files)
- **Cron**: node-cron (auto-cancel expired orders)
- **Validation**: Zod v3, Orval codegen
- **Build**: esbuild (CJS bundle)

## Where things live

```
supabase/migrations/00001_init_schema.sql  ← DB schema, seed, RPC, RLS
artifacts/api-server/src/
  app.ts                  ← Express app setup, middlewares
  index.ts                ← Server entry point
  config/index.ts         ← Env validation (fail-fast)
  types/index.ts          ← All TypeScript interfaces
  lib/
    logger.ts             ← Pino logger singleton
    supabaseClient.ts     ← Supabase service_role client
  middlewares/
    sePayAuth.ts          ← SePay Apikey token validation
    telegramAdminAuth.ts  ← Admin chat ID guard
    errorHandler.ts       ← Global error handler + AppError classes
    requestValidator.ts   ← Zod request body validation
  routes/
    health.ts             ← GET /api/healthz (UptimeRobot keep-alive)
    products.ts           ← GET /api/products, GET /api/products/:id
    orders.ts             ← POST /api/orders, GET /api/orders/:id, PATCH /api/orders/:id/ship
    webhook.ts            ← POST /api/webhook/sepay
    reports.ts            ← GET /api/reports/* (admin only)
  services/
    telegramNotifier.ts   ← Stub (Phase 4)
lib/api-spec/openapi.yaml ← OpenAPI spec (source of truth)
.env.example              ← Tất cả biến môi trường
```

## Architecture decisions

- **Supabase RPC cho webhook**: `process_sepay_webhook` stored procedure dùng `pg_advisory_xact_lock` + `FOR UPDATE SKIP LOCKED` để atomic, idempotent. 100% loại bỏ race condition.
- **VietQR URL template**: Dùng `img.vietqr.io` URL template thay vì Canvas/JS library — zero bundle overhead, tải cực nhanh.
- **Telegram Long Polling in-process**: Chạy trong cùng Express process để đơn giản hóa deploy Render.com (không cần webhook URL riêng).
- **Cloudinary stream upload**: Không lưu file temp ra disk — upload thẳng Buffer qua `upload_stream` để tránh tràn memory trên free tier.
- **Auto-cancel cron**: Gọi `auto_cancel_expired_orders()` RPC mỗi phút từ node-cron.

## Product

Hệ thống 4 phân hệ:
1. **Storefront** (Next.js): Trang bán hàng SSR/SEO, VietQR động, polling trạng thái đơn.
2. **Backend API** (Express): REST endpoints, SePay webhook, order management.
3. **Telegram Bot Admin**: Thông báo đơn paid, nút Đã giao, /report upload bill.
4. **Admin Dashboard** (Next.js): Báo cáo tra soát giao dịch kèm ảnh bill.

## User preferences

_Triển khai theo 6 phân đoạn tuần tự, full code production-ready mỗi phân đoạn._

## Gotchas

- Chạy `pnpm --filter @workspace/api-spec run codegen` sau MỖI lần sửa `openapi.yaml`.
- Orval v8 sinh Zod v4 syntax — giữ `type: number` thay cho `type: integer` và không dùng `format: uuid/email` trong OpenAPI spec để tránh lỗi Zod v3.
- `lib/api-zod/src/index.ts` CHỈ export từ `./generated/api` — không export `./generated/types` (duplicate).
- `SUPABASE_SERVICE_ROLE_KEY` TUYỆT ĐỐI không expose ra frontend.
- SePay webhook luôn trả 200 OK dù lỗi — để SePay không retry liên tục.

## Deployment Phases

| Phase | Status | Nội dung |
|---|---|---|
| 1 | ✅ Done | Supabase Schema, RPC, RLS, Seed |
| 2 | ✅ Done | Express Setup, Configs, Types, Middlewares, Routes |
| 3 | 🔲 Next | SePay Controller, Order Services, Cloudinary, Cron |
| 4 | 🔲 | Telegram Bot Engine (Polling, Notifier, /report) |
| 5 | 🔲 | Next.js Frontend (Storefront + Admin Dashboard) |
| 6 | 🔲 | Deployment Cheat Sheet |

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
