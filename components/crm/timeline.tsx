import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { TimelineEvent, TimelineEventType } from "@/lib/crm/types";

const iconByType: Record<TimelineEventType, string> = {
  voicemail: "voicemail",
  email: "mail",
  sms: "sms",
  callback: "phone_callback",
  video: "videocam",
  connection: "handshake",
  note: "edit_note",
};

const toneByType: Record<TimelineEventType, string> = {
  voicemail: "bg-sage-light text-emerald-muted",
  email: "bg-bronze-light text-bronze",
  sms: "bg-champagne text-taupe",
  callback: "bg-rose-gold/20 text-rose-gold-deep",
  video: "bg-secondary-fixed/30 text-secondary",
  connection: "bg-surface-container text-on-surface-variant",
  note: "bg-surface-container-high text-primary",
};

type TimelineProps = {
  events: TimelineEvent[];
  className?: string;
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <ul className={cn("space-y-0", className)}>
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
          {index < events.length - 1 ? (
            <span
              className="absolute left-5 top-11 bottom-0 w-px bg-outline-variant/40"
              aria-hidden
            />
          ) : null}
          <div
            className={cn(
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              toneByType[event.type],
            )}
          >
            <Icon name={iconByType[event.type]} className="text-[20px]" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-medium text-ink">{event.title}</h4>
              <time className="text-[12px] text-taupe">{event.date}</time>
            </div>
            <p className="mt-1 text-body-md text-slate-text">{event.description}</p>
            {event.actor ? (
              <p className="mt-1 text-[12px] text-taupe/80">{event.actor}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
