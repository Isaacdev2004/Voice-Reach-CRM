import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, getSupabaseEnv } from "@/lib/server-config";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  assertSupabaseConfigured();
  const { url, serviceRoleKey } = getSupabaseEnv();

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

/** @deprecated Use getSupabaseAdmin() — lazy init for frontend-only builds */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseAdmin(), prop);
  },
});
