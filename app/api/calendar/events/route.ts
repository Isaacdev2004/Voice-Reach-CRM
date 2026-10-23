import { apiOk, apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { readCalendar } from "@/lib/calendar/read-model";
import { CalendarEventSchema } from "@/lib/calendar/event-schema";
import { createOwnerCalendarEvent } from "@/lib/calendar/create-event";
export const GET = withApiHandler(async (request: Request) => {
  const owner = await requireUserId();
  const q = new URL(request.url).searchParams;
  const month = q.get("month");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return apiError("Choose a valid calendar month.", { status: 400 });
  const fallback =
    month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      ? Date.parse(month + "-01T00:00Z")
      : Date.now() - 7 * 86400000;
  const from = q.get("from") ?? new Date(fallback).toISOString();
  const to = q.get("to") ?? new Date(fallback + 70 * 86400000).toISOString();
  if (
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    Date.parse(to) <= Date.parse(from) ||
    Date.parse(to) - Date.parse(from) > 100 * 86400000
  )
    return apiError("Choose a calendar range of up to 100 days.", {
      status: 400,
    });
  try {
    return apiOk(await readCalendar(owner, from, to));
  } catch {
    return apiError(
      "Calendar information is temporarily unavailable. Please refresh.",
      { status: 503 },
    );
  }
});
export const POST = withApiHandler(async (request: Request) => {
  const ownerId = await requireUserId();
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return apiError("Check the appointment details.", { status: 400 });
  const parsed = CalendarEventSchema.safeParse({
    ...raw,
    endsAt:
      raw.endsAt ??
      (Number.isFinite(Date.parse(raw.startsAt))
        ? new Date(Date.parse(raw.startsAt) + 3600000).toISOString()
        : undefined),
  });
  if (!parsed.success)
    return apiError(
      "Check the appointment title, dates, and contact selection.",
      { status: 400 },
    );
  try {
    return apiOk(await createOwnerCalendarEvent({ ownerId, ...parsed.data }), {
      status: 201,
    });
  } catch (e) {
    const overlap = e instanceof Error && e.message === "CALENDAR_OVERLAP";
    return apiError(
      overlap
        ? "This time overlaps an existing appointment. Review the conflict before saving."
        : "Appointment could not be saved. Refresh and check your selections.",
      {
        status: overlap ? 409 : 503,
        code: overlap ? "calendar_overlap" : "calendar_unavailable",
      },
    );
  }
});
