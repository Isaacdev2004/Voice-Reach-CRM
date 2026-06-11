import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { isGoogleCalendarConfigured } from "@/lib/calendar/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("calendar_connections")
    .select("account_email, calendar_id, updated_at")
    .eq("owner_id", ownerId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    const missingTable = error.message.includes("calendar_connections");
    return apiOk({
      configured: isGoogleCalendarConfigured(),
      connected: false,
      accountEmail: null,
      calendarId: null,
      lastUpdated: null,
      setupError: missingTable
        ? "Database table missing — run supabase/schema-calendar.sql in Supabase."
        : error.message,
    });
  }

  return apiOk({
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(data),
    accountEmail: data?.account_email ?? null,
    calendarId: data?.calendar_id ?? null,
    lastUpdated: data?.updated_at ?? null,
  });
});

export const DELETE = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const { error } = await supabaseAdmin
    .from("calendar_connections")
    .delete()
    .eq("owner_id", ownerId)
    .eq("provider", "google");

  if (error) return apiError(error.message, { status: 500 });
  return apiOk({ disconnected: true });
});
