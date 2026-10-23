/* Synthetic owners/providers only. No credentials, network, sends or production writes. */
const test = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
const now = new Date("2026-10-23T14:00:00Z");
function setup() {
  const f = fixture();
  f.tables.inbound_communications = [];
  f.tables.subscriber_phone_numbers = [];
  f.tables.task_transactions = [];
  f.tables.contacts.push({ ...f.contact });
  f.tables.campaigns.push({
    id: id(30),
    owner_id: owner,
    name: "Owned",
    status: "sending",
  });
  f.stubs["@/lib/delivery/store"] = {
    readDelivery: async () => ({ records: [] }),
  };
  return f;
}
const req = (body, headers = {}) =>
  new Request("http://localhost/api/dashboard/briefing", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
test("owner-scoped durable preferences reject stale versions and foreign session saves", async () => {
  const f = setup(),
    store = f.load("lib/dashboard/briefing/store"),
    model = f.load("lib/dashboard/briefing/model");
  const a = await store.loadPreferences(owner);
  assert.equal(a.preferences.enabled, false);
  const saved = await store.savePreferences(
    owner,
    model.Preferences.parse({ enabled: true, limit: 3 }),
    null,
  );
  assert.equal((await store.loadPreferences(owner)).preferences.limit, 3);
  await assert.rejects(
    store.savePreferences(owner, a.preferences, null),
    /conflict/,
  );
  await assert.rejects(
    store.savePreferences(owner, a.preferences, id(9)),
    /conflict/,
  );
  assert.equal(
    (await store.loadPreferences("foreign")).preferences.enabled,
    false,
  );
  const r = await f
    .load("app/api/dashboard/briefing/preferences/route")
    .PUT(
      req(
        { preferences: a.preferences, version: saved.version },
        { "X-MyARI-Owner": "foreign" },
      ),
    );
  assert.equal(r.status, 409);
});
test("ranked sources use actual tasks, appointments and transactions; foreign/complete/cancelled records excluded", async () => {
  const f = setup(),
    p = f.load("lib/dashboard/briefing/model").Preferences.parse({});
  f.tables.contact_tasks.push(
    {
      id: id(1),
      owner_id: owner,
      contact_id: f.contact.id,
      title: "Overdue",
      due_at: "2026-10-22T12:00:00Z",
      completed: false,
      created_at: "2026-10-21T12:00:00Z",
    },
    {
      id: id(2),
      owner_id: "foreign",
      contact_id: f.contact.id,
      title: "Private",
      due_at: "2026-10-22T12:00:00Z",
      completed: false,
    },
    {
      id: id(3),
      owner_id: owner,
      contact_id: f.contact.id,
      title: "Done",
      due_at: "2026-10-22T12:00:00Z",
      completed: true,
    },
  );
  f.tables.calendar_events.push(
    {
      id: id(4),
      owner_id: owner,
      contact_id: f.contact.id,
      title: "Today appointment",
      starts_at: "2026-10-23T16:00:00Z",
      ends_at: "2026-10-23T17:00:00Z",
      metadata: {},
    },
    {
      id: id(5),
      owner_id: owner,
      contact_id: f.contact.id,
      title: "Canceled",
      starts_at: "2026-10-23T16:00:00Z",
      metadata: { status: "cancelled" },
    },
  );
  f.tables.task_transactions.push({
    id: id(6),
    owner_id: owner,
    contact_id: f.contact.id,
    created_at: "2026-10-01T12:00:00Z",
    payload: { name: "Closing", closingDate: "2026-10-26" },
  });
  const s = await f
    .load("lib/dashboard/briefing/sources")
    .buildPriorities(owner, p, null, now);
  assert.deepEqual(
    s.items.map((i) => i.title),
    ["Overdue", "Today appointment", "Closing"],
  );
  assert.equal(s.total, 3);
  assert.equal(s.counts.tasks, 1);
  assert.equal(s.items[0].href, "/dashboard/tasks?taskId=" + id(1));
});
test("Twilio attribution deduplicates alerts and excludes opt-outs, unverified numbers, foreign contacts and answered SMS", async () => {
  const f = setup(),
    p = f.load("lib/dashboard/briefing/model").Preferences.parse({});
  f.tables.subscriber_phone_numbers.push({
    id: id(50),
    owner_id: owner,
    phone: "+15555550100",
    verified: true,
  });
  const base = {
    owner_id: owner,
    kind: "sms",
    contact_id: f.contact.id,
    to_number: "+15555550100",
    status: "received",
    classification: "Question",
    received_at: "2026-10-23T12:00:00Z",
  };
  f.tables.inbound_communications.push(
    { id: id(1), provider_id: "SM1", ...base },
    { id: id(2), provider_id: "SM1", ...base },
    {
      id: id(3),
      provider_id: "CA1",
      ...base,
      kind: "call",
      status: "no-answer",
    },
    { id: id(4), provider_id: "SM2", ...base, to_number: "+19999999999" },
    { id: id(5), provider_id: "SM3", ...base, contact_id: id(99) },
  );
  let s = await f
    .load("lib/dashboard/briefing/sources")
    .buildPriorities(owner, p, null, now);
  assert.equal(s.items.length, 2);
  f.stubs["@/lib/delivery/store"].readDelivery = async () => ({
    records: [
      {
        provider: "twilio",
        channel: "sms",
        contact_id: f.contact.id,
        events: [{ event_type: "sent", occurred_at: "2026-10-23T13:00:00Z" }],
      },
    ],
  });
  s = await f
    .load("lib/dashboard/briefing/sources")
    .buildPriorities(owner, p, null, now);
  assert.equal(s.items.filter((i) => i.category === "replies").length, 0);
});
test("source failures are explicit limitations rather than fake empty data", async () => {
  const f = setup();
  f.fail("inbound_communications");
  const s = await f
    .load("lib/dashboard/briefing/sources")
    .buildPriorities(
      owner,
      f.load("lib/dashboard/briefing/model").Preferences.parse({}),
      null,
      now,
    );
  assert.equal(s.items.length, 0);
  assert.ok(s.limitations.some((x) => x.includes("missed calls")));
});
test("manual reorder, categories and dismissal are transparent and persistent preferences", () => {
  const m = setup().load("lib/dashboard/briefing/model");
  const items = [
    { id: "a", category: "tasks", rank: 0, at: "2026-10-01" },
    { id: "b", category: "calls", rank: 3, at: "2026-10-02" },
  ];
  assert.deepEqual(
    m
      .orderedPriorities(items, m.Preferences.parse({ order: ["b", "a"] }))
      .map((i) => i.id),
    ["b", "a"],
  );
  assert.deepEqual(
    m.orderedPriorities(
      items,
      m.Preferences.parse({ dismissed: ["a"], categories: ["tasks"] }),
    ),
    [],
  );
});
test("schedule observes weekday, local time, DST, and workspace quiet hours without ambiguous-time duplication", () => {
  const m = setup().load("lib/dashboard/briefing/model"),
    p = m.Preferences.parse({
      enabled: true,
      time: "08:30",
      timezone: "America/New_York",
    });
  assert.equal(m.briefingDue(p, new Date("2026-10-23T12:15Z")), false);
  assert.equal(m.briefingDue(p, new Date("2026-10-23T12:30Z")), true);
  assert.equal(m.briefingDue(p, new Date("2026-10-24T12:30Z")), false);
  assert.equal(
    m.briefingDue(p, new Date("2026-10-23T12:30Z"), "08:00", "09:00"),
    false,
  );
  assert.equal(
    m.briefingDue({ ...p, weekdaysOnly: false }, new Date("2026-11-01T13:30Z")),
    true,
  );
  assert.equal(m.briefingDue({ ...p, enabled: false }, now), false);
});
test("AI provider outages and missing keys yield grounded cached summaries, not fabricated recommendations", async () => {
  const priorKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const f = setup();
    f.stubs["./sources"] = {
      buildPriorities: async () => ({
        items: [
          {
            id: "task:1",
            category: "tasks",
            rank: 0,
            title: "Actual task",
            reason: "Past deadline",
            href: "/dashboard/tasks",
            at: now.toISOString(),
          },
        ],
        limitations: [],
        updatedAt: now.toISOString(),
        since: null,
      }),
    };
    const service = f.load("lib/dashboard/briefing/service");
    const p = f.load("lib/dashboard/briefing/model").Preferences.parse({});
    const a = await service.generateBriefing(owner, p, now),
      b = await service.generateBriefing(owner, p, now);
    assert.deepEqual(a, b);
    assert.equal(a.provider, "verified-records");
    assert.ok(a.limitation.includes("not configured"));
    assert.equal(
      f.tables.audit_logs.filter(
        (r) =>
          r.id ===
          f
            .load("lib/dashboard/briefing/store")
            .documentId(owner, "ai-usage:2026-10-23"),
      ).length,
      1,
    );
    assert.equal(
      (await f.load("lib/dashboard/briefing/store").loadPreferences("foreign"))
        .version,
      null,
    );
  } finally {
    if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = priorKey;
  }
});
test("briefing routes never accept executable actions or expose raw database errors", async () => {
  const f = setup(),
    r = f.load("app/api/dashboard/briefing/route");
  assert.equal((await r.POST(req({ action: "send" }))).status, 400);
  f.actor(null);
  assert.equal((await r.GET(new Request("http://localhost"))).status, 401);
});
test("scheduler requires cron authentication and never sends messages", async () => {
  const f = setup();
  const r = await f
    .load("app/api/dashboard/briefing/runner/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 401);
  assert.equal(f.payloads.length, 0);
});
test("Claude selection is cached, cost-bounded and rejects invented IDs or provider failure", async () => {
  const priorKey = process.env.ANTHROPIC_API_KEY,
    priorFetch = global.fetch;
  process.env.ANTHROPIC_API_KEY = "synthetic-not-a-real-key";
  try {
    for (const mode of ["valid", "invented", "failed"]) {
      const f = setup();
      let calls = 0;
      f.stubs["./sources"] = {
        buildPriorities: async () => ({
          items: [
            {
              id: "task:1",
              category: "tasks",
              rank: 0,
              title: "Actual task",
              reason: "Past deadline",
              href: "/dashboard/tasks",
              at: now.toISOString(),
            },
          ],
          limitations: [],
          updatedAt: now.toISOString(),
          since: null,
        }),
      };
      global.fetch = async (url, opts) => {
        calls++;
        const payload = JSON.parse(opts.body);
        assert.equal(
          payload.messages[0].content.includes("Actual task"),
          false,
        );
        if (mode === "failed") throw Error("private provider trace");
        return new Response(
          JSON.stringify({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  itemIds: [mode === "invented" ? "foreign:id" : "task:1"],
                }),
              },
            ],
          }),
          { status: 200 },
        );
      };
      const svc = f.load("lib/dashboard/briefing/service"),
        p = f.load("lib/dashboard/briefing/model").Preferences.parse({});
      const a = await svc.generateBriefing(owner, p, now),
        b = await svc.generateBriefing(owner, p, now);
      assert.deepEqual(a, b);
      assert.equal(calls, 1);
      assert.equal(
        a.provider,
        mode === "valid" ? "claude" : "verified-records",
      );
      assert.deepEqual(a.itemIds, ["task:1"]);
      assert.equal(JSON.stringify(a).includes("private provider trace"), false);
    }
  } finally {
    global.fetch = priorFetch;
    if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = priorKey;
  }
});
test("opt-in scheduled in-app notifications are daily idempotent and respect quiet hours", async () => {
  const secret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "synthetic-cron";
  try {
    const f = setup(),
      model = f.load("lib/dashboard/briefing/model"),
      store = f.load("lib/dashboard/briefing/store");
    await store.savePreferences(
      owner,
      model.Preferences.parse({
        enabled: true,
        weekdaysOnly: false,
        time: "00:00",
        delivery: "in_app",
      }),
      null,
    );
    f.tables.audit_logs.push({
      id: id(90),
      owner_id: owner,
      action: "SETTINGS_SAVED",
      entity_type: "user_settings",
      created_at: now.toISOString(),
      metadata: {
        settings: {
          workspace: { quietHoursStart: "00:00", quietHoursEnd: "00:00" },
        },
      },
    });
    let generations = 0;
    f.stubs["@/lib/dashboard/briefing/service"] = {
      generateBriefing: async () => {
        generations++;
        return { itemIds: [] };
      },
    };
    const run = f.load("app/api/dashboard/briefing/runner/route").GET;
    const request = () =>
      new Request("http://localhost", {
        headers: { authorization: "Bearer synthetic-cron" },
      });
    assert.equal((await run(request())).status, 200);
    assert.equal((await run(request())).status, 200);
    assert.equal(
      f.tables.audit_logs.filter((r) => r.action === "DASHBOARD_BRIEFING_READY")
        .length,
      1,
    );
    assert.equal(f.payloads.length, 0);
    const settings = f.tables.audit_logs.find(
      (r) => r.action === "SETTINGS_SAVED",
    );
    settings.metadata.settings.workspace = {
      quietHoursStart: "00:00",
      quietHoursEnd: "23:59",
    };
    await run(request());
    assert.equal(generations, 2);
  } finally {
    if (secret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = secret;
  }
});
test("only verified current campaign failures become priorities; unknown status, simulations and foreign campaigns do not", async () => {
  const f = setup(),
    base = {
      provider: "twilio",
      campaign_id: id(30),
      logical_key: "key1",
      created_at: now.toISOString(),
      status: "failed",
      failure: { explanation: "Failed" },
      events: [{ event_type: "failed" }],
    };
  f.stubs["@/lib/delivery/store"].readDelivery = async () => ({
    records: [
      { ...base, id: id(1) },
      { ...base, id: id(2) },
      { ...base, id: id(3), logical_key: "key2", status: "unknown" },
      { ...base, id: id(4), logical_key: "key3", provider: "mock" },
      { ...base, id: id(5), logical_key: "key4", campaign_id: id(99) },
    ],
  });
  const s = await f
    .load("lib/dashboard/briefing/sources")
    .buildPriorities(
      owner,
      f.load("lib/dashboard/briefing/model").Preferences.parse({}),
      null,
      now,
    );
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].campaignId, id(30));
});
test("briefing preference saves reject delivery times inside workspace quiet hours", async () => {
  const f = setup(),
    p = f
      .load("lib/dashboard/briefing/model")
      .Preferences.parse({ enabled: true, time: "23:00" });
  const r = await f
    .load("app/api/dashboard/briefing/preferences/route")
    .PUT(req({ preferences: p, version: null }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, "quiet_hours");
  assert.equal(f.tables.audit_logs.length, 0);
});
