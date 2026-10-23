import assert from "node:assert/strict";
import { test } from "node:test";
import {
  messageRecord,
  summarizeDelivery,
  buildProviderHealth,
  troubleshooting,
} from "../lib/delivery/metrics";
import { queryDelivery } from "../lib/delivery/query";
import {
  analyticsStart,
  buildAnalyticsSnapshot,
} from "../lib/analytics/compute";
import type {
  DeliveryMessage,
  DeliveryEvent,
  MessageRecord,
} from "../lib/delivery/types";
const time = "2026-10-23T10:00:00.000Z",
  later = "2026-10-23T11:00:00.000Z";
const message = (changes: Partial<DeliveryMessage> = {}): DeliveryMessage => ({
  id: "one",
  owner_id: "a",
  logical_key: "logical",
  provider: "twilio",
  channel: "sms",
  campaign_id: "campaign",
  contact_id: "contact",
  recipient_id: "recipient",
  step_id: "step",
  provider_message_id: "SM-example",
  created_at: time,
  subject: null,
  body: "Hello",
  submission_status: "accepted",
  error_code: null,
  ...changes,
});
const event = (
  type: DeliveryEvent["event_type"],
  changes: Partial<DeliveryEvent> = {},
): DeliveryEvent => ({
  id: type,
  owner_id: "a",
  message_id: "one",
  provider: "twilio",
  event_key: type,
  event_type: type,
  occurred_at: time,
  received_at: time,
  source: "webhook",
  error_code: null,
  ...changes,
});
const record = (
  events: DeliveryEvent[] = [],
  changes: Partial<DeliveryMessage> = {},
): MessageRecord =>
  messageRecord(message(changes), events, {
    contact: "Jordan",
    campaign: "Follow-up",
    step: "First message",
  });
