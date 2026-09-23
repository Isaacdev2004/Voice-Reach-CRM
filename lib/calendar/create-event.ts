import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createGoogleCalendarEvent, getGoogleConnection, type Recurrence } from "./google";
import { expandRecurrenceOccurrences } from "./recurrence";

export type { Recurrence };

export async function createOwnerCalendarEvent(options: {
  ownerId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  description?: string;
  contactId?: string | null;
  recurrence?: Recurrence;
  meetingLink?: string | null;
  timeZone?: string;
}): Promise<{
  eventId: string;
  googleEventId?: string;
  htmlLink?: string;
  syncedToGoogle: boolean;
  instancesCreated: number;
}> {
  const start = new Date(options.startsAt);
  const end = new Date(options.endsAt ?? new Date(start.getTime() + 60 * 60_000).toISOString());
  const timeZone = options.timeZone ?? "America/New_York";
  const recurrence = options.recurrence ?? "none";
  const meetingLink = options.meetingLink?.trim() || null;

  let googleEventId: string | undefined;
  let htmlLink: string | undefined;
  let syncedToGoogle = false;

  const connection = await getGoogleConnection(options.ownerId).catch(() => null);
  if (connection) {
    const created = await createGoogleCalendarEvent({
      connection,
      title: options.title,
      description: options.description,
      start,
      end,
      timeZone,
      recurrence,
      meetingLink,
    });
    googleEventId = created.eventId;
    htmlLink = created.htmlLink;
    syncedToGoogle = true;
  }

  const seriesId = recurrence !== "none" ? crypto.randomUUID() : undefined;
  const occurrences =
    syncedToGoogle && recurrence !== "none"
      ? [{ start, end }]
      : expandRecurrenceOccurrences({ start, end, recurrence });

  const rows = occurrences.map((occurrence, index) => ({
    owner_id: options.ownerId,
    contact_id: options.contactId ?? null,
    external_event_id:
      syncedToGoogle && index === 0 && googleEventId
        ? googleEventId
        : `local-${crypto.randomUUID()}`,
    provider: syncedToGoogle && index === 0 ? "google" : "local",
    title: options.title,
    starts_at: occurrence.start.toISOString(),
    ends_at: occurrence.end.toISOString(),
    metadata: {
      htmlLink: index === 0 ? htmlLink : null,
      description: options.description,
      recurrence,
      meetingLink,
      seriesId,
      seriesIndex: index,
      remindMinutesBefore: 15,
    },
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from("calendar_events")
    .insert(rows)
    .select("id");

  if (error) throw new Error(error.message);

  const eventId = inserted?.[0]?.id;
  if (!eventId) throw new Error("Could not save calendar event");

  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_CREATED",
    entityType: "calendar_event",
    entityId: eventId,
    metadata: {
      title: options.title,
      syncedToGoogle,
      googleEventId,
      instancesCreated: rows.length,
    },
  }).catch(() => undefined);

  return {
    eventId,
    googleEventId,
    htmlLink,
    syncedToGoogle,
    instancesCreated: rows.length,
  };
}

export function recurrenceLabel(recurrence: Recurrence): string {
  switch (recurrence) {
    case "daily":
      return "Repeats daily";
    case "weekly":
      return "Repeats weekly";
    case "monthly":
      return "Repeats monthly";
    default:
      return "One time";
  }
}
