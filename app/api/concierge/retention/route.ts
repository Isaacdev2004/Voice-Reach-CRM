import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
/** Explicit operator-run cleanup; not scheduled or enabled by this change. */
export const POST = withApiHandler(async request => {
  const secret = process.env.CRON_SECRET?.trim();
  if (process.env.CONCIERGE_RETENTION_ENABLED !== "true" || !secret || request.headers.get("authorization") !== `Bearer ${secret}`) return apiError("Unauthorized", { status: 401 });
  const now = new Date().toISOString();
  const expired = await supabaseAdmin.from("concierge_imports").select("id,owner_id").eq("state", "preview").lte("expires_at", now).order("expires_at").limit(100);
  if (expired.error) return apiError("Retention inspection unavailable", { status: 503 });
  let processed = 0;
  for (const row of expired.data) {
    const result = await supabaseAdmin.from("concierge_imports").update({ rows: [], row_errors: [], state: "expired" }).eq("owner_id", row.owner_id).eq("id", row.id).eq("state", "preview").lte("expires_at", now);
    if (result.error) return apiError("Retention incomplete; retry is safe", { status: 503 });
    processed++;
  }
  return apiOk({ inspected: processed, batchLimit: 100, message: "Expired preview payloads cleared; contacts and case history retained." });
});
