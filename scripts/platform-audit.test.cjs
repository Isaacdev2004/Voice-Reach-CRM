const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, owner } = require("./campaign-audit/harness.cjs");

test("unexpected API exceptions and logs do not disclose credentials or customer payloads", async () => {
  const f = fixture(),
    { withApiHandler } = f.load("lib/api-response.ts");
  const logs = [],
    prior = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const response = await withApiHandler(async () => {
      throw Error("sk_test_secret private@example.test");
    })(new Request("https://qa.test"), {});
    assert.equal(response.status, 500);
    const body = await response.text();
    assert.ok(body.includes("internal_error"));
    assert.ok(!/sk_test|private@example/.test(body + JSON.stringify(logs)));
  } finally {
    console.error = prior;
  }
});

test("malformed JSON is safely handled and authentication stays enforced", async () => {
  const { withApiHandler } = fixture().load("lib/api-response.ts");
  const bad = await withApiHandler(async (request) => {
    await request.json();
  })(new Request("https://qa.test", { method: "POST", body: "{" }), {});
  assert.equal(bad.status, 500);
  assert.equal((await bad.json()).code, "internal_error");
  assert.equal(
    (
      await withApiHandler(async () => {
        throw Error("Unauthorized");
      })(new Request("https://qa.test"), {})
    ).status,
    401,
  );
});

test("database health requires authentication, uses tenant scope and never returns host details", async () => {
  const f = fixture();
  const route = f.load("app/api/health/db/route.ts");
  const old = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic-db.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
  try {
    f.actor(null);
    assert.equal(
      (await route.GET(new Request("https://qa.test"), {})).status,
      401,
    );
    f.actor(owner);
    const response = await route.GET(new Request("https://qa.test"), {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).urlHost, undefined);
    assert.ok(
      f.calls.some(
        (c) =>
          c.table === "contacts" &&
          c.filter === "owner_id" &&
          c.value === owner,
      ),
    );
  } finally {
    for (const [key, value] of Object.entries({
      NEXT_PUBLIC_SUPABASE_URL: old.url,
      SUPABASE_SERVICE_ROLE_KEY: old.key,
    }))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});

test("contact delivery failure hides provider body and uses a bounded request", async () => {
  const f = fixture(),
    oldFetch = global.fetch,
    oldKey = process.env.RESEND_API_KEY,
    oldFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "synthetic";
  process.env.RESEND_FROM_EMAIL = "qa@example.test";
  global.fetch = async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    return new Response("provider-secret private@example.test", {
      status: 502,
    });
  };
  try {
    const response = await f
      .load("app/api/contact/route.ts")
      .POST(
        new Request("https://qa.test", {
          method: "POST",
          body: JSON.stringify({
            name: "QA",
            email: "qa@example.test",
            subject: "Question",
            message: "Test only",
          }),
        }),
        {},
      );
    assert.equal(response.status, 502);
    assert.ok(!/provider-secret|private@example/.test(await response.text()));
  } finally {
    global.fetch = oldFetch;
    for (const [k, v] of Object.entries({
      RESEND_API_KEY: oldKey,
      RESEND_FROM_EMAIL: oldFrom,
    }))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});

test("template fallback does not invent verified engagement or prior contact", async () => {
  const f = fixture(),
    key = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const { generate } = f.load("lib/ai/generate.ts");
    const a = await generate("follow_up", {});
    assert.equal(a.provider, "template");
    assert.match(a.output.reason, /No engagement history/);
    const b = await generate("email_writer", {});
    assert.ok(!b.output.body.includes("great connecting recently"));
  } finally {
    if (key !== undefined) process.env.ANTHROPIC_API_KEY = key;
  }
});

