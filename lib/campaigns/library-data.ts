/** Read-only campaign presentation. No engine or enrollment mutations. */
export type LibraryCampaign = {
  id: string;
  name: string;
  status: string;
  provider?: string;
  live_launched?: boolean | null;
  created_at: string;
  updated_at?: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  owner_name?: string;
  audience?: string;
  goals?: string[];
  enrollmentCount: number;
  stepCount: number;
  durationMinutes: number | null;
  channels: string[];
};
export type LibraryStep = {
  id: string;
  campaign_id?: string;
  step_order: number;
  type: string;
  title: string;
  description?: string;
  delay_minutes: number;
  day_label?: string | null;
  time_label?: string | null;
  voice_asset_id?: string | null;
  conditions?: Record<string, unknown> | null;
};
export type LibraryRecipient = {
  id: string;
  campaign_id?: string;
  contact_id: string;
  eligibility_status: string;
  delivery_status: string;
  updated_at?: string;
  contact?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
};
export type LibraryRun = {
  id: string;
  campaign_id?: string;
  step_id: string;
  recipient_id: string;
  status: string;
  scheduled_at?: string;
  executed_at?: string | null;
};
export type LibraryEvent = {
  id: string;
  event_type: string;
  contact_id?: string;
  occurred_at?: string;
};
export type LibraryPreview = {
  campaign: LibraryCampaign;
  steps: LibraryStep[];
  recipients: LibraryRecipient[];
  runs: LibraryRun[];
  engagement: LibraryEvent[];
  performanceAvailable: boolean;
};
export function sequenceSummary(steps: LibraryStep[]) {
  const delays = steps.map((s) => Number(s.delay_minutes));
  return {
    stepCount: new Set(steps.map((s) => s.id)).size,
    durationMinutes:
      steps.length && delays.every((d) => Number.isFinite(d) && d >= 0)
        ? Math.max(...delays)
        : null,
    channels: [
      ...new Set(
        steps.map((s) => s.type).filter((t) => t !== "wait" && t !== "task"),
      ),
    ],
  };
}
export function durationLabel(minutes: number | null) {
  if (minutes === null) return "Duration unavailable";
  if (minutes === 0) return "Same day";
  return minutes >= 1440
    ? `${Number((minutes / 1440).toFixed(1))} days`
    : `${minutes} min`;
}
export function campaignCounts(rows: LibraryCampaign[]) {
  const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
  return {
    total: unique.length,
    active: unique.filter(
      (r) =>
        r.status === "sending" &&
        (r.provider === "mock" || r.live_launched !== false),
    ).length,
    draft: unique.filter((r) => r.status === "draft").length,
    queued: unique.filter((r) => r.status === "queued").length,
  };
}
export function campaignStatus(
  row: Pick<LibraryCampaign, "status" | "provider" | "live_launched">,
) {
  if (
    row.status === "sending" &&
    row.provider !== "mock" &&
    row.live_launched === false
  )
    return "Paused";
  return (
    (
      {
        draft: "Draft",
        queued: "Queued",
        sending: "Sending",
        sent: "Sent",
        partial: "Partial",
        failed: "Failed",
      } as Record<string, string>
    )[row.status] ?? row.status
  );
}
export function performanceSummary(data: LibraryPreview) {
  const actualRuns =
    data.campaign.provider === "mock"
      ? []
      : data.runs.filter((r) => r.status === "sent");
  const eventCount = (kind: string) =>
    new Set(
      data.engagement.filter((e) => e.event_type === kind).map((e) => e.id),
    ).size;
  const steps = new Set(data.steps.map((s) => s.id));
  const completed = data.steps.length
    ? data.recipients.filter((rec) =>
        [...steps].every((step) =>
          data.runs.some(
            (r) =>
              r.recipient_id === rec.id &&
              r.step_id === step &&
              r.status === "sent",
          ),
        ),
      ).length
    : null;
  return {
    sent: new Set(actualRuns.map((r) => r.id)).size,
    delivered: eventCount("delivered"),
    opened: eventCount("opened"),
    replied: eventCount("replied"),
    completed,
  };
}
export function recipientProgress(
  recipient: LibraryRecipient,
  data: LibraryPreview,
) {
  const runs = data.runs.filter((r) => r.recipient_id === recipient.id);
  const next = runs
    .filter((r) => r.status === "scheduled" && r.scheduled_at)
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))[0];
  const current = runs.find((r) => r.status === "running") ?? next;
  const step = data.steps.find((s) => s.id === current?.step_id);
  const activity = [
    ...runs.map((r) => r.executed_at),
    ...data.engagement
      .filter((e) => e.contact_id === recipient.contact_id)
      .map((e) => e.occurred_at),
  ]
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);
  return {
    step: step?.title ?? "No pending step",
    next: next?.scheduled_at ?? null,
    last: activity ?? null,
  };
}
/** Reject malformed presentation data rather than rendering partial counts. */
export function isLibraryCampaign(value: unknown): value is LibraryCampaign {
  if (!value || typeof value !== "object") return false;
  const c = value as LibraryCampaign;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.status === "string" &&
    typeof c.created_at === "string" &&
    Number.isInteger(c.enrollmentCount) &&
    c.enrollmentCount >= 0 &&
    Number.isInteger(c.stepCount) &&
    c.stepCount >= 0 &&
    (c.durationMinutes === null ||
      (Number.isFinite(c.durationMinutes) && c.durationMinutes >= 0)) &&
    Array.isArray(c.channels) &&
    c.channels.every((ch) => typeof ch === "string")
  );
}
export function isLibraryPreview(value: unknown): value is LibraryPreview {
  if (!value || typeof value !== "object") return false;
  const d = value as LibraryPreview;
  return (
    isLibraryCampaign(d.campaign) &&
    Array.isArray(d.steps) &&
    d.steps.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.type === "string" &&
        typeof s.title === "string" &&
        Number.isFinite(s.delay_minutes) &&
        s.delay_minutes >= 0,
    ) &&
    Array.isArray(d.recipients) &&
    d.recipients.every(
      (r) => r && typeof r.id === "string" && typeof r.contact_id === "string",
    ) &&
    Array.isArray(d.runs) &&
    d.runs.every((r) => r && typeof r.id === "string") &&
    Array.isArray(d.engagement) &&
    d.engagement.every(
      (e) => e && typeof e.id === "string" && typeof e.event_type === "string",
    )
  );
}
