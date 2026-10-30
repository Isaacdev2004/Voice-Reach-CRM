"use client";
import "@/components/calendar/calendar-workspace.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { CalendarEventEditor } from "@/components/calendar/calendar-event-editor";
import { CalendarPreferencesDialog } from "@/components/calendar/calendar-preferences-dialog";
import {
  DEFAULT_CALENDAR_PREFERENCES,
  CalendarPreferencesSchema,
  type CalendarPreferences,
} from "@/lib/calendar/preferences";
import {
  addCalendarDays,
  initialCalendarDate,
  describeCalendarInstant,
  navigateCalendarDate,
  dateLabel,
  formatClock,
  monthDates,
  weekDates,
  zonedParts,
  wallTimeToInstant,
} from "@/lib/calendar/time";
import { placeIntervals, conflictsFor } from "@/lib/calendar/conflicts";
import type {
  ScheduleItem,
  CalendarInfo,
  CalendarHealth,
} from "@/lib/calendar/model";
import { DailyPriorities } from "@/components/activity/daily-priorities";
import { BookingRequestsPanel } from "@/components/calendar/booking-requests-panel";
import { CalendarLinksPanel } from "@/components/calendar/calendar-links-panel";
type Snapshot = {
  agenda: ScheduleItem[];
  calendars: CalendarInfo[];
  health: CalendarHealth[];
  authorized: boolean;
};
type Editor = {
  date: string;
  time: string;
  kind?: "crm" | "callback" | "reminder" | "task";
  contactId?: string;
  item?: ScheduleItem;
};

/** Matches `.calendar-slot` height (30px per 30-minute row). */
const MINUTE_PX = 1;

