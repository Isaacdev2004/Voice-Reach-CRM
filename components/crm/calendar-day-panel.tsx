"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type DayPanelEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  contact_id?: string | null;
  contacts?: { first_name: string; last_name?: string | null } | null;
  source: "google" | "crm" | "task";
  htmlLink?: string | null;
  meetingLink?: string | null;
  crmEventId?: string | null;
  description?: string | null;
};

type CalendarDayPanelProps = {
  date: Date;
  events: DayPanelEvent[];
  onAddEvent: () => void;
  onEditEvent?: (event: DayPanelEvent) => void;
  onDeleteEvent?: (event: DayPanelEvent) => Promise<void>;
  onBack?: () => void;
  className?: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function contactName(c?: { first_name: string; last_name?: string | null } | null) {
  if (!c) return null;
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

function sourceLabel(source: DayPanelEvent["source"]) {
  switch (source) {
    case "google":
      return "Google";
    case "task":
      return "Task";
    default:
      return "CRM";
  }
}

export function CalendarDayPanel({
  date,
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onBack,
  className,
}: CalendarDayPanelProps) {
  const label = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={cn("w-full min-w-0", className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-[14px] font-medium text-rose-gold-deep hover:underline"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to month
        </button>
      ) : null}

      <div className="border-b border-outline-variant/15 pb-4">
        <h2 className="font-serif text-[24px] font-semibold text-ink">{label}</h2>
        <p className="mt-1 text-[14px] text-taupe">
          {events.length === 0
            ? "Nothing scheduled yet"
            : `${events.length} event${events.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={onAddEvent}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[14px] font-medium text-ivory"
        >
          <Icon name="add" className="text-[18px]" />
          Add event
        </button>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-[15px] leading-relaxed text-slate-text">
          Your day is open. Add an appointment, callback, or reminder above.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {events.map((item) => {
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
            const canManage = Boolean(item.crmEventId && onEditEvent && onDeleteEvent);

            return (
              <li key={item.id} className="flex gap-3 py-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}
                >
                  <Icon name={icon} className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="text-[14px] text-slate-text">{formatWhen(item.starts_at)}</p>
                  {item.meetingLink ? (
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-rose-gold-deep hover:underline"
                    >
                      <Icon name="videocam" className="text-[16px]" />
                      Join meeting
                    </a>
                  ) : null}
                  {name && item.contact_id ? (
                    <Link
                      href={`/dashboard/contacts/${item.contact_id}`}
                      className="mt-1 inline-block text-[13px] text-rose-gold-deep hover:underline"
                    >
                      {name}
                    </Link>
                  ) : null}
                  <span className="mt-1 block text-[11px] uppercase tracking-wider text-taupe">
                    {sourceLabel(item.source)}
                  </span>
                  {canManage ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEditEvent?.(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-outline-variant/25 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-champagne"
                      >
                        <Icon name="edit" className="text-[14px]" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteEvent?.(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-error/25 px-3 py-1.5 text-[12px] font-medium text-error hover:bg-error/5"
                      >
                        <Icon name="delete" className="text-[14px]" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