test("partner invitations and shares reject foreign references before any write", async () => {
  const f = fixture();
  f.tables.partner_workspaces = [
    { id: "00000000-0000-4000-8000-000000000101", owner_id: owner },
    { id: "00000000-0000-4000-8000-000000000102", owner_id: "foreign" },
  ];
  f.tables.partner_invitations = [];
  f.tables.partner_shared_assets = [];
  f.tables.campaigns = [
    { id: "00000000-0000-4000-8000-000000000103", owner_id: "foreign" },
    { id: "00000000-0000-4000-8000-000000000104", owner_id: owner },
  ];
  const call = (route, body) =>
    f
      .load(route)
      .POST(
        new Request("https://qa.test", {
          method: "POST",
          body: JSON.stringify(body),
        }),
        {},
      );
  assert.equal(
    (
      await call("app/api/partners/invitations/route.ts", {
        partnerId: f.tables.partner_workspaces[1].id,
        email: "qa@example.test",
      })
    ).status,
    404,
  );
  assert.equal(f.tables.partner_invitations.length, 0);
  assert.equal(
    (
      await call("app/api/partners/shared-assets/route.ts", {
        partnerId: f.tables.partner_workspaces[0].id,
        assetType: "campaign",
        assetId: f.tables.campaigns[0].id,
      })
    ).status,
    404,
  );
  assert.equal(f.tables.partner_shared_assets.length, 0);
  assert.equal(
    (
      await call("app/api/partners/shared-assets/route.ts", {
        partnerId: f.tables.partner_workspaces[0].id,
        assetType: "campaign",
        assetId: f.tables.campaigns[1].id,
      })
    ).status,
    200,
  );
  assert.equal(f.tables.partner_shared_assets[0].owner_id, owner);
});

test("health does not advertise live sending while the outbound kill switch is off", async () => {
  const f = fixture(),
    old = process.env.ALLOW_LIVE_OUTBOUND;
  process.env.ALLOW_LIVE_OUTBOUND = "false";
  try {
    const r = await f
      .load("app/api/health/route.ts")
      .GET(new Request("https://qa.test"), {});
    assert.equal((await r.json()).liveSending, false);
  } finally {
    if (old === undefined) delete process.env.ALLOW_LIVE_OUTBOUND;
    else process.env.ALLOW_LIVE_OUTBOUND = old;
  }
});

test("past-due or incomplete Stripe subscriptions are not mislabeled canceled", async () => {
  const f = fixture();
  f.tables.audit_logs = [
    {
      id: "mapped",
      owner_id: owner,
      entity_type: "billing",
      action: "STRIPE_CUSTOMER",
      created_at: "2026-10-23",
      metadata: { customerId: "cus_qa" },
    },
  ];
  let status = "past_due";
  f.stubs["@/lib/stripe/config"] = {
    isStripeConfigured: () => true,
    getStripe: () => ({
      customers: {
        retrieve: async () => ({ id: "cus_qa", metadata: { ownerId: owner } }),
      },
      subscriptions: {
        list: async () => ({ has_more: false, data: [{ status }] }),
      },
    }),
  };
  const { readSubscriptionStatus } = f.load("lib/billing/read-subscription.ts");
  for (status of ["past_due", "incomplete", "unpaid"])
    assert.deepEqual(await readSubscriptionStatus(owner), {
      verified: false,
      status: "none",
    });
  status = "canceled";
  assert.equal((await readSubscriptionStatus(owner)).status, "canceled");
});

test("Stripe error text is not exposed and idempotency exceptions are not claimed as successful charges", async () => {
  const f = fixture();
  f.stubs["@/lib/billing/plan-limits"] = {
    resolveOwnerPlan: async () => ({ smsIncluded: 0, rvmIncluded: 0 }),
  };
  f.stubs["@/lib/billing/settings-store"] = {
    loadStripeCustomerId: async () => "cus_qa",
  };
  f.stubs["@/lib/stripe/config"] = {
    isStripeConfigured: () => true,
    getStripe: () => ({
      invoiceItems: {
        create: async () => {
          throw Error("idempotent collision sk_test_secret");
        },
      },
    }),
  };
  const r = await f
    .load("lib/billing/payg-usage.ts")
    .billPaygUsage({
      ownerId: owner,
      channel: "sms",
      idempotencyKey: "synthetic",
    });
  assert.equal(r.billed, false);
  assert.ok(!JSON.stringify(r).includes("sk_test"));
  assert.ok(
    !f
      .load("lib/billing/stripe-checkout.ts")
      .stripeMessage(Error("sk_test_secret"))
      .includes("sk_test"),
  );
});