export function CalendarPage() {
  const { user } = useUser();
  return <CalendarWorkspace key={user?.id ?? "signed-out"} />;
}
function CalendarWorkspace() {
  const q = useSearchParams();
  const initialDateQuery = useRef(q.get("date"));
  const [prefs, setPrefs] = useState(DEFAULT_CALENDAR_PREFERENCES),
    [ready, setReady] = useState(false),
    [prefFailed, setPrefFailed] = useState(false),
    [prefStatus, setPrefStatus] = useState<"synced" | "saving" | "unsynced">(
      "synced",
    );
  const [date, setDate] = useState(() =>
    initialCalendarDate(
      initialDateQuery.current,
      DEFAULT_CALENDAR_PREFERENCES.timezone,
    ),
  );
  const [data, setData] = useState<Snapshot>({
      agenda: [],
      calendars: [],
      health: [],
      authorized: false,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0),
    [preferencesOpen, setPreferencesOpen] = useState(false),
    [panel, setPanel] = useState<"calendars" | "details" | null>(null),
    [selected, setSelected] = useState<ScheduleItem | null>(null),
    [editor, setEditor] = useState<Editor | null>(null),
    [section, setSection] = useState<
      "calendar" | "agenda" | "task" | "reminder"
    >("calendar"),
    [search, setSearch] = useState(""),
    [saving, setSaving] = useState(false),
    [now, setNow] = useState(Date.now());
  const scroll = useRef<HTMLDivElement>(null),
    requestVersion = useRef(0),
    eventSaving = useRef(false),
    prefVersion = useRef<string | null>(null),
    prefQueue = useRef<Promise<unknown>>(Promise.resolve()),
    prefChange = useRef(0),
    prefBlocked = useRef(false),
    alive = useRef(true),
    initialQuery = useRef(false);
  useEffect(() => {
    alive.current = true;
    const ac = new AbortController();
    fetch("/api/calendar/preferences", {
      signal: AbortSignal.any([ac.signal, AbortSignal.timeout(15000)]),
      cache: "no-store",
    })
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok || d.success === false) throw Error();
        if (ac.signal.aborted) return;
        const parsed = CalendarPreferencesSchema.parse(d.preferences);
        setPrefs(parsed);
        prefVersion.current = d.version;
        const requested = initialDateQuery.current;
        setDate(initialCalendarDate(requested, parsed.timezone));
        if (matchMedia("(max-width:767px)").matches) {
          if (d.version === null)
            setPrefs((p: CalendarPreferences) => ({ ...p, view: "day" }));
          setPanel(
            d.preferences.mobileLeftOpen
              ? "calendars"
              : d.preferences.mobileRightOpen
                ? "details"
                : null,
          );
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setPrefFailed(true);
          setPrefStatus("unsynced");
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setReady(true);
      });
    return () => {
      alive.current = false;
      ac.abort();
    };
  }, []);
  const displayedView = section === "agenda" ? "agenda" : prefs.view;
  const days = useMemo(
    () =>
      displayedView === "month"
        ? monthDates(date, prefs.mondayStart)
        : displayedView === "day"
          ? [date]
          : displayedView === "agenda"
            ? Array.from({ length: 30 }, (_, i) => addCalendarDays(date, i))
            : weekDates(date, prefs.mondayStart),
    [date, displayedView, prefs.mondayStart],
  );
  const from = days[0],
    until = addCalendarDays(days.at(-1)!, 1);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/calendar/events?${new URLSearchParams({ from: wallTimeToInstant(from, "00:00", prefs.timezone, "earlier"), to: wallTimeToInstant(until, "00:00", prefs.timezone, "earlier") })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.success === false || !Array.isArray(d.agenda))
          throw Error();
        if (!controller.signal.aborted) setData(d);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData({ agenda: [], calendars: [], health: [], authorized: false });
          setError(
            "Calendar information could not be loaded. Refresh to try again.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ready, from, until, prefs.timezone, revision]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scroll.current && !loading) scroll.current.scrollTop = 7.5 * 60;
  }, [loading, prefs.view]);
  useEffect(() => {
    if (!ready || initialQuery.current) return;
    initialQuery.current = true;
    if (q.get("new") === "event")
      setEditor({
        date,
        time: prefs.workStart,
        contactId: q.get("contactId") ?? undefined,
        kind: q.get("kind") === "callback" ? "callback" : "crm",
      });
  }, [ready, q, date, prefs.workStart]);
  const refresh = () => setRevision((r) => r + 1);
  useEffect(() => {
    const reload = () => setRevision((r) => r + 1);
    window.addEventListener("focus", reload);
    window.addEventListener("myari:activity-changed", reload);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener("myari:activity-changed", reload);
    };
  }, []);
  const savePreferences = useCallback(
    (next: CalendarPreferences): Promise<boolean> => {
      const parsed = CalendarPreferencesSchema.safeParse(next);
      if (!parsed.success) return Promise.resolve(false);
      // Rendering is local and immediate; persistence must never gate navigation.
      setPrefs(parsed.data);
      setPrefStatus("saving");
      const change = ++prefChange.current;
      const save = async () => {
        if (!alive.current) return false;
        if (prefFailed || prefBlocked.current) {
          setPrefStatus("unsynced");
          setNotice(
            "Preferences are not synced. Your local view still works; reload to reconnect before saving.",
          );
          return false;
        }
        try {
          const response = await fetch("/api/calendar/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              preferences: parsed.data,
              version: prefVersion.current,
            }),
            signal: AbortSignal.timeout(15000),
          });
          const result = await response.json();
          if (!response.ok || result.success === false) {
            if (response.status === 409) prefBlocked.current = true;
            throw Error(
              response.status === 409
                ? "Preferences changed on another device. Reload to sync; your local view still works."
                : "Preferences could not be saved. Your local view still works; retry or reload to reconnect.",
            );
          }
          if (
            !CalendarPreferencesSchema.safeParse(result.preferences).success ||
            typeof result.version !== "string"
          )
            throw Error();
          if (!alive.current) return false;
          prefVersion.current = result.version;
          // An older response must not replace a newer local view or filter.
          if (change === prefChange.current) {
            setNotice("");
            setPrefStatus("synced");
          }
          return true;
        } catch (error) {
          if (alive.current) {
            setPrefStatus("unsynced");
            setNotice(
              error instanceof Error && error.message.startsWith("Preferences")
                ? error.message
                : "Preferences could not be saved. Your local view still works.",
            );
          }
          return false;
        }
      };
      const pending = prefQueue.current.then(save, save);
      prefQueue.current = pending;
      return pending;
    },
    [prefFailed],
  );
  const visible = data.agenda
    .filter(
      (i) =>
        prefs.visibility[i.calendarKey] !== false &&
        i.title.toLowerCase().includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
        a.id.localeCompare(b.id),
    );
  const today = zonedParts(new Date(now), prefs.timezone);
  const daily = visible.filter(
    (i) => zonedParts(i.starts_at, prefs.timezone).date === date,
  );
  const upcoming = visible
    .filter((i) => Date.parse(i.starts_at) >= now)
    .slice(0, 4);
  useEffect(() => {
    if (!prefs.inAppReminders || loading) return;
    const due = data.agenda.find(
      (i) =>
        ["reminder", "callback", "task"].includes(i.source) &&
        Date.parse(i.starts_at) >= now &&
        Date.parse(i.starts_at) <= now + 15 * 60000,
    );
    if (due) setNotice(`Upcoming ${due.source}: ${due.title}`);
  }, [prefs.inAppReminders, loading, data.agenda, now]);
  function create(
    day = date,
    time = prefs.workStart,
    kind: Editor["kind"] = "crm",
  ) {
    setEditor({ date: day, time, kind });
  }
  async function move(item: ScheduleItem, start: string, end: string) {
    if (
      !item.editable ||
      (!item.crmEventId && !item.externalId) ||
      saving ||
      eventSaving.current ||
      item.allDay
    )
      return;
    const conflicts = conflictsFor(data.agenda, start, end, {
      excludeId: item.id,
      ...prefs,
    });
    if (conflicts.length) {
      setNotice(
        "This move overlaps an appointment or configured buffer. Use Edit to review and explicitly allow a conflict.",
      );
      return;
    }
    eventSaving.current = true;
    const ticket = ++requestVersion.current;
    const previous = item;
    setSaving(true);
    setData((d) => ({
      ...d,
      agenda: d.agenda.map((e) =>
        e.id === item.id ? { ...e, starts_at: start, ends_at: end } : e,
      ),
    }));
    try {
      const r = await fetch(
        item.crmEventId
          ? `/api/calendar/events/${item.crmEventId}`
          : "/api/calendar/external",
        {
          method: "PATCH",
          signal: AbortSignal.timeout(15000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: start,
            endsAt: end,
            version: item.version,
            etag: item.etag,
            timeZone: prefs.timezone,
            ...(!item.crmEventId
              ? {
                  calendarId: item.externalCalendarId,
                  eventId: item.externalId,
                }
              : {}),
          }),
        },
      );
      if (!r.ok || (await r.json()).success === false) throw Error();
      setNotice("Appointment updated.");
      window.dispatchEvent(new Event("myari:activity-changed"));
      refresh();
    } catch {
      if (ticket === requestVersion.current)
        setData((d) => ({
          ...d,
          agenda: d.agenda.map((e) => (e.id === item.id ? previous : e)),
        }));
      setNotice(
        "Saving could not be confirmed. The previous time has been restored locally; refresh before retrying.",
      );
    } finally {
      eventSaving.current = false;
      setSaving(false);
    }
  }
  function drop(e: React.DragEvent, day: string, minute: number) {
    e.preventDefault();
    const item = data.agenda.find(
      (i) => i.id === e.dataTransfer.getData("text/myari-event"),
    );
    if (!item) return;
    try {
      const start = wallTimeToInstant(
        day,
        `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
        prefs.timezone,
      );
      void move(
        item,
        start,
        new Date(
          Date.parse(start) +
            Date.parse(item.ends_at) -
            Date.parse(item.starts_at),
        ).toISOString(),
      );
    } catch {
      setNotice(
        "This time is ambiguous or unavailable due to daylight saving. Use Edit to choose an occurrence.",
      );
    }
  }
  function resize(e: React.PointerEvent, item: ScheduleItem) {
    e.preventDefault();
    e.stopPropagation();
    const y = e.clientY;
    const end = Date.parse(item.ends_at);
    const node = e.currentTarget as HTMLElement;
    node.setPointerCapture(e.pointerId);
    const up = (p: PointerEvent) => {
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", cancel);
      const delta = Math.round((p.clientY - y) / 15) * 15 * 60000;
      const next = Math.max(
        Date.parse(item.starts_at) + 15 * 60000,
        end + delta,
      );
      if (next !== end)
        void move(item, item.starts_at, new Date(next).toISOString());
    };
    const cancel = () => {
      node.removeEventListener("pointerup", up);
    };
    node.addEventListener("pointercancel", cancel, { once: true });
    node.addEventListener("pointerup", up, { once: true });
  }
  async function remove(item: ScheduleItem) {
    if (
      !confirm(
        "Delete this appointment? No messages or invitations will be sent.",
      )
    )
      return;
    setSaving(true);
    try {
      const r = await fetch(
        item.crmEventId
          ? `/api/calendar/events/${item.crmEventId}?${new URLSearchParams({ version: item.version ?? "", ...(item.etag ? { etag: item.etag } : {}) })}`
          : "/api/calendar/external",
        {
          method: "DELETE",
          ...(!item.crmEventId
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  calendarId: item.externalCalendarId,
                  eventId: item.externalId,
                  etag: item.etag,
                }),
              }
            : {}),
        },
      );
      if (!r.ok) throw Error();
      setSelected(null);
      refresh();
      setNotice("Appointment deleted.");
      window.dispatchEvent(new Event("myari:activity-changed"));
    } catch {
      setNotice(
        "This appointment could not be deleted. Its local record has been preserved. Refresh and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  const left = (
    <div className="calendar-side-stack">
    <div className="calendar-panel">
      <h2>All Calendars</h2>
      {data.calendars.map((c) => (
        <label key={c.key} className="calendar-side-label">
          <input
            type="checkbox"
            checked={prefs.visibility[c.key] !== false}
            disabled={!ready}
            onChange={(e) =>
              void savePreferences({
                ...prefs,
                visibility: { ...prefs.visibility, [c.key]: e.target.checked },
              })
            }
          />
          <span>
            {c.name}
            {!c.write ? <small> · read only</small> : null}
          </span>
          <input
            type="color"
            aria-label={`Color for ${c.name}`}
            value={prefs.colors[c.key] ?? c.color}
            onChange={(e) =>
              void savePreferences({
                ...prefs,
                colors: { ...prefs.colors, [c.key]: e.target.value },
              })
            }
          />
        </label>
      ))}
      {!data.calendars.length ? (
        <p>Calendars appear after a successful refresh.</p>
      ) : null}
      <button
        className="calendar-preference-button"
        onClick={() => setPreferencesOpen(true)}
      >
        Calendar preferences
      </button>
    </div>
      <section className="calendar-panel">
        <h2>Quick Actions</h2>
        <div className="calendar-actions">
          <button onClick={() => create()}>
            <Icon name="event" />
            Schedule Event
          </button>
          <button onClick={() => create(date, prefs.workStart, "task")}>
            <Icon name="task_alt" />
            Create Task
          </button>
          <button onClick={() => create(date, prefs.workStart, "callback")}>
            <Icon name="call" />
            Log Callback
          </button>
          <button onClick={() => create(date, prefs.workStart, "reminder")}>
            <Icon name="notifications" />
            Add Reminder
          </button>
        </div>
        <p>
          Callbacks schedule a follow-up. Record completed calls in the contact
          timeline.
        </p>
      </section>
      <DailyPriorities compact timezone={prefs.timezone} />
      <section className="calendar-panel">
        <h2>Daily agenda</h2>
        <p>{dateLabel(date, { month: "short", day: "numeric" })}</p>
        {daily.length ? (
          daily.map((i) => (
            <button
              className="calendar-upcoming"
              key={i.id}
              onClick={() => setSelected(i)}
            >
              <small>
                {i.allDay
                  ? "All day"
                  : formatClock(i.starts_at, prefs.timezone, prefs.hour24)}
              </small>
              {i.title}
            </button>
          ))
        ) : (
          <p>No appointments or dated tasks recorded for this day.</p>
        )}
      </section>
    </div>
  );
  const miniDays = monthDates(date, prefs.mondayStart);
  const right = (
    <div className="calendar-side-stack">
      <section className="calendar-panel">
        <h2>Calendar Integrations</h2>
        {data.health.map((h) => (
          <div className="calendar-provider" key={h.provider}>
            <strong>{h.provider}</strong>
            <p>{h.status}</p>
            <details>
              <summary>Sync details</summary>
              <small>
                Read: {h.read ? "available" : "unverified"} · Write:{" "}
                {h.write ? "available" : "unverified"}
              </small>
              <small>
                Last attempt:{" "}
                {h.lastAttempt
                  ? new Date(h.lastAttempt).toLocaleString("en-US", {
                      timeZone: prefs.timezone,
                    })
                  : "Not recorded"}
              </small>
              <small>
                Last success:{" "}
                {h.lastSuccess
                  ? new Date(h.lastSuccess).toLocaleString("en-US", {
                      timeZone: prefs.timezone,
                    })
                  : "Not recorded"}
              </small>
              {h.error ? <p role="alert">{h.error}</p> : null}
              <small>{h.mode}</small>
              {h.provider === "Google Calendar"
                ? data.calendars
                    .filter((c) => c.provider === "google")
                    .map((c) => (
                      <div
                        key={c.key}
                        className="mt-2 border-t border-[#eee7de] pt-2"
                      >
                        <strong>{c.name}</strong>
                        <small>
                          {c.status ?? "Unverified"} ·{" "}
                          {c.read ? "read" : "no read"} /{" "}
                          {c.write ? "write" : "read only"}
                        </small>
                        <small>
                          Last attempt:{" "}
                          {c.lastAttempt
                            ? new Date(c.lastAttempt).toLocaleString(
                                undefined,
                                { timeZone: prefs.timezone },
                              )
                            : "Not recorded"}
                        </small>
                        <small>
                          Last successful read:{" "}
                          {c.lastSuccess
                            ? new Date(c.lastSuccess).toLocaleString(
                                undefined,
                                { timeZone: prefs.timezone },
                              )
                            : "Not recorded"}
                        </small>
                        {c.error ? <p role="alert">{c.error}</p> : null}
                      </div>
                    ))
                : null}
            </details>
            {h.provider === "Google Calendar" ? (
              <a href="/api/integrations/google/authorize">
                {h.authorized ? "Reconnect Google" : "Connect Google"}
              </a>
            ) : null}
          </div>
        ))}
        <details className="calendar-provider-setup">
          <summary>Booking links & Apple subscriptions</summary>
          <CalendarLinksPanel prefs={prefs} />
        </details>
      </section>
      <section className="calendar-panel">
        <h2>{dateLabel(date, { month: "long", year: "numeric" })}</h2>
        <div className="calendar-mini">
          {(prefs.mondayStart
            ? ["M", "T", "W", "T", "F", "S", "S"]
            : ["S", "M", "T", "W", "T", "F", "S"]
          ).map((d, i) => (
            <span key={i}>{d}</span>
          ))}
          {miniDays.map((d) => (
            <button
              key={d}
              aria-label={dateLabel(d)}
              aria-pressed={d === date}
              onClick={() => setDate(d)}
            >
              {+d.slice(-2)}
            </button>
          ))}
        </div>
      </section>
      <section className="calendar-panel">
        <h2>Upcoming appointments</h2>
        {upcoming.length ? (
          upcoming.map((i) => (
            <button
              className="calendar-upcoming"
              key={i.id}
              onClick={() => setSelected(i)}
            >
              {i.title}
              <small>
                {dateLabel(zonedParts(i.starts_at, prefs.timezone).date, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                ·{" "}
                {i.allDay
                  ? "All day"
                  : formatClock(i.starts_at, prefs.timezone, prefs.hour24)}
              </small>
            </button>
          ))
        ) : (
          <p>No upcoming items in this calendar range.</p>
        )}
      </section>
      <BookingRequestsPanel onChanged={refresh} />

    </div>
  );
  return (
    <div className="calendar-workspace">
      {notice ? (
        <div className="calendar-notice" role="status">
          {notice}
          <button
            className="float-right"
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      ) : null}
      {prefFailed ? (
        <p className="calendar-notice" role="alert">
          Preferences are unavailable. Default settings are shown; reload to
          restore your saved view.
        </p>
      ) : null}
      <div className="calendar-tools">
        {(["calendar", "agenda", "task", "reminder"] as const).map((s) => (
          <button
            key={s}
            aria-pressed={section === s}
            onClick={() => setSection(s)}
          >
            {s === "task"
              ? "Tasks"
              : s === "reminder"
                ? "Reminders"
                : s === "agenda"
                  ? "Agenda"
                  : "Calendar"}
          </button>
        ))}
        <div className="calendar-mobile-panels">
          <button
            onClick={() => {
              setPanel("calendars");
              void savePreferences({
                ...prefs,
                mobileLeftOpen: true,
                mobileRightOpen: false,
              });
            }}
            aria-label="Open calendars panel"
          >
            ☷
          </button>
          <button
            onClick={() => {
              setPanel("details");
              void savePreferences({
                ...prefs,
                mobileRightOpen: true,
                mobileLeftOpen: false,
              });
            }}
            aria-label="Open calendar details"
          >
            ⓘ
          </button>
        </div>
        <div className="calendar-date">
          <button onClick={() => setDate(today.date)}>Today</button>
          <button
            aria-label="Previous period"
            onClick={() =>
              setDate(navigateCalendarDate(date, displayedView, -1))
            }
          >
            ‹
          </button>
          <input
            aria-label="Calendar date"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
          <button
            aria-label="Next period"
            onClick={() =>
              setDate(navigateCalendarDate(date, displayedView, 1))
            }
          >
            ›
          </button>
        </div>
        {(["day", "week", "month", "agenda"] as const).map((v) => (
          <button
            key={v}
            aria-pressed={prefs.view === v}
            disabled={!ready}
            onClick={() => {
              setSection("calendar");
              void savePreferences({ ...prefs, view: v });
            }}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
        <button className="calendar-primary" onClick={() => create()}>
          ＋ Add Event
        </button>
        <div className="calendar-sidebar-toggle">
          <button
            onClick={() =>
              void savePreferences({ ...prefs, leftOpen: !prefs.leftOpen })
            }
            aria-label="Toggle calendars panel"
          >
            ☷
          </button>
          <button
            onClick={() =>
              void savePreferences({ ...prefs, rightOpen: !prefs.rightOpen })
            }
            aria-label="Toggle details panel"
          >
            ⓘ
          </button>
        </div>
      </div>
      <div
        className={`calendar-columns ${!prefs.leftOpen ? "no-left" : ""} ${!prefs.rightOpen ? "no-right" : ""}`}
      >
        {prefs.leftOpen ? (
          <aside className="calendar-left-desktop">{left}</aside>
        ) : null}
        <section className="calendar-stage" aria-label="Scheduling workspace">
          <div className="calendar-period-heading">
            <span className="calendar-period-eyebrow">Your calendar</span>
            <h2 aria-live="polite"><time dateTime={date.slice(0, 7)}>{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</time></h2>
          </div>
          <div className="calendar-stage-header">
            <span>
              {prefs.timezone}
              {saving
                ? " · Saving appointment…"
                : prefStatus === "saving"
                  ? " · Saving preferences…"
                  : prefStatus === "unsynced"
                    ? " · Preferences not synced"
                    : ""}
            </span>
            <input
              aria-label="Search calendar"
              placeholder="Search calendar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="calendar-empty" role="status">
              Loading your calendar…
            </div>
          ) : error ? (
            <div className="calendar-empty" role="alert">
              {error}
            </div>
          ) : section === "task" || section === "reminder" ? (
            <div className="calendar-task-list">
              {visible.filter((i) => i.source === section).length ? (
                visible
                  .filter((i) => i.source === section)
                  .map((i) => (
                    <button
                      className="calendar-upcoming"
                      key={i.id}
                      onClick={() => setSelected(i)}
                    >
                      {i.title}
                      <small>
                        {dateLabel(
                          zonedParts(i.starts_at, prefs.timezone).date,
                        )}
                      </small>
                    </button>
                  ))
              ) : (
                <div className="calendar-empty">
                  No {section === "task" ? "dated tasks" : "reminders"} in this
                  range.
                </div>
              )}
            </div>
          ) : displayedView === "agenda" ? (
            <div className="calendar-agenda">
              {visible.length ? (
                visible.map((i) => (
                  <button key={i.id} onClick={() => setSelected(i)}>
                    <span>
                      {i.title}
                      <small className="block">
                        {i.contactName ?? i.source}
                      </small>
                    </span>
                    <time>
                      {dateLabel(zonedParts(i.starts_at, prefs.timezone).date, {
                        month: "short",
                        day: "numeric",
                      })}
                      <br />
                      {i.allDay
                        ? "All day"
                        : formatClock(
                            i.starts_at,
                            prefs.timezone,
                            prefs.hour24,
                          )}
                    </time>
                  </button>
                ))
              ) : (
                <div className="calendar-empty">
                  No events in this range. Choose Add Event to plan your next
                  appointment.
                </div>
              )}
            </div>
          ) : displayedView === "month" ? (
            <div className="calendar-month">
              {(prefs.mondayStart
                ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
              ).map((weekday) => (
                <div key={weekday} className="calendar-month-weekday" data-weekday={weekday}>
                  <span className="calendar-weekday-full">{weekday}</span>
                  <abbr className="calendar-weekday-short" title={weekday}>{weekday.slice(0, 3)}</abbr>
                </div>
              ))}
              {days.map((day) => (
                <div
                  key={day}
                  className="calendar-month-day"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const item = data.agenda.find(
                      (i) =>
                        i.id === e.dataTransfer.getData("text/myari-event"),
                    );
                    if (item)
                      drop(
                        e,
                        day,
                        (() => {
                          const t = zonedParts(item.starts_at, prefs.timezone)
                            .time.split(":")
                            .map(Number);
                          return t[0] * 60 + t[1];
                        })(),
                      );
                  }}
                >
                  <button
                    aria-label={`Schedule on ${dateLabel(day)}`}
                    aria-current={day === today.date ? "date" : undefined}
                    className={day === today.date ? "calendar-month-today" : undefined}
                    onClick={() => create(day)}
                  >
                    {+day.slice(-2)}
                  </button>
                  {visible
                    .filter((i) =>
                      i.allDay
                        ? i.startDate! <= day && i.endDate! > day
                        : zonedParts(i.starts_at, prefs.timezone).date === day,
                    )
                    .map((i) => (
                      <button
                        key={i.id}
                        className="calendar-month-event"
                        draggable={
                          i.editable &&
                          !i.allDay &&
                          !!(i.crmEventId || i.externalId) &&
                          !saving
                        }
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/myari-event", i.id)
                        }
                        onClick={() => setSelected(i)}
                      >
                        {i.title}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                className="calendar-grid-head"
                style={{
                  gridTemplateColumns: `42px repeat(${days.length},minmax(0,1fr))`,
                }}
              >
                <div />
                <>
                  {days.map((day) => (
                    <div
                      key={day}
                      className={day === today.date ? "is-today" : ""}
                    >
                      <small>{dateLabel(day, { weekday: "short" })}</small>
                      <b>{+day.slice(-2)}</b>
                    </div>
                  ))}
                </>
              </div>
              <div
                className="calendar-all-day"
                style={{
                  gridTemplateColumns: `42px repeat(${days.length},minmax(0,1fr))`,
                }}
              >
                <div>All day</div>
                {days.map((day) => (
                  <div key={day}>
                    {visible
                      .filter(
                        (i) =>
                          i.allDay && i.startDate! <= day && i.endDate! > day,
                      )
                      .map((i) => (
                        <button key={i.id} onClick={() => setSelected(i)}>
                          {i.title}
                        </button>
                      ))}
                  </div>
                ))}
              </div>
              <div className="calendar-scroll" ref={scroll}>
                <div
                  className="calendar-hours"
                  style={{
                    gridTemplateColumns: `42px repeat(${days.length},minmax(0,1fr))`,
                  }}
                >
                  <div>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="calendar-hour-label">
                        {prefs.hour24
                          ? `${h}:00`
                          : `${h % 12 || 12}${h < 12 ? "a" : "p"}`}
                      </div>
                    ))}
                  </div>
                  {days.map((day) => {
                    const segments = placeIntervals(
                      visible
                        .filter(
                          (i) =>
                            !i.allDay &&
                            zonedParts(i.starts_at, prefs.timezone).date <=
                              day &&
                            zonedParts(i.ends_at, prefs.timezone).date >= day,
                        )
                        .map((i) => {
                          const a = zonedParts(i.starts_at, prefs.timezone),
                            b = zonedParts(i.ends_at, prefs.timezone);
                          return {
                            id: i.id,
                            item: i,
                            top: a.date < day ? 0 : a.minutes,
                            bottom:
                              i.source === "task"
                                ? Math.min(1440, a.minutes + 15)
                                : b.date > day
                                  ? 1440
                                  : b.minutes,
                          };
                        })
                        .filter((i) => i.bottom > i.top),
                    );
                    return (
                      <div className="calendar-hours-column" key={day}>
                        {Array.from({ length: 48 }, (_, slot) => (
                          <button
                            key={slot}
                            className="calendar-slot"
                            style={{ top: slot * 30 }}
                            aria-label={`Schedule ${day} ${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`}
                            onClick={() =>
                              create(
                                day,
                                `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`,
                              )
                            }
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => drop(e, day, slot * 30)}
                          />
                        ))}
                        {segments.map(
                          ({ item: i, top, bottom, lane, lanes }) => (
                            <div
                              key={i.id}
                              className={`calendar-event ${bottom - top < 30 ? "calendar-event-compact" : ""}`}
                              role="button"
                              title={`${i.title} · ${describeCalendarInstant(i.starts_at, prefs.timezone, prefs.hour24)}`}
                              tabIndex={0}
                              aria-label={`${i.title}, ${formatClock(i.starts_at, prefs.timezone, prefs.hour24)}`}
                              style={
                                {
                                  top: top * MINUTE_PX,
                                  height: Math.max(
                                    18,
                                    (bottom - top) * MINUTE_PX - 2,
                                  ),
                                  left: `calc(${(lane / lanes) * 100}% + 2px)`,
                                  width: `calc(${100 / lanes}% - 4px)`,
                                  "--event-color":
                                    prefs.colors[i.calendarKey] ??
                                    (i.source === "crm"
                                      ? (
                                          {
                                            meeting: "#79a1d0",
                                            showing: "#78a1d0",
                                            buyer_consultation: "#a38bcf",
                                            listing_appointment: "#b7936f",
                                          } as Record<string, string>
                                        )[i.appointmentType ?? ""]
                                      : undefined) ??
                                    data.calendars.find(
                                      (c) => c.key === i.calendarKey,
                                    )?.color ??
                                    "#bd9169",
                                } as React.CSSProperties
                              }
                              draggable={
                                i.editable &&
                                !!(i.crmEventId || i.externalId) &&
                                !i.allDay &&
                                !saving
                              }
                              onDragStart={(e) =>
                                e.dataTransfer.setData("text/myari-event", i.id)
                              }
                              onClick={() => setSelected(i)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelected(i);
                                }
                              }}
                            >
                              <span
                                className="calendar-event-icon"
                                aria-hidden="true"
                              >
                                <Icon
                                  name={
                                    i.source === "task"
                                      ? "task_alt"
                                      : i.source === "callback"
                                        ? "call"
                                        : i.appointmentType === "showing"
                                          ? "home"
                                          : i.source === "reminder"
                                            ? "notifications"
                                            : "event"
                                  }
                                />
                              </span>
                              <time>
                                {formatClock(
                                  i.starts_at,
                                  prefs.timezone,
                                  prefs.hour24,
                                )}
                              </time>
                              <strong>{i.title}</strong>
                              {i.editable &&
                              (i.crmEventId || i.externalId) &&
                              !i.allDay ? (
                                <span
                                  className="calendar-resize"
                                  onPointerDown={(e) => resize(e, i)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-hidden="true"
                                />
                              ) : null}
                            </div>
                          ),
                        )}
                        {day === today.date ? (
                          <div
                            className="calendar-now"
                            style={{ top: today.minutes * MINUTE_PX }}
                            aria-label="Current time"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
        {prefs.rightOpen ? (
          <aside className="calendar-right-desktop">{right}</aside>
        ) : null}
      </div>
      {panel ? (
        <Modal
          open
          onClose={() => {
            setPanel(null);
            void savePreferences({
              ...prefs,
              mobileLeftOpen: false,
              mobileRightOpen: false,
            });
          }}
          title={panel === "calendars" ? "Calendars" : "Calendar details"}
        >
          {panel === "calendars" ? left : right}
        </Modal>
      ) : null}
      {preferencesOpen ? (
        <CalendarPreferencesDialog
          value={prefs}
          onSave={savePreferences}
          onClose={() => setPreferencesOpen(false)}
        />
      ) : null}
      {editor ? (
        <CalendarEventEditor
          key={
            editor.item?.id ?? `${editor.date}-${editor.time}-${editor.kind}`
          }
          {...editor}
          prefs={prefs}
          items={data.agenda}
          googleAuthorized={data.authorized}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null);
            setSelected(null);
            setNotice(message ?? "Saved.");
            window.dispatchEvent(new Event("myari:activity-changed"));
            refresh();
          }}
        />
      ) : null}
      {selected ? (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={selected.title}
          description={selected.syncState ?? selected.source}
        >
          <div className="calendar-detail">
            <dl>
              <dt>When</dt>
              <dd>
                {dateLabel(zonedParts(selected.starts_at, prefs.timezone).date)}{" "}
                ·{" "}
                {selected.source === "task"
                  ? `Due ${formatClock(selected.starts_at, prefs.timezone, prefs.hour24)}`
                  : selected.allDay
                    ? "All day"
                    : `${formatClock(selected.starts_at, prefs.timezone, prefs.hour24)} – ${formatClock(selected.ends_at, prefs.timezone, prefs.hour24)}`}
              </dd>
              {!selected.allDay ? (
                <>
                  <dt>Exact time</dt>
                  <dd>
                    {describeCalendarInstant(
                      selected.starts_at,
                      prefs.timezone,
                      prefs.hour24,
                    )}
                  </dd>
                </>
              ) : null}
              <dt>Timezone</dt>
              <dd>{prefs.timezone}</dd>
              {selected.contactName ? (
                <>
                  <dt>Contact</dt>
                  <dd>
                    <Link href={`/dashboard/contacts/${selected.contact_id}`}>
                      {selected.contactName}
                    </Link>
                  </dd>
                </>
              ) : null}
              <dt>Source</dt>
              <dd>
                {selected.source}
                {selected.recurrence && selected.recurrence !== "none"
                  ? ` · ${selected.recurrence}`
                  : ""}
              </dd>
            </dl>
            {selected.description ? <p>{selected.description}</p> : null}
            {selected.meetingLink &&
            /^https?:\/\//.test(selected.meetingLink) ? (
              <a
                href={selected.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open meeting link ↗
              </a>
            ) : null}
            <div className="calendar-actions">
              {selected.editable &&
              (selected.crmEventId || selected.externalId) &&
              (!selected.allDay || !selected.externalId) ? (
                <button
                  disabled={saving}
                  onClick={() => {
                    setEditor({ date, time: prefs.workStart, item: selected });
                    setSelected(null);
                  }}
                >
                  Edit / move / resize
                </button>
              ) : null}
              {selected.editable &&
              (selected.crmEventId || selected.externalId) ? (
                <button disabled={saving} onClick={() => void remove(selected)}>
                  Delete appointment
                </button>
              ) : null}
              {selected.htmlLink &&
              /^https:\/\/(calendar|www)\.google\.com\//.test(
                selected.htmlLink,
              ) ? (
                <a
                  href={selected.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google ↗
                </a>
              ) : null}
              {selected.contact_id ? (
                <>
                  <Link href={`/dashboard/contacts/${selected.contact_id}`}>
                    Open contact / tasks
                  </Link>
                  <button
                    onClick={() => {
                      setEditor({
                        date,
                        time: prefs.workStart,
                        contactId: selected.contact_id ?? undefined,
                      });
                      setSelected(null);
                    }}
                  >
                    Schedule follow-up
                  </button>
                </>
              ) : null}
            </div>
            {selected.taskId && !selected.contact_id ? (
              <Link href="/dashboard/tasks">Open task workspace</Link>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
