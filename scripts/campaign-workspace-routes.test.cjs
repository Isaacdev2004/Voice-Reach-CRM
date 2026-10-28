/* Exercise actual workspace handlers; only auth, database and storage boundaries are replaced. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  sid = "00000000-0000-4000-8000-000000000001",
  rid = "00000000-0000-4000-8000-000000000002";
function fixture() {
  let owner = "a",
    sourceVersion = "original",
    failSteps = false,
    failAudit = false;
  const tables = {
      campaigns: [],
      campaign_steps: [],
      voice_assets: [],
      audit_logs: [],
    },
    calls = [];
  const source = {
    campaign: {
      id: sid,
      owner_id: "a",
      name: "Source",
      status: "sending",
      provider: "existing-live-provider",
      updated_at: "original",
      created_at: "date",
      enrollmentCount: 5,
      channels: ["email"],
      stepCount: 1,
      durationMinutes: 0,
    },
    steps: [
      {
        id: "s1",
        owner_id: "a",
        campaign_id: sid,
        type: "email",
        title: "Hello",
        description: "Subject: Hello\n\nWelcome.",
        step_order: 1,
        delay_minutes: 0,
        time_label: "10:00 AM",
        conditions: {},
      },
    ],
    recipients: [],
    runs: [],
    engagement: [],
    performanceAvailable: false,
  };
  const db = {
    from(table) {
      const filters = [];
      let single = false,
        operation = "read",
        payload;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push([k, v]);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        single() {
          single = true;
          return q;
        },
        insert(v) {
          operation = "insert";
          payload = v;
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              calls.push({ table, operation, filters });
              if (operation === "insert") {
                if (tables[table].some((r) => r.id === payload.id))
                  return { data: null, error: { message: "duplicate" } };
                tables[table].push({ ...payload });
                return { data: single ? payload : [payload], error: null };
              }
              const rows = tables[table].filter((r) =>
                filters.every(([k, v]) => r[k] === v),
              );
              return { data: single ? (rows[0] ?? null) : rows, error: null };
            })
            .then(resolve, reject);
        },
      };
      return q;
    },
  };
  const api = {
    apiOk: (p) => Response.json({ success: true, ...p }),
    apiError: (error, o = {}) =>
      Response.json(
        { success: false, error, code: o.code },
        { status: o.status ?? 500 },
      ),
    withApiHandler:
      (f) =>
      async (...args) => {
        try {
          return await f(...args);
        } catch (e) {
          return Response.json(
            { success: false, error: e.message },
            { status: e.message === "Unauthorized" ? 401 : 400 },
          );
        }
      },
  };
  const stubs = {
    "@/lib/api-response": api,
    "@/lib/auth": {
      requireUserId: async () => {
        if (!owner) throw Error("Unauthorized");
        return owner;
      },
    },
    "@/lib/supabaseAdmin": { supabaseAdmin: db },
    "@/lib/campaigns/library-server": {
      readPreview: async (o, id) =>
        o === "a" && id === sid
          ? structuredClone({
              ...source,
              campaign: { ...source.campaign, updated_at: sourceVersion },
            })
          : null,
    },
    "@/lib/campaigns/engine": {
      persistSteps: async (o, id, steps) => {
        assert.notEqual(id, sid);
        assert.equal(o, owner);
        if (failSteps) throw Error("private details");
        for (const s of steps)
          tables.campaign_steps.push({
            owner_id: o,
            campaign_id: id,
            step_order: s.order,
            type: s.type,
            title: s.title,
            description: s.description,
            delay_minutes: s.delayMinutes ?? 0,
            day_label: s.dayLabel ?? null,
            time_label: s.timeLabel ?? null,
            conditions: s.conditions,
            voice_asset_id: s.conditions.voiceAssetId ?? null,
          });
      },
    },
    "@/lib/audit": {
      writeAuditLog: async (a) => {
        if (failAudit) throw Error("audit failed");
        tables.audit_logs.push({
          id: "audit",
          owner_id: a.ownerId,
          entity_id: a.entityId,
          action: a.action,
        });
      },
    },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const m = { exports: {} };
    cache.set(file, m);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (name) => {
        if (stubs[name]) return stubs[name];
        if (name.startsWith("@/"))
          return load(path.join(root, name.slice(2)) + ".ts");
        if (name.startsWith("."))
          return load(path.resolve(path.dirname(file), name) + ".ts");
        return require(name);
      },
      m,
      m.exports,
    );
    return m.exports;
  }
  const route = load(path.join(root, "app/api/campaigns/workspace/route.ts"));
  async function body() {
    const r = await route.GET(
      new Request("https://test/api/campaigns/workspace?id=" + sid),
    );
    const data = await r.json();
    return {
      sourceId: sid,
      version: data.version,
      requestId: rid,
      confirmation: "CREATE_DRAFT_REVISION",
      draft: data.draft,
    };
  }
  return {
    route,
    tables,
    calls,
    source,
    body,
    setOwner: (v) => (owner = v),
    change: () => (sourceVersion = "newer"),
    failSteps: () => (failSteps = true),
    failAudit: (v) => (failAudit = v),
  };
}
const request = (b) =>
  new Request("https://test/api/campaigns/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
test("owner-only reads and authentication reject foreign access", async () => {
  const f = fixture();
  f.setOwner("b");
  assert.equal(
    (
      await f.route.GET(
        new Request("https://test/api/campaigns/workspace?id=" + sid),
      )
    ).status,
    404,
  );
  f.setOwner(null);
  assert.equal(
    (
      await f.route.GET(
        new Request("https://test/api/campaigns/workspace?id=" + sid),
      )
    ).status,
    401,
  );
});
test("saved revision never alters source, enrollment, execution status or provider", async () => {
  const f = fixture(),
    before = structuredClone(f.source),
    b = await f.body();
  const r = await f.route.POST(request(b));
  assert.equal(r.status, 200);
  assert.deepEqual(f.source, before);
  assert.equal(f.tables.campaigns[0].id, rid);
  assert.equal(f.tables.campaigns[0].status, "draft");
  assert.equal(f.tables.campaigns[0].provider, "existing-live-provider");
  assert(
    f.calls.every(
      (c) => !["campaign_recipients", "campaign_step_runs"].includes(c.table),
    ),
  );
  assert.equal(f.tables.audit_logs.length, 1);
});
test("retry returns same complete draft without duplicate records or updates", async () => {
  const f = fixture(),
    b = await f.body();
  await f.route.POST(request(b));
  assert.equal(
    (await (await f.route.POST(request(b))).json()).alreadySaved,
    true,
  );
  assert.equal(f.tables.campaigns.length, 1);
  assert.equal(f.tables.campaign_steps.length, 1);
  assert(f.calls.every((c) => c.operation !== "update"));
});
test("stale source rejects before any writes", async () => {
  const f = fixture(),
    b = await f.body();
  f.change();
  const r = await f.route.POST(request(b));
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, "stale_campaign");
  assert.equal(f.tables.campaigns.length, 0);
});
test("foreign source, empty content, unsupported rules and unowned audio are rejected", async () => {
  const f = fixture(),
    b = await f.body();
  f.setOwner("b");
  assert.equal((await f.route.POST(request(b))).status, 404);
  f.setOwner("a");
  b.draft.steps[0].description = "";
  assert.equal((await f.route.POST(request(b))).status, 400);
  b.draft.steps[0].description = "Subject: Hi\n\nBody";
  b.draft.steps[0].voiceAssetId = "00000000-0000-4000-8000-000000000099";
  assert.equal((await f.route.POST(request(b))).status, 400);
  assert.equal(f.tables.campaigns.length, 0);
});
test("attachments cannot reference another owner", async () => {
  const f = fixture(),
    b = await f.body();
  b.draft.steps[0].attachments = [
    {
      id: "a",
      storagePath: "b/attachments/private.pdf",
      fileName: "private.pdf",
      mimeType: "application/pdf",
    },
  ];
  assert.equal((await f.route.POST(request(b))).status, 403);
  assert.equal(f.tables.campaigns.length, 0);
});
test("partial save is reported, never deletes source or retries steps blindly", async () => {
  const f = fixture(),
    b = await f.body();
  f.failSteps();
  let r = await f.route.POST(request(b));
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, "inspect_save");
  r = await f.route.POST(request(b));
  assert.equal(r.status, 409);
  assert.equal(f.tables.campaigns.length, 1);
  assert.equal(f.source.campaign.status, "sending");
});
test("missing audit after completed steps is repaired on identical retry", async () => {
  const f = fixture(),
    b = await f.body();
  f.failAudit(true);
  assert.equal((await f.route.POST(request(b))).status, 503);
  f.failAudit(false);
  assert.equal((await f.route.POST(request(b))).status, 200);
  assert.equal(f.tables.audit_logs.length, 1);
});
test("retry with changed content or request ID matching source cannot overwrite", async () => {
  const f = fixture(),
    b = await f.body();
  await f.route.POST(request(b));
  b.draft.name = "Different content";
  assert.equal((await f.route.POST(request(b))).status, 409);
  assert.equal(f.tables.campaigns[0].name, "Source");
});

test("custom source delivery rules cannot be silently dropped", async () => {
  const f = fixture();
  f.source.steps[0].conditions = { stopOnReply: true };
  const b = await f.body();
  assert.equal((await f.route.POST(request(b))).status, 409);
  assert.equal(f.tables.campaigns.length, 0);
});
test("request cannot activate, enroll or impersonate an owner", async () => {
  const f = fixture(),
    b = await f.body();
  for (const extra of [
    { action: "activate" },
    { owner_id: "b" },
    { contactIds: ["foreign"] },
  ])
    assert.equal((await f.route.POST(request({ ...b, ...extra }))).status, 400);
  assert.equal(f.tables.campaigns.length, 0);
});
