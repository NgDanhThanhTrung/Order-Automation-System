// =============================================================================
// Supabase Client Singleton
// Dùng service_role key → bypass RLS, full access tất cả bảng.
// TUYỆT ĐỐI không expose key này ra frontend.
// =============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config/index.js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const config = getConfig();

  _client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      // Service role không cần auth session
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Giúp trace request trong Supabase logs
        "x-client-info": "payment-system-backend/1.0",
      },
    },
  });

  return _client;
}

// Reset dùng cho tests
export function resetSupabaseClient(): void {
  _client = null;
}
