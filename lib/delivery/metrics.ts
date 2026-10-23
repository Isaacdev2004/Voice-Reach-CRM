import {
  CHANNELS,
  type DeliveryChannel,
  type DeliveryEvent,
  type DeliveryMessage,
  type MessageRecord,
  type SyncRun,
  type ChannelHealth,
} from "./types";
export const PROVIDERS: Record<DeliveryChannel, string> = {
  sms: "twilio",
  email: "resend",
  voicemail: "slybroadcast",
};
const failures = new Set(["failed", "undelivered", "bounced", "rejected"]);
const webhookOnly = new Set([
  "delivered",
  "opened",
  "clicked",
  "replied",
  "opt_out",
  "listened",
  "callback",
  "undelivered",
  "bounced",
  "rejected",
]);
export function troubleshooting(code: string | null, status: string) {
  const mapping: Record<string, [string, string]> = {
    "21211": [
      "Invalid phone number",
      "Check the contact's phone number and country code.",
    ],
    "30007": [
      "Carrier rejection",
      "Review carrier restrictions and consent before requesting a resend.",
    ],
    "21610": [
      "Recipient opted out",
      "Respect suppression. Obtain renewed permission through an authorized process.",
    ],
    missing_consent: [
      "Missing consent",
      "Review recorded permission for this channel. Do not resend without authorization.",
    ],
    unavailable: [
      "Provider unavailable",
      "Review channel configuration and reconcile provider records before any resend.",
    ],
    ambiguous: [
      "Submission outcome unknown",
      "Check the provider before any retry; the message may have been accepted.",
    ],
    no_reference: [
      "Provider message reference unavailable",
      "Delivery cannot be independently correlated. Reconcile with the provider before retrying.",
    ],
  };
  const pair =
    mapping[code ?? ""] ??
    (status === "bounced"
      ? [
          "Email bounced",
          "Verify the address and suppression status before requesting a resend.",
        ]
      : status === "rejected"
        ? [
            "Voicemail rejected",
            "Review the recording, destination and provider restrictions.",
          ]
        : [
            "Delivery failed",
            "Review the provider record and consent before authorizing any resend.",
          ]);
  return { explanation: pair[0], guidance: pair[1] };
}
const time = (event: DeliveryEvent) => event.occurred_at ?? event.received_at;
const firstTime = (events: DeliveryEvent[], type: string) =>
  events
    .filter((e) => e.event_type === type)
    .map((e) => e.occurred_at)
    .filter((t): t is string => !!t)
    .sort()[0] ?? null;
