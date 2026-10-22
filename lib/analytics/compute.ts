import type {
  AnalyticsKpi,
  AnalyticsRange,
  AnalyticsSnapshot,
  CampaignMetric,
  ChannelMetric,
  FunnelStage,
  ProviderSlice,
  TrendPoint,
} from "./types";

type ContactRow = {
  id: string;
  dnc: boolean;
  consent_records?: { status: string }[] | { status: string } | null;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  provider: string;
  created_at: string;
};

type RecipientRow = {
  id: string;
  campaign_id: string;
  delivery_status: string;
  updated_at: string;
  created_at: string;
};

type EngagementRow = {
  event_type: string;
  channel: string | null;
  score: number | null;
  occurred_at: string;
};

type StepRunRow = {
  status: string;
  executed_at: string | null;
  campaign_steps: { type: string } | { type: string }[] | null;
};

const ENGAGEMENT_SIGNAL_TYPES = new Set([
  "listened",
  "clicked",
  "opened",
  "replied",
  "callback",
  "task_completed",
]);

const HIGH_INTENT_TYPES = new Set(["replied", "callback", "task_completed"]);

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

function rangeStart(range: AnalyticsRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function previousRangeStart(range: AnalyticsRange): Date | null {
  if (range === "all") return null;
  const d = rangeStart(range)!;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const prev = new Date(d);
  prev.setDate(prev.getDate() - days);
  return prev;
}

function inRange(iso: string, start: Date | null, end?: Date | null): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (start && t < start.getTime()) return false;
  if (end && t >= end.getTime()) return false;
  return true;
}

function isSuccessStatus(status: string): boolean {
  return status === "sent" || status === "mock_sent" || status === "delivered";
}

function isFailedStatus(status: string): boolean {
  return status === "failed" || status === "blocked";
}

function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

function formatDelta(current: number, previous: number, unit = "%"): string {
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return " - ";
  const sign = diff > 0 ? "+" : "";
  return unit === "ms"
    ? `${sign}${Math.round(diff)}ms`
    : `${sign}${diff.toFixed(1)}%`;
}

function consentScore(contacts: ContactRow[]): number {
  if (contacts.length === 0) return 0;
  let score = 0;
  for (const c of contacts) {
    const rec = Array.isArray(c.consent_records)
      ? c.consent_records[0]
      : c.consent_records;
    if (c.dnc) continue;
    if (rec?.status === "Yes") score += 1;
    else if (rec?.status === "Unknown") score += 0.4;
  }
  return Math.round((score / contacts.length) * 100);
}

function dayLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
  }
  return labels;
}

function stepTypeFromRun(run: StepRunRow): string | null {
  const raw = run.campaign_steps;
  if (!raw) return null;
  const step = Array.isArray(raw) ? raw[0] : raw;
  return step?.type ?? null;
}

const CHANNEL_STEP_MAP: Record<string, { id: string; channel: string; icon: string }> = {
  voicemail: { id: "vm", channel: "Ringless voicemail", icon: "voicemail" },
  sms: { id: "sms", channel: "SMS", icon: "sms" },
  email: { id: "email", channel: "Email", icon: "mail" },
  avatar_video: { id: "video", channel: "Avatar video", icon: "videocam" },
  video: { id: "video", channel: "Avatar video", icon: "videocam" },
};

