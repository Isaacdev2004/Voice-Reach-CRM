import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calendarLinksEnabled } from "@/lib/calendar/links";
import { readCalendar } from "@/lib/calendar/read-model";
import { conflictsFor } from "@/lib/calendar/conflicts";
import { z } from "zod";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  if (!calendarLinksEnabled()) return apiOk({ requests: [], enabled: false });
  const r = await supabaseAdmin
    .from("calendar_booking_requests")
    .select("id, guest_name, guest_email, starts_at, ends_at, status")
    .eq("owner_id", owner)
    .eq("status", "pending")
    .order("starts_at", { ascending: true })
    .limit(100);
  if (r.error)
    return apiError("Booking requests are temporarily unavailable.", {
      status: 503,
    });
  return apiOk({ requests: r.data, enabled: true });
});
export const POST = withApiHandler(async (req: Request) => {
  const owner = await requireUserId();
  if (!calendarLinksEnabled())
    return apiError("Booking links need configuration.", { status: 503 });
  const b = z
    .object({ id: z.string().uuid(), action: z.enum(["confirm", "decline"]) })
    .safeParse(await req.json().catch(() => null));
  if (!b.success)
    return apiError("Check the request selection.", { status: 400 });
  const found = await supabaseAdmin
    .from("calendar_booking_requests")
    .select("id, starts_at, ends_at")
    .eq("owner_id", owner)
    .eq("id", b.data.id)
    .eq("status", "pending")
    .maybeSingle();
  if (found.error || !found.data)
    return apiError("Request unavailable.", { status: 404 });
  try {
    if (b.data.action === "decline") {
      const r = await supabaseAdmin
        .from("calendar_booking_requests")
        .update({ status: "cancelled" })
        .eq("owner_id", owner)
        .eq("id", b.data.id)
        .eq("status", "pending")
        .select("id");
      if (r.error || !r.data?.length) throw Error();
      return apiOk({ declined: true });
    }
    const calendar = await readCalendar(
      owner,
      found.data.starts_at,
      found.data.ends_at,
    );
    if (
      calendar.health.some((h) => !!h.error) ||
      (calendar.authorized && !calendar.connected)
    )
      return apiError(
        "External availability could not be verified. Reconnect and refresh.",
        { status: 409 },
      );
    if (
      conflictsFor(calendar.agenda, found.data.starts_at, found.data.ends_at)
        .length
    )
      return apiError(
        "This request overlaps an appointment. Review the calendar.",
        { status: 409 },
      );
    const saved = await supabaseAdmin.rpc("confirm_calendar_booking", {
      p_owner: owner,
      p_request: b.data.id,
    });
    if (saved.error)
      return apiError(
        "Request changed or its time is no longer available. Refresh before retrying.",
        { status: 409 },
      );
    return apiOk({
      eventId: saved.data,
      confirmed: true,
      message:
        "Appointment saved locally. No invitations or notifications sent.",
    });
  } catch {
    return apiError(
      "The request could not be updated. Refresh and try again.",
      { status: 503 },
    );
  }
});
