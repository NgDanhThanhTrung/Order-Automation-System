// =============================================================================
// Cloudinary Client Singleton
// Cấu hình một lần, tái sử dụng toàn project.
// =============================================================================

import { v2 as cloudinary } from "cloudinary";
import { getConfig } from "../config/index.js";

let _initialized = false;

/**
 * Khởi tạo Cloudinary SDK với credentials từ config.
 * Gọi một lần khi server start.
 */
export function initCloudinary(): void {
  if (_initialized) return;

  const config = getConfig();

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true, // Luôn dùng HTTPS
  });

  _initialized = true;
}

/**
 * Lấy cloudinary instance đã được configure.
 * Gọi initCloudinary() trước khi sử dụng.
 */
export function getCloudinary() {
  if (!_initialized) {
    initCloudinary();
  }
  return cloudinary;
}

// Export cloudinary instance for direct use
export { cloudinary };

// Reset cho tests
export function resetCloudinary(): void {
  _initialized = false;
}
