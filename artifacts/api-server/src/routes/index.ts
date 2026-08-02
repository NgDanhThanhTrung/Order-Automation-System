// =============================================================================
// Route Registry — Đăng ký tất cả route groups
// =============================================================================

import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import webhookRouter from "./webhook.js";
import webhookTestRouter from "./webhook-test.js";
import reportsRouter from "./reports.js";
import docsRouter from "./docs.js";

const router: IRouter = Router();

// GET /api/docs — API documentation (Swagger UI)
router.use("/docs", docsRouter);

// GET /api/healthz — Health check (public, cho UptimeRobot)
router.use(healthRouter);

// GET /api/products — Danh sách & chi tiết sản phẩm (public)
router.use("/products", productsRouter);

// POST /api/orders — Tạo đơn hàng (public)
// GET  /api/orders/:id — Chi tiết đơn hàng (public)
router.use("/orders", ordersRouter);

// POST /api/webhook/sepay — SePay webhook (protected by sePayAuth)
// POST /api/webhook/test — Test webhook (no auth, for testing)
router.use("/webhook", webhookRouter);
router.use("/webhook", webhookTestRouter);

// GET  /api/reports — Danh sách tra soát (admin only)
// POST /api/reports — Upload bill report (admin only)
router.use("/reports", reportsRouter);

export default router;
