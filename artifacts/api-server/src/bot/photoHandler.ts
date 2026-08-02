// =============================================================================
// Bot Photo Handler — Admin gửi ảnh → upload Cloudinary → lưu payment_report
//
// Luồng:
//   1. Admin gửi photo (có thể kèm caption = orderId)
//   2. Bot download file từ Telegram về Buffer
//   3. Upload lên Cloudinary qua uploadBufferToCloudinary()
//   4. Lưu payment_reports vào Supabase (savePaymentReport)
//   5. Reply URL ảnh + public_id
// =============================================================================

import type { Context } from "telegraf";
import { getTelegramBot } from "../lib/telegramBot.js";
import { uploadBufferToCloudinary, savePaymentReport } from "../lib/cloudinaryUploader.js";
import { adminGuard } from "./adminGuard.js";
import { logger } from "../lib/logger.js";

/**
 * Đăng ký handler cho photo messages.
 * Gọi sau khi bot đã được khởi tạo, trước khi launch().
 */
export function registerPhotoHandler(): void {
  const bot = getTelegramBot();

  bot.on("photo", adminGuard, async (ctx: Context) => {
    const fromId = ctx.from?.id ?? 0;

    try {
      // Lấy ảnh có độ phân giải cao nhất
      const photos = (ctx.message as any)?.photo as Array<{
        file_id: string;
        file_size?: number;
        width: number;
        height: number;
      }>;

      if (!photos || photos.length === 0) {
        await ctx.reply("❌ Không nhận được ảnh.");
        return;
      }

      const bestPhoto = photos[photos.length - 1];
      const caption: string = (ctx.message as any)?.caption ?? "";

      // Caption có thể là orderId — parse UUID đơn giản
      const orderIdMatch = caption.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      const orderId = orderIdMatch ? orderIdMatch[0] : null;

      await ctx.reply("⏳ Đang upload ảnh lên Cloudinary...");

      // Download file từ Telegram
      const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);
      const response = await fetch(fileLink.href);
      if (!response.ok) {
        throw new Error(`Failed to download Telegram file: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.info(
        { fromId, fileId: bestPhoto.file_id, size: buffer.byteLength, orderId },
        "[PhotoHandler] Uploading bill image",
      );

      // Upload lên Cloudinary
      const uploadResult = await uploadBufferToCloudinary(buffer, {
        folder: "payment_reports",
        tags: ["bill", orderId ? `order:${orderId}` : "manual"],
      });

      // Lưu vào payment_reports
      await savePaymentReport({
        orderId: orderId ?? null,
        transactionId: null,
        cloudinaryResult: uploadResult,
        uploadedByTelegramId: fromId,
        note: caption || null,
      });

      await ctx.reply(
        `✅ Upload thành công!\n\n` +
          `🖼 URL: ${uploadResult.secure_url}\n` +
          `📁 Public ID: \`${uploadResult.public_id}\`\n` +
          (orderId ? `📦 Order ID: \`${orderId}\`` : "ℹ️ Không tìm thấy Order ID trong caption"),
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      logger.error({ err, fromId }, "[PhotoHandler] Upload failed");
      await ctx.reply("❌ Upload thất bại. Xem log server để biết chi tiết.");
    }
  });
}
