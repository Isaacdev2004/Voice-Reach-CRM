/* Actual read-only route handlers; substitute database and authentication only. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  test = require("node:test"),
  ts = require("typescript");
const root = path.resolve(__dirname, ".."),
  id = "00000000-0000-4000-8000-000000000001",
  foreign = "00000000-0000-4000-8000-000000000002";
function fixture() {
  const tables = {
    campaigns: [
      {
        id,
        owner_id: "a",
        name: "Owned",
        status: "draft",
        created_at: "2026-10-22",
      },
      { id: foreign, owner_id: "b", name: "Private", status: "draft" },
    ],
    campaign_steps: [
      {
        id: "step",
        owner_id: "a",
        campaign_id: id,
        type: "email",
        step_order: 1,
        delay_minutes: 0,
      },
    ],
    campaign_recipients: [
      {
        id: "rec",
        owner_id: "a",
        campaign_id: id,
        contact_id: "contact-a",
        delivery_status: "not_sent",
        eligibility_status: "eligible",
      },
      {
        id: "bad-reference",
        owner_id: "a",
        campaign_id: id,
        contact_id: "contact-b",
        delivery_status: "not_sent",
      },
    ],
    contacts: [
      { id: "contact-a", owner_id: "a", first_name: "Owned" },
      { id: "contact-b", owner_id: "b", first_name: "Private" },
    ],
    audit_logs: [],
    campaign_step_runs: [],
    engagement_events: [],
  };
  let owner = "a",
    fail = null,
    rowCap = 500,
    countOffset = 0;
  const calls = [];
  const database = {
    from(table) {
      const filters = [];
      let range = [0, 499],
        single = false,
        operation = "read",
        payload;
      const q = {
        insert(value) {
          operation = "insert";
          payload = value;
          return q;
        },
        update(value) {
          operation = "update";
          payload = value;
          return q;
        },
        single() {
          single = true;
          return q;
        },
        select() {
          return q;
        },
        eq(key, value) {
          calls.push({ table, key, value });
          filters.push((row) => row[key] === value);
          return q;
        },
        order() {
          return q;
        },
        range(a, b) {
          range = [a, b];
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              if (fail === table)
                return {
                  data: null,
                  error: { message: "private database information" },
                };
              if (operation === "insert")
                tables[table].push({
                  id: "00000000-0000-4000-8000-000000000090",
                  ...payload,
                });
              const list = tables[table].filter((row) =>
                filters.every((f) => f(row)),
              );
              if (operation === "update")
                for (const row of list) Object.assign(row, payload);
              return {
                data: single
                  ? (list[0] ?? null)
                  : list.slice(
                      range[0],
                      Math.min(range[1] + 1, range[0] + rowCap),
                    ),
                error: null,
                count: list.length + countOffset,
              };
            })
            .then(resolve, reject);
        },
      };
      return q;
    },
  };
  const cache = new Map();
  const stubs = {
    "@/lib/auth": {
      requireUserId: async () => {
        if (!owner) throw Error("Unauthorized");
        return owner;
      },
    },
    "@/lib/supabaseAdmin": { supabaseAdmin: database },
    "@/lib/audit": { writeAuditLog: async () => {} },
    "@/lib/campaigns/engine": {
      persistSteps: async (owner, campaignId, steps) => {
        calls.push({ service: "persistSteps", owner, campaignId, steps });
      },
      scheduleStepRunsForCampaign: async () => {
        throw Error("Unexpected schedule mutation");
      },
    },
    "@/lib/campaigns/enroll": {
      enrollContacts: async () => {
        throw Error("Unexpected enrollment");
      },
    },
  };
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += ".ts";
    if (cache.has(file)) return cache.get(file).exports;
    const m = { exports: {} };
    cache.set(file, m);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (key) =>
        stubs[key] ??
        (key.startsWith("@/")
          ? load(key.slice(2))
          : key.startsWith(".")
            ? load(path.resolve(path.dirname(file), key))
            : require(key)),
      m,
      m.exports,
    );
    return m.exports;
  }
  return {
    tables,
    calls,
    load,
    setOwner: (v) => (owner = v),
    fail: (v) => (fail = v),
    cap: (v) => (rowCap = v),
    wrongCount: (v) => (countOffset = v),
  };
}
const request = new Request("http://qa/api/campaigns/library");
const context = (campaignId) => ({ params: Promise.resolve({ campaignId }) });
test("library exact distinct enrollments, full pagination and tenant filtering", async () => {
  const f = fixture();
  f.cap(100);
  f.tables.campaign_recipients.push({
    ...f.tables.campaign_recipients[0],
    id: "duplicate",
  });
  for (let i = 0; i < 1002; i++)
    f.tables.campaigns.push({
      id: "owned-" + i,
      owner_id: "a",
      name: "Campaign",
      status: "draft",
    });
  const result = await f
    .load("app/api/campaigns/library/route.ts")
    .GET(request, {});
  const json = await result.json();
  assert.equal(json.campaigns.length, 1003);
  assert.equal(json.campaigns.find((c) => c.id === id).enrollmentCount, 2);
  assert.equal(
    json.campaigns.some((c) => c.owner_id === "b"),
    false,
  );
  for (const table of ["campaigns", "campaign_steps", "campaign_recipients"])
    assert.ok(
      f.calls.some(
        (c) => c.table === table && c.key === "owner_id" && c.value === "a",
      ),
    );
});
test("preview refuses foreign campaigns and never follows foreign contact references", async () => {
  const f = fixture(),
    route = f.load("app/api/campaigns/library/[campaignId]/route.ts");
  assert.equal((await route.GET(request, context(foreign))).status, 404);
  const result = await route.GET(request, context(id));
  const json = await result.json();
  assert.equal(
    json.recipients.find((r) => r.contact_id === "contact-b").contact,
    null,
  );
  assert.equal(
    json.recipients.find((r) => r.contact_id === "contact-a").contact
      .first_name,
    "Owned",
  );
  assert.ok(!JSON.stringify(json).includes("Private"));
  f.setOwner("b");
  const other = await route.GET(request, context(id));
  assert.equal(other.status, 404);
});
test("failures are safe and counts are never silently partial", async () => {
  const f = fixture();
  f.fail("campaign_steps");
  const res = await f
    .load("app/api/campaigns/library/route.ts")
    .GET(request, {});
  assert.equal(res.status, 503);
  assert.ok(!(await res.text()).includes("private database"));
  f.fail("engagement_events");
  const result = await f
    .load("app/api/campaigns/library/[campaignId]/route.ts")
    .GET(request, context(id));
  assert.equal((await result.json()).performanceAvailable, false);
});
test("authentication and IDs validated before reads", async () => {
  const f = fixture();
  const route = f.load("app/api/campaigns/library/[campaignId]/route.ts");
  assert.equal((await route.GET(request, context("invalid"))).status, 400);
  assert.equal(f.calls.length, 0);
  f.setOwner(null);
  assert.equal((await route.GET(request, context(id))).status, 401);
  assert.equal(f.calls.length, 0);
});

test("saved descriptions and goals use newest owned blueprint; status/enrollment updates recalculate", async () => {
  const f = fixture();
  f.tables.audit_logs.push(
    {
      id: "a1",
      owner_id: "a",
      entity_type: "campaign",
      entity_id: id,
      created_at: "2026-10-20",
      metadata: { blueprint: { description: "Old" } },
    },
    {
      id: "a2",
      owner_id: "a",
      entity_type: "campaign",
      entity_id: id,
      created_at: "2026-10-22",
      metadata: {
        blueprint: {
          description: "Saved description",
          audience: "Buyers",
          goals: ["Stay connected"],
        },
      },
    },
    {
      id: "b",
      owner_id: "b",
      entity_type: "campaign",
      entity_id: id,
      created_at: "2026-10-23",
      metadata: { blueprint: { description: "Private" } },
    },
  );
  const route = f.load("app/api/campaigns/library/route.ts");
  let data = await (await route.GET(request, {})).json();
  assert.equal(data.campaigns[0].description, "Saved description");
  assert.deepEqual(data.campaigns[0].goals, ["Stay connected"]);
  f.tables.campaigns[0].status = "queued";
  f.tables.campaign_recipients = [];
  data = await (await route.GET(request, {})).json();
  assert.equal(data.campaigns[0].status, "queued");
  assert.equal(data.campaigns[0].enrollmentCount, 0);
});

test("existing builder template action saves draft without enrollment or schedule execution", async () => {
  const f = fixture();
  f.tables.campaigns = [];
  const body = {
    action: "template",
    campaign: {
      id: "draft-qa",
      name: "Imported draft",
      description: "Saved text",
      audience: "Selected contacts",
      durationDays: 1,
      provider: "mock",
      steps: [
        {
          id: "step1",
          order: 1,
          type: "email",
          title: "Subject",
          description: "Message",
          delayMinutes: 0,
        },
      ],
    },
  };
  const res = await f.load("app/api/campaigns/builder/route.ts").POST(
    new Request("http://qa/api/campaigns/builder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    {},
  );
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.data.status, "draft");
  assert.equal(f.tables.campaigns[0].owner_id, "a");
  assert.equal(f.tables.campaigns[0].provider, "mock");
  assert.equal(f.tables.campaigns[0].status, "draft");
  assert.equal(f.calls.filter((c) => c.service === "persistSteps").length, 1);
});

test("incomplete pages and duplicate primary keys fail closed", async () => {
  const f = fixture();
  f.wrongCount(1);
  let result = await f
    .load("app/api/campaigns/library/route.ts")
    .GET(request, {});
  assert.equal(result.status, 503);
  f.wrongCount(0);
  f.tables.campaigns.push({ ...f.tables.campaigns[0] });
  result = await f.load("app/api/campaigns/library/route.ts").GET(request, {});
  assert.equal(result.status, 503);
});

test('installing an existing playbook reports existing state without changing live execution',async()=>{const f=fixture();f.tables.campaigns[0].name='Cold Lead Re-engagement';f.tables.campaigns[0].status='sending';const route=f.load('app/api/campaigns/from-template/route.ts');const res=await route.POST(new Request('http://qa/api/campaigns/from-template',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({templateKey:'cold-lead-reengage',createAutomation:false})}),{});const json=await res.json();assert.equal(json.alreadyExisted,true);assert.equal(f.tables.campaigns[0].status,'sending');assert.equal(f.calls.some(c=>c.service==='persistSteps'),false);});
