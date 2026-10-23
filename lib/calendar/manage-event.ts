import { readCalendar } from "./read-model";
import { conflictsFor } from "./conflicts";
import { loadCalendarPreferences } from "./load-preferences";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  deleteGoogleCalendarEvent,
  getGoogleConnection,
  updateGoogleCalendarEvent,
  type Recurrence,
} from "./google";
import { validateInterval, wallTimeToInstant } from "./time";
async function owned(ownerId: string, eventId: string, version?: string) {
  const r = await supabaseAdmin
    .from("calendar_events")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", eventId)
    .maybeSingle();
  if (r.error || !r.data) throw Error("NOT_FOUND");
  if (
    !version ||
    version !== String(r.data.metadata?.version ?? r.data.created_at)
  )
    throw Error("CALENDAR_CONFLICT");
  return r.data;
}
export async function updateOwnerCalendarEvent(options: {
  ownerId: string;
  eventId: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  meetingLink?: string | null;
  timeZone?: string;
  version?: string;
  etag?: string;
  contactId?: string | null;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
  allowConflict?: boolean;
  appointmentType?: string;
  appointmentStatus?: string;
}) {
  const old = await owned(options.ownerId, options.eventId, options.version);
  const title = options.title?.trim() ?? old.title;
  const start = options.startsAt ?? old.starts_at,
    end = options.endsAt ?? old.ends_at;
  validateInterval(start, end);
  if (!title || title.length > 200) throw Error("INVALID_EVENT");
  const allDay = options.allDay ?? old.metadata?.allDay ?? false;
  if (allDay) {
    if (old.provider === "google") throw Error("ALL_DAY_EDIT_UNSUPPORTED");
    const zone =
      options.timeZone ?? String(old.metadata?.timeZone ?? "America/New_York");
    if (
      !options.startDate ||
      !options.endDate ||
      wallTimeToInstant(options.startDate, "00:00", zone, "earlier") !==
        new Date(start).toISOString() ||
      wallTimeToInstant(options.endDate, "00:00", zone, "earlier") !==
        new Date(end).toISOString()
    )
      throw Error("INVALID_EVENT");
  }
  if (options.contactId) {
    const c = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", options.ownerId)
      .eq("id", options.contactId)
      .maybeSingle();
    if (c.error || !c.data) throw Error("NOT_FOUND");
  }
  const preferences = await loadCalendarPreferences(options.ownerId);
  const gap =
    (preferences.bufferBefore +
      preferences.bufferAfter +
      preferences.travelMinutes) *
    60000;
  if (!options.allowConflict) {
    const snapshot = await readCalendar(options.ownerId, start, end);
    if (
      snapshot.health.some((h) => !!h.error) ||
      (snapshot.authorized && !snapshot.connected)
    )
      throw Error("EXTERNAL_UNVERIFIED");
    if (
      conflictsFor(
        snapshot.agenda.filter(
          (i) => i.id !== old.id && i.crmEventId !== old.id,
        ),
        start,
        end,
        preferences,
      ).length
    )
      throw Error("CALENDAR_OVERLAP");
  }
  let etag = old.metadata?.etag;
  if (old.provider === "google") {
    const connection = await getGoogleConnection(options.ownerId);
    if (!connection) throw Error("GOOGLE_RECONNECT_REQUIRED");
    const remote = await updateGoogleCalendarEvent({
      connection,
      eventId: old.external_event_id,
      etag: options.etag,
      title,
      start: new Date(start),
      end: new Date(end),
      timeZone:
        options.timeZone ??
        String(old.metadata?.timeZone ?? "America/New_York"),
      description: options.description ?? old.metadata?.description,
      meetingLink: options.meetingLink ?? old.metadata?.meetingLink,
    });
    etag = remote.etag;
  }
  const metadata = {
    ...old.metadata,
    allDay,
    startDate: allDay ? options.startDate : undefined,
    endDate: allDay ? options.endDate : undefined,
    enforceConflict: !options.allowConflict,
    gapMinutes: gap / 60000,
    appointmentType: options.appointmentType ?? old.metadata?.appointmentType,
    status: options.appointmentStatus ?? old.metadata?.status,
    outcomeRecordedAt:
      options.appointmentStatus === undefined
        ? old.metadata?.outcomeRecordedAt
        : options.appointmentStatus !== "scheduled"
          ? new Date().toISOString()
          : undefined,
    description: options.description ?? old.metadata?.description,
    meetingLink:
      options.meetingLink === undefined
        ? old.metadata?.meetingLink
        : options.meetingLink,
    version: crypto.randomUUID(),
    etag,
  };
  let q = supabaseAdmin
    .from("calendar_events")
    .update({
      title,
      starts_at: start,
      ends_at: end,
      contact_id:
        options.contactId === undefined ? old.contact_id : options.contactId,
      metadata,
    })
    .eq("id", old.id)
    .eq("owner_id", options.ownerId);
  q = old.metadata?.version
    ? q.eq("metadata->>version", old.metadata.version)
    : q.eq("metadata", JSON.stringify(old.metadata ?? {}));
  const saved = await q.select("id");
  if (saved.error || !saved.data?.length) throw Error("CALENDAR_CONFLICT");
  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_UPDATED",
    entityType: "calendar_event",
    entityId: old.id,
    metadata: { contactId: old.contact_id },
  }).catch(() => undefined);
  return { eventId: old.id };
}
export async function deleteOwnerCalendarEvent(options: {
  ownerId: string;
  eventId: string;
  version?: string;
  etag?: string;
}) {
  const old = await owned(options.ownerId, options.eventId, options.version);
  if (old.provider === "google") {
    const connection = await getGoogleConnection(options.ownerId);
    if (!connection) throw Error("GOOGLE_RECONNECT_REQUIRED");
    await deleteGoogleCalendarEvent({
      connection,
      eventId: old.external_event_id,
      etag: options.etag,
    });
  }
  let q = supabaseAdmin
    .from("calendar_events")
    .delete()
    .eq("owner_id", options.ownerId)
    .eq("id", old.id);
  q = old.metadata?.version
    ? q.eq("metadata->>version", old.metadata.version)
    : q.eq("metadata", JSON.stringify(old.metadata ?? {}));
  const deleted = await q.select("id");
  if (deleted.error || !deleted.data?.length) throw Error("CALENDAR_CONFLICT");
  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_DELETED",
    entityType: "calendar_event",
    entityId: old.id,
    metadata: { contactId: old.contact_id },
  }).catch(() => undefined);
}
export type { Recurrence };