/** Only owner-matched, message-matched, non-mock, authenticated events are authoritative. */
export function messageRecord(
  message: DeliveryMessage,
  events: DeliveryEvent[],
  names?: { contact?: string; campaign?: string; step?: string },
  _syncs: SyncRun[] = [],
): MessageRecord {
  const seen = new Set<string>();
  const verified = events
    .filter((e) => {
      if (
        e.owner_id !== message.owner_id ||
        e.message_id !== message.id ||
        e.provider !== message.provider ||
        !Number.isFinite(Date.parse(e.received_at)) ||
        (e.occurred_at && !Number.isFinite(Date.parse(e.occurred_at))) ||
        (webhookOnly.has(e.event_type) && e.source === "submission")
      )
        return false;
      const key = `${e.provider}:${e.event_key}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        time(a).localeCompare(time(b)) ||
        a.event_key.localeCompare(b.event_key),
    );
  const deliveredAt = firstTime(verified, "delivered");
  const terminal = verified.filter(
    (e) => failures.has(e.event_type) || e.event_type === "delivered",
  );
  // Queued/sent/open events received late never erase a terminal disposition.
  const lastTerminal = terminal.at(-1);
  let status: string =
    lastTerminal?.event_type ??
    (verified.some((e) => e.event_type === "sent")
      ? "sent"
      : verified.some((e) => e.event_type === "accepted")
        ? "accepted"
        : verified.some((e) => e.event_type === "queued")
          ? "queued"
          : verified.some((e) => e.event_type === "submitted")
            ? "submitted"
            : message.submission_status === "failed"
              ? "failed"
              : message.submission_status === "unknown"
                ? "unknown"
                : "pending");
  if (
    new Set(terminal.map((e) => e.event_type)).size > 1 &&
    terminal.some((e) => !e.occurred_at)
  )
    status = "unknown";
  if (message.provider === "mock") status = "simulation";
  const failure =
    failures.has(status) || status === "unknown"
      ? troubleshooting(
          lastTerminal?.error_code ??
            message.error_code ??
            (status === "unknown" ? "ambiguous" : null),
          status,
        )
      : null;
  const supported = PROVIDERS[message.channel] === message.provider;
  const indicator =
    status === "simulation"
      ? "Simulation — excluded from delivery metrics"
      : failures.has(status)
        ? "Failed"
        : status === "delivered"
          ? "Confirmed Delivered"
          : !supported
            ? "Delivery Confirmation Unavailable"
            : status === "sent"
              ? "Sent — Awaiting Confirmation"
              : "Pending Provider Update";
  return {
    ...message,
    contact: names?.contact ?? "Contact unavailable",
    campaign: names?.campaign ?? "Campaign unavailable",
    step: names?.step ?? "Step unavailable",
    events: verified,
    status,
    indicator,
    submittedAt: message.created_at,
    sentAt: firstTime(verified, "sent"),
    deliveredAt,
    lastWebhookAt:
      verified
        .filter((e) => e.source === "webhook")
        .map((e) => e.received_at)
        .sort()
        .at(-1) ?? null,
    lastSyncAt:
      verified
        .filter((e) => e.source === "reconciliation")
        .map((e) => e.received_at)
        .sort()
        .at(-1) ?? null,
    failure,
  };
}
/** Cohort = logical messages submitted in [from,to), UTC; rates deduplicate attempts. */
export function summarizeDelivery(
  records: MessageRecord[],
  from?: string,
  to?: string,
) {
  const filtered = records.filter(
    (r) =>
      r.provider !== "mock" &&
      (!from || r.created_at >= from) &&
      (!to || r.created_at < to),
  );
  const logical = new Map<string, MessageRecord[]>();
  for (const r of filtered) {
    const key = `${r.owner_id}:${r.channel}:${r.logical_key}`;
    logical.set(key, [...(logical.get(key) ?? []), r]);
  }
  const groups = [...logical.values()];
  // A failed retry does not erase an independently confirmed earlier attempt.
  const delivered = groups.filter((g) =>
    g.some((r) => r.status === "delivered"),
  ).length;
  const eventCount = (type: string) =>
    groups.filter((g) =>
      g.some((r) =>
        r.events.some(
          (e) => e.event_type === type && e.source !== "submission",
        ),
      ),
    ).length;
  const sent = groups.filter((g) =>
    g.some((r) => r.events.some((e) => e.event_type === "sent")),
  ).length;
  const failed = groups.filter((g) =>
    g.every((r) => failures.has(r.status)),
  ).length;
  const pending = groups.length - delivered - failed;
  return {
    messages: groups.length,
    attempts: filtered.length,
    recipients: new Set(filtered.map((r) => r.contact_id).filter(Boolean)).size,
    queued: groups.filter((g) => g.some((r) => r.status === "queued")).length,
    submitted: groups.filter((g) =>
      g.some((r) => r.events.some((e) => e.event_type === "submitted")),
    ).length,
    accepted: groups.filter((g) =>
      g.some((r) => r.events.some((e) => e.event_type === "accepted")),
    ).length,
    sent,
    delivered,
    failed,
    undelivered: eventCount("undelivered"),
    bounced: eventCount("bounced"),
    rejected: eventCount("rejected"),
    opened: eventCount("opened"),
    clicked: eventCount("clicked"),
    replied: eventCount("replied"),
    pending,
    deliveryRate: groups.length ? (delivered / groups.length) * 100 : null,
  };
}
export function buildProviderHealth(
  records: MessageRecord[],
  syncs: SyncRun[],
  configured: Record<DeliveryChannel, boolean>,
): ChannelHealth[] {
  return CHANNELS.map((channel) => {
    const provider = PROVIDERS[channel];
    const channelRecords = records.filter(
      (r) => r.channel === channel && r.provider === provider,
    );
    const channelSyncs = syncs
      .filter((s) => s.channel === channel && s.provider === provider)
      .sort((a, b) => a.attempted_at.localeCompare(b.attempted_at));
    const last = channelSyncs.at(-1);
    const latestWebhook =
      channelRecords
        .map((r) => r.lastWebhookAt)
        .filter((v): v is string => !!v)
        .sort()
        .at(-1) ?? null;
    const lastSuccessfulSync =
      channelSyncs
        .filter((s) => s.succeeded_at)
        .map((s) => s.succeeded_at!)
        .sort()
        .at(-1) ?? null;
    // No age threshold without an actual provider SLA or failed reconciliation evidence.
    const status = !configured[channel]
      ? "Not Configured"
      : last?.error_code === "delayed"
        ? "Sync Delayed"
        : last?.error_code
          ? "Connection Error"
          : lastSuccessfulSync
            ? "Connected"
            : "Status Unavailable";
    return {
      channel,
      provider,
      configured: configured[channel],
      confirmationSupported: true,
      status,
      lastSuccessfulSync,
      lastAttemptedSync: last?.attempted_at ?? null,
      latestWebhook,
      pendingUpdates: channelRecords.filter(
        (r) => !failures.has(r.status) && r.status !== "delivered",
      ).length,
      syncError: last?.error_code
        ? troubleshooting(last.error_code, "failed").explanation
        : null,
      mode:
        channel === "voicemail"
          ? "webhook-only"
          : "webhook + manual reconciliation",
    };
  });
}
