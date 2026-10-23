const test = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
const context = {
  contact: {
    first_name: "Jordan",
    last_name: "Lee",
    preferred_area: "Winter Park",
    property_address: "123 Example Lane",
    email: "jordan@example.test",
    phone: "+15555550123",
  },
  agentName: "Avery Agent",
  agentPhone: "+15555550199",
  brokerage: "Example Realty",
  timezone: "America/New_York",
};
const baseline = fixture();
const templates = baseline.load(
  "lib/crm/campaign-templates.ts",
).PRODUCT_CAMPAIGN_TEMPLATES;
for (const template of templates) {
  test(`all steps: ${template.templateKey} (${template.steps.length})`, async () => {
    for (const step of template.steps) {
      const f = fixture();
      f.seed({
        type: step.type,
        title: step.title,
        description: step.description,
      });
      const result = await f
        .load("lib/campaigns/engine.ts")
        .runDueStepRuns({ ownerId: owner, campaignId: id(1) });
      assert.equal(result.processed, 1);
      const run = f.tables.campaign_step_runs[0];
      if (["sms", "email", "voicemail"].includes(step.type)) {
        const render = f
          .load("lib/campaigns/render-message.ts")
          .renderMessage(step.type, step.description, step.title, context);
        if (render.ok) {
          assert.equal(
            f.payloads.length,
            1,
            `${template.templateKey}/${step.order} valid payload`,
          );
          assert.equal(f.payloads[0].body, render.body);
          assert.equal(f.payloads[0].subject, render.subject ?? undefined);
          assert.equal(run.status, "sent");
        } else {
          assert.equal(f.payloads.length, 0);
          assert.equal(run.status, "failed");
        }
      } else {
        assert.equal(f.payloads.length, 0);
        assert.equal(
          run.status,
          ["avatar_video", "retargeting"].includes(step.type)
            ? "blocked"
            : "sent",
        );
      }
      assert.equal(
        f.engagement.filter((e) => e.eventType === "delivered").length,
        0,
      );
    }
  });
}
test("all messages handle complete, partial, missing and malformed contacts without leaking data", () => {
  const f = fixture(),
    { renderMessage } = f.load("lib/campaigns/render-message.ts");
  for (const t of templates)
    for (const s of t.steps.filter((s) =>
      ["email", "sms", "voicemail"].includes(s.type),
    ))
      for (const contact of [
        context.contact,
        { first_name: "Sam" },
        {},
        {
          first_name: { secret: "SENSITIVE_FIXTURE_VALUE" },
          last_name: null,
          preferred_area: ["SENSITIVE_FIXTURE_VALUE"],
          budget: { secret: "SENSITIVE_FIXTURE_VALUE" },
          property_address: "undefined",
        },
      ]) {
        const r = renderMessage(s.type, s.description, s.title, {
          ...context,
          contact,
        });
        if (r.ok) {
          assert.ok(
            !/\[object Object\]|undefined|\bnull\b|SENSITIVE_FIXTURE_VALUE|\{\{|```/.test(
              r.body,
            ),
          );
          assert.ok(r.body.trim());
        }
      }
});
test("JSON recommendations, arrays, code fences, empty copy, broken variables and links never reach provider", async () => {
  const cases = [
    '{"recommendation":"Send a recommendation","reason":"internal"}',
    '[{"body":"text"}]',
    '```json\n{"bad":true}\n```',
    '{"bad":true}',
    "[object Object]",
    "undefined",
    "null",
    "",
    "Hello {{first-name}}",
    "Visit https://",
    "Hello [UnconfiguredToken]",
    "owner_id: private",
    "Beautifully designed, personalized email follow-up.",
  ];
  for (const body of cases) {
    const f = fixture();
    const res = await f
      .load("lib/providers/dispatch-message.ts")
      .sendToContact({
        ownerId: owner,
        contact: f.contact,
        channel: "sms",
        campaignId: id(1),
        recipientId: id(4),
        body,
        providerId: "mock",
      });
    assert.equal(res.ok, false, body);
    assert.equal(f.payloads.length, 0, body);
  }
  const r = fixture()
    .load("lib/campaigns/render-message.ts")
    .renderMessage(
      "email",
      '{"subject":"Hello","body":"Hi {{first_name}}, thanks for connecting."}',
      "Title",
      context,
    );
  assert.equal(r.ok, true);
  assert.equal(r.body, "Hi Jordan, thanks for connecting.");
});
test("atomic claims, repeated ticks, replies, opt-outs and mismatched owners cannot duplicate sends", async () => {
  const f = fixture();
  f.seed();
  const engine = f.load("lib/campaigns/engine.ts");
  await Promise.all([
    engine.runDueStepRuns({ ownerId: owner }),
    engine.runDueStepRuns({ ownerId: owner }),
  ]);
  assert.equal(f.payloads.length, 1);
  await engine.runDueStepRuns({ ownerId: owner });
  assert.equal(f.payloads.length, 1);
  for (const kind of ["replied", "opt_out", "foreign"]) {
    const g = fixture();
    g.seed();
    if (kind === "foreign") g.tables.contacts[0].owner_id = "other";
    else
      g.tables.engagement_events.push({
        id: id(20),
        owner_id: owner,
        contact_id: id(2),
        event_type: kind,
        occurred_at: "2026-10-01T12:00:00Z",
      });
    await g.load("lib/campaigns/engine.ts").runDueStepRuns({ ownerId: owner });
    assert.equal(g.payloads.length, 0, kind);
  }
  const g = fixture();
  g.seed();
  g.tables.contacts[0].opt_out_requested = true;
  await g.load("lib/campaigns/engine.ts").runDueStepRuns({ ownerId: owner });
  assert.equal(g.payloads.length, 0);
});
test("mock sequence preview is read-only and enforces contact ownership", async () => {
  const f = fixture();
  f.seed();
  const route = f.load("app/api/campaigns/[campaignId]/test-run/route.ts");
  const req = (contactId) =>
    new Request("http://qa/test-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "mock", contactIds: [contactId] }),
    });
  const res = await route.POST(req(id(2)), {
    params: Promise.resolve({ campaignId: id(1) }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).previews.length, 1);
  assert.equal(
    f.calls.filter((c) => ["insert", "delete", "update"].includes(c.mode))
      .length,
    0,
  );
  assert.equal(f.payloads.length, 0);
  assert.equal(
    (
      await route.POST(req(id(90)), {
        params: Promise.resolve({ campaignId: id(1) }),
      })
    ).status,
    404,
  );
});
test("scheduler preserves completed history and original enrollment anchors on resume", async () => {
  const f = fixture();
  f.seed();
  f.tables.campaign_step_runs[0].status = "sent";
  f.tables.campaign_step_runs[0].step_id = id(3);
  const enroll = f.load("lib/campaigns/enroll.ts");
  await enroll.rebuildScheduledStepRuns(owner, id(1));
  assert.equal(f.tables.campaign_step_runs.length, 1);
  assert.equal(f.tables.campaign_step_runs[0].status, "sent");
  assert.equal(f.calls.filter((c) => c.mode === "delete").length, 0);
});
test("wall clock and immediate delays honor IANA zones and DST quiet-hour boundaries", () => {
  const f = fixture(),
    { scheduledAtForStep } = f.load("lib/campaigns/scheduling.ts");
  assert.equal(
    scheduledAtForStep(
      { delay_minutes: 0, time_label: "Immediate +2m" },
      "2026-10-22T12:00:00Z",
      "America/New_York",
    ).toISOString(),
    "2026-10-22T12:02:00.000Z",
  );
  assert.equal(
    scheduledAtForStep(
      { delay_minutes: 1440, time_label: "9:00 AM" },
      "2026-03-07T15:00:00Z",
      "America/New_York",
    ).toISOString(),
    "2026-03-08T13:00:00.000Z",
  );
  const q = f.load("lib/compliance/quiet-hours.ts");
  const after = q.nextQuietHoursEnd({
    now: new Date("2026-03-08T06:30:00Z"),
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    timeZone: "America/New_York",
  });
  assert.equal(
    q.isInQuietHours({
      now: after,
      quietHoursStart: "21:00",
      quietHoursEnd: "08:00",
      timeZone: "America/New_York",
    }),
    false,
  );
  assert.equal(after.toISOString(), "2026-03-08T12:02:00.000Z");
  assert.equal(
    q.isInQuietHours({ quietHoursStart: "bad", quietHoursEnd: "08:00" }),
    true,
  );
  assert.throws(() =>
    scheduledAtForStep(
      { delay_minutes: 1, time_label: "Immediate" },
      "bad",
      "America/New_York",
    ),
  );
});
test("last live boundary blocks missing consent, DNC, foreign destinations, invalid identity and quiet hours", async () => {
  const f = fixture();
  f.tables.campaigns.push({id:id(1),owner_id:owner,status:'sending',provider:'live',live_launched:true});
  f.tables.campaign_recipients.push({id:id(4),owner_id:owner,campaign_id:id(1),contact_id:id(2),created_at:"2026-01-01T00:00:00Z"});
  f.tables.contacts.push(structuredClone(f.contact));
  f.tables.consent_records.push(...structuredClone(f.contact.consent_records));
  const auth = f.load(
    "lib/providers/send-authorization.ts",
  ).authorizeLiveOutbound;
  const old = process.env.ALLOW_LIVE_OUTBOUND;
  process.env.ALLOW_LIVE_OUTBOUND = "true";
  try {
    const req = {
      ownerId: owner,
      contactId: id(2),
      channel: "sms",
      to: f.contact.phone,
      campaignId: id(1),
      recipientId: id(4),
    };
    assert.deepEqual(await auth(req), []);
    f.tables.contacts[0].dnc = true;
    assert.ok((await auth(req)).length);
    f.tables.contacts[0].dnc = false;
    assert.ok((await auth({ ...req, to: "+15555559999" })).length);
    f.tables.contacts[0].consent_records = [];
    f.tables.consent_records = [];
    assert.ok((await auth(req)).length);
    f.tables.contacts[0].consent_records = [
      { ...f.contact.consent_records[0], owner_id: "foreign" },
    ];
    assert.ok((await auth(req)).length);
  } finally {
    if (old === undefined) delete process.env.ALLOW_LIVE_OUTBOUND;
    else process.env.ALLOW_LIVE_OUTBOUND = old;
  }
});
test("provider payload uses escaped HTML; failures are not recorded as delivery", async () => {
  const f = fixture(),
    provider = f.load("lib/providers/resend.ts").resendProvider;
  const saved = {
    key: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
    fetch: global.fetch,
  };
  process.env.RESEND_API_KEY = "synthetic-unit-key";
  process.env.RESEND_FROM_EMAIL = "agent@example.test";
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: "fixture-provider-id" }), {
      status: 200,
    });
  };
  try {
    await provider.send({
      channel: "email",
      to: "jordan@example.test",
      body: "Hello <script>alert(1)</script> & welcome",
      subject: "Hello",
      campaignId: id(1),
      recipientId: id(4),
      idempotencyKey: "fixture-step-id",
    });
    assert.ok(payload.html.includes("&lt;script&gt;"));
    assert.equal(payload.text, "Hello <script>alert(1)</script> & welcome");
  } finally {
    global.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = saved.key;
    if (saved.from === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = saved.from;
  }
});
test("webhook dedup distinguishes lifecycle events for the same provider message", async () => {
  const f = fixture();
  f.tables.provider_webhooks.push({
    id: id(10),
    provider: "resend",
    external_id: "message",
    event_type: "delivered",
  });
  const check = f.load(
    "lib/webhooks/replay-guard.ts",
  ).isDuplicateProviderWebhook;
  assert.equal(await check("resend", "message", "delivered"), true);
  assert.equal(await check("resend", "message", "opened"), false);
});
test("active campaign edits and foreign recordings are rejected before any mutation", async () => {
  const f = fixture();
  f.seed();
  const route = f.load("app/api/campaigns/builder/route.ts");
  const body = {
    action: "template",
    campaignId: id(1),
    campaign: {
      id: "revision",
      name: "Revision",
      description: "Review",
      audience: "Selected contacts",
      durationDays: 1,
      steps: [
        {
          id: "s",
          order: 1,
          type: "email",
          title: "Hi",
          description: "Hello",
          dayLabel: "Day 1",
          timeLabel: "9:00 AM",
        },
      ],
    },
  };
  const request = (b) =>
    new Request("http://qa/builder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    });
  assert.equal((await route.POST(request(body), {})).status, 409);
  assert.equal(
    f.calls.filter((c) => ["insert", "delete", "update"].includes(c.mode))
      .length,
    0,
  );
  delete body.campaignId;
  body.campaign.steps[0].voiceAssetId = id(100);
  assert.equal((await route.POST(request(body), {})).status, 403);
  assert.equal(
    f.calls.filter((c) => ["insert", "delete", "update"].includes(c.mode))
      .length,
    0,
  );
});
test("every proposed copy is separately reviewable, schema-valid, personalized and non-activating", () => {
  const fs = require("node:fs");
  const proposals = JSON.parse(
    fs.readFileSync("docs/campaign-audit/proposed-copy.json", "utf8"),
  );
  const f = fixture(),
    { CampaignImportSchema } = f.load("lib/campaigns/library-transfer.ts"),
    { renderMessage } = f.load("lib/campaigns/render-message.ts");
  assert.equal(proposals.length, templates.length);
  for (const p of proposals) {
    assert.equal(p.approvalRequired, true);
    CampaignImportSchema.parse(p.campaign);
    for (const step of p.campaign.steps)
      if (["email", "sms", "voicemail"].includes(step.type)) {
        const rendered = renderMessage(
          step.type,
          step.description,
          step.title,
          context,
        );
        assert.equal(
          rendered.ok,
          true,
          `${p.templateKey}/${step.order}: ${rendered.issues}`,
        );
        if (step.type === "sms")
          assert.match(rendered.body, /Reply STOP to opt out/);
      }
  }
});
test("provider failures do not turn into automatic retries or fabricated delivery events", async () => {
  const f = fixture();
  f.seed();
  f.stubs["@/lib/providers/registry"].dispatch = async (request) => {
    f.payloads.push(request);
    return { ok: false, status: "failed", error: "Fixture provider failure" };
  };
  const engine = f.load("lib/campaigns/engine.ts");
  await engine.runDueStepRuns({ ownerId: owner, campaignId: id(1) });
  assert.equal(f.tables.campaign_step_runs[0].status, "failed");
  await engine.runDueStepRuns({ ownerId: owner, campaignId: id(1) });
  assert.equal(f.payloads.length, 1);
  assert.equal(
    f.engagement.filter((e) => e.eventType === "delivered").length,
    0,
  );
});
test('skipped outreach never counts as a completed sequence',()=>{const f=fixture();const metric=f.load('lib/campaigns/library-data.ts').performanceSummary({campaign:{provider:'live'},steps:[{id:'one'}],recipients:[{id:'r'}],runs:[{id:'run',step_id:'one',recipient_id:'r',status:'skipped'}],engagement:[]});assert.equal(metric.completed,0);});
test('a concurrently running predecessor defers the next outreach step',async()=>{const f=fixture();f.seed();const first=f.tables.campaign_steps[0],rec=f.tables.campaign_recipients[0];f.tables.campaign_step_runs[0].status='running';const second={...first,id:id(30),step_order:2};f.tables.campaign_steps.push(second);f.tables.campaign_step_runs.push({...f.tables.campaign_step_runs[0],id:id(31),step_id:second.id,campaign_steps:second,status:'scheduled'});await f.load('lib/campaigns/engine.ts').runDueStepRuns({ownerId:owner,campaignId:id(1)});assert.equal(f.payloads.length,0);assert.equal(f.tables.campaign_step_runs[1].status,'scheduled');});
test('final live authorization rechecks pause state rather than trusting a worker cache',async()=>{const f=fixture();f.tables.contacts.push(structuredClone(f.contact));f.tables.consent_records.push(...structuredClone(f.contact.consent_records));f.tables.campaigns.push({id:id(1),owner_id:owner,provider:'live',status:'sending',live_launched:false});const saved=process.env.ALLOW_LIVE_OUTBOUND;process.env.ALLOW_LIVE_OUTBOUND='true';try{const issues=await f.load('lib/providers/send-authorization.ts').authorizeLiveOutbound({ownerId:owner,contactId:id(2),campaignId:id(1),recipientId:id(4),channel:'sms',to:f.contact.phone});assert.ok(issues.length);}finally{if(saved===undefined)delete process.env.ALLOW_LIVE_OUTBOUND;else process.env.ALLOW_LIVE_OUTBOUND=saved;}});
test('authenticated delivery events update accurate status and do not suppress later lifecycle events',async()=>{const f=fixture();f.seed();f.stubs['@/lib/providers/registry'].getAdapter=()=>f.load('lib/providers/resend.ts').resendProvider;const old=process.env.VOICE_WEBHOOK_SECRET;process.env.VOICE_WEBHOOK_SECRET='synthetic-webhook-secret';try{const route=f.load('app/api/webhooks/voice/route.ts');const call=type=>route.POST(new Request('https://qa.example.test/api/webhooks/voice?provider=resend',{method:'POST',headers:{'content-type':'application/json','x-voice-webhook-secret':'synthetic-webhook-secret'},body:JSON.stringify({type,data:{email_id:'message-1',tags:[{name:'campaign_id',value:id(1)},{name:'recipient_id',value:id(4)}]}})}),{});assert.equal((await call('email.delivered')).status,200);assert.equal(f.tables.campaign_recipients[0].delivery_status,'delivered');await call('email.opened');await call('email.opened');assert.equal(f.engagement.length,2);await call('email.failed');assert.equal(f.tables.campaign_recipients[0].delivery_status,'failed');await call('email.sent');assert.equal(f.engagement.length,3);}finally{if(old===undefined)delete process.env.VOICE_WEBHOOK_SECRET;else process.env.VOICE_WEBHOOK_SECRET=old;}});
test('signed inbound SMS without required account/receiver mapping fails closed',async()=>{const f=fixture();f.seed();const old=process.env.TWILIO_AUTH_TOKEN;process.env.TWILIO_AUTH_TOKEN='synthetic';try{const raw={From:f.contact.phone,To:'+15555550999',Body:'STOP',MessageSid:'SM-1'};const url='https://qa.example.test/api/webhooks/twilio/sms';f.stubs['@/lib/webhooks/twilio-signature']={twilioWebhookPublicUrl:()=>url,validateTwilioSignature:()=>true};const route=f.load('app/api/webhooks/twilio/sms/route.ts');const response=await route.POST(new Request(url,{method:'POST',body:new URLSearchParams(raw)}));assert.equal(response.status,400);assert.equal(f.engagement.length,0);assert.equal(f.tables.contacts[0].dnc,false);}finally{if(old===undefined)delete process.env.TWILIO_AUTH_TOKEN;else process.env.TWILIO_AUTH_TOKEN=old;}});