test("queued, accepted, sent and mocked submissions never become delivered", () => {
  for (const type of ["queued", "accepted", "sent"] as const) {
    const r = record([event(type)]);
    assert.equal(summarizeDelivery([r]).delivered, 0);
    assert.notEqual(r.indicator, "Confirmed Delivered");
  }
  assert.equal(
    summarizeDelivery([record([event("delivered")], { provider: "mock" })])
      .messages,
    0,
  );
  assert.equal(record([event("opened")]).deliveredAt, null);
  assert.equal(
    summarizeDelivery([record([event("delivered", { source: "submission" })])])
      .delivered,
    0,
  );
});
test("failure categories and unknown provider outcomes never inflate success", () => {
  for (const type of [
    "failed",
    "undelivered",
    "bounced",
    "rejected",
  ] as const) {
    const m = summarizeDelivery([record([event(type)])]);
    assert.equal(m.delivered, 0);
    assert.equal(m.failed, 1);
    assert.equal(m.deliveryRate, 0);
  }
  assert.equal(
    record([], { submission_status: "unknown", error_code: "ambiguous" })
      .status,
    "unknown",
  );
  assert.match(troubleshooting("21610", "failed").guidance, /permission/);
});
test("duplicate and out of order events deduplicate without queued-state regression", () => {
  const delivered = event("delivered", { occurred_at: later });
  const r = record([
    delivered,
    event("queued", { received_at: "2026-10-24T00:00Z" }),
    delivered,
    event("sent"),
  ]);
  assert.equal(r.status, "delivered");
  assert.equal(r.events.length, 3);
  assert.equal(summarizeDelivery([r]).delivered, 1);
  const terminal = record([
    event("delivered"),
    event("failed", { occurred_at: later }),
  ]);
  assert.equal(terminal.status, "failed");
  assert.equal(summarizeDelivery([terminal]).delivered, 0);
  assert.equal(
    record([
      event("delivered", { occurred_at: null }),
      event("failed", { occurred_at: null }),
    ]).status,
    "unknown",
  );
});
test("receipt recording time never substitutes for provider delivery timestamp", () => {
  const r = record([
    event("delivered", { occurred_at: null, received_at: later }),
  ]);
  assert.equal(r.status, "delivered");
  assert.equal(r.deliveredAt, null);
  assert.equal(r.lastWebhookAt, later);
  assert.equal(r.lastSyncAt, null);
});
test("unique messages, attempts, contacts and retries have separate denominators", () => {
  const first = record([event("failed")]);
  const second = record([event("delivered", { message_id: "two" })], {
    id: "two",
  });
  const m = summarizeDelivery([first, second]);
  assert.equal(m.messages, 1);
  assert.equal(m.attempts, 2);
  assert.equal(m.recipients, 1);
  assert.equal(m.delivered, 1);
  assert.equal(m.failed, 0);
  assert.equal(m.deliveryRate, 100);
});
test("owner, provider, and message mismatches cannot supply delivery evidence", () => {
  for (const changes of [
    { owner_id: "b" },
    { provider: "resend" },
    { message_id: "foreign" },
  ])
    assert.equal(record([event("delivered", changes)]).status, "pending");
  assert.equal(
    summarizeDelivery([record(), record([], { id: "other", owner_id: "b" })])
      .messages,
    2,
  );
});
test("channel health is independent and inactivity is not an outage", () => {
  const records = [record([event("delivered")])];
  const syncs = [
    {
      id: "sync",
      owner_id: "a",
      provider: "resend",
      channel: "email" as const,
      attempted_at: later,
      succeeded_at: null,
      error_code: "unavailable",
    },
  ];
  const health = buildProviderHealth(records, syncs, {
    sms: true,
    email: true,
    voicemail: false,
  });
  assert.equal(health[0].status, "Status Unavailable");
  assert.equal(health[0].latestWebhook, time);
  assert.equal(health[0].lastSuccessfulSync, null);
  assert.equal(health[1].status, "Connection Error");
  assert.equal(health[2].status, "Not Configured");
  assert.equal(
    buildProviderHealth([], [], { sms: true, email: true, voicemail: true })[0]
      .status,
    "Status Unavailable",
  );
  syncs[0].error_code = "delayed";
  assert.equal(
    buildProviderHealth(records, syncs, {
      sms: true,
      email: true,
      voicemail: true,
    })[1].status,
    "Sync Delayed",
  );
});
test("all reporting uses the same UTC cohort and distinct-message calculations", () => {
  const records = [
    record([event("delivered")]),
    record([event("failed", { message_id: "two" })], {
      id: "two",
      logical_key: "second",
      contact_id: "other",
    }),
    record([event("delivered", { message_id: "old" })], {
      id: "old",
      logical_key: "old",
      created_at: "2020-01-01T00:00:00Z",
    }),
  ];
  const data = buildAnalyticsSnapshot({
    range: "7d",
    contacts: [{ id: "one" }, { id: "one" }],
    campaigns: [{ id: "campaign", name: "Follow-up", status: "sending" }],
    records,
    now: new Date("2026-10-24T00:00:00Z"),
  });
  assert.equal(data.kpis[0].value, "50.0%");
  assert.equal(data.campaigns[0].deliveryRate, 50);
  assert.equal(data.totals.outreach, 2);
  assert.equal(data.totals.contacts, 1);
  assert.equal(data.channels[0].rate, 50);
  assert.equal(
    summarizeDelivery(
      queryDelivery(records, {
        from: "2026-10-17T00:00:00.000Z",
        to: "2026-10-24T00:00:00.000Z",
      }).matching,
    ).deliveryRate,
    50,
  );
});
test("combined search, campaign/contact/channel/status/date filters and stable pagination", () => {
  const records = Array.from({ length: 30 }, (_, i) =>
    record([event("delivered", { message_id: `m${i}` })], {
      id: `m${i}`,
      logical_key: `l${i}`,
    }),
  );
  const query = {
    q: "jordan",
    campaign: "campaign",
    contact: "contact",
    channel: "sms",
    status: "delivered",
    from: time,
    to: later,
    page: 2,
    pageSize: 10,
    sort: "contact",
    direction: "asc",
  };
  const result = queryDelivery(records, query);
  assert.equal(result.total, 30);
  assert.equal(result.rows.length, 10);
  assert.equal(result.page, 2);
  assert.equal(result.pages, 3);
  assert.equal(new Set(result.rows.map((r) => r.id)).size, 10);
  assert.equal(queryDelivery(records, { ...query, channel: "email" }).total, 0);
});
test("missing event history and unsupported provider do not invent confirmation or health timestamps", () => {
  const r = record([], { provider: "other", provider_message_id: null });
  assert.equal(r.indicator, "Delivery Confirmation Unavailable");
  assert.equal(r.sentAt, null);
  assert.equal(r.deliveredAt, null);
  assert.equal(r.lastSyncAt, null);
  const empty = buildAnalyticsSnapshot({
    range: "all",
    contacts: [],
    campaigns: [],
  });
  assert.equal(empty.kpis[0].value, "Unavailable");
  assert.equal(empty.fromLiveData, false);
});

test("analytics date ranges begin at UTC midnight and include exactly the labeled calendar days", () => {
  assert.equal(
    analyticsStart("7d", new Date("2026-10-24T12:34:00Z")),
    "2026-10-18T00:00:00.000Z",
  );
  assert.equal(analyticsStart("all"), undefined);
});
test("unmeasured channel and funnel rates stay unavailable and provider shares count attempts", () => {
  const empty = buildAnalyticsSnapshot({
    range: "all",
    contacts: [],
    campaigns: [],
    records: [],
  });
  assert.equal(empty.channels[0].rate, null);
  assert.ok(empty.funnel.every((f) => f.percent === null));
  const records = [
    record([], { provider: "twilio" }),
    record([], { id: "retry", provider: "resend", channel: "sms" }),
  ];
  const snapshot = buildAnalyticsSnapshot({
    range: "all",
    contacts: [],
    campaigns: [],
    records,
    now: new Date("2026-10-24T00:00:00Z"),
  });
  assert.equal(
    snapshot.providers.reduce((sum, p) => sum + p.count, 0),
    2,
  );
  assert.equal(
    snapshot.providers.reduce((sum, p) => sum + p.percent, 0),
    100,
  );
});
