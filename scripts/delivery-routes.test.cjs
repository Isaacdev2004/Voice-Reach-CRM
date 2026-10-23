const { fixture } = require("./campaign-audit/harness.cjs");
const assert = require("node:assert/strict"),
  test = require("node:test"),
  crypto = require("node:crypto");
const saved = {};
for (const key of [
  "DELIVERY_EVIDENCE_ENABLED",
  "ALLOW_DELIVERY_RECONCILIATION",
  "TWILIO_AUTH_TOKEN",
  "APP_BASE_URL",
  "RESEND_WEBHOOK_SECRET",
  "VOICE_WEBHOOK_SECRET",
])
  saved[key] = process.env[key];
process.env.DELIVERY_EVIDENCE_ENABLED = "true";
process.env.ALLOW_DELIVERY_RECONCILIATION = "false";
process.env.TWILIO_AUTH_TOKEN = "synthetic-auth";
process.env.APP_BASE_URL = "https://qa.example.test";
process.env.RESEND_WEBHOOK_SECRET =
  "whsec_" + Buffer.from("synthetic-resend-secret").toString("base64");
process.env.VOICE_WEBHOOK_SECRET = "synthetic-voice-secret";
process.on("exit", () => {
  for (const [key, value] of Object.entries(saved))
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
});
function setup() {
  const f = fixture();
  f.tables.contacts.push(f.contact);
  f.tables.campaigns.push({
    id: f.id(1),
    owner_id: f.owner,
    name: "Owned campaign",
    status: "sending",
  });
  f.tables.campaign_steps.push({
    id: f.id(3),
    owner_id: f.owner,
    title: "Email follow-up",
  });
  f.tables.outbound_messages.push({
    id: f.id(100),
    owner_id: f.owner,
    logical_key: "one",
    provider: "twilio",
    channel: "sms",
    campaign_id: f.id(1),
    contact_id: f.contact.id,
    step_id: f.id(3),
    provider_message_id: "SMsynthetic123",
    created_at: "2026-10-22T10:00:00.000Z",
    body: "Authorized synthetic body",
    subject: null,
    submission_status: "accepted",
  });
  f.tables.outbound_messages.push({
    ...f.tables.outbound_messages[0],
    id: f.id(101),
    owner_id: "foreign",
    body: "Private foreign message",
    logical_key: "foreign",
    provider_message_id: "SMforeign123",
  });
  return f;
}
function twilio(raw) {
  const url = "https://qa.example.test/api/webhooks/delivery/twilio";
  const text =
    url +
    Object.keys(raw)
      .sort()
      .map((k) => k + raw[k])
      .join("");
  const signature = crypto
    .createHmac("sha1", "synthetic-auth")
    .update(text)
    .digest("base64");
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature,
    },
    body: new URLSearchParams(raw),
  });
}
test("delivery list/detail API enforces owner filters and does not expose message text in index", async () => {
  const f = setup(),
    get = f.load("app/api/delivery/route.ts").GET;
  const result = await get(new Request("https://qa.example.test/api/delivery"));
  assert.equal(result.status, 200);
  const json = await result.json();
  assert.equal(json.total, 1);
  assert.equal(json.records[0].body, undefined);
  assert.ok(!JSON.stringify(json).includes("Private foreign"));
  const detail = await get(
    new Request(`https://qa.example.test/api/delivery?id=${f.id(100)}`),
  );
  assert.equal((await detail.json()).record.body, "Authorized synthetic body");
  assert.equal(
    (
      await get(
        new Request(`https://qa.example.test/api/delivery?id=${f.id(101)}`),
      )
    ).status,
    404,
  );
  assert.ok(
    f.calls.filter(
      (c) =>
        [
          "outbound_messages",
          "outbound_delivery_events",
          "provider_sync_runs",
        ].includes(c.table) && c.filter === "owner_id",
    ).length >= 3,
  );
});
test("delivery API fails safely on database failure and rejects invalid filters", async () => {
  const f = setup(),
    get = f.load("app/api/delivery/route.ts").GET;
  f.fail("outbound_delivery_events");
  const failed = await get(new Request("https://qa.example.test/api/delivery"));
  assert.equal(failed.status, 503);
  assert.ok(!JSON.stringify(await failed.json()).includes("private database"));
  assert.equal(
    (
      await get(
        new Request("https://qa.example.test/api/delivery?channel=bogus"),
      )
    ).status,
    400,
  );
  f.actor(null);
  assert.equal(
    (await get(new Request("https://qa.example.test/api/delivery"))).status,
    401,
  );
});
test("signed SMS receipts correlate by stored provider reference and are idempotent", async () => {
  const f = setup(),
    handle = f.load("lib/delivery/webhook.ts").processDeliveryWebhook;
  const raw = {
    MessageSid: "SMsynthetic123",
    MessageStatus: "delivered",
    campaignId: "foreign",
  };
  assert.equal((await handle(twilio(raw), "twilio")).status, 200);
  assert.equal((await handle(twilio(raw), "twilio")).status, 200);
  assert.equal(f.tables.outbound_delivery_events.length, 1);
  assert.equal(f.tables.outbound_delivery_events[0].owner_id, f.owner);
  assert.equal(f.tables.outbound_delivery_events[0].occurred_at, null);
  const get = f.load("app/api/delivery/route.ts").GET;
  const data = await (
    await get(new Request("https://qa.example.test/api/delivery"))
  ).json();
  assert.equal(data.metrics.delivered, 1);
  assert.equal(data.records[0].deliveredAt, null);
  assert.equal(f.payloads.length, 0);
});
test("bad signatures, missing IDs, unknown status and unmatched references cannot create delivery", async () => {
  const f = setup(),
    handle = f.load("lib/delivery/webhook.ts").processDeliveryWebhook;
  const invalid = twilio({
    MessageSid: "SMsynthetic123",
    MessageStatus: "delivered",
  });
  invalid.headers.set("x-twilio-signature", "bad");
  assert.equal((await handle(invalid, "twilio")).status, 401);
  for (const raw of [
    { MessageStatus: "delivered" },
    { MessageSid: "SMsynthetic123", MessageStatus: "complete-ish" },
  ])
    assert.equal((await handle(twilio(raw), "twilio")).status, 200);
  assert.equal(
    (
      await handle(
        twilio({ MessageSid: "SMnotmapped999", MessageStatus: "delivered" }),
        "twilio",
      )
    ).status,
    503,
  );
  assert.equal(f.tables.outbound_delivery_events.length, 0);
});
test("native Resend signatures are timestamp bounded, body bound, and lifecycle-specific", async () => {
  const f = setup(),
    mod = f.load("lib/delivery/webhook.ts");
  f.tables.outbound_messages[0].provider = "resend";
  f.tables.outbound_messages[0].channel = "email";
  f.tables.outbound_messages[0].provider_message_id = "email-example-id";
  const body = JSON.stringify({
      type: "email.delivered",
      created_at: "2026-10-23T10:15:00Z",
      data: { email_id: "email-example-id" },
    }),
    timestamp = String(Math.floor(Date.now() / 1000));
  const id = "evt-synthetic";
  const sig = crypto
    .createHmac("sha256", Buffer.from("synthetic-resend-secret"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const headers = new Headers({
    "content-type": "application/json",
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${sig}`,
  });
  assert.equal(mod.verifyResendSignature(body, headers), true);
  assert.equal(mod.verifyResendSignature(body + " ", headers), false);
  assert.equal(
    mod.verifyResendSignature(body, headers, Date.now() + 3600000),
    false,
  );
  const request = () =>
    new Request("https://qa.example.test/api/webhooks/delivery/resend", {
      method: "POST",
      headers,
      body,
    });
  assert.equal(
    (await mod.processDeliveryWebhook(request(), "resend")).status,
    200,
  );
  assert.equal(
    (await mod.processDeliveryWebhook(request(), "resend")).status,
    200,
  );
  assert.equal(f.tables.outbound_delivery_events.length, 1);
  assert.equal(
    f.tables.outbound_delivery_events[0].occurred_at,
    "2026-10-23T10:15:00.000Z",
  );
});
test("voicemail requires authentication and never treats ambiguous completed disposition as delivered", async () => {
  const f = setup(),
    handle = f.load("lib/delivery/webhook.ts").processDeliveryWebhook;
  const request = (token) =>
    new Request(
      `https://qa.example.test/api/webhooks/delivery/slybroadcast?token=${token}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionid: "SMsynthetic123",
          status: "completed",
        }),
      },
    );
  assert.equal((await handle(request("bad"), "slybroadcast")).status, 401);
  assert.equal(
    (await handle(request("synthetic-voice-secret"), "slybroadcast")).status,
    200,
  );
  assert.equal(f.tables.outbound_delivery_events.length, 0);
});
test("complaint suppression is owner scoped and safely repeated on webhook replay", async () => {
  const f = setup(),
    handle = f.load("lib/delivery/webhook.ts").processDeliveryWebhook;
  f.tables.outbound_messages[0].provider = "resend";
  f.tables.outbound_messages[0].channel = "email";
  f.tables.contacts.push({
    ...f.contact,
    id: f.id(999),
    owner_id: "foreign",
    dnc: false,
  });
  const body = JSON.stringify({
      type: "email.complained",
      data: { email_id: "SMsynthetic123" },
    }),
    timestamp = String(Math.floor(Date.now() / 1000)),
    id = "complaint-synthetic";
  const signature = crypto
    .createHmac("sha256", Buffer.from("synthetic-resend-secret"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const request = () =>
    new Request("https://qa.example.test/api/webhooks/delivery/resend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": id,
        "svix-timestamp": timestamp,
        "svix-signature": `v1,${signature}`,
      },
      body,
    });
  assert.equal((await handle(request(), "resend")).status, 200);
  assert.equal((await handle(request(), "resend")).status, 200);
  assert.equal(f.tables.contacts[0].dnc, true);
  assert.equal(f.tables.contacts[1].dnc, false);
  assert.equal(f.tables.outbound_delivery_events.length, 1);
  assert.equal(f.engagement.length, 1);
  assert.equal(f.payloads.length, 0);
});
test("submission tracking requires durable pre-submit evidence and records acceptance without inventing delivery", async () => {
  const f = setup(),
    store = f.load("lib/delivery/store.ts");
  const request = {
    ownerId: f.owner,
    contactId: f.contact.id,
    channel: "sms",
    campaignId: f.id(1),
    recipientId: f.id(2),
    body: "Synthetic test",
  };
  const id = await store.beginMessage(request, "twilio");
  await store.finishMessage(id, request, "twilio", {
    ok: true,
    status: "sent",
    providerMessageId: "SMqueuedexample",
    rawResponse: { status: "queued" },
  });
  assert.equal(f.tables.outbound_delivery_events.at(-1).event_type, "queued");
  assert.equal(
    f.tables.outbound_messages.find((m) => m.id === id).submission_status,
    "accepted",
  );
  f.fail("outbound_messages");
  await assert.rejects(() => store.beginMessage(request, "twilio"));
  assert.equal(f.payloads.length, 0);
});
test("reconciliation is disabled without explicit rollout authorization and never sends", async () => {
  const f = setup(),
    mod = f.load("lib/delivery/reconcile.ts");
  await assert.rejects(() => mod.reconcileChannel(f.owner, "sms"));
  assert.equal(f.tables.provider_sync_runs.length, 0);
  assert.equal(f.payloads.length, 0);
});
test("analytics, campaign details and preview use shared evidence instead of mutable recipient success flags", async () => {
  const f = setup();
  f.tables.outbound_delivery_events.push({
    id: f.id(200),
    owner_id: f.owner,
    message_id: f.id(100),
    provider: "twilio",
    event_key: "delivered",
    event_type: "delivered",
    source: "webhook",
    occurred_at: null,
    received_at: "2026-10-23T12:00:00Z",
  });
  const analytics = await (
    await f
      .load("app/api/analytics/route.ts")
      .GET(new Request("https://qa.example.test/api/analytics?range=all"))
  ).json();
  assert.equal(analytics.campaigns[0].deliveryRate, 100);
  f.tables.campaign_recipients.push({id:f.id(400),owner_id:f.owner,campaign_id:f.id(1),delivery_status:"queued",eligibility_status:"eligible",contacts:{id:f.id(999),owner_id:"foreign",first_name:"Private"}});
  const response=await f.load("app/api/campaigns/[campaignId]/route.ts").GET(new Request(`https://qa.example.test/api/campaigns/${f.id(1)}`),{params:Promise.resolve({campaignId:f.id(1)})});
  assert.equal(response.status,200);const details=await response.json();assert.equal(details.counts.sent,0);assert.equal(details.deliveryMetrics.delivered,1);assert.equal(details.recipients[0].contacts,null);

  const preview = await f
    .load("lib/campaigns/library-server.ts")
    .readPreview(f.owner, f.id(1));
  assert.equal(preview.deliveryMetrics.delivered, 1);
  assert.equal(preview.deliveryMetrics.sent, 0);
  assert.equal(analytics.kpis.find((k) => k.id === "delivery").value, "100.0%");
});

