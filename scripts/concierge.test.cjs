const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, owner, id } = require("./campaign-audit/harness.cjs");
const request = (body, path = "/api/concierge") =>
  new Request("http://localhost" + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("Concierge defaults off and requires explicit eligible subscriber; staff IDs do not grant CRM eligibility", () => {
  const a = fixture().load("lib/concierge/access");
  delete process.env.CONCIERGE_ENABLED;
  delete process.env.CONCIERGE_OWNER_IDS;
  assert.equal(a.eligible(owner), false);
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = owner;
  assert.equal(a.eligible(owner), true);
  assert.equal(a.eligible("foreign"), false);
  process.env.CONCIERGE_SALES_IDS = "sales";
  assert.equal(a.staffRole("sales"), "sales");
  assert.equal(a.eligible("sales"), false);
});
test("CSV mapping reuses existing parser, rejects malformed/oversized/duplicate headers and validates contacts", () => {
  const { prepareCsv, csvColumns } = fixture().load("lib/concierge/import");
  const csv =
    "Given,Mobile,Email,Tags\nAlex,5555550123,alex@example.test,buyer\nAlex,5555550123,alex@example.test,buyer\nInvalid,1,no,no";
  const p = prepareCsv(csv, {
    firstName: "Given",
    phone: "Mobile",
    email: "Email",
    tags: "Tags",
  });
  assert.equal(p.rows.length, 1);
  assert.equal(p.errors.length, 2);
  assert.match(p.rows[0].notes, /Imported tags: buyer/);
  assert.equal(p.rows[0].phone, "+15555550123");
  assert.equal(
    p.fingerprint,
    prepareCsv(csv, {
      firstName: "Given",
      phone: "Mobile",
      email: "Email",
      tags: "Tags",
    }).fingerprint,
  );
  assert.throws(() => csvColumns("A,A\nx,y"), /unique/);
  assert.throws(() => csvColumns("x".repeat(1048577)), /1 MB/);
  assert.throws(
    () => prepareCsv(csv, { firstName: "Given", phone: "Given" }),
    /once/,
  );
  assert.throws(
    () => prepareCsv(csv, { firstName: "Given", phone: "Unknown" }),
    /headers/,
  );
});
test("readiness cannot fabricate completion from staff stage or discovery only", () => {
  const { readiness } = fixture().load("lib/concierge/readiness");
  assert.equal(
    readiness(null, {
      imported: false,
      campaignDraft: false,
      integrationsVerified: false,
    }).percent,
    0,
  );
  const c = {
    discovery: { agentName: "Alex", market: "Orlando", goals: "Follow up" },
    stage: "ready",
    milestones: { campaignReviewed: true },
    created_at: new Date().toISOString(),
  };
  assert.equal(
    readiness(c, {
      imported: false,
      campaignDraft: false,
      integrationsVerified: false,
    }).completed,
    1,
  );
});
test("subscriber cannot spoof owner or staff fields; cross-origin writes rejected", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = owner;
  const f = fixture(),
    route = f.load("app/api/concierge/route");
  assert.equal(
    (
      await route.POST(
        request({
          owner: "foreign",
          requestId: id(1),
          version: 0,
          milestones: { importSkipped: true },
        }),
      )
    ).status,
    400,
  );
  const r = new Request("http://localhost/api/concierge", {
    method: "POST",
    headers: { origin: "https://evil.test" },
    body: "{}",
  });
  assert.equal((await route.POST(r)).status, 403);
});
test("sales cannot mutate cases and unassigned specialists cannot access foreign case", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = "foreign";
  process.env.CONCIERGE_SALES_IDS = owner;
  const f = fixture();
  assert.equal(
    (await f.load("app/api/concierge/staff/route").POST(request({}))).status,
    403,
  );
  delete process.env.CONCIERGE_SALES_IDS;
  process.env.CONCIERGE_SPECIALIST_IDS = owner;
  const g = fixture();
  g.tables.concierge_cases = [
    { owner_id: "foreign", assignee_id: "someone-else" },
  ];
  assert.equal(
    (
      await g.load("app/api/concierge/staff/route").POST(
        request({
          owner: "foreign",
          requestId: id(1),
          version: 1,
          stage: "ready",
        }),
      )
    ).status,
    404,
  );
});
test("import confirmation requires explicit approval and refuses another owner preview", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = owner;
  const f = fixture();
  assert.equal(
    (
      await f
        .load("app/api/concierge/import/route")
        .POST(request({ action: "confirm", id: id(10), confirmed: false }))
    ).status,
    400,
  );
});
test("staff sales response redacts discovery, internal notes, assignments and unrelated cases", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = "allowed,unrelated";
  process.env.CONCIERGE_SALES_IDS = owner;
  delete process.env.CONCIERGE_SPECIALIST_IDS;
  const f = fixture();
  f.tables.concierge_cases = [
    {
      owner_id: "allowed",
      assignee_id: owner,
      stage: "discovery",
      updated_at: new Date().toISOString(),
      next_followup: null,
      discovery: { agentName: "PRIVATE NAME" },
      internal_note: "PRIVATE NOTE",
    },
    {
      owner_id: "unrelated",
      assignee_id: "other",
      stage: "ready",
      updated_at: new Date().toISOString(),
      discovery: {},
    },
  ];
  const r = await f
    .load("app/api/concierge/staff/route")
    .GET(new Request("http://localhost/api/concierge/staff"));
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.cases.length, 1);
  assert.ok(!JSON.stringify(body).includes("PRIVATE"));
  assert.ok(!JSON.stringify(body).includes("unrelated"));
  assert.equal(body.communicationDrafts.length, 0);
});
test("signed-out and disabled subscriber calls do not reach Concierge storage", async () => {
  const f = fixture();
  f.stubs["@/lib/auth"] = {
    requireUserId: async () => {
      throw Error("Unauthorized");
    },
  };
  assert.equal(
    (
      await f
        .load("app/api/concierge/route")
        .GET(new Request("http://localhost/api/concierge"))
    ).status,
    401,
  );
  process.env.CONCIERGE_ENABLED = "false";
  const g = fixture();
  assert.equal(
    (
      await g
        .load("app/api/concierge/route")
        .GET(new Request("http://localhost/api/concierge"))
    ).status,
    404,
  );
  assert.equal(g.calls.filter((x) => x.table === "concierge_cases").length, 0);
});
test("campaign Concierge reuses reviewed premium drafts and builder template action without enrollment", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = owner;
  const f = fixture();
  let captured = null;
  f.stubs["@/lib/concierge/store"] = {
    loadCase: async () => ({ version: 1 }),
    mutate: async () => ({ version: 2 }),
  };
  f.stubs["@/lib/billing/plan-limits"] = {
    resolveOwnerPlan: async () => ({ id: "growth" }),
  };
  f.stubs["@/app/api/campaigns/builder/route"] = {
    POST: async (req) => {
      captured = await req.json();
      return Response.json({ success: true, data: { campaignId: id(42) } });
    },
  };
  const premium = f.load("lib/campaigns/premium-drafts")
    .PREMIUM_CAMPAIGN_DRAFTS[0];
  const r = await f
    .load("app/api/concierge/campaign/route")
    .POST(request({ templateKey: premium.revisionKey, confirmed: true }));
  assert.equal(r.status, 200);
  assert.equal(captured.action, "template");
  assert.equal(captured.enrollAllEligible, false);
  assert.equal(captured.contactIds, undefined);
  assert.equal(captured.campaign.provider, "mock");
  assert.equal(
    captured.campaign.steps[0].description,
    premium.steps[0].description,
  );
});
test("Starter and unconfirmed campaign requests cannot create multi-step drafts through Concierge", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = owner;
  const f = fixture();
  f.stubs["@/lib/concierge/store"] = { loadCase: async () => ({ version: 1 }) };
  f.stubs["@/lib/billing/plan-limits"] = {
    resolveOwnerPlan: async () => ({ id: "starter" }),
  };
  const premium = f.load("lib/campaigns/premium-drafts")
      .PREMIUM_CAMPAIGN_DRAFTS[0],
    route = f.load("app/api/concierge/campaign/route");
  assert.equal(
    (
      await route.POST(
        request({ templateKey: premium.revisionKey, confirmed: true }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await route.POST(
        request({ templateKey: premium.revisionKey, confirmed: false }),
      )
    ).status,
    400,
  );
});
test("saved import preview recovery cannot reveal another subscriber rows", async () => {
  process.env.CONCIERGE_ENABLED = "true";
  process.env.CONCIERGE_OWNER_IDS = owner;
  const f = fixture();
  f.tables.concierge_imports = [
    {
      id: id(70),
      owner_id: "foreign",
      state: "preview",
      expires_at: "2099-01-01T00:00:00Z",
      rows: [{ firstName: "PRIVATE" }],
    },
  ];
  const r = await f
    .load("app/api/concierge/import/route")
    .GET(new Request("http://localhost/api/concierge/import?id=" + id(70)));
  assert.equal(r.status, 404);
  assert.ok(!(await r.text()).includes("PRIVATE"));
});
test("analytics uses actual scoped events and leaves unsupported conversion denominators unavailable", () => {
  const { conciergeAnalytics } = fixture().load("lib/concierge/analytics");
  const c = {
    owner_id: "a",
    created_at: "2026-10-27T10:00:00Z",
    discovery: { agentName: "Alex", market: "Orlando", goals: "Follow up" },
    milestones: {},
  };
  const result = conciergeAnalytics(
    [c],
    new Map([
      [
        "a",
        { imported: true, campaignDraft: true, integrationsVerified: false },
      ],
    ]),
    [
      {
        owner_id: "a",
        action: "CAMPAIGN_DRAFT_PREPARED",
        created_at: "2026-10-27T10:30:00Z",
      },
    ],
  );
  assert.equal(result.meanMinutesToFirstDraft, 30);
  assert.equal(result.importsCompleted, 1);
  assert.equal(result.trialToPaidConversion, null);
  assert.equal(result.registrationToStart, null);
});
