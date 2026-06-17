"use client";

import Link from "next/link";
import { DashboardConcierge } from "@/components/crm/dashboard-concierge";
import {
  FocusHeroBanner,
  HeroActionButton,
  HeroActionLink,
} from "@/components/crm/focus-hero-banner";
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="luxury-page px-4 py-6 sm:p-8 max-w-[1400px] w-full mx-auto space-y-6">
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
          Calendar
        </p>
        <h1 className="font-serif text-[36px] font-semibold tracking-tight text-ink md:text-[40px]">
          {greeting}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-[15px] text-slate-text">
          Your agenda — Google Calendar, tasks, and CRM callbacks together.
        </p>
      </header>

      <FocusHeroBanner
        eyebrow="Today's focus"
        title="Stay on top of every appointment"
        description={
          connected
            ? `Synced with Google Calendar${accountEmail ? ` (${accountEmail})` : ""}. Refresh to pull your latest schedule, or open Google Calendar to add events.`
            : "Connect Google Calendar to see your live schedule alongside VoiceReach tasks and campaign callbacks."
        }
        actions={
          <>
            <HeroActionButton
              icon="refresh"
              onClick={() => void load(true)}
              disabled={loading || refreshing}
              variant="primary"
            >
              {refreshing ? "Refreshing…" : "Refresh agenda"}
            </HeroActionButton>
            {connected ? (
              <HeroActionLink href="https://calendar.google.com/" icon="open_in_new" external variant="ghost">
                Open Google Calendar
              </HeroActionLink>
            ) : (
              <HeroActionLink href="/dashboard/settings?tab=workspace" icon="calendar_today" variant="ghost">
                Connect Google
              </HeroActionLink>
            )}
            <HeroActionLink href="/dashboard/tasks" icon="task_alt" variant="ghost">
              View tasks
            </HeroActionLink>
          </>
        }
      />

      <DashboardConcierge />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          {
            label: "Google events",
            value: loading ? "…" : String(counts.google),
            icon: "event",
            tone: "bg-sage-light text-emerald-muted",
          },
          {
            label: "Open tasks",
            value: loading ? "…" : String(counts.tasks),
            icon: "task_alt",
            tone: "bg-champagne text-taupe",
          },
          {
            label: "CRM callbacks",
            value: loading ? "…" : String(counts.crm),
            icon: "phone_callback",
            tone: "bg-rose-gold/15 text-rose-gold-deep",
          },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="md" className="transition-shadow hover:shadow-nav">
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.tone}`}>
                <Icon name={stat.icon} className="text-[20px]" />
              </div>
              {connected && stat.label === "Google events" ? (
                <span className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-muted">
                  Live
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-[13px] text-taupe">{stat.label}</p>
            <p className="font-serif text-[32px] font-semibold text-ink">{stat.value}</p>
          </LuxuryCard>
        ))}
      </div>

      {error ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error}
        </p>
      ) : null}

      <LuxuryCard padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-4">
          <h2 className="font-serif text-[22px] font-semibold text-ink">Upcoming</h2>
          <Link
            href="/dashboard/settings?tab=workspace"
            className="text-[13px] font-medium text-rose-gold-deep hover:underline"
          >
            {connected ? "Manage connection" : "Connect calendar"}
          </Link>
        </div>

        {loading ? (
          <p className="p-8 text-center text-taupe">Loading agenda…</p>
        ) : agenda.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-champagne/80">
              <Icon name="event_available" className="text-[32px] text-taupe/70" />
            </div>
            <p className="mt-4 font-serif text-[22px] text-ink">
              {connected ? "No upcoming events in this window" : "Nothing scheduled yet"}
            </p>
            <p className="mt-2 mx-auto max-w-md text-[14px] text-slate-text">
              {connected
                ? "Add an event in Google Calendar or create a task on a contact — then hit Refresh agenda."
                : "Connect Google Calendar, or add tasks from any contact profile."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void load(true)}
                className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[14px] font-medium text-ivory"
              >
                <Icon name="refresh" className="text-[18px]" />
                Refresh agenda
              </button>
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
                <li key={item.id} className="flex gap-4 px-6 py-5 transition-colors hover:bg-cream/40">
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
