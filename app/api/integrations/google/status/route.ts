import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  getGoogleConnection,
  isGoogleCalendarConfigured,
} from "@/lib/calendar/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const connection = await getGoogleConnection(ownerId);

  return apiOk({
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(connection),
    accountEmail: connection?.account_email ?? null,
    calendarId: connection?.calendar_id ?? null,
    lastUpdated: connection?.updated_at ?? null,
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
