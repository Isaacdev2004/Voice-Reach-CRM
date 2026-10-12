"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { DayPanelEvent } from "@/components/crm/calendar-day-panel";

function formatUpcoming(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function sourceTag(source: DayPanelEvent["source"]) {
  if (source === "google") return { label: "Google", className: "bg-sage-light text-emerald-muted" };
  if (source === "task") return { label: "Task", className: "bg-champagne text-taupe" };
  return { label: "CRM", className: "bg-rose-gold/15 text-rose-gold-deep" };
}

type CalendarUpcomingListProps = {
  items: DayPanelEvent[];
  limit?: number;
};

export function CalendarUpcomingList({ items, limit = 6 }: CalendarUpcomingListProps) {
  const slice = items.slice(0, limit);
  if (slice.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-[18px] font-semibold text-ink">Upcoming events</h3>
        <Link href="/dashboard/calendar" className="text-[12px] font-medium text-rose-gold-deep hover:underline">
          View all events
        </Link>
      </div>
      <ul className="space-y-3">
        {slice.map((item) => {
          const when = formatUpcoming(item.starts_at);
          const tag = sourceTag(item.source);
          return (
            <li
              key={item.id}
              className="rounded-2xl border border-outline-variant/12 bg-ivory px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-taupe">
                    {when.date} · {when.time}
                  </p>
                </div>
                <button type="button" className="shrink-0 rounded-full p-1 text-taupe hover:bg-champagne" aria-label="Options">
                  <Icon name="more_horiz" className="text-[20px]" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {item.meetingLink ? (
                  <a
                    href={item.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-gold-deep hover:underline"
                  >
                    <Icon name="videocam" className="text-[16px]" />
                    Join meeting
                  </a>
                ) : null}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}
                >
                  {tag.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