test("mocked reconciliation records real status-read evidence without submitting or resending", async () => {
  const f = setup();
  const originalFetch = global.fetch,
    enabled = process.env.ALLOW_DELIVERY_RECONCILIATION,
    sid = process.env.TWILIO_ACCOUNT_SID,
    token = process.env.TWILIO_AUTH_TOKEN;
  process.env.ALLOW_DELIVERY_RECONCILIATION = "true";
  process.env.TWILIO_ACCOUNT_SID = "ACsynthetic";
  process.env.TWILIO_AUTH_TOKEN = "synthetic-auth";
  const requests = [];
  global.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method ?? "GET" });
    return new Response(
      JSON.stringify({ status: "delivered", sid: "SMsynthetic123" }),
      { status: 200 },
    );
  };
  try {
    const result = await f
      .load("lib/delivery/reconcile.ts")
      .reconcileChannel(f.owner, "sms");
    assert.equal(result.checked, 1);
    assert.ok(result.succeededAt);
    assert.equal(f.tables.provider_sync_runs[0].owner_id, f.owner);
    assert.equal(f.tables.outbound_delivery_events[0].source, "reconciliation");
    assert.equal(f.tables.outbound_delivery_events[0].event_type, "delivered");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "GET");
    assert.ok(!requests[0].url.includes("SMforeign"));
    assert.equal(f.payloads.length, 0);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries({
      ALLOW_DELIVERY_RECONCILIATION: enabled,
      TWILIO_ACCOUNT_SID: sid,
      TWILIO_AUTH_TOKEN: token,
    }))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
