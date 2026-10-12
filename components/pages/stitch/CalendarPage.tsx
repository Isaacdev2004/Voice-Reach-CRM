"use client";

import { CalendarQuickActions } from "@/components/calendar/calendar-quick-actions";
import { CalendarUpcomingList } from "@/components/calendar/calendar-upcoming-list";
import { useCalendarReminders } from "@/components/calendar/use-calendar-reminders";
import {
  AddCalendarEventModal,
  type CalendarEventEdit,
} from "@/components/crm/add-calendar-event-modal";
import { CalendarDayPanel, type DayPanelEvent } from "@/components/crm/calendar-day-panel";
import { KpiSpark } from "@/components/crm/kpi-spark";
import { AppToast } from "@/components/ui/app-toast";
import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { MonthCalendar, type CalendarViewMode } from "@/components/crm/month-calendar";
import { Icon } from "@/components/ui/icon";
import { connectGoogleCalendar } from "@/lib/connect-google-calendar";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { cn } from "@/lib/cn";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AgendaItem = DayPanelEvent;

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function monthParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}

export function CalendarPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [counts, setCounts] = useState({ google: 0, crm: 0, tasks: 0 });
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventEdit | null>(null);
  const [connectHint, setConnectHint] = useState<string | null>(null);
  const [mobileDayView, setMobileDayView] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("month");

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch(`/api/calendar/events?month=${monthParam(viewDate)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load calendar");
        setConnected(Boolean(data.connected));
        setAccountEmail(data.accountEmail ?? null);
        setAgenda(data.agenda ?? []);
        setCounts(data.counts ?? { google: 0, crm: 0, tasks: 0 });
        const errors = [data.googleError, data.eventsError, data.tasksError].filter(Boolean);
        setError(errors[0] ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load calendar");
        setAgenda([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [viewDate],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "event") setAddEventOpen(true);
  }, [searchParams]);

  const upcomingAgenda = useMemo(() => {
    const now = Date.now();
    return agenda.filter((item) => new Date(item.starts_at).getTime() >= now);
  }, [agenda]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return agenda.filter((item) => sameDay(new Date(item.starts_at), selectedDate));
  }, [agenda, selectedDate]);

  const weekEvents = useMemo(() => {
    if (!selectedDate) return [];
    const start = startOfWeek(selectedDate);
    const end = endOfWeek(selectedDate);
    return agenda.filter((item) => {
      const t = new Date(item.starts_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
  }, [agenda, selectedDate]);

  const totalEvents = agenda.length;
  const eventsThisWeek = useMemo(() => {
    const now = new Date();
    const end = addDays(now, 7);
    return agenda.filter((item) => {
      const t = new Date(item.starts_at);
      return t >= now && t <= end;
    }).length;
  }, [agenda]);

  const shiftSelectedDay = useCallback((delta: number) => {
    setSelectedDate((prev) => (prev ? addDays(prev, delta) : new Date()));
  }, []);

  const { activeReminder, dismissReminder } = useCalendarReminders(upcomingAgenda);

  const openCreateEvent = useCallback(() => {
    setEditingEvent(null);
    setAddEventOpen(true);
  }, []);

  const openEditEvent = useCallback((event: DayPanelEvent) => {
    if (!event.crmEventId) return;
    setEditingEvent({
      crmEventId: event.crmEventId,
      title: event.title,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      description: event.description ?? null,
      meetingLink: event.meetingLink ?? null,
    });
    setAddEventOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(
    async (event: DayPanelEvent) => {
      if (!event.crmEventId) return;
      if (!window.confirm(`Delete "${event.title}"?`)) return;

      setActionError(null);
      try {
        const res = await fetch(`/api/calendar/events/${event.crmEventId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not delete event");
        await load(true);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not delete event");
      }
    },
    [load],
  );

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDate(day);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileDayView(true);
    }
  }, []);

  const connectGoogle = () => {
    const result = connectGoogleCalendar();
    if (result.blocked) {
      setConnectHint(
        "Google Calendar can’t connect inside this browser. Open MyARI in Safari or Chrome, then try again.",
      );
    }
  };

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      {!connected ? <InAppBrowserBanner context="google-calendar" /> : null}

      {connectHint ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          {connectHint}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {actionError}
        </p>
      ) : null}

      {activeReminder ? (
        <div className="relative z-[200]">
          <AppToast
            message={`Starting in 15 minutes: ${activeReminder.title}`}
            tone="success"
          />
          <button
            type="button"
            onClick={dismissReminder}
            className="fixed left-1/2 top-[4.5rem] z-[201] -translate-x-1/2 text-[12px] font-medium text-taupe hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total events",
            value: loading ? "…" : String(totalEvents),
            detail: eventsThisWeek > 0 ? `+${eventsThisWeek} this week` : "Nothing this week",
            spark: "line" as const,
            trendUp: true,
            icon: "event",
            tone: "bg-sage-light text-emerald-muted",
          },
          {
            label: "Open tasks",
            value: loading ? "…" : String(counts.tasks),
            detail: counts.tasks > 0 ? "On your calendar" : "No task due dates",
            spark: "line" as const,
            trendUp: false,
            icon: "task_alt",
            tone: "bg-champagne text-taupe",
          },
          {
            label: "CRM callbacks",
            value: loading ? "…" : String(counts.crm),
            detail: counts.crm > 0 ? "+3 this week" : "Schedule a callback",
            spark: "line" as const,
            trendUp: true,
            icon: "phone_callback",
            tone: "bg-rose-gold/15 text-rose-gold-deep",
          },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="md" className="min-w-0 transition-shadow hover:shadow-nav">
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                  stat.tone,
                )}
              >
                <Icon name={stat.icon} className="text-[20px]" />
              </div>
              <KpiSpark variant={stat.spark} className={stat.trendUp ? "text-emerald-muted" : "text-taupe"} />
            </div>
            <p className="mt-3 text-[13px] text-taupe">{stat.label}</p>
            <p className="font-serif text-[32px] font-semibold text-ink">{stat.value}</p>
            <p
              className={cn(
                "mt-1 text-[12px]",
                stat.trendUp ? "text-emerald-muted" : "text-slate-text",
              )}
            >
              {stat.detail}
            </p>
          </LuxuryCard>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          <p>{error.includes("invalid_grant") || error.includes("expired") ? "Your Google Calendar connection expired. Reconnect to sync live events - your in-app events still work." : error}</p>
          {error.includes("expired") || error.includes("invalid_grant") || error.includes("Reconnect") ? (
            <button
              type="button"
              onClick={() => {
                const result = connectGoogleCalendar();
                if (result.blocked) {
                  setConnectHint(
                    "Open MyARI in Safari or Chrome, then reconnect Google Calendar.",
                  );
                }
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory"
            >
              Reconnect Google Calendar
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid w-full gap-6 xl:grid-cols-12">
        <LuxuryCard padding="lg" className="w-full min-w-0 xl:col-span-8">
          {loading ? (
            <p className="py-12 text-center text-taupe">Loading calendar…</p>
          ) : mobileDayView && selectedDate ? (
            <CalendarDayPanel
              date={selectedDate}
              events={selectedDayEvents}
              onAddEvent={openCreateEvent}
              onEditEvent={openEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onBack={() => setMobileDayView(false)}
              onPrevDay={() => shiftSelectedDay(-1)}
              onNextDay={() => shiftSelectedDay(1)}
            />
          ) : calendarView === "day" && selectedDate ? (
            <CalendarDayPanel
              date={selectedDate}
              events={selectedDayEvents}
              onAddEvent={openCreateEvent}
              onEditEvent={openEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onPrevDay={() => shiftSelectedDay(-1)}
              onNextDay={() => shiftSelectedDay(1)}
            />
          ) : calendarView === "week" ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCalendarView(mode)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium capitalize",
                      calendarView === mode
                        ? "bg-rose-gold text-ivory"
                        : "border border-outline-variant/25 text-taupe",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="mb-4 font-serif text-[22px] font-semibold text-ink">Week view</p>
              {weekEvents.length === 0 ? (
                <p className="text-[14px] text-slate-text">No events this week.</p>
              ) : (
                <ul className="space-y-2">
                  {weekEvents.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-outline-variant/15 px-4 py-3"
                    >
                      <p className="font-medium text-ink">{item.title}</p>
                      <p className="text-[13px] text-taupe">{formatWhen(item.starts_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <MonthCalendar
              viewDate={viewDate}
              onViewDateChange={setViewDate}
              events={agenda}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onDayClick={handleDayClick}
              viewMode={calendarView}
              onViewModeChange={setCalendarView}
            />
          )}
        </LuxuryCard>

        <div className="space-y-4 xl:col-span-4">
          <LuxuryCard padding="md" className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              {!connected ? (
                <button
                  type="button"
                  onClick={connectGoogle}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-outline-variant/25 bg-ivory px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-champagne"
                >
                  <Icon name="calendar_today" className="text-[18px] text-rose-gold-deep" />
                  Connect Google Calendar
                </button>
              ) : (
                <p className="flex-1 truncate text-[12px] text-taupe">
                  Synced{accountEmail ? ` · ${accountEmail}` : ""}
                </p>
              )}
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/25 px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-champagne disabled:opacity-50"
              >
                <Icon name="refresh" className={cn("text-[18px]", refreshing && "animate-spin")} />
                Refresh
              </button>
            </div>
          </LuxuryCard>

          <LuxuryCard padding="lg" className="w-full min-w-0">
            {selectedDate ? (
              <CalendarDayPanel
                date={selectedDate}
                events={selectedDayEvents}
                onAddEvent={openCreateEvent}
                onEditEvent={openEditEvent}
                onDeleteEvent={handleDeleteEvent}
                onPrevDay={() => shiftSelectedDay(-1)}
                onNextDay={() => shiftSelectedDay(1)}
              />
            ) : (
              <p className="text-[14px] text-taupe">Select a day on the calendar to view its schedule.</p>
            )}
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-taupe">
              Quick actions
            </p>
            <CalendarQuickActions onScheduleEvent={openCreateEvent} />
          </LuxuryCard>

          {!loading && upcomingAgenda.length > 0 ? (
            <LuxuryCard padding="lg">
              <CalendarUpcomingList items={upcomingAgenda} />
            </LuxuryCard>
          ) : null}
        </div>
      </div>
      <AddCalendarEventModal
        open={addEventOpen}
        onClose={() => {
          setAddEventOpen(false);
          setEditingEvent(null);
        }}
        defaultDate={selectedDate}
        editingEvent={editingEvent}
        connected={connected}
        onCreated={() => void load(true)}
      />
    </div>
  );
}

