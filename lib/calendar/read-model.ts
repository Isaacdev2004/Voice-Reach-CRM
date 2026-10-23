import type { CalendarConnection } from "./google";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { writeAuditLog } from "@/lib/audit";
import {
  getGoogleConnection,
  listGoogleCalendars,
  listGoogleCalendarEvents,
  listGoogleBusyIntervals,
  isGoogleCalendarConfigured,
} from "./google";
import type { ScheduleItem, CalendarInfo, CalendarHealth } from "./model";
export type CalendarRow = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  provider: string;
  external_event_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  metadata: Record<string, unknown>;
};
export async function readCalendar(owner: string, from: string, to: string) {
  const [rows, tasks, contacts, logs] = await Promise.all([
    ownedRows<CalendarRow>("calendar_events", "*", owner),
    ownedRows<{
      id: string;
      contact_id: string;
      title: string;
      due_at: string | null;
      completed: boolean;
      calendar_event_id?: string | null;
      notes?: string;
      reminder_at?: string;
    }>("contact_tasks", "*", owner),
    ownedRows<{
      id: string;
      first_name: string;
      last_name: string | null;
    }>("contacts", "id, first_name, last_name", owner),
    ownedRows<{
      id: string;
      action: string;
      created_at: string;
      metadata: Record<string, unknown>;
    }>("audit_logs", "id, action, created_at, metadata", owner, undefined, {
      entity_type: "calendar_sync",
    }),
  ]);
  const names = new Map(
    contacts.map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" "),
    ]),
  );
  const openTasks = tasks.filter((t) => !t.completed && t.due_at);
  const mirroredTaskIds = new Set(
    openTasks.map((t) => t.calendar_event_id).filter(Boolean),
  );
  const calendars: CalendarInfo[] = [
    {
      key: "crm",
      name: "MyARI appointments",
      color: "#bd9169",
      provider: "myari",
      read: true,
      write: true,
    },
    {
      key: "task",
      name: "Tasks",
      color: "#b97281",
      provider: "myari",
      read: true,
      write: true,
    },
    {
      key: "callback",
      name: "Callbacks",
      color: "#76a68a",
      provider: "myari",
      read: true,
      write: true,
    },
    {
      key: "reminder",
      name: "Reminders",
      color: "#ae8b61",
      provider: "myari",
      read: true,
      write: true,
    },
  ];
  const previous = logs.sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const lastSuccess =
    previous.find((l) => l.action === "CALENDAR_SYNC_SUCCEEDED")?.created_at ??
    null;
  let health: CalendarHealth = {
    provider: "Google Calendar",
    authorized: false,
    status: isGoogleCalendarConfigured()
      ? "Not connected"
      : "Needs configuration",
    lastAttempt: previous[0]?.created_at ?? null,
    lastSuccess,
    error: null,
    read: false,
    write: false,
    mode: "On-demand refresh; no background watch configured",
  };
  let connection: CalendarConnection | null = null;
  const remote: ScheduleItem[] = [];
  const linkedLocalIds = new Set<string>();
  let completedRead = false;
  try {
    connection = await getGoogleConnection(owner);
    if (connection) {
      const attempted = new Date().toISOString();
      health = {
        ...health,
        authorized: true,
        status: "Authorized — sync unverified",
        lastAttempt: attempted,
      };
      await writeAuditLog({
        ownerId: owner,
        action: "CALENDAR_SYNC_ATTEMPTED",
        entityType: "calendar_sync",
        metadata: { provider: "google" },
      });
      const available = await listGoogleCalendars(connection);
      for (const cal of available) {
        if (
          !["owner", "writer", "reader", "freeBusyReader"].includes(
            cal.accessRole,
          )
        )
          continue;

        const key = "google:" + cal.id;
        calendars.push({
          key,
          name: cal.summary || "Google calendar",
          provider: "google",
          color: /^#[a-f\d]{6}$/i.test(cal.backgroundColor ?? "")
            ? cal.backgroundColor!
            : "#7898bc",
          read: true,
          write: ["owner", "writer"].includes(cal.accessRole),
          primary: cal.primary,
          status: "Read unverified",
          lastAttempt: new Date().toISOString(),
          lastSuccess:
            previous.find(
              (l) =>
                l.action === "CALENDAR_READ_SUCCEEDED" &&
                l.metadata?.calendarId === cal.id,
            )?.created_at ?? null,
          error: null,
        });
        await writeAuditLog({
          ownerId: owner,
          action: "CALENDAR_READ_ATTEMPTED",
          entityType: "calendar_sync",
          metadata: { provider: "google", calendarId: cal.id },
        });
        const events = await (
          cal.accessRole === "freeBusyReader"
            ? listGoogleBusyIntervals
            : listGoogleCalendarEvents
        )({
          connection,
          timeMin: new Date(from),
          timeMax: new Date(to),
          calendarId: cal.id,
          accessRole: cal.accessRole,
        });
        await writeAuditLog({
          ownerId: owner,
          action: "CALENDAR_READ_SUCCEEDED",
          entityType: "calendar_sync",
          metadata: { provider: "google", calendarId: cal.id },
        });
        const calendarStatus = calendars.find((c) => c.key === key);
        if (calendarStatus) {
          calendarStatus.status = "Read verified";
          calendarStatus.lastSuccess = new Date().toISOString();
        }
        for (const e of events) {
          const local = rows.find(
            (r) =>
              (r.external_event_id === e.id ||
                r.external_event_id === e.recurringEventId ||
                r.id === e.localId) &&
              ((r.metadata?.externalCalendarId ??
                connection?.calendar_id ??
                "primary") === cal.id ||
                ((r.metadata?.externalCalendarId ??
                  connection?.calendar_id ??
                  "primary") === "primary" &&
                  cal.primary)),
          );
          if (local && mirroredTaskIds.has(local.external_event_id)) continue;
          if (local) linkedLocalIds.add(local.id);
          const kind =
            local?.metadata?.stepType === "callback" ? "callback" : "google";
          remote.push({
            id: `google:${cal.id}:${e.id}`,
            title: e.title,
            starts_at: e.starts_at,
            ends_at: e.ends_at,
            source: kind,
            calendarKey: key,
            allDay: e.allDay,
            startDate: e.startDate,
            endDate: e.endDate,
            crmEventId:
              e.recurringEventId || local?.provider === "local"
                ? null
                : (local?.id ?? null),
            contact_id: local?.contact_id ?? null,
            contactName: e.private
              ? null
              : (names.get(local?.contact_id ?? "") ?? null),
            description: e.description,
            meetingLink: e.meetingLink,
            htmlLink: e.htmlLink,
            version: local
              ? String(local.metadata?.version ?? local.created_at)
              : undefined,
            etag: e.etag,
            externalId: e.id,
            externalCalendarId: cal.id,
            recurringEventId: e.recurringEventId,
            originalStart: e.originalStart,
            appointmentType: String(
              local?.metadata?.appointmentType ?? "meeting",
            ),
            appointmentStatus: String(local?.metadata?.status ?? "scheduled"),
            recurrence: String(local?.metadata?.recurrence ?? "none"),
            private: e.private,
            busy: e.busy,
            editable: e.editable,
            syncState: "Verified by provider read",
          });
        }
      }
      completedRead = true;
      const succeeded = new Date().toISOString();
      await writeAuditLog({
        ownerId: owner,
        action: "CALENDAR_SYNC_SUCCEEDED",
        entityType: "calendar_sync",
        metadata: { provider: "google", calendarCount: available.length },
      });
      health = {
        ...health,
        status: "Connected & verified",
        lastSuccess: succeeded,
        read: true,
        write: calendars.some((c) => c.provider === "google" && c.write),
      };
    }
  } catch (err) {
    remote.length = 0;
    for (const c of calendars.filter(
      (c) => c.provider === "google" && c.status !== "Read verified",
    )) {
      c.status = "Read unavailable";
      c.error = "Could not verify this calendar. Refresh or reconnect.";
    }
    const reconnect =
      err instanceof Error && err.message === "GOOGLE_RECONNECT_REQUIRED";
    health = {
      ...health,
      status: reconnect ? "Reconnect required" : "Synchronization unavailable",
      error: reconnect
        ? "Google authorization expired. Reconnect your account."
        : "Google events could not be fully verified. Refresh or reconnect; local records are preserved.",
    };
  }
  const local: ScheduleItem[] = rows
    .filter(
      (r) =>
        Date.parse(r.starts_at) < Date.parse(to) &&
        Date.parse(r.ends_at) > Date.parse(from) &&
        !mirroredTaskIds.has(r.id) &&
        !mirroredTaskIds.has(r.external_event_id) &&
        !(
          completedRead &&
          (r.provider === "google" || linkedLocalIds.has(r.id))
        ),
    )
    .map((r) => {
      const kind =
        r.metadata?.kind === "callback" || r.metadata?.stepType === "callback"
          ? "callback"
          : r.metadata?.kind === "reminder"
            ? "reminder"
            : "crm";
      return {
        id: r.id,
        title: r.title,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        source: kind,
        calendarKey: kind,
        crmEventId: r.id,
        contact_id: r.contact_id,
        contactName: names.get(r.contact_id ?? "") ?? null,
        description:
          typeof r.metadata?.description === "string"
            ? r.metadata.description
            : null,
        meetingLink:
          typeof r.metadata?.meetingLink === "string"
            ? r.metadata.meetingLink
            : null,
        allDay: r.metadata?.allDay === true,
        startDate: r.metadata?.startDate as string | undefined,
        endDate: r.metadata?.endDate as string | undefined,
        appointmentType: String(r.metadata?.appointmentType ?? "meeting"),
        appointmentStatus: String(r.metadata?.status ?? "scheduled"),
        recurrence: String(r.metadata?.recurrence ?? "none"),
        version: String(r.metadata?.version ?? r.created_at),
        editable: r.provider === "local",
        busy: r.metadata?.busy !== false,
        syncState:
          r.provider === "google"
            ? "External copy unverified"
            : String(r.metadata?.syncState ?? "Local appointment"),
      };
    });
  const taskItems: ScheduleItem[] = openTasks
    .filter(
      (t) =>
        Date.parse(t.due_at!) >= Date.parse(from) &&
        Date.parse(t.due_at!) < Date.parse(to),
    )
    .map((t) => ({
      id: "task:" + t.id,
      title: t.title,
      starts_at: t.due_at!,
      ends_at: t.due_at!,
      source: "task",
      calendarKey: "task",
      taskId: t.id,
      contact_id: t.contact_id,
      contactName: names.get(t.contact_id) ?? null,
      description: t.notes ?? null,
      busy: false,
      editable: false,
    }));
  return {
    agenda: [...local, ...remote, ...taskItems].sort(
      (a, b) =>
        a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id),
    ),
    calendars,
    health: [
      health,
      {
        provider: "Apple / iCloud",
        authorized: false,
        status: "Read-only subscription available after setup",
        lastAttempt: null,
        lastSuccess: null,
        error: null,
        read: false,
        write: false,
        mode: "MyARI → Apple subscription; no CalDAV account sync",
      },
    ],
    counts: {
      google: remote.length,
      crm: local.length,
      tasks: taskItems.length,
    },
    googleError: health.error,
    eventsError: null,
    tasksError: null,
    connected: completedRead,
    authorized: !!connection,
    accountEmail: connection?.account_email ?? null,
    complete: !health.error && (!connection || completedRead),
  };
}
