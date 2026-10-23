import { readCalendar } from "@/lib/calendar/read-model";
import { loadCalendarPreferences } from "@/lib/calendar/load-preferences";
import { conflictsFor } from "@/lib/calendar/conflicts";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  getGoogleConnection,
  listGoogleCalendars,
  getGoogleEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/calendar/google";
import { validateInterval, validTimeZone } from "@/lib/calendar/time";
import { z } from "zod";
const input = z.object({
  calendarId: z.string().min(1).max(512),
  eventId: z.string().min(1).max(1024),
  etag: z.string().min(1).max(500),
  title: z.string().trim().min(1).max(200).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  description: z.string().max(2000).optional(),
  meetingLink: z
    .string()
    .url()
    .refine((s) => /^https?:\/\//.test(s))
    .nullable()
    .optional(),
  allowConflict: z.boolean().default(false),
  timeZone: z.string().refine(validTimeZone).default("America/New_York"),
});
async function change(req: Request, remove: boolean) {
  const owner = await requireUserId();
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return apiError("Check the event details and refresh its version.", {
      status: 400,
    });
  const b = parsed.data;
  try {
    const connection = await getGoogleConnection(owner);
    if (!connection)
      return apiError(
        "Connect Google Calendar before changing an external event.",
        { status: 409 },
      );
    const calendars = await listGoogleCalendars(connection);
    if (
      !calendars.some(
        (c) =>
          c.id === b.calendarId && ["owner", "writer"].includes(c.accessRole),
      )
    )
      return apiError("This calendar is read only or unavailable.", {
        status: 403,
      });
    const event = await getGoogleEvent(connection, b.eventId, b.calendarId);
    if (!event || event.visibility === "private")
      return apiError("Event unavailable.", { status: 404 });
    if (event.etag !== b.etag)
      return apiError("This event changed in Google. Refresh before editing.", {
        status: 409,
      });
    if (remove) {
      await deleteGoogleCalendarEvent({
        connection,
        eventId: b.eventId,
        calendarId: b.calendarId,
        etag: b.etag,
      });
      return apiOk({ deleted: true });
    }
    if (event.start?.date)
      return apiError("Edit all-day external events in Google Calendar.", {
        status: 400,
      });
    const start = b.startsAt ?? event.start?.dateTime,
      end = b.endsAt ?? event.end?.dateTime;
    validateInterval(start, end);
    if (!b.allowConflict) {
      const prefs = await loadCalendarPreferences(owner);
      const snapshot = await readCalendar(owner, start, end);
      if (!snapshot.connected) throw Error("EXTERNAL_UNVERIFIED");
      if (
        conflictsFor(
          snapshot.agenda.filter(
            (i) =>
              !(
                i.externalId === b.eventId &&
                i.externalCalendarId === b.calendarId
              ),
          ),
          start,
          end,
          prefs,
        ).length
      )
        return apiError(
          "This time overlaps another appointment. Review the calendar.",
          { status: 409 },
        );
    }
    await updateGoogleCalendarEvent({
      connection,
      eventId: b.eventId,
      calendarId: b.calendarId,
      etag: b.etag,
      title: b.title ?? event.summary ?? "Appointment",
      description: b.description ?? event.description,
      start: new Date(start),
      end: new Date(end),
      timeZone: b.timeZone,
      meetingLink: b.meetingLink,
    });
    return apiOk({ saved: true });
  } catch (e) {
    const conflict = e instanceof Error && e.message === "CALENDAR_CONFLICT";
    return apiError(
      conflict
        ? "This event changed in Google. Refresh before saving."
        : "External event could not be changed. Refresh and check authorization.",
      { status: conflict ? 409 : 503 },
    );
  }
}
export const PATCH = withApiHandler((req: Request) => change(req, false));
export const DELETE = withApiHandler((req: Request) => change(req, true));
