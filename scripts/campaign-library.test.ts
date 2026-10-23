import assert from "node:assert/strict";
import {
  campaignCounts,
  isLibraryCampaign,
  isLibraryPreview,
  campaignStatus,
  sequenceSummary,
  performanceSummary,
  recipientProgress,
  type LibraryCampaign,
  type LibraryPreview,
} from "../lib/campaigns/library-data";
import {
  CampaignImportSchema,
  duplicateBlueprint,
} from "../lib/campaigns/library-transfer";
const row = (id: string, status: string, extra = {}) =>
  ({
    id,
    name: id,
    status,
    provider: "live",
    live_launched: true,
    created_at: "2026-10-22",
    enrollmentCount: 0,
    stepCount: 0,
    durationMinutes: null,
    channels: [],
    ...extra,
  }) as LibraryCampaign;
const rows = [
  row("a", "sending"),
  row("b", "draft"),
  row("c", "queued"),
  row("d", "sent"),
  row("e", "partial"),
  row("f", "failed"),
  row("g", "sending", { live_launched: false }),
];
assert.deepEqual(campaignCounts([...rows, rows[0]]), {
  total: 7,
  active: 1,
  draft: 1,
  queued: 1,
});
assert.equal(campaignStatus(rows[3]), "Sent");
assert.equal(campaignStatus(rows[4]), "Partial");
assert.equal(campaignStatus(rows[5]), "Failed");
assert.equal(campaignStatus(rows[6]), "Paused");
const steps = [
  {
    id: "s1",
    step_order: 1,
    type: "email",
    title: "A",
    description: "Subject: Hello\nBody",
    delay_minutes: 0,
  },
  {
    id: "s2",
    step_order: 2,
    type: "sms",
    title: "B",
    description: "Text",
    delay_minutes: 2880,
  },
];
assert.deepEqual(sequenceSummary(steps), {
  stepCount: 2,
  durationMinutes: 2880,
  channels: ["email", "sms"],
});
assert.equal(sequenceSummary([]).durationMinutes, null);
const data: LibraryPreview = {
  campaign: row("a", "sending"),
  steps,
  recipients: [
    {
      id: "r1",
      contact_id: "c1",
      delivery_status: "sent",
      eligibility_status: "eligible",
    },
  ],
  runs: [
    {
      id: "run1",
      step_id: "s1",
      recipient_id: "r1",
      status: "sent",
      executed_at: "2026-10-21T10:00Z",
    },
    {
      id: "run2",
      step_id: "s2",
      recipient_id: "r1",
      status: "scheduled",
      scheduled_at: "2026-10-25T10:00Z",
    },
  ],
  engagement: [
    { id: "e1", event_type: "delivered" },
    { id: "e1", event_type: "delivered" },
    {
      id: "e2",
      event_type: "opened",
      contact_id: "c1",
      occurred_at: "2026-10-22T10:00Z",
    },
  ],
  performanceAvailable: true,
};
assert.deepEqual(performanceSummary(data), {
  sent: null,
  delivered: null,
  opened: null,
  replied: null,
  completed: 0,
});
assert.equal(
  performanceSummary({
    ...data,
    campaign: { ...data.campaign, provider: "mock" },
  }).sent,
  null,
);
assert.equal(
  recipientProgress(data.recipients[0], data).next,
  "2026-10-25T10:00Z",
);
assert.equal(
  recipientProgress(data.recipients[0], data).last,
  "2026-10-22T10:00Z",
);
const duplicate = CampaignImportSchema.parse(duplicateBlueprint(data));
assert.equal(duplicate.steps[1].delayMinutes, 2880);
assert.ok(!("contactIds" in duplicate));
assert.ok(!("provider" in duplicate));
assert.ok(
  CampaignImportSchema.safeParse({
    name: "Safe",
    steps: [{ id: "s", order: 1, type: "email", title: "Hello" }],
  }).success,
);
assert.ok(
  !CampaignImportSchema.safeParse({
    ...duplicate,
    provider: "live",
    contactIds: ["foreign"],
  }).success,
);
assert.ok(!CampaignImportSchema.safeParse({ ...duplicate, steps: [] }).success);
assert.ok(
  !CampaignImportSchema.safeParse({
    ...duplicate,
    steps: [{ ...duplicate.steps[0], delayMinutes: -1 }],
  }).success,
);
console.log(
  "Campaign library: accurate statuses/counts, sequence offsets, real metrics, progress, safe draft import/duplicate passed.",
);

assert.ok(isLibraryCampaign(rows[0]));
assert.ok(!isLibraryCampaign({ ...rows[0], enrollmentCount: -1 }));
assert.ok(!isLibraryCampaign({ ...rows[0], channels: null }));
assert.ok(isLibraryPreview(data));
assert.ok(!isLibraryPreview({ ...data, steps: [null] }));

import {
  allocateCampaignArt,
  campaignCover,
} from "../lib/campaigns/library-art";
const art = allocateCampaignArt(["b", "c"], {});
const extended = allocateCampaignArt(["a", "b", "c"], art);
assert.equal(extended.b, art.b);
assert.equal(extended.c, art.c);
assert.equal(new Set(Object.values(extended)).size, 3);
assert.equal(
  Object.keys(
    allocateCampaignArt(
      Array.from({ length: 30 }, (_, i) => String(i)),
      {},
    ),
  ).length,
  24,
);
assert.equal(
  campaignCover(
    { ...rows[0], image_url: "https://uploads.example.test/owned-cover.jpg" },
    art,
  ).url,
  "https://uploads.example.test/owned-cover.jpg",
);
assert.equal(campaignCover(rows[0], {}).url, "");
