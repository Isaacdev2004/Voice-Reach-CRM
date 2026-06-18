import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createGoogleCalendarEvent, getGoogleConnection, type Recurrence } from "./google";

export type { Recurrence };

export async function createOwnerCalendarEvent(options: {
  ownerId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  description?: string;
  contactId?: string | null;
  recurrence?: Recurrence;
  timeZone?: string;
}): Promise<{
  eventId: string;
  googleEventId?: string;
  htmlLink?: string;
  syncedToGoogle: boolean;
}> {
  const start = new Date(options.startsAt);
  const end = new Date(options.endsAt ?? new Date(start.getTime() + 60 * 60_000).toISOString());
  const timeZone = options.timeZone ?? "America/New_York";

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
      recurrence: options.recurrence ?? "none",
    });
    googleEventId = created.eventId;
    htmlLink = created.htmlLink;
    syncedToGoogle = true;
  }

  const externalId = googleEventId ?? `local-${crypto.randomUUID()}`;

  const { data: row, error } = await supabaseAdmin
    .from("calendar_events")
    .insert({
      owner_id: options.ownerId,
      contact_id: options.contactId ?? null,
      external_event_id: externalId,
      provider: googleEventId ? "google" : "local",
      title: options.title,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      metadata: {
        htmlLink,
        description: options.description,
        recurrence: options.recurrence ?? "none",
      },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_CREATED",
    entityType: "calendar_event",
    entityId: row.id,
    metadata: { title: options.title, syncedToGoogle, googleEventId },
  }).catch(() => undefined);

  return {
    eventId: row.id,
    googleEventId,
    htmlLink,
    syncedToGoogle,
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
