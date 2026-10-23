/* Reproduces a remaining accounting mismatch using synthetic in-memory records only. */
const { fixture, owner, id } = require("./campaign-audit/harness.cjs"),
  fs = require("node:fs");
(async () => {
  const f = fixture(),
    { getPlanUsage } = f.load("lib/billing/plan-limits.ts"),
    at = new Date().toISOString();
  f.tables.outbound_messages = [
    {
      id: id(10),
      owner_id: owner,
      provider: "twilio",
      channel: "sms",
      submission_status: "submitted",
      created_at: at,
    },
  ];
  const acceptedWithoutReceipt = (await getPlanUsage(owner)).smsUsed;
  f.tables.engagement_events.push({
    id: id(11),
    owner_id: owner,
    channel: "sms",
    event_type: "sent",
    occurred_at: at,
    metadata: { messageId: id(10) },
  });
  const sentEvent = (await getPlanUsage(owner)).smsUsed;
  f.tables.engagement_events.push({
    id: id(12),
    owner_id: owner,
    channel: "sms",
    event_type: "delivered",
    occurred_at: at,
    metadata: { messageId: id(10) },
  });
  const sentAndDeliveredEvents = (await getPlanUsage(owner)).smsUsed;
  const evidence = {
    fixture: "synthetic only",
    distinctSubmissions: 1,
    observedSmsUsed: {
      acceptedWithoutReceipt,
      sentEvent,
      sentAndDeliveredEvents,
    },
    source:
      "lib/billing/plan-limits.ts countChannelSends; engagement_events event-row count",
    status:
      "Unresolved: requires approved quota ledger/reservation semantics; not production data",
  };
  fs.writeFileSync(
    "docs/platform-audit/usage-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
