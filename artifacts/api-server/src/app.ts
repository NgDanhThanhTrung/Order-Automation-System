// =============================================================================
// Express App — Cấu hình middlewares, routes, error handlers
// =============================================================================

import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { notFoundHandler, globalErrorHandler } from "./middlewares/errorHandler.js";
import { generalRateLimiter } from "./middlewares/rateLimiter.js";
import { requestIdMiddleware } from "./middlewares/requestId.js";

const app: Express = express();

// ─────────────────────────────────────────────
// REQUEST ID TRACKING (must be first)
// ─────────────────────────────────────────────
app.use(requestIdMiddleware);

// ─────────────────────────────────────────────
// SECURITY HEADERS
// ─────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────
// HTTP REQUEST LOGGING
// ─────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: (req as Request & { requestId: string }).requestId,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (mobile, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env["FRONTEND_URL"],
        process.env["NEXT_PUBLIC_API_URL"],
        // Vercel preview URLs
        /^https:\/\/.*\.vercel\.app$/,
        // Localhost development
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      ].filter(Boolean);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") return allowed === origin;
        if (allowed instanceof RegExp) return allowed.test(origin);
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn({ origin }, "CORS blocked origin");
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Telegram-Chat-Id",
      "X-Request-Id",
    ],
  }),
);

// ─────────────────────────────────────────────
// BODY PARSERS
// ─────────────────────────────────────────────
// Raw body cần thiết cho SePay webhook signature verification (nếu dùng)
app.use(
  express.json({
    limit: "1mb",
    verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────
app.use(generalRateLimiter);

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.use("/api", router);

// ─────────────────────────────────────────────
// 404 & GLOBAL ERROR HANDLER (phải đặt cuối cùng)
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
