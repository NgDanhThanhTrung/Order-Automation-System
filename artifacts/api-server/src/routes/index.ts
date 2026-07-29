// =============================================================================
// Route Registry — Đăng ký tất cả route groups
// =============================================================================

import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import webhookRouter from "./webhook.js";
import reportsRouter from "./reports.js";

const router: IRouter = Router();

// GET /api/healthz — Health check (public, cho UptimeRobot)
router.use(healthRouter);

// GET /api/products — Danh sách & chi tiết sản phẩm (public)
router.use("/products", productsRouter);

// POST /api/orders — Tạo đơn hàng (public)
// GET  /api/orders/:id — Chi tiết đơn hàng (public)
router.use("/orders", ordersRouter);

// POST /api/webhook/sepay — SePay webhook (protected by sePayAuth)
router.use("/webhook", webhookRouter);

// GET  /api/reports — Danh sách tra soát (admin only)
// POST /api/reports — Upload bill report (admin only)
router.use("/reports", reportsRouter);

export default router;
