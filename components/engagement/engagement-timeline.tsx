"use client";

import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type EngagementEvent = {
  id: string;
  contact_id: string | null;
  campaign_id: string | null;
  step_id: string | null;
  event_type:
    | "delivered"
    | "listened"
    | "clicked"
    | "opened"
    | "replied"
    | "callback"
    | "opt_out"
    | "blocked"
    | "failed"
    | "task_completed";
  channel: "voicemail" | "sms" | "email" | "video" | "task" | "callback" | "system";
  score: number;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

type ApiResponse = {
  events: EngagementEvent[];
  score: number | null;
};

const ICON_BY_TYPE: Record<EngagementEvent["event_type"], string> = {
  delivered: "check_circle",
  listened: "voicemail",
  clicked: "ads_click",
  opened: "drafts",
  replied: "reply",
  callback: "phone_callback",
  opt_out: "block",
  blocked: "block",
  failed: "error",
  task_completed: "task_alt",
};

const TONE_BY_TYPE: Record<EngagementEvent["event_type"], string> = {
  delivered: "bg-sage-light text-emerald-muted",
  listened: "bg-rose-gold/15 text-rose-gold-deep",
  clicked: "bg-bronze-light text-bronze",
  opened: "bg-champagne text-taupe",
  replied: "bg-sage-light text-emerald-muted",
  callback: "bg-rose-gold/15 text-rose-gold-deep",
  opt_out: "bg-error/10 text-error",
  blocked: "bg-error/10 text-error",
  failed: "bg-error/10 text-error",
  task_completed: "bg-sage-light text-emerald-muted",
};

const LABELS: Record<EngagementEvent["event_type"], string> = {
  delivered: "Delivered",
  listened: "Voicemail listened",
  clicked: "Link clicked",
  opened: "Email opened",
  replied: "Replied",
  callback: "Callback received",
  opt_out: "Opted out",
  blocked: "Blocked",
  failed: "Failed to send",
  task_completed: "Task completed",
};

function eventTitle(event: EngagementEvent): string {
  if (event.event_type === "delivered" && event.metadata?.provider === "mock") {
    return "Simulated delivery";
  }
  return LABELS[event.event_type];
}

type Props = {
  contactId?: string;
  campaignId?: string;
  limit?: number;
  showScore?: boolean;
  emptyHint?: string;
};

export function EngagementTimeline({
  contactId,
  campaignId,
  limit = 25,
  showScore = true,
  emptyHint = "No engagement events yet — once campaigns send, listens, clicks, and callbacks will appear here.",
}: Props) {
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (contactId) params.set("contactId", contactId);
    if (campaignId) params.set("campaignId", campaignId);
    params.set("limit", String(limit));

    (async () => {
      setLoading(true);
      const envelope = await safeFetch<ApiResponse>(`/api/engagement?${params.toString()}`);
      setLoading(false);
      if (envelope.success) {
        setEvents(envelope.data.events);
        setScore(envelope.data.score);
        setError(null);
      } else {
        setError(envelope.error);
      }
    })();
  }, [contactId, campaignId, limit]);

  if (loading) {
    return <p className="text-[13px] text-taupe">Loading engagement…</p>;
  }
  if (error) {
    return <p className="text-[13px] text-error">{error}</p>;
  }
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/30 p-5 text-center">
        <Icon name="auto_graph" className="text-[28px] text-rose-gold-deep" />
        <p className="mt-2 text-[13px] text-slate-text">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showScore && score !== null ? (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-rose-gold/10 to-bronze-light/15 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-taupe">Engagement score</p>
            <p className="font-serif text-[28px] font-semibold text-rose-gold-deep">{score}</p>
          </div>
          <Icon name="favorite" className="text-[28px] text-rose-gold-deep" />
        </div>
      ) : null}

      <ul className="space-y-0">
        {events.map((event, index) => (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < events.length - 1 ? (
              <span
                className="absolute left-5 top-11 bottom-0 w-px bg-outline-variant/40"
                aria-hidden
              />
            ) : null}
            <div
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                TONE_BY_TYPE[event.event_type],
              )}
            >
              <Icon name={ICON_BY_TYPE[event.event_type]} className="text-[20px]" />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-medium text-ink">{eventTitle(event)}</h4>
                <time className="text-[12px] text-taupe">
                  {new Date(event.occurred_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-0.5 text-[12px] capitalize text-slate-text">
                {event.channel}
                {event.score ? ` · +${event.score}` : ""}
              </p>
              {event.metadata?.provider === "mock" &&
              (event.event_type === "delivered" || event.event_type === "failed") ? (
                <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5 text-[12px] leading-snug text-amber-950">
                  Simulated only — nothing was sent to a real phone or inbox. Use{" "}
                  <strong>Live send</strong> after Twilio / Slybroadcast / Resend are configured.
                </p>
              ) : typeof event.metadata?.error === "string" && event.metadata.error ? (
                <p className="mt-1 text-[12px] leading-snug text-error/90">
                  {event.metadata.error}
                  {typeof event.metadata.provider === "string"
                    ? ` · provider: ${event.metadata.provider}`
                    : ""}
                </p>
              ) : typeof event.metadata?.provider === "string" &&
                event.event_type === "delivered" ? (
                <p className="mt-1 text-[12px] text-taupe">
                  Sent via {event.metadata.provider} (live)
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
