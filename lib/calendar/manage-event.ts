import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  deleteGoogleCalendarEvent,
  getGoogleConnection,
  updateGoogleCalendarEvent,
  type Recurrence,
} from "./google";

export async function updateOwnerCalendarEvent(options: {
  ownerId: string;
  eventId: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  meetingLink?: string | null;
  timeZone?: string;
}) {
  const { data: existing, error: findError } = await supabaseAdmin
    .from("calendar_events")
    .select("*")
    .eq("owner_id", options.ownerId)
    .eq("id", options.eventId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!existing) throw new Error("Event not found");

  const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
  const title = options.title?.trim() ?? existing.title;
  const startsAt = options.startsAt ?? existing.starts_at;
  const endsAt = options.endsAt ?? existing.ends_at;
  const description =
    options.description !== undefined
      ? options.description
      : (metadata.description as string | undefined);
  const meetingLink =
    options.meetingLink !== undefined
      ? options.meetingLink
      : ((metadata.meetingLink as string | undefined) ?? null);

  const connection = await getGoogleConnection(options.ownerId).catch(() => null);
  if (connection && existing.provider === "google" && existing.external_event_id) {
    await updateGoogleCalendarEvent({
      connection,
      eventId: existing.external_event_id,
      title,
      description,
      start: new Date(startsAt),
      end: new Date(endsAt),
      timeZone: options.timeZone ?? "America/New_York",
      meetingLink,
    });
  }

  const nextMetadata = {
    ...metadata,
    description,
    meetingLink,
  };

  const { error: updateError } = await supabaseAdmin
    .from("calendar_events")
    .update({
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      metadata: nextMetadata,
    })
    .eq("id", options.eventId)
    .eq("owner_id", options.ownerId);

  if (updateError) throw new Error(updateError.message);

  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_UPDATED",
    entityType: "calendar_event",
    entityId: options.eventId,
    metadata: { title },
  }).catch(() => undefined);

  return { eventId: options.eventId };
}

export async function deleteOwnerCalendarEvent(options: {
  ownerId: string;
  eventId: string;
}) {
  const { data: existing, error: findError } = await supabaseAdmin
    .from("calendar_events")
    .select("*")
    .eq("owner_id", options.ownerId)
    .eq("id", options.eventId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!existing) throw new Error("Event not found");

  const connection = await getGoogleConnection(options.ownerId).catch(() => null);
  if (connection && existing.provider === "google" && existing.external_event_id) {
    await deleteGoogleCalendarEvent({
      connection,
      eventId: existing.external_event_id,
    }).catch(() => undefined);
  }

  const { error: deleteError } = await supabaseAdmin
    .from("calendar_events")
    .delete()
    .eq("id", options.eventId)
    .eq("owner_id", options.ownerId);
  if (deleteError) throw new Error(deleteError.message);

  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_DELETED",
    entityType: "calendar_event",
    entityId: options.eventId,
    metadata: { title: existing.title },
  }).catch(() => undefined);
}

export type { Recurrence };
