import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { isGoogleCalendarConfigured } from "@/lib/calendar/google";
import { tokenEncryptionConfigured } from "@/lib/calendar/token-crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  const c = await supabaseAdmin
    .from("calendar_connections")
    .select("account_email, calendar_id")
    .eq("owner_id", owner)
    .eq("provider", "google")
    .maybeSingle();
  if (c.error)
    return apiError("Calendar connection status is unavailable.", {
      status: 503,
    });
  const s = await supabaseAdmin
    .from("audit_logs")
    .select("created_at")
    .eq("owner_id", owner)
    .eq("entity_type", "calendar_sync")
    .eq("action", "CALENDAR_SYNC_SUCCEEDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return apiOk({
    configured: isGoogleCalendarConfigured() && tokenEncryptionConfigured(),
    connected: !!c.data,
    authorized: !!c.data,
    syncVerified: false,
    accountEmail: c.data?.account_email ?? null,
    calendarId: c.data?.calendar_id ?? null,
    lastUpdated: s.data?.created_at ?? null,
    lastSuccessfulSync: s.data?.created_at ?? null,
    status: c.data
      ? "Authorized; open Calendar to verify synchronization"
      : "Not connected",
  });
});
export const DELETE = withApiHandler(async () => {
  const owner = await requireUserId();
  const r = await supabaseAdmin
    .from("calendar_connections")
    .delete()
    .eq("owner_id", owner)
    .eq("provider", "google");
  if (r.error)
    return apiError("Calendar could not be disconnected.", { status: 503 });
  return apiOk({ disconnected: true });
});
