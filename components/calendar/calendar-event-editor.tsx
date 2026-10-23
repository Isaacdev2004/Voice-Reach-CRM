"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/crm/modal";
import { useContacts } from "@/lib/hooks/use-contacts";
import {
  wallTimeToInstant,
  zonedParts,
  addCalendarDays,
  foldForInstant,
} from "@/lib/calendar/time";
import type { CalendarPreferences } from "@/lib/calendar/preferences";
import type { ScheduleItem } from "@/lib/calendar/model";
import { conflictsFor } from "@/lib/calendar/conflicts";
import { ContactTasksPanel } from "@/components/crm/contact-tasks-panel";
export function CalendarEventEditor({
  date,
  time,
  kind = "crm",
  contactId = "",
  item,
  prefs,
  items,
  googleAuthorized,
  onClose,
  onSaved,
}: {
  date: string;
  time: string;
  kind?: "crm" | "callback" | "reminder" | "task";
  contactId?: string;
  item?: ScheduleItem;
  prefs: CalendarPreferences;
  items: ScheduleItem[];
  googleAuthorized: boolean;
  onClose: () => void;
  onSaved: (message?: string) => void;
}) {
  const { contacts, loading, error: contactError } = useContacts();
  const start = item
    ? zonedParts(item.starts_at, prefs.timezone)
    : { date, time };
  const [appointmentType, setAppointmentType] = useState(
      item?.appointmentType ?? "meeting",
    ),
    [appointmentStatus, setAppointmentStatus] = useState(
      item?.appointmentStatus ?? "scheduled",
    );
  const [title, setTitle] = useState(item?.title ?? "");
  const [day, setDay] = useState(start.date);
  const [clock, setClock] = useState(start.time);
  const [duration, setDuration] = useState(
    item
      ? (Date.parse(item.ends_at) - Date.parse(item.starts_at)) / 60000
      : prefs.duration,
  );
  const [selected, setSelected] = useState(item?.contact_id ?? contactId);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState(item?.description ?? "");
  const [link, setLink] = useState(item?.meetingLink ?? "");
  const [recurrence, setRecurrence] = useState("none");
  const [sync, setSync] = useState(false);
  const [allow, setAllow] = useState(false);
  const [allDay, setAllDay] = useState(item?.allDay ?? false);
  const [endDate, setEndDate] = useState(
    item?.endDate ?? addCalendarDays(start.date, 1),
  );
  const [fold, setFold] = useState<"reject" | "earlier" | "later">(
    item ? foldForInstant(item.starts_at, prefs.timezone) : "reject",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(crypto.randomUUID());
  const contact = contacts.find((c) => c.id === selected);
  const options = contacts.filter((c) =>
    [c.first_name, c.last_name, c.email, c.phone]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let startsAt: string, endsAt: string;
    try {
      startsAt =
        item &&
        !allDay &&
        day === start.date &&
        clock === start.time &&
        fold === foldForInstant(item.starts_at, prefs.timezone)
          ? item.starts_at
          : wallTimeToInstant(
              day,
              allDay ? "00:00" : clock,
              prefs.timezone,
              fold,
            );
      if (allDay) {
        endsAt = wallTimeToInstant(endDate, "00:00", prefs.timezone, fold);
        if (Date.parse(endsAt) <= Date.parse(startsAt))
          throw Error("Choose an all-day end date after the start date.");
      } else
        endsAt = new Date(
          Date.parse(startsAt) + duration * 60000,
        ).toISOString();
      const conflicts = conflictsFor(items, startsAt, endsAt, {
        excludeId: item?.id,
        ...prefs,
      });
      if (conflicts.length && !allow) {
        setError(
          `This time overlaps ${conflicts.length} appointment${conflicts.length === 1 ? "" : "s"}. Review the calendar or explicitly allow an overlap.`,
        );
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your date and time.");
      return;
    }
    setBusy(true);
    try {
      let path = "/api/calendar/events",
        method = "POST",
        body: Record<string, unknown> = {
          title,
          startsAt,
          endsAt,
          appointmentType,
          appointmentStatus,
          description: notes,
          meetingLink: link || null,
          contactId: selected || null,
          timeZone: prefs.timezone,
          kind: kind === "task" ? "crm" : kind,
          recurrence,
          allDay,
          startDate: allDay ? day : undefined,
          endDate: allDay ? zonedParts(endsAt, prefs.timezone).date : undefined,
          syncToGoogle: sync,
          allowConflict: allow,
          clientRequestId: request.current,
        };
      if (kind === "task") {
        path = selected ? `/api/contacts/${selected}/tasks` : "/api/tasks";
        body = {
          title,
          dueAt: startsAt,
          notes,
          recurrence,
          addToCalendar: false,
        };
      } else if (item) {
        path = item.crmEventId
          ? `/api/calendar/events/${item.crmEventId}`
          : "/api/calendar/external";
        method = "PATCH";
        body = {
          title,
          startsAt,
          endsAt,
          appointmentType,
          appointmentStatus,
          description: notes,
          meetingLink: link || null,
          contactId: selected || null,
          allDay,
          startDate: allDay ? day : undefined,
          endDate: allDay ? endDate : undefined,
          timeZone: prefs.timezone,
          version: item.version,
          etag: item.etag,
          allowConflict: allow,
          ...(!item.crmEventId
            ? { calendarId: item.externalCalendarId, eventId: item.externalId }
            : {}),
        };
      }
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false)
        throw Error(data.error || "Appointment could not be saved.");
      onSaved(
        data.syncWarning ??
          (recurrence !== "none" && !sync && kind !== "task"
            ? "Saved recurring appointments, up to 60 occurrences within the next year."
            : undefined),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={
        item
          ? "Edit appointment"
          : kind === "task"
            ? "Create task"
            : kind === "callback"
              ? "Schedule callback"
              : kind === "reminder"
                ? "Add reminder"
                : "Schedule event"
      }
      description={`Times use ${prefs.timezone}. No invitations or messages are sent.`}
    >
      <form className="calendar-form" onSubmit={save}>
        <label>
          Title
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="calendar-form-pair">
          <label>
            Date
            <input
              required
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <label>
            Time
            <input
              required
              type="time"
              disabled={allDay}
              value={clock}
              onChange={(e) => setClock(e.target.value)}
            />
          </label>
        </div>
        {allDay ? (
          <label>
            All-day end date (not included)
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        ) : null}
        <div className="calendar-form-pair">
          {kind !== "task" ? (
            <label>
              Duration (minutes)
              <input
                required
                type="number"
                min={0.001}
                max={527040}
                step="any"
                disabled={allDay}
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </label>
          ) : null}
          <label>
            DST repeated time
            <select
              value={fold}
              onChange={(e) => setFold(e.target.value as typeof fold)}
            >
              <option value="reject">Ask when ambiguous</option>
              <option value="earlier">First occurrence</option>
              <option value="later">Second occurrence</option>
            </select>
          </label>
        </div>
        {!item && kind !== "task" ? (
          <label className="calendar-check">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            All-day event
          </label>
        ) : null}
        <label>
          Find subscriber contact
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, or phone"
          />
        </label>
        <label>
          Associated contact
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading || !!(item && !item.crmEventId)}
          >
            <option value="">No contact associated</option>
            {options
              .filter((c) => c.id !== selected)
              .concat(contact ? [contact] : [])
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                  {c.email ? ` · ${c.email}` : c.phone ? ` · ${c.phone}` : ""}
                </option>
              ))}
          </select>
        </label>
        {contactError ? (
          <small role="alert">
            Contacts could not be loaded. Refresh before selecting a contact.
          </small>
        ) : null}
        {contact ? (
          <small>
            {contact.phone || "Phone not recorded"} ·{" "}
            {contact.email || "Email not recorded"} ·{" "}
            <Link href={`/dashboard/contacts/${contact.id}`}>Open profile</Link>
          </small>
        ) : null}
        {kind !== "task" && (!item || item.crmEventId) ? (
          <div className="calendar-form-pair">
            <label>
              Appointment type
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
              >
                <option value="meeting">Meeting</option>
                <option value="showing">Property showing</option>
                <option value="buyer_consultation">Buyer consultation</option>
                <option value="listing_appointment">Listing appointment</option>
              </select>
            </label>
            <label>
              Recorded outcome
              <select
                value={appointmentStatus}
                onChange={(e) => setAppointmentStatus(e.target.value)}
              >
                <option value="scheduled">
                  Scheduled — attendance not established
                </option>
                <option value="completed">
                  I confirm this appointment completed
                </option>
                <option value="missed">
                  I confirm this appointment was missed
                </option>
              </select>
            </label>
          </div>
        ) : null}
        <label>
          Notes
          <textarea
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {kind !== "task" ? (
          <label>
            Meeting link
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </label>
        ) : null}
        {!item ? (
          <label>
            Repeat
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              <option value="none">One time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        ) : (
          <small>
            Changes apply to this local occurrence. External recurring instances
            must be edited in their provider.
          </small>
        )}
        {recurrence !== "none" && !sync && kind !== "task" ? (
          <small>
            Local repeats create up to 60 occurrences within one year; invalid
            monthly dates and nonexistent DST times are skipped.
          </small>
        ) : null}
        {!item && kind !== "task" && googleAuthorized ? (
          <label className="calendar-check">
            <input
              type="checkbox"
              checked={sync}
              onChange={(e) => setSync(e.target.checked)}
            />
            Also create in my Google calendar
          </label>
        ) : null}
        {kind !== "task" ? (
          <label className="calendar-check">
            <input
              type="checkbox"
              checked={allow}
              onChange={(e) => setAllow(e.target.checked)}
            />
            I reviewed the calendar and allow an overlapping appointment
          </label>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <button disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {item?.crmEventId&&<Link href={`/dashboard/tasks?new=task&eventId=${item.crmEventId}${contact?`&contactId=${contact.id}`:''}`}>Create follow-up task from this event</Link>}
        {contact ? (
          <details>
            <summary>Related contact tasks</summary>
            <ContactTasksPanel contactId={contact.id} />
          </details>
        ) : null}
      </form>
    </Modal>
  );
}