test("rate limited reconciliation logs only that channel as delayed and does not retry", async () => {
  const f = setup();
  f.tables.outbound_messages[0].provider = "resend";
  f.tables.outbound_messages[0].channel = "email";
  const originalFetch = global.fetch,
    enabled = process.env.ALLOW_DELIVERY_RECONCILIATION,
    key = process.env.RESEND_API_KEY;
  process.env.ALLOW_DELIVERY_RECONCILIATION = "true";
  process.env.RESEND_API_KEY = "synthetic-only";
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response("{}", { status: 429 });
  };
  try {
    const result = await f
      .load("lib/delivery/reconcile.ts")
      .reconcileChannel(f.owner, "email");
    assert.equal(result.errorCode, "delayed");
    assert.equal(result.succeededAt, null);
    assert.equal(calls, 1);
    assert.equal(f.tables.provider_sync_runs[0].channel, "email");
    assert.equal(f.tables.outbound_delivery_events.length, 0);
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries({
      ALLOW_DELIVERY_RECONCILIATION: enabled,
      RESEND_API_KEY: key,
    }))
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
  }
});
test("live requests cannot silently fall back to simulation when a provider is missing", async () => {
  const f = setup(),
    keys = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    values = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  try {
    const dispatch = f.load("lib/providers/registry.ts").dispatch;
    const result = await dispatch({
      channel: "sms",
      to: "+15555550123",
      body: "Synthetic test",
      campaignId: f.id(1),
      recipientId: f.id(2),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "blocked");
    assert.equal(f.tables.outbound_messages.length, 2);
    assert.equal(f.payloads.length, 0);
  } finally {
    for (const [k, v] of Object.entries(values))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});
test("reconciliation API requires authentication, explicit confirmation, and enabled rollout", async () => {
  const f = setup(),
    post = f.load("app/api/delivery/reconcile/route.ts").POST;
  const request = (confirm) =>
    new Request("https://qa.example.test/api/delivery/reconcile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "sms", confirmReadOnly: confirm }),
    });
  assert.equal((await post(request(false))).status, 400);
  assert.equal((await post(request(true))).status, 503);
  f.actor(null);
  assert.equal((await post(request(true))).status, 401);
  assert.equal(f.tables.provider_sync_runs.length, 0);
  assert.equal(f.payloads.length, 0);
});
