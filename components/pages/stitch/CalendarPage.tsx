"use client";

import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { useCallback, useEffect, useState } from "react";

type AgendaItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  contact_id?: string | null;
  contacts?: { first_name: string; last_name?: string | null } | null;
  source: "google" | "crm" | "task";
  htmlLink?: string | null;
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

function sourceLabel(source: AgendaItem["source"]) {
  switch (source) {
    case "google":
      return "Google";
    case "task":
      return "Task";
    default:
      return "CRM";
  }
}

export function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [counts, setCounts] = useState({ google: 0, crm: 0, tasks: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/calendar/events", { cache: "no-store" });
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Calendar
          </p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Your agenda</h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Live Google Calendar events, CRM callbacks, and tasks in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-cream px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne disabled:opacity-50"
          >
            <Icon name="refresh" className="text-[18px]" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {connected ? (
            <a
              href="https://calendar.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-cream px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
            >
              <Icon name="open_in_new" className="text-[18px]" />
              Open Google Calendar
            </a>
          ) : null}
          <Link
            href="/dashboard/settings?tab=workspace"
            className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-[14px] font-medium text-ivory hover:opacity-90"
          >
            <Icon name="calendar_today" className="text-[18px]" />
            {connected ? "Manage connection" : "Connect Google Calendar"}
          </Link>
        </div>
      </header>

      {connected ? (
        <p className="rounded-2xl border border-emerald-muted/20 bg-sage-light/40 px-4 py-3 text-[14px] text-emerald-muted">
          Google Calendar connected
          {accountEmail ? ` · ${accountEmail}` : ""}
          {counts.google > 0 ? ` · ${counts.google} event${counts.google === 1 ? "" : "s"} loaded` : ""}
        </p>
      ) : !loading ? (
        <p className="rounded-2xl border border-outline-variant/20 bg-champagne/50 px-4 py-3 text-[14px] text-slate-text">
          Connect Google Calendar in Settings to see your live schedule here.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error}
        </p>
      ) : null}

      <LuxuryCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading agenda…</p>
        ) : agenda.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="event_available" className="mx-auto text-[48px] text-taupe/60" />
            <p className="mt-4 font-serif text-[22px] text-ink">
              {connected ? "No upcoming events in this window" : "Nothing scheduled yet"}
            </p>
            <p className="mt-2 text-[14px] text-slate-text max-w-md mx-auto">
              {connected
                ? "Add events in Google Calendar, create tasks on a contact profile, or run a campaign with callback steps — then hit Refresh."
                : "Connect Google Calendar to pull in your schedule, or add tasks from any contact profile."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[14px] font-medium text-ivory"
              >
                <Icon name="task_alt" className="text-[18px]" />
                View tasks
              </Link>
              <Link
                href="/dashboard/contacts"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-4 py-2 text-[14px] font-medium text-ink hover:bg-champagne"
              >
                <Icon name="person" className="text-[18px]" />
                Add task on a contact
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/15">
            {agenda.map((item) => {
              const name = contactName(item.contacts);
              const tone =
                item.source === "google"
                  ? "bg-sage-light text-emerald-muted"
                  : item.source === "task"
                    ? "bg-champagne text-taupe"
                    : "bg-rose-gold/15 text-rose-gold-deep";
              const icon =
                item.source === "google" ? "event" : item.source === "task" ? "task_alt" : "phone_callback";

              return (
                <li key={item.id} className="flex gap-4 px-6 py-5 hover:bg-cream/40">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}
                  >
                    <Icon name={icon} className="text-[22px]" />
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
                  <div className="flex shrink-0 flex-col items-end gap-2 self-center">
                    <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-taupe">
                      {sourceLabel(item.source)}
                    </span>
                    {item.htmlLink ? (
                      <a
                        href={item.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-medium text-rose-gold-deep hover:underline"
                      >
                        Open →
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </LuxuryCard>
    </div>
  );
}