export function buildAnalyticsSnapshot(params: {
  range: AnalyticsRange;
  contacts: ContactRow[];
  campaigns: CampaignRow[];
  recipients: RecipientRow[];
  engagementEvents?: EngagementRow[];
  stepRuns?: StepRunRow[];
}): AnalyticsSnapshot {
  const { range, contacts, campaigns, recipients } = params;
  const engagementEvents = params.engagementEvents ?? [];
  const stepRuns = params.stepRuns ?? [];
  const start = rangeStart(range);
  const prevStart = previousRangeStart(range);
  const periodEnd = start ? new Date() : null;

  const inPeriod = recipients.filter((r) =>
    inRange(r.updated_at || r.created_at, start, periodEnd ?? undefined),
  );
  const inPrevious =
    start && prevStart
      ? recipients.filter((r) =>
          inRange(r.updated_at || r.created_at, prevStart, start),
        )
      : [];

  const success = inPeriod.filter((r) => isSuccessStatus(r.delivery_status));
  const failed = inPeriod.filter((r) => isFailedStatus(r.delivery_status));
  const attempted = inPeriod.filter((r) => r.delivery_status !== "not_sent");

  const prevSuccess = inPrevious.filter((r) => isSuccessStatus(r.delivery_status));
  const prevAttempted = inPrevious.filter((r) => r.delivery_status !== "not_sent");

  const deliveryRate =
    attempted.length > 0 ? (success.length / attempted.length) * 100 : 0;
  const prevDeliveryRate =
    prevAttempted.length > 0
      ? (prevSuccess.length / prevAttempted.length) * 100
      : deliveryRate;

  const consent = consentScore(contacts);

  const kpis: AnalyticsKpi[] = [
    {
      id: "delivery",
      label: "Delivery success rate",
      value: formatPercent(deliveryRate),
      change: formatDelta(deliveryRate, prevDeliveryRate),
      changeTone: deliveryRate >= prevDeliveryRate ? "up" : "down",
      icon: "check_circle",
      tone: "sage",
    },
    {
      id: "response",
      label: "Avg. provider latency",
      value: "Unavailable",
      change: "No latency measurements",
      changeTone: "neutral",
      icon: "timer",
      tone: "bronze",
    },
    {
      id: "conversion",
      label: "Engagement rate",
      value: "Unavailable",
      change: "No engagement measurements",
      changeTone: "neutral",
      icon: "trending_up",
      tone: "rose",
    },
    {
      id: "consent",
      label: "Consent health",
      value: `${consent}/100`,
      change: consent >= 80 ? "Healthy" : consent >= 60 ? "Review" : "At risk",
      changeTone: consent >= 80 ? "neutral" : "down",
      icon: "verified_user",
      tone: consent >= 80 ? "sage" : "bronze",
    },
  ];

  const trendDays = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : Math.max(7, Math.ceil((Date.now() - Math.min(Date.now(), ...recipients.map((r) => Date.parse(r.created_at)).filter(Number.isFinite))) / 86400000) + 1);
  const labels = dayLabels(trendDays);
  const trends: TrendPoint[] = labels.map((label, idx) => {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - (trendDays - 1 - idx));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayRows = inPeriod.filter((r) => {
      const t = new Date(r.updated_at || r.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    return {
      label,
      connected: dayRows.filter((r) => isSuccessStatus(r.delivery_status)).length,
      failed: dayRows.filter((r) => isFailedStatus(r.delivery_status)).length,
    };
  });

  const providerMap = new Map<string, number>();
  for (const c of campaigns) {
    const key = c.provider || "mock";
    const count = inPeriod.filter(
      (r) => r.campaign_id === c.id && isSuccessStatus(r.delivery_status),
    ).length;
    providerMap.set(key, (providerMap.get(key) ?? 0) + count);
  }
  if (providerMap.size === 0 && success.length > 0) {
    providerMap.set("mock", success.length);
  }

  const providerTotal = [...providerMap.values()].reduce((a, b) => a + b, 0) || 1;
  const providerNames: Record<string, string> = {
    mock: "ARI (mock)",
    twilio: "Twilio",
    vonage: "Vonage",
    aws: "AWS Connect",
  };

  const providers: ProviderSlice[] = [...providerMap.entries()]
    .map(([id, count]) => ({
      id,
      name: providerNames[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
      count,
      percent: Math.round((count / providerTotal) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const totalOutreach = attempted.length;
  const connected = inPeriod.filter((r) => isSuccessStatus(r.delivery_status)).length;
  const engagement = 0;
  const converted = 0;

  const funnel: FunnelStage[] = [
    {
      id: "outreach",
      label: "Total outreach",
      count: totalOutreach,
      percent: 100,
    },
    {
      id: "connected",
      label: "Sent / delivered",
      count: connected,
      percent: totalOutreach ? Math.round((connected / totalOutreach) * 100) : 0,
    },
    {
      id: "engagement",
      label: "Engagement (unavailable)",
      count: engagement,
      percent: totalOutreach ? Math.round((engagement / totalOutreach) * 100) : 0,
    },
    {
      id: "converted",
      label: "High-intent leads (unavailable)",
      count: converted,
      percent: totalOutreach ? Math.round((converted / totalOutreach) * 100) : 0,
    },
  ];

  const campaignMetrics: CampaignMetric[] = campaigns.filter((c) => inPeriod.some((r) => r.campaign_id === c.id)).map((c) => {
    const rows = attempted.filter((r) => r.campaign_id === c.id);
    const vol = rows.length;
    const del = rows.filter((r) => isSuccessStatus(r.delivery_status)).length;
    const rate = vol > 0 ? (del / vol) * 100 : 0;

    return {
      id: c.id,
      name: c.name,
      subtitle: c.provider ? `${c.provider} provider` : "Campaign",
      volume: vol,
      delivered: del,
      roi: "Unavailable",
      roiTone: "neutral",
      status: c.status,
      deliveryRate: Math.round(rate),
    };
  });

  campaignMetrics.sort((a, b) => b.volume - a.volume);

  const channels: ChannelMetric[] = []; // Recipient records do not identify a channel.

  return {
    range,
    rangeLabel: RANGE_LABELS[range],
    generatedAt: new Date().toISOString(),
    fromLiveData: true,
    kpis,
    trends,
    providers,
    funnel,
    campaigns: campaignMetrics,
    channels,
    totals: {
      outreach: totalOutreach,
      contacts: contacts.length,
      campaigns: campaigns.length,
    },
  };
}
