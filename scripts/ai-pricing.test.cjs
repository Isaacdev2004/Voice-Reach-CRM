const test = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
const env = (values) => {
  const old = {};
  for (const [k, v] of Object.entries(values)) {
    old[k] = process.env[k];
    if (v === null) delete process.env[k];
    else process.env[k] = String(v);
  }
  return () => {
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
};
function setup() {
  const f = fixture();
  f.tables.ai_usage_accounts = [];
  f.tables.ai_usage_operations = [];
  f.tables.ai_usage_adjustments = [];
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => ({
    data: 1,
    error: null,
  });
  f.tables.audit_logs.push({
    id: id(500),
    owner_id: owner,
    entity_type: "billing",
    action: "STRIPE_CUSTOMER",
    created_at: new Date().toISOString(),
    metadata: { customerId: "cus_synthetic" },
  });
  return f;
}
const prices = {
  STRIPE_PRICE_STARTER_AI_MONTHLY: "price_starter_ai",
  STRIPE_PRICE_GROWTH_AI_MONTHLY: "price_growth_ai",
  STRIPE_PRICE_PRO_AI_MONTHLY: "price_pro_ai",
  STRIPE_PRICE_AI_PRO_MONTHLY: "price_ai_pro",
};
function subscription(plan = "starter", addon = false) {
  return {
    id: "sub_synthetic",
    metadata: { ownerId: owner, planId: plan },
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          id: "si_base",
          quantity: 1,
          current_period_start: Math.floor(Date.now() / 1000) - 100,
          current_period_end: Math.floor(Date.now() / 1000) + 2591900,
          price: {
            id: prices[`STRIPE_PRICE_${plan.toUpperCase()}_AI_MONTHLY`],
            active: true,
            livemode: false,
            currency: "usd",
            unit_amount: { starter: 65, growth: 115, pro: 215 }[plan] * 100,
            recurring: { interval: "month", interval_count: 1 },
          },
        },
        ...(addon
          ? [
              {
                id: "si_addon",
                quantity: 1,
                price: {
                  id: "price_ai_pro",
                  unit_amount: 2000,
                  currency: "usd",
                  recurring: { interval: "month", interval_count: 1 },
                },
              },
            ]
          : []),
      ],
    },
  };
}
function stripeMock(f, sub = subscription()) {
  const client = {
    customers: {
      retrieve: async () => ({
        id: "cus_synthetic",
        metadata: { ownerId: owner },
      }),
      create: async () => ({ id: "cus_synthetic" }),
    },
    subscriptions: {
      list: async () => ({ has_more: false, data: [sub] }),
      retrieve: async () => sub,
      update: async () => ({
        ...sub,
        items: subscription("starter", true).items,
      }),
    },
    prices: {
      retrieve: async (id) => {
        for (const plan of ["starter", "growth", "pro"]) {
          const s = subscription(plan);
          if (s.items.data[0].price.id === id) return s.items.data[0].price;
        }
        return {
          id,
          active: true,
          livemode: false,
          currency: "usd",
          unit_amount: 2000,
          recurring: { interval: "month", interval_count: 1 },
        };
      },
    },
    invoices: {
      createPreview: async () => ({ currency: "usd", amount_due: 1200 }),
    },
    checkout: {
      sessions: {
        list: async () => ({ data: [], has_more: false }),
        create: async () => ({
          id: "cs_synthetic",
          url: "https://checkout.stripe.com/c/pay_synthetic",
        }),
      },
    },
  };
  f.stubs["@/lib/stripe/config"] = {
    getStripe: () => client,
    isStripeConfigured: () => true,
    appBaseUrl: () => "https://example.test",
  };
  return client;
}
const launch = (now = new Date()) => ({
  approved: true,
  start: new Date(+now - 86400000).toISOString(),
  end: new Date(+now + 89 * 86400000).toISOString(),
  eligiblePlans: ["starter", "growth", "pro"],
  eligibleOwnerIds: [owner],
  allNewSubscribers: false,
  grandfatheringTerms:
    "Approved launch prices continue while continuously subscribed under approved terms.",
  postLaunchPrices: null,
  regularPricesApproved: false,
});
test("new catalog preserves corresponding CRM tiers, old prices and exact Plus/Pro allowances", () => {
  const f = setup(),
    c = f.load("lib/billing/ai/catalog.ts");
  assert.deepEqual(
    c.AI_LAUNCH_PLANS.map((p) => p.monthly),
    [65, 115, 215],
  );
  assert.equal(c.AI_PRO_ADDON_MONTHLY, 20);
  assert.equal(c.underlyingCrm("starter").price, 49);
  assert.equal(c.underlyingCrm("starter").contactLimit, 1000);
  assert.equal(c.underlyingCrm("pro").usersIncluded, 3);
  assert.equal(c.AI_LIMITS.plus.requests, 200);
  assert.equal(c.AI_LIMITS.pro.requests, 600);
  assert.equal(c.AI_LIMITS.plus.transcription_seconds, 1800);
  assert.equal(c.AI_LIMITS.pro.sapphire_seconds, 1200);
  assert.equal(c.AI_MONITORING_THRESHOLDS.plus, 5);
});
test("launch requires explicit approved dates, exact 90 days, eligibility and no existing subscription", () => {
  const restore = env({
    MYARI_AI_PRICING_ENABLED: "true",
    MYARI_AI_LAUNCH_CONFIG: JSON.stringify(launch()),
  });
  try {
    const l = setup().load("lib/billing/ai/launch.ts");
    assert.equal(l.launchEligibility(owner, false).eligible, true);
    assert.equal(l.launchEligibility("foreign", false).eligible, false);
    assert.equal(l.launchEligibility(owner, true).eligible, false);
    assert.equal(
      l.launchEligibility(owner, false, new Date(Date.now() + 100 * 86400000))
        .eligible,
      false,
    );
    process.env.MYARI_AI_LAUNCH_CONFIG = JSON.stringify({
      ...launch(),
      approved: false,
    });
    assert.equal(l.launchEligibility(owner, false).eligible, false);
    process.env.MYARI_AI_LAUNCH_CONFIG = JSON.stringify({
      ...launch(),
      end: new Date().toISOString(),
    });
    assert.equal(l.launchConfig(), null);
  } finally {
    restore();
  }
});
test("public pricing remains off until separate public, database, entitlement and launch gates pass", () => {
  const restore = env({
    MYARI_AI_PRICING_ENABLED: "true",
    MYARI_AI_LAUNCH_CONFIG: JSON.stringify({
      ...launch(),
      allNewSubscribers: true,
    }),
    MYARI_AI_PUBLIC_LAUNCH_VERIFIED: null,
    MYARI_AI_STRIPE_MODE: null,
    MYARI_AI_BILLING_LIVE_APPROVED: null,
    MYARI_AI_BILLING_ENABLED: null,
    MYARI_AI_ENTITLEMENTS_ENABLED: null,
    MYARI_AI_METER_DATABASE_VERIFIED: null,
  });
  try {
    const l = setup().load("lib/billing/ai/launch.ts");
    assert.equal(l.publicAiLaunch(), null);
    process.env.MYARI_AI_PUBLIC_LAUNCH_VERIFIED = "true";
    process.env.MYARI_AI_STRIPE_MODE = "live";
    process.env.MYARI_AI_BILLING_LIVE_APPROVED = "true";
    process.env.MYARI_AI_BILLING_ENABLED = "true";
    process.env.MYARI_AI_ENTITLEMENTS_ENABLED = "true";
    process.env.MYARI_AI_METER_DATABASE_VERIFIED = "true";
    assert.equal(l.publicAiLaunch().plans.length, 3);
  } finally {
    restore();
  }
});
for (const plan of ["starter", "growth", "pro"])
  test(`authoritative ${plan} AI subscription grants Plus without changing CRM tier`, () => {
    const restore = env(prices);
    try {
      const e = setup()
        .load("lib/billing/ai/entitlements.ts")
        .entitlementFromSubscription(subscription(plan), owner);
      assert.equal(e.tier, "plus");
      assert.equal(e.crmPlan, plan);
      assert.ok(e.periodEnd);
    } finally {
      restore();
    }
  });
