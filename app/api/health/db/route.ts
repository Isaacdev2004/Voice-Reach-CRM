import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { humanizeDatabaseError, isDatabaseUnreachableMessage } from "@/lib/supabase-errors";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/server-config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  if (!isSupabaseConfigured()) {
    return apiError("Supabase env vars are missing on this deployment.", {
      status: 503,
      code: "service_unconfigured",
    });
  }

  const { url } = getSupabaseEnv();
  const { error } = await supabaseAdmin.from("contacts").select("id", { head: true, count: "exact" });

  if (error) {
    const message = humanizeDatabaseError(error.message);
    return apiError(message, {
      status: isDatabaseUnreachableMessage(message) ? 503 : 500,
      code: isDatabaseUnreachableMessage(message) ? "database_unreachable" : "database_error",
      details: { urlHost: new URL(url).host },
    });
  }

  return apiOk({ ok: true, urlHost: new URL(url).host });
});
