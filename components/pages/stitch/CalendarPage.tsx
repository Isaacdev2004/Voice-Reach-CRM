"use client";



import Link from "next/link";

import { AddCalendarEventModal } from "@/components/crm/add-calendar-event-modal";

import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";

import { LuxuryCard } from "@/components/crm/luxury-card";

import { MonthCalendar } from "@/components/crm/month-calendar";

import { Icon } from "@/components/ui/icon";
import { connectGoogleCalendar } from "@/lib/connect-google-calendar";

import { useSearchParams } from "next/navigation";

import { useCallback, useEffect, useMemo, useState } from "react";



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
  const [connectHint, setConnectHint] = useState<string | null>(null);



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



  const selectedDayEvents = useMemo(() => {

    if (!selectedDate) return [];

    return agenda.filter((item) => sameDay(new Date(item.starts_at), selectedDate));

  }, [agenda, selectedDate]);



  const handleDayClick = useCallback((day: Date) => {

    setSelectedDate(day);

    setAddEventOpen(true);

  }, []);



  const hour = new Date().getHours();

  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";



  return (

    <div className="luxury-page w-full max-w-[1400px] space-y-6 px-4 py-6 sm:p-8 mx-auto">

      <header className="flex w-full flex-wrap items-start justify-between gap-4">

        <div className="min-w-0 flex-1">

          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">

            Calendar

          </p>

          <h1 className="font-serif text-[36px] font-semibold tracking-tight text-ink md:text-[40px]">

            {greeting}

          </h1>

          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-text">

            Your full schedule in one place — add events here and they sync to Google Calendar when

            connected.

          </p>

          {connected && accountEmail ? (

            <p className="mt-2 text-[13px] text-taupe">Synced with {accountEmail}</p>

          ) : null}

        </div>

        <div className="flex shrink-0 flex-wrap gap-3">

          <button

            type="button"

            onClick={() => setAddEventOpen(true)}

            className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory hover:bg-rose-gold-deep"

          >

            <Icon name="add" className="text-[18px]" />

            Add event

          </button>

          <button

            type="button"

            onClick={() => void load(true)}

            disabled={loading || refreshing}

            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne disabled:opacity-50"

          >

            <Icon name="refresh" className="text-[18px]" />

            {refreshing ? "Refreshing…" : "Refresh"}

          </button>

          {!connected ? (

            <button

              type="button"

              onClick={() => {

                const result = connectGoogleCalendar();

                if (result.blocked) {

                  setConnectHint(

                    "Google Calendar can’t connect inside this browser. Open VoiceReach in Safari or Chrome, then try again.",

                  );

                }

              }}

              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"

            >

              <Icon name="calendar_today" className="text-[18px]" />

              Connect Google

            </button>

          ) : null}

        </div>

      </header>



      {!connected ? <InAppBrowserBanner context="google-calendar" /> : null}



      {connectHint ? (

        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">

          {connectHint}

        </p>

      ) : null}



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



      <div className="grid w-full gap-6 lg:grid-cols-[1fr_340px]">

        <LuxuryCard padding="lg" className="w-full min-w-0">

          {loading ? (

            <p className="py-12 text-center text-taupe">Loading calendar…</p>

          ) : (

            <MonthCalendar

              viewDate={viewDate}

              onViewDateChange={setViewDate}

              events={agenda}

              selectedDate={selectedDate}

              onSelectDate={setSelectedDate}

              onDayClick={handleDayClick}

            />

          )}

          {!loading ? (

            <p className="mt-4 text-center text-[13px] text-taupe sm:text-left">

              Click any day to add an event on that date.

            </p>

          ) : null}

        </LuxuryCard>



        <LuxuryCard padding="none" className="w-full min-w-0 overflow-hidden">

          <div className="border-b border-outline-variant/15 px-5 py-4">

            <h2 className="font-serif text-[20px] font-semibold text-ink">

              {selectedDate

                ? selectedDate.toLocaleDateString(undefined, {

                    weekday: "long",

                    month: "long",

                    day: "numeric",

                  })

                : "Select a day"}

            </h2>

            <button

              type="button"

              onClick={() => setAddEventOpen(true)}

              className="mt-2 text-[13px] font-medium text-rose-gold-deep hover:underline"

            >

              + Add event on this day

            </button>

          </div>



          {selectedDayEvents.length === 0 ? (

            <p className="p-6 text-center text-[14px] text-taupe">

              Nothing scheduled this day. Click the day on the calendar to add an event.

            </p>

          ) : (

            <ul className="divide-y divide-outline-variant/15">

              {selectedDayEvents.map((item) => {

                const name = contactName(item.contacts);

                const tone =

                  item.source === "google"

                    ? "bg-sage-light text-emerald-muted"

                    : item.source === "task"

                      ? "bg-champagne text-taupe"

                      : "bg-rose-gold/15 text-rose-gold-deep";

                const icon =

                  item.source === "google"

                    ? "event"

                    : item.source === "task"

                      ? "task_alt"

                      : "phone_callback";



                return (

                  <li key={item.id} className="flex gap-3 px-5 py-4">

                    <div

                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}

                    >

                      <Icon name={icon} className="text-[18px]" />

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="font-medium text-ink">{item.title}</p>

                      <p className="text-[13px] text-slate-text">{formatWhen(item.starts_at)}</p>

                      {name && item.contact_id ? (

                        <Link

                          href={`/dashboard/contacts/${item.contact_id}`}

                          className="mt-1 inline-block text-[12px] text-rose-gold-deep hover:underline"

                        >

                          {name}

                        </Link>

                      ) : null}

                      <span className="mt-1 block text-[11px] uppercase tracking-wider text-taupe">

                        {sourceLabel(item.source)}

                      </span>

                    </div>

                  </li>

                );

              })}

            </ul>

          )}

        </LuxuryCard>

      </div>



      <LuxuryCard padding="none" className="w-full overflow-hidden">

        <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-4">

          <h2 className="font-serif text-[22px] font-semibold text-ink">Upcoming</h2>

          <Link

            href="/dashboard/tasks"

            className="text-[13px] font-medium text-rose-gold-deep hover:underline"

          >

            View all tasks →

          </Link>

        </div>



        {loading ? (

          <p className="p-8 text-center text-taupe">Loading agenda…</p>

        ) : agenda.length === 0 ? (

          <div className="p-12 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-champagne/80">

              <Icon name="event_available" className="text-[32px] text-taupe/70" />

            </div>

            <p className="mt-4 font-serif text-[22px] text-ink">No events yet</p>

            <p className="mx-auto mt-2 max-w-md text-[14px] text-slate-text">

              Click Add event to schedule something — it will appear here and sync to Google

              Calendar when connected.

            </p>

            <button

              type="button"

              onClick={() => setAddEventOpen(true)}

              className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[14px] font-medium text-ivory"

            >

              <Icon name="add" className="text-[18px]" />

              Add your first event

            </button>

          </div>

        ) : (

          <ul className="divide-y divide-outline-variant/15">

            {agenda.slice(0, 8).map((item) => {

              const name = contactName(item.contacts);

              return (

                <li key={item.id} className="flex gap-4 px-6 py-4 hover:bg-cream/40">

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

                  <span className="shrink-0 self-center rounded-full bg-cream px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-taupe">

                    {sourceLabel(item.source)}

                  </span>

                </li>

              );

            })}

          </ul>

        )}

      </LuxuryCard>



      <AddCalendarEventModal

        open={addEventOpen}

        onClose={() => setAddEventOpen(false)}

        defaultDate={selectedDate}

        connected={connected}

        onCreated={() => void load(true)}

      />

    </div>

  );

}


