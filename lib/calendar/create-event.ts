import { loadCalendarPreferences } from "./load-preferences";
import { readCalendar } from "./read-model";
import { conflictsFor } from "./conflicts";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import {
  createGoogleCalendarEvent,
  getGoogleConnection,
  type Recurrence,
} from "./google";
import { expandRecurrenceOccurrences } from "./recurrence";
import { validateInterval, zonedParts, wallTimeToInstant } from "./time";
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
  kind?: string;
  appointmentType?: string;
  appointmentStatus?: string;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
  syncToGoogle?: boolean;
  clientRequestId?: string;
  allowConflict?: boolean;
}) {
  const end =
    options.endsAt ??
    new Date(Date.parse(options.startsAt) + 3600000).toISOString();
  validateInterval(options.startsAt, end);
  if (!options.title.trim()) throw Error("Enter an appointment title.");
  if (options.contactId) {
    const contact = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", options.ownerId)
      .eq("id", options.contactId)
      .maybeSingle();
    if (contact.error || !contact.data) throw Error("Contact not found.");
  }
  const requestId = options.clientRequestId ?? crypto.randomUUID();
  const existing = await supabaseAdmin
    .from("calendar_events")
    .select("id, starts_at, title, metadata")
    .eq("owner_id", options.ownerId)
    .eq("id", requestId)
    .maybeSingle();
  if (existing.error) throw Error("Calendar is unavailable.");
  if (existing.data) {
    if (
      Date.parse(existing.data.starts_at) !== Date.parse(options.startsAt) ||
      existing.data.title !== options.title
    )
      throw Error("This request reference was already used.");
    return {
      eventId: existing.data.id,
      syncedToGoogle: existing.data.metadata?.syncState === "synced",
      instancesCreated: 1,
      alreadySaved: true,
    };
  }
  const preferences = await loadCalendarPreferences(options.ownerId);
  const recurrence = options.recurrence ?? "none";
  const instances = options.syncToGoogle
    ? [{ start: new Date(options.startsAt), end: new Date(end) }]
    : expandRecurrenceOccurrences({
        start: new Date(options.startsAt),
        end: new Date(end),
        recurrence,
        timeZone: options.timeZone,
      });
  if (options.allDay && !options.syncToGoogle) {
    const span = Math.round(
      (Date.parse(options.endDate + "T12:00Z") -
        Date.parse(options.startDate + "T12:00Z")) /
        86400000,
    );
    for (const i of instances) {
      const d = zonedParts(
        i.start,
        options.timeZone ?? preferences.timezone,
      ).date;
      const next = new Date(d + "T12:00Z");
      next.setUTCDate(next.getUTCDate() + span);
      i.end = new Date(
        wallTimeToInstant(
          next.toISOString().slice(0, 10),
          "00:00",
          options.timeZone ?? preferences.timezone,
          "earlier",
        ),
      );
    }
  }
  if (!options.allowConflict) {
    const connection = await getGoogleConnection(options.ownerId);
    if (connection) {
      for (const i of instances) {
        const snapshot = await readCalendar(
          options.ownerId,
          i.start.toISOString(),
          i.end.toISOString(),
        );
        if (!snapshot.connected) throw Error("EXTERNAL_UNVERIFIED");
        if (
          conflictsFor(
            snapshot.agenda,
            i.start.toISOString(),
            i.end.toISOString(),
            preferences,
          ).length
        )
          throw Error("CALENDAR_OVERLAP");
      }
    }
  }
  const rows = await ownedRows<{
    id: string;
    starts_at: string;
    ends_at: string;
  }>("calendar_events", "id, starts_at, ends_at", options.ownerId);
  if (
    !options.allowConflict &&
    instances.some((i) =>
      rows.some(
        (r) =>
          Date.parse(r.starts_at) <
            +i.end +
              (preferences.bufferBefore +
                preferences.bufferAfter +
                preferences.travelMinutes) *
                60000 &&
          Date.parse(r.ends_at) >
            +i.start -
              (preferences.bufferBefore +
                preferences.bufferAfter +
                preferences.travelMinutes) *
                60000,
      ),
    )
  )
    throw Error("CALENDAR_OVERLAP");
  const version = crypto.randomUUID();
  const records = instances.map((i, index) => ({
    id: index ? crypto.randomUUID() : requestId,
    owner_id: options.ownerId,
    contact_id: options.contactId ?? null,
    external_event_id: `local-${index ? crypto.randomUUID() : requestId}`,
    provider: "local",
    title: options.title.trim(),
    starts_at: i.start.toISOString(),
    ends_at: i.end.toISOString(),
    metadata: {
      enforceConflict: !options.allowConflict,
      gapMinutes:
        preferences.bufferBefore +
        preferences.bufferAfter +
        preferences.travelMinutes,
      appointmentType: options.appointmentType ?? "meeting",
      status: options.appointmentStatus ?? "scheduled",
      outcomeRecordedAt:
        options.appointmentStatus && options.appointmentStatus !== "scheduled"
          ? new Date().toISOString()
          : undefined,
      description: options.description ?? "",
      recurrence,
      meetingLink: options.meetingLink ?? null,
      seriesId: recurrence !== "none" ? requestId : null,
      seriesIndex: index,
      kind: options.kind ?? "crm",
      timeZone: options.timeZone ?? "America/New_York",
      allDay: !!options.allDay,
      startDate: options.allDay
        ? zonedParts(i.start, options.timeZone ?? "America/New_York").date
        : undefined,
      endDate: options.allDay
        ? zonedParts(i.end, options.timeZone ?? "America/New_York").date
        : undefined,
      version,
      syncState: options.syncToGoogle ? "pending" : "local",
    },
  }));
  const inserted = await supabaseAdmin.from("calendar_events").insert(records);
  if (inserted.error)
    throw Error("Appointment could not be saved. Refresh before retrying.");
  let synced = false,
    syncWarning: string | undefined;
  if (options.syncToGoogle) {
    try {
      const connection = await getGoogleConnection(options.ownerId);
      if (!connection) throw Error();
      const created = await createGoogleCalendarEvent({
        connection,
        title: options.title,
        description: options.description,
        start: new Date(options.startsAt),
        end: new Date(end),
        timeZone: options.timeZone ?? "America/New_York",
        recurrence,
        meetingLink: options.meetingLink,
        eventId: requestId.replace(/-/g, ""),
        localId: requestId,
        allDay: options.allDay,
        startDate: options.startDate,
        endDate: options.endDate,
      });
      const result = await supabaseAdmin
        .from("calendar_events")
        .update({
          provider: "google",
          external_event_id: created.eventId,
          metadata: {
            ...records[0].metadata,
            etag: created.etag,
            externalCalendarId: connection.calendar_id ?? "primary",
            htmlLink: created.htmlLink,
            syncState: "synced",
          },
        })
        .eq("id", requestId)
        .eq("owner_id", options.ownerId);
      if (result.error) throw Error();
      synced = true;
    } catch {
      syncWarning =
        "Saved locally. Google synchronization needs review; do not recreate this appointment.";
    }
  }
  await writeAuditLog({
    ownerId: options.ownerId,
    action: "CALENDAR_EVENT_CREATED",
    entityType: "calendar_event",
    entityId: requestId,
    metadata: {
      contactId: options.contactId,
      title: options.title,
      syncedToGoogle: synced,
      instancesCreated: records.length,
    },
  }).catch(() => undefined);
  return {
    eventId: requestId,
    syncedToGoogle: synced,
    instancesCreated: records.length,
    syncWarning,
  };
}
export function recurrenceLabel(value: Recurrence) {
  return value === "none" ? "One time" : `Repeats ${value}`;
}
