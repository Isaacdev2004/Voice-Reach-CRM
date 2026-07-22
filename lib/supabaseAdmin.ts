import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, getSupabaseEnv, ServiceConfigError } from "@/lib/server-config";

let client: SupabaseClient | null = null;

async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network error";
    throw new ServiceConfigError(
      reason.includes("fetch failed") || reason.includes("ENOTFOUND")
        ? "Cannot reach Supabase. Check that your Supabase project is active and NEXT_PUBLIC_SUPABASE_URL is correct in Vercel."
        : `Database connection failed (${reason}).`,
    );
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  assertSupabaseConfigured();
  const { url, serviceRoleKey } = getSupabaseEnv();

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch },
  });

  return client;
}

/** @deprecated Use getSupabaseAdmin() — lazy init for frontend-only builds */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseAdmin(), prop);
  },
});