test("one verified add-on grants AI Pro; duplicates, quantity changes and wrong price/owner do not", () => {
  const restore = env(prices);
  try {
    const fn = setup().load(
        "lib/billing/ai/entitlements.ts",
      ).entitlementFromSubscription,
      s = subscription("starter", true);
    assert.equal(fn(s, owner).tier, "pro");
    assert.equal(fn(s, "foreign").tier, null);
    s.items.data.push(s.items.data[1]);
    assert.equal(fn(s, owner).tier, null);
    const wrong = subscription();
    wrong.items.data[0].price.unit_amount = 49 * 100;
    assert.equal(fn(wrong, owner).tier, null);
    wrong.items.data[0].quantity = 5;
    assert.equal(fn(wrong, owner).tier, null);
  } finally {
    restore();
  }
});
test("trialing grants verified allowance; failed payment, paused, canceled and legacy prices do not grant AI", () => {
  const restore = env(prices);
  try {
    const fn = setup().load(
      "lib/billing/ai/entitlements.ts",
    ).entitlementFromSubscription;
    for (const status of [
      "trialing",
      "past_due",
      "unpaid",
      "paused",
      "canceled",
    ]) {
      const s = subscription();
      s.status = status;
      assert.equal(fn(s, owner).tier, status === "trialing" ? "plus" : null);
    }
    const legacy = subscription();
    legacy.items.data[0].price.id = "price_legacy_49";
    assert.equal(fn(legacy, owner).tier, null);
  } finally {
    restore();
  }
});
test("actual billing periods define reset keys across renewal", () => {
  const restore = env(prices);
  try {
    const fn = setup().load(
        "lib/billing/ai/entitlements.ts",
      ).entitlementFromSubscription,
      a = subscription(),
      b = subscription();
    b.items.data[0].current_period_start += 2592000;
    b.items.data[0].current_period_end += 2592000;
    assert.notEqual(fn(a, owner).periodStart, fn(b, owner).periodStart);
  } finally {
    restore();
  }
});
test("meter uses server entitlement/caps and owner, commits success, releases failure and rejects duplicate reservations", async () => {
  const f = setup(),
    restore = env({ ...prices, MYARI_AI_ENTITLEMENTS_ENABLED: "true" });
  stripeMock(f);
  const calls = [];
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, args) => {
    calls.push({ name, args });
    return { data: { fresh: true }, error: null };
  };
  try {
    const m = f.load("lib/billing/ai/meter.ts");
    assert.equal(
      await m.meteredAi(owner, "requests", "synthetic", async () => 42),
      42,
    );
    assert.equal(calls[0].args.p_limit, 200);
    assert.equal(calls[0].args.p_owner, owner);
    assert.equal(calls[1].args.p_delivered, true);
    await assert.rejects(
      m.meteredAi(owner, "tasks", "failed", async () => {
        throw Error("mock");
      }),
    );
    assert.equal(calls.at(-1).args.p_delivered, false);
    f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => ({
      data: { fresh: false },
      error: null,
    });
    await assert.rejects(
      m.reserveAi(owner, "requests", "same"),
      /already exists/,
    );
  } finally {
    restore();
  }
});
test("missing meter schema and hard quota exhaustion fail closed before operation runs", async () => {
  const f = setup(),
    restore = env({ ...prices, MYARI_AI_ENTITLEMENTS_ENABLED: "true" });
  stripeMock(f);
  let ran = false;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => ({
    data: null,
    error: { message: "AI_LIMIT" },
  });
  try {
    const m = f.load("lib/billing/ai/meter.ts");
    await assert.rejects(
      m.meteredAi(owner, "documents", "blocked", async () => {
        ran = true;
      }),
      /allowance reached/,
    );
    assert.equal(ran, false);
    f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => ({
      data: null,
      error: { message: "function missing" },
    });
    await assert.rejects(
      m.reserveAi(owner, "requests", "missing"),
      /unavailable/,
    );
  } finally {
    restore();
  }
});
test("subscriber usage reports actual 80%/100% states and excludes other subscriber counters", async () => {
  const f = setup(),
    restore = env(prices);
  stripeMock(f);
  const period = new Date(
    subscription().items.data[0].current_period_start * 1000,
  ).toISOString();
  f.tables.ai_usage_accounts.push(
    {
      id: id(20),
      owner_id: owner,
      period_start: period,
      capability: "requests",
      used: 160,
      reserved: 0,
    },
    {
      id: id(21),
      owner_id: "foreign",
      period_start: period,
      capability: "requests",
      used: 200,
      reserved: 0,
    },
    {
      id: id(22),
      owner_id: owner,
      period_start: period,
      capability: "message_drafts",
      used: 100,
      reserved: 0,
    },
  );
  try {
    const r = await f
        .load("app/api/billing/ai/usage/route.ts")
        .GET(new Request("http://qa/api/billing/ai/usage"), undefined),
      d = await r.json();
    assert.equal(
      d.usage.find((x) => x.capability === "requests").state,
      "near_limit",
    );
    assert.equal(d.usage.find((x) => x.capability === "requests").used, 160);
    assert.equal(
      d.usage.find((x) => x.capability === "message_drafts").state,
      "limit_reached",
    );
  } finally {
    restore();
  }
});
test("test-mode checkout verifies the exact price and never uses inline products or duplicate subscriptions", async () => {
  const f = setup(),
    restore = env({
      ...prices,
      MYARI_AI_BILLING_ENABLED: "true",
      MYARI_AI_ENTITLEMENTS_ENABLED: "true",
      MYARI_AI_METER_DATABASE_VERIFIED: "true",
      STRIPE_SECRET_KEY: "sk_test_synthetic",
      MYARI_AI_PRICING_ENABLED: "true",
      MYARI_AI_LAUNCH_CONFIG: JSON.stringify(launch()),
    }),
    stripe = stripeMock(f);
  let captured;
  stripe.subscriptions.list = async () => ({ data: [], has_more: false });
  stripe.checkout.sessions.create = async (data, options) => {
    captured = { data, options };
    return { url: "https://checkout.stripe.com/c/pay_synthetic" };
  };
  try {
    const api = f.load("lib/billing/ai/stripe.ts");
    await api.newAiCheckout(owner, "starter", id(31));
    assert.equal(captured.data.line_items[0].price, "price_starter_ai");
    assert.equal(captured.data.line_items[0].price_data, undefined);
    assert.equal(
      captured.data.subscription_data.trial_settings.end_behavior
        .missing_payment_method,
      "pause",
    );
    assert.match(captured.options.idempotencyKey, /ai-launch-v1/);
    stripe.subscriptions.list = async () => ({
      data: [subscription()],
      has_more: false,
    });
    await assert.rejects(
      api.newAiCheckout(owner, "starter", id(32)),
      /preserved/,
    );
  } finally {
    restore();
  }
});
test("AI Pro quote requires policy; confirmation is idempotent and never duplicates an add-on", async () => {
  const f = setup(),
    restore = env({
      ...prices,
      MYARI_AI_BILLING_ENABLED: "true",
      MYARI_AI_ENTITLEMENTS_ENABLED: "true",
      MYARI_AI_METER_DATABASE_VERIFIED: "true",
      MYARI_AI_ADDON_BILLING_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_synthetic",
      MYARI_AI_ADDON_PRORATION: "create_prorations",
    }),
    stripe = stripeMock(f);
  let updates = 0,
    current = subscription();
  stripe.subscriptions.retrieve = async () => current;
  stripe.subscriptions.list = async () => ({
    data: [current],
    has_more: false,
  });
  stripe.subscriptions.update = async (_id, p, options) => {
    updates++;
    assert.equal(p.items.length, 1);
    assert.equal(p.items[0].quantity, 1);
    assert.ok(options.idempotencyKey);
    current = subscription("starter", true);
    return current;
  };
  try {
    const api = f.load("lib/billing/ai/stripe.ts"),
      q = await api.previewAiPro(owner);
    assert.equal(updates, 0);
    await api.approveAiPro(owner, q.quoteId, q.digest);
    assert.equal(updates, 1);
    assert.equal(
      (await api.approveAiPro(owner, q.quoteId, q.digest)).alreadyActive,
      true,
    );
    assert.equal(updates, 1);
  } finally {
    restore();
  }
});
test("admin reporting/adjustment scope cannot be granted from frontend fields", () => {
  const f = setup(),
    restore = env({
      MYARI_AI_ADMIN_OWNER_IDS: "authorized-admin",
      MYARI_AI_ADMIN_REPORT_OWNER_IDS: owner,
    });
  try {
    const a = f.load("lib/billing/ai/admin.ts");
    assert.throws(() => a.requireAiAdmin(owner));
    assert.throws(() => a.requireAiAdmin("authorized-admin", "foreign"));
    assert.deepEqual(a.requireAiAdmin("authorized-admin", owner), [owner]);
  } finally {
    restore();
  }
});
test("PCM WAV usage is based on validated frames; client duration and malformed/compressed data cannot spoof units", () => {
  const fn = setup().load("lib/assistant/audio.ts").wavSeconds,
    b = Buffer.alloc(44 + 16000 * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(32000, 40);
  assert.equal(fn(b), 1);
  b.writeUInt32LE(1, 28);
  assert.throws(() => fn(b));
  assert.throws(() => fn(Buffer.from("fake-audio")));
});

test("Stripe mode is checked against the authoritative price before billing writes", async () => {
  const restore = env({ MYARI_AI_STRIPE_MODE: "test" });
  try {
    const f = setup();
    const client = stripeMock(f);
    client.prices.retrieve = async () => ({
      id: "price_synthetic",
      active: true,
      livemode: true,
      currency: "usd",
      unit_amount: 6500,
      recurring: { interval: "month", interval_count: 1 },
    });
    await assert.rejects(
      () =>
        f.load("lib/billing/ai/stripe.ts").verifyAiPrice("price_synthetic", 65),
      /mode does not match/,
    );
  } finally {
    restore();
  }
});
