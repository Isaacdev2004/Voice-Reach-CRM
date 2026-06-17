"use client";

import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  contact_id?: string | null;
  contacts?: { first_name: string; last_name?: string | null } | null;
};

type CalendarTask = {
  id: string;
  title: string;
  due_at: string;
  contact_id?: string | null;
  contacts?: { first_name: string; last_name?: string | null } | null;
};

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

function contactName(c?: { first_name: string; last_name?: string | null } | null) {
  if (!c) return null;
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

export function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/calendar/events", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load calendar");
        setConnected(Boolean(data.connected));
        setAccountEmail(data.accountEmail ?? null);
        setEvents(data.events ?? []);
        setTasks(data.tasks ?? []);
        setError(data.eventsError || data.tasksError || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load calendar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcoming = [...events, ...tasks.map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    starts_at: t.due_at,
    contact_id: t.contact_id,
    contacts: t.contacts,
    isTask: true as const,
  }))].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Calendar
          </p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Your agenda</h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Callbacks, tasks, and Google Calendar events in one place.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-[14px] font-medium text-ivory hover:opacity-90"
        >
          <Icon name="calendar_today" className="text-[18px]" />
          {connected ? "Manage Google Calendar" : "Connect Google Calendar"}
        </Link>
      </header>

      {connected && accountEmail ? (
        <p className="rounded-2xl border border-emerald-muted/20 bg-sage-light/40 px-4 py-3 text-[14px] text-emerald-muted">
          Synced with {accountEmail}
        </p>
      ) : !loading ? (
        <p className="rounded-2xl border border-outline-variant/20 bg-champagne/50 px-4 py-3 text-[14px] text-slate-text">
          Connect Google Calendar in Settings to sync campaign callbacks and tasks automatically.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-champagne px-4 py-3 text-[14px] text-taupe">{error}</p>
      ) : null}

      <LuxuryCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading agenda…</p>
        ) : upcoming.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="event_available" className="mx-auto text-[48px] text-taupe/60" />
            <p className="mt-4 font-serif text-[22px] text-ink">Nothing scheduled yet</p>
            <p className="mt-2 text-[14px] text-slate-text">
              Tasks with due dates and campaign callbacks appear here.
            </p>
            <Link
              href="/dashboard/tasks"
              className="mt-4 inline-block text-[14px] font-medium text-rose-gold-deep hover:underline"
            >
              View all tasks →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/15">
            {upcoming.map((item) => {
              const name = contactName(item.contacts);
              const isTask = "isTask" in item && item.isTask;
              return (
                <li key={item.id} className="flex gap-4 px-6 py-5 hover:bg-cream/40">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      isTask ? "bg-champagne text-taupe" : "bg-sage-light text-emerald-muted"
                    }`}
                  >
                    <Icon name={isTask ? "task_alt" : "event"} className="text-[22px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="text-[14px] text-slate-text">{formatWhen(item.starts_at)}</p>
                    {name && item.contact_id ? (
                      <Link
                        href={`/dashboard/contacts/${item.contact_id}`}
                        className="mt-1 inline-block text-[13px] text-rose-gold-deep hover:underline"
                      >
                        {name} →
                      </Link>
                    ) : null}
                  </div>
                  <span className="self-center rounded-full bg-cream px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-taupe">
                    {isTask ? "Task" : "Event"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </LuxuryCard>
    </div>
  );
}
