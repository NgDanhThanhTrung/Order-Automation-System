// =============================================================================
// Cloudinary Stream Uploader
//
// Upload Buffer/Stream thẳng lên Cloudinary — TUYỆT ĐỐI không lưu file
// tạm ra disk để tránh tràn bộ nhớ trên Render.com free tier.
//
// Sử dụng cloudinary.uploader.upload_stream (pipe Buffer vào stream).
// =============================================================================

import { Readable } from "stream";
import { getCloudinary } from "./cloudinaryClient.js";
import { getConfig } from "../config/index.js";
import { logger } from "./logger.js";
import type { CloudinaryUploadResult } from "../types/index.js";

// ─────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────
export interface UploadOptions {
  /** Sub-folder trong Cloudinary (mặc định: lấy từ CLOUDINARY_UPLOAD_FOLDER) */
  folder?: string;
  /** Public ID tùy chỉnh (mặc định: tự sinh) */
  publicId?: string;
  /** Tags để tìm kiếm trên Cloudinary dashboard */
  tags?: string[];
  /** Resource type (mặc định: 'image') */
  resourceType?: "image" | "raw" | "video" | "auto";
  /** Transformation khi upload (vd: resize, crop) */
  transformation?: object[];
  /** Giới hạn kích thước file (bytes) — mặc định: 10MB */
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

// ─────────────────────────────────────────────
// Core: uploadBufferToCloudinary
// ─────────────────────────────────────────────

/**
 * Upload một Buffer (từ Telegram file download, multipart, v.v.) lên Cloudinary
 * qua upload_stream — không cần lưu file tạm ra disk.
 *
 * @param buffer  - File buffer (PNG, JPG, WEBP, PDF, ...)
 * @param options - Upload options
 * @returns       Cloudinary upload result kèm public_id và secure_url
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<CloudinaryUploadResult> {
  const config = getConfig();
  const cloudinary = getCloudinary();

  // Validate kích thước
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (buffer.byteLength > maxBytes) {
    throw new Error(
      `File quá lớn: ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB vượt quá giới hạn ${(maxBytes / 1024 / 1024).toFixed(0)}MB`,
    );
  }

  const folder = options.folder ?? config.cloudinaryUploadFolder;
  const resourceType = options.resourceType ?? "image";

  logger.debug(
    { folder, size: buffer.byteLength, resourceType },
    "[Cloudinary] Starting stream upload",
  );

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId,
        tags: options.tags,
        resource_type: resourceType,
        transformation: options.transformation,
        // Tự động phát hiện format
        format: undefined,
        // Overwrite nếu cùng public_id
        overwrite: true,
        // Thêm metadata để trace
        context: {
          source: "payment-system-backend",
          uploaded_at: new Date().toISOString(),
        },
      },
      (error, result) => {
        if (error) {
          logger.error({ err: error, folder }, "[Cloudinary] Upload stream error");
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }

        logger.info(
          {
            publicId: result.public_id,
            url: result.secure_url,
            bytes: result.bytes,
            format: result.format,
          },
          "[Cloudinary] Upload successful",
        );

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          width: result.width ?? 0,
          height: result.height ?? 0,
          format: result.format ?? "unknown",
          bytes: result.bytes ?? 0,
          created_at: result.created_at ?? new Date().toISOString(),
        });
      },
    );

    // Convert Buffer → Readable stream và pipe vào upload stream
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);

    // Handle stream errors
    readable.on("error", (err) => {
      logger.error({ err }, "[Cloudinary] Readable stream error");
      reject(err);
    });

    uploadStream.on("error", (err) => {
      logger.error({ err }, "[Cloudinary] Upload stream pipe error");
      reject(err);
    });
  });
}

// ─────────────────────────────────────────────
// Xóa asset trên Cloudinary (dùng khi cần cleanup)
// ─────────────────────────────────────────────

/**
 * Xóa một asset khỏi Cloudinary theo public_id.
 * Ít dùng, nhưng hữu ích khi upload nhầm hoặc test.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const cloudinary = getCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    const success = result.result === "ok";

    if (success) {
      logger.info({ publicId }, "[Cloudinary] Asset deleted");
    } else {
      logger.warn({ publicId, result }, "[Cloudinary] Asset deletion result unexpected");
    }

    return success;
  } catch (err) {
    logger.error({ err, publicId }, "[Cloudinary] Delete error");
    return false;
  }
}

// ─────────────────────────────────────────────
// Lưu payment_report vào Supabase sau khi upload thành công
// ─────────────────────────────────────────────

import { getSupabaseClient } from "./supabaseClient.js";
import type { PaymentReport } from "../types/index.js";

export interface SavePaymentReportParams {
  orderId?: string | null;
  transactionId?: string | null;
  cloudinaryResult: CloudinaryUploadResult;
  uploadedByTelegramId?: number | null;
  note?: string | null;
}

/**
 * Lưu kết quả upload vào bảng payment_reports.
 * Gọi ngay sau uploadBufferToCloudinary().
 */
export async function savePaymentReport(
  params: SavePaymentReportParams,
): Promise<PaymentReport> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("payment_reports")
    .insert({
      order_id: params.orderId ?? null,
      transaction_id: params.transactionId ?? null,
      bill_image_url: params.cloudinaryResult.secure_url,
      cloudinary_public_id: params.cloudinaryResult.public_id,
      uploaded_by_telegram_id: params.uploadedByTelegramId ?? null,
      note: params.note ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, "[Cloudinary] savePaymentReport error");
    throw error;
  }

  logger.info(
    { reportId: (data as PaymentReport).id, orderId: params.orderId },
    "[Cloudinary] Payment report saved",
  );

  return data as PaymentReport;
}
