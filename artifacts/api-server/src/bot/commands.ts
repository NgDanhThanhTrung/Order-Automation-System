// =============================================================================
// Bot Commands & Callback Handlers
//
// Commands (admin only):
//   /start   — Welcome + hướng dẫn
//   /help    — Danh sách lệnh
//   /orders  — 5 đơn hàng gần nhất (pending + paid)
//   /stats   — Doanh thu hôm nay
//
// Callbacks:
//   ship:{orderId} — Admin bấm "✅ Đã giao" trên notification message
// =============================================================================

import type { Context } from "telegraf";
import { getTelegramBot } from "../lib/telegramBot.js";
import { adminGuard } from "./adminGuard.js";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { markOrderShipped, setOrderTelegramMessageId } from "../services/orderService.js";
import { logger } from "../lib/logger.js";
import type { Order } from "../types/index.js";

// ─────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────

const STATUS_EMOJI: Record<string, string> = {
  pending:   "🕐",
  paid:      "💰",
  shipped:   "📦",
  cancelled: "❌",
};

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─────────────────────────────────────────────
// Register all commands & callbacks
// ─────────────────────────────────────────────

export function registerBotCommands(): void {
  const bot = getTelegramBot();

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.command("start", adminGuard, async (ctx: Context) => {
    await ctx.reply(
      `👋 *Chào Admin!*\n\n` +
        `Bot thanh toán tự động đang hoạt động.\n` +
        `Gõ /help để xem danh sách lệnh.\n\n` +
        `📸 Gửi ảnh bất kỳ để upload hóa đơn lên Cloudinary.`,
      { parse_mode: "Markdown" },
    );
  });

  // ── /help ───────────────────────────────────────────────────────────────────
  bot.command("help", adminGuard, async (ctx: Context) => {
    await ctx.reply(
      `*📋 Danh sách lệnh:*\n\n` +
        `/orders  — 5 đơn hàng mới nhất\n` +
        `/stats   — Doanh thu hôm nay\n` +
        `/report  — Hướng dẫn upload hóa đơn\n` +
        `/help    — Hiển thị menu này\n\n` +
        `*📸 Upload hóa đơn:*\n` +
        `Gửi ảnh kèm caption là Order ID (UUID)\n` +
        `để gắn hóa đơn vào đơn hàng tương ứng.`,
      { parse_mode: "Markdown" },
    );
  });

  // ── /orders ─────────────────────────────────────────────────────────────────
  bot.command("orders", adminGuard, async (ctx: Context) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_code, status, total_amount, customer_name, created_at, paid_at")
        .in("status", ["pending", "paid"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const orders = (data ?? []) as Pick<
        Order,
        "id" | "order_code" | "status" | "total_amount" | "customer_name" | "created_at" | "paid_at"
      >[];

      if (orders.length === 0) {
        await ctx.reply("✅ Không có đơn hàng pending/paid nào.");
        return;
      }

      const lines = orders.map((o) => {
        const emoji = STATUS_EMOJI[o.status] ?? "❓";
        const customer = o.customer_name ?? "Khách lẻ";
        return (
          `${emoji} *${o.order_code}* — ${formatVND(o.total_amount)}\n` +
          `   👤 ${customer} | 🕐 ${formatDate(o.created_at)}`
        );
      });

      await ctx.reply(
        `*📦 5 đơn hàng gần nhất:*\n\n${lines.join("\n\n")}`,
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      logger.error({ err }, "[BotCommands] /orders error");
      await ctx.reply("❌ Lỗi khi lấy danh sách đơn hàng.");
    }
  });

  // ── /report ─────────────────────────────────────────────────────────────────
  // Upload bill từ URL hoặc hiện thị hướng dẫn upload
  bot.command("report", adminGuard, async (ctx: Context) => {
    await ctx.reply(
      `*📸 Upload hóa đơn thanh toán:*\n\n` +
        `Cách 1: Gửi ảnh trực tiếp\n` +
        `• Gửi ảnh kèm caption là Order ID (UUID)\n` +
        `• Bot sẽ tự upload lên Cloudinary và lưu vào payment_reports\n\n` +
        `Cách 2: Sử dụng API\n` +
        `• POST /api/reports với admin header\n` +
        `• Xem tài liệu API chi tiết\n\n` +
        `💡 Order ID dạng: \`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\``,
      { parse_mode: "Markdown" },
    );
  });

  // ── /stats ───────────────────────────────────────────────────────────────────
  bot.command("stats", adminGuard, async (ctx: Context) => {
    try {
      const supabase = getSupabaseClient();

      // Đếm tổng đơn + doanh thu hôm nay (theo Asia/Ho_Chi_Minh)
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
      const todayStart = `${today}T00:00:00+07:00`;
      const todayEnd   = `${today}T23:59:59+07:00`;

      const [paidResult, pendingResult] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount")
          .eq("status", "paid")
          .gte("paid_at", todayStart)
          .lte("paid_at", todayEnd),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (paidResult.error) throw paidResult.error;
      if (pendingResult.error) throw pendingResult.error;

      const paidOrders = paidResult.data ?? [];
      const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
      const pendingCount = pendingResult.count ?? 0;

      await ctx.reply(
        `*📊 Thống kê hôm nay (${today}):*\n\n` +
          `💰 Doanh thu: *${formatVND(revenue)}*\n` +
          `✅ Đơn đã TT: *${paidOrders.length}*\n` +
          `🕐 Đơn chờ TT: *${pendingCount}*`,
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      logger.error({ err }, "[BotCommands] /stats error");
      await ctx.reply("❌ Lỗi khi lấy thống kê.");
    }
  });

  // ── Callback: ship:{orderId} ─────────────────────────────────────────────────
  // Triggered khi admin bấm nút "✅ Đã giao hàng" trong notification
  bot.action(/^ship:(.+)$/, adminGuard, async (ctx: Context) => {
    const orderId = (ctx as any).match?.[1] as string | undefined;
    if (!orderId) {
      await ctx.answerCbQuery("❌ Không tìm thấy Order ID");
      return;
    }

    try {
      const shipped = await markOrderShipped(orderId);

      if (!shipped) {
        await ctx.answerCbQuery("⚠️ Đơn hàng không thể xác nhận (đã shipped hoặc không tồn tại)");
        return;
      }

      // Chỉnh sửa message gốc — xóa nút, thêm dòng xác nhận
      try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.editMessageText(
          ((ctx.callbackQuery as any)?.message?.text ?? "") +
            `\n\n✅ *ĐÃ XÁC NHẬN GIAO HÀNG*\n📅 ${formatDate(shipped.shipped_at)}`,
          { parse_mode: "Markdown" },
        );
      } catch {
        // Edit có thể fail nếu message quá cũ (>48h) — không sao
      }

      await ctx.answerCbQuery(`✅ Đã giao: ${shipped.order_code}`);
      logger.info({ orderId, orderCode: shipped.order_code }, "[BotCommands] Order shipped via bot");
    } catch (err) {
      logger.error({ err, orderId }, "[BotCommands] ship callback error");
      await ctx.answerCbQuery("❌ Lỗi server, xem log.");
    }
  });

  // ── Error handler ───────────────────────────────────────────────────────────
  bot.catch((err: unknown, ctx: Context) => {
    logger.error({ err, updateType: ctx.updateType }, "[TelegramBot] Unhandled bot error");
  });

  logger.info("[TelegramBot] Commands & callbacks registered");
}
