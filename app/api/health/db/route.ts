import { requireUserId } from "@/lib/auth";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { humanizeDatabaseError, isDatabaseUnreachableMessage } from "@/lib/supabase-errors";
import { isSupabaseConfigured } from "@/lib/server-config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  if (!isSupabaseConfigured()) {
    return apiError("Supabase env vars are missing on this deployment.", {
      status: 503,
      code: "service_unconfigured",
    });
  }

  const { error } = await supabaseAdmin.from("contacts").select("id", { head: true, count: "exact" }).eq("owner_id", ownerId);

  if (error) {
    const message = humanizeDatabaseError(error.message);
    return apiError("Database health could not be verified. Please try again later.", {
      status: isDatabaseUnreachableMessage(message) ? 503 : 500,
      code: isDatabaseUnreachableMessage(message) ? "database_unreachable" : "database_error",
    });
  }

  return apiOk({ ok: true });
});
