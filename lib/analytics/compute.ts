import type { AnalyticsRange, AnalyticsSnapshot } from "./types";
import { summarizeDelivery } from "@/lib/delivery/metrics";
import { CHANNELS, type MessageRecord } from "@/lib/delivery/types";
export function analyticsStart(
  range: AnalyticsRange,
  now = new Date(),
): string | undefined {
  if (range === "all") return undefined;
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(
    date.getUTCDate() - ({ "7d": 7, "30d": 30, "90d": 90 }[range] - 1),
  );
  return date.toISOString();
}
/** UTC calendar-day attempt cohort. Old recipient rollups and manual engagement events are not receipts. */
export function buildAnalyticsSnapshot(params: {
  range: AnalyticsRange;
  contacts: { id: string }[];
  campaigns: {
    id: string;
    name: string;
    status: string;
    provider?: string;
    created_at?: string;
  }[];
  recipients?: unknown[];
  engagementEvents?: unknown[];
  stepRuns?: unknown[];
  records?: MessageRecord[];
  now?: Date;
}): AnalyticsSnapshot {
  const now = params.now ?? new Date(),
    from = analyticsStart(params.range, now),
    to = now.toISOString();
  const records = (params.records ?? []).filter(
    (r) =>
      r.provider !== "mock" &&
      (!from || r.created_at >= from) &&
      r.created_at < to,
  );
  const metric = summarizeDelivery(records);
  const labels = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
  };
  const percent = (n: number | null) =>
    n === null ? "Unavailable" : `${n.toFixed(1)}%`;
  const previous =
    params.range === "all"
      ? null
      : summarizeDelivery(
          params.records ?? [],
          new Date(
            Date.parse(from!) -
              { "7d": 7, "30d": 30, "90d": 90 }[
                params.range as Exclude<AnalyticsRange, "all">
              ] *
                86400000,
          ).toISOString(),
          from,
        );
  const change =
    metric.deliveryRate !== null &&
    previous?.deliveryRate !== null &&
    previous?.deliveryRate !== undefined
      ? `${metric.deliveryRate - previous.deliveryRate >= 0 ? "+" : ""}${(metric.deliveryRate - previous.deliveryRate).toFixed(1)} pp`
      : undefined;
  const providerNames: Record<string, string> = {
    twilio: "Twilio",
    resend: "Resend",
    slybroadcast: "Slybroadcast",
  };
  const providers = [...new Set(records.map((r) => r.provider))].map(
    (provider) => {
      const count = records.filter((r) => r.provider === provider).length;
      return {
        id: provider,
        name: providerNames[provider] ?? provider,
        count,
        percent: records.length
          ? (count / records.length) * 100
          : 0,
      };
    },
  );
  const days =
    params.range === "all"
      ? Math.min(
          366,
          Math.max(
            7,
            Math.ceil(
              (now.getTime() -
                Math.min(
                  now.getTime(),
                  ...records.map((r) => Date.parse(r.created_at)),
                )) /
                86400000,
            ),
          ),
        )
      : { "7d": 7, "30d": 30, "90d": 90 }[params.range];
  const trends = Array.from({ length: days }, (_, i) => {
    const start = new Date(now.getTime() - (days - 1 - i) * 86400000);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    const m = summarizeDelivery(
      records,
      start.toISOString(),
      end.toISOString(),
    );
    return {
      label: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      connected: m.delivered,
      failed: m.failed,
    };
  });
  return {
    range: params.range,
    rangeLabel: labels[params.range],
    generatedAt: to,
    fromLiveData: params.records !== undefined,
    kpis: [
      {
        id: "delivery",
        label: "Confirmed delivery rate",
        value: percent(metric.deliveryRate),
        change,
        changeTone: "neutral",
        icon: "check_circle",
        tone: "sage",
      },
      {
        id: "response",
        label: "Provider-confirmed sent",
        value: params.records ? String(metric.sent) : "Unavailable",
        change: "Distinct logical messages",
        icon: "send",
        tone: "bronze",
      },
      {
        id: "conversion",
        label: "Verified reply rate",
        value:
          metric.replied && metric.messages
            ? percent((metric.replied / metric.messages) * 100)
            : "Unavailable",
        change: "Replies correlated to outbound messages",
        icon: "forum",
        tone: "rose",
      },
      {
        id: "consent",
        label: "Pending confirmation",
        value: params.records ? String(metric.pending) : "Unavailable",
        change: "Not proof of delivery",
        icon: "schedule",
        tone: "default",
      },
    ],
    trends,
    providers,
    funnel: [
      {
        id: "outreach",
        label: "Attempted logical messages",
        count: metric.messages,
        percent: metric.messages ? 100 : null,
      },
      {
        id: "connected",
        label: "Confirmed delivered",
        count: metric.delivered,
        percent: metric.deliveryRate,
      },
      {
        id: "engagement",
        label: "Verified replies",
        count: metric.replied,
        percent:
          metric.messages && metric.replied
            ? (metric.replied / metric.messages) * 100
            : null,
      },
    ],
    campaigns: params.campaigns
      .filter((c) => records.some((r) => r.campaign_id === c.id))
      .map((c) => {
        const m = summarizeDelivery(
          records.filter((r) => r.campaign_id === c.id),
        );
        return {
          id: c.id,
          name: c.name,
          subtitle: "UTC attempt cohort · unique messages",
          volume: m.messages,
          contacts: m.recipients,
          delivered: m.delivered,
          roi: "Unavailable",
          roiTone: "neutral",
          status: c.status,
          deliveryRate: Number((m.deliveryRate ?? 0).toFixed(1)),
        };
      }),
    channels: params.records
      ? CHANNELS.map((channel) => {
          const m = summarizeDelivery(
            records.filter((r) => r.channel === channel),
          );
          return {
            id: channel,
            channel:
              channel === "voicemail"
                ? "Ringless voicemail"
                : channel === "sms"
                  ? "SMS"
                  : "Email",
            icon:
              channel === "email"
                ? "mail"
                : channel === "sms"
                  ? "sms"
                  : "voicemail",
            sent: m.sent,
            rate: m.deliveryRate,
          };
        })
      : [],
    totals: {
      outreach: metric.messages,
      contacts: new Set(params.contacts.map((c) => c.id)).size,
      campaigns: new Set(params.campaigns.map((c) => c.id)).size,
    },
  };
}
