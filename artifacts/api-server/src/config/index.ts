// =============================================================================
// Config — Tập trung tất cả biến môi trường, validate khi khởi động.
// Throw lỗi rõ ràng nếu thiếu biến bắt buộc (fail-fast).
// =============================================================================

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[Config] Missing required environment variable: ${key}\n` +
        `  → Copy .env.example to .env and fill in the value.`,
    );
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key]?.trim() || defaultValue;
}

function optionalBoolEnv(key: string, defaultValue: boolean): boolean {
  const val = process.env[key]?.trim().toLowerCase();
  if (val === undefined || val === "") return defaultValue;
  return val === "true" || val === "1";
}

// Parse danh sách Admin Chat IDs (có thể nhiều ID phân cách bằng dấu phẩy)
function parseAdminChatIds(raw: string): Set<number> {
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const id = parseInt(s, 10);
        if (isNaN(id)) {
          throw new Error(`[Config] Invalid ADMIN_TELEGRAM_CHAT_IDS value: "${s}" is not a number`);
        }
        return id;
      }),
  );
}

// ─────────────────────────────────────────────
// BUILD CONFIG OBJECT (lazy — chỉ validate khi gọi lần đầu)
// ─────────────────────────────────────────────

let _config: AppConfig | null = null;

export interface AppConfig {
  // Server
  port: number;
  nodeEnv: "development" | "production" | "test";
  logLevel: string;

  // Supabase
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;

  // SePay
  sePayWebhookToken: string;

  // Bank / VietQR
  bankId: string;
  bankAccountNo: string;
  bankAccountName: string;

  // Telegram
  telegramBotToken: string;
  adminTelegramChatIds: Set<number>;

  // Cloudinary
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  cloudinaryUploadFolder: string;

  // Cron
  cronAutoCancelExpr: string;
  cronEnabled: boolean;
}

export function getConfig(): AppConfig {
  if (_config) return _config;

  const rawPort = optionalEnv("PORT", "5000");
  const port = parseInt(rawPort, 10);
  if (isNaN(port) || port <= 0) {
    throw new Error(`[Config] Invalid PORT value: "${rawPort}"`);
  }

  const rawAdminIds = requireEnv("ADMIN_TELEGRAM_CHAT_IDS");

  _config = {
    // Server
    port,
    nodeEnv: (optionalEnv("NODE_ENV", "development") as AppConfig["nodeEnv"]),
    logLevel: optionalEnv("LOG_LEVEL", "info"),

    // Supabase
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: requireEnv("SUPABASE_ANON_KEY"),

    // SePay
    sePayWebhookToken: requireEnv("SEPAY_WEBHOOK_TOKEN"),

    // Bank
    bankId: requireEnv("BANK_ID"),
    bankAccountNo: requireEnv("BANK_ACCOUNT_NO"),
    bankAccountName: requireEnv("BANK_ACCOUNT_NAME"),

    // Telegram
    telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    adminTelegramChatIds: parseAdminChatIds(rawAdminIds),

    // Cloudinary
    cloudinaryCloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    cloudinaryApiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudinaryApiSecret: requireEnv("CLOUDINARY_API_SECRET"),
    cloudinaryUploadFolder: optionalEnv("CLOUDINARY_UPLOAD_FOLDER", "payment_reports"),

    // Cron
    cronAutoCancelExpr: optionalEnv("CRON_AUTO_CANCEL_EXPR", "* * * * *"),
    cronEnabled: optionalBoolEnv("CRON_ENABLED", true),
  };

  return _config;
}

// Reset dùng cho tests
export function resetConfig(): void {
  _config = null;
}
