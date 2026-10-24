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
  STRIPE_PRICE_STARTER: "price_starter_crm",
  STRIPE_PRICE_GROWTH: "price_growth_crm",
  STRIPE_PRICE_PRO: "price_pro_crm",
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
  assert.equal(c.AI_PLUS_MONTHLY_DIFFERENCE, 16);
  assert.equal(c.AI_PRO_ADDON_MONTHLY, undefined);
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
test("AI base always includes Plus; retired add-on never grants a second AI tier", () => {
  const restore = env(prices);
  try {
    const fn = setup().load(
      "lib/billing/ai/entitlements.ts",
    ).entitlementFromSubscription;
    const s = subscription("starter", true);
    assert.equal(fn(s, owner).tier, "plus");
    assert.match(fn(s, owner).reason, /Historical/);
    assert.equal(fn(s, "foreign").tier, null);
    const doubled = subscription();
    doubled.items.data.push({
      ...subscription().items.data[0],
      id: "si_second",
    });
    assert.equal(fn(doubled, owner).tier, null);
    const wrong = subscription();
    wrong.items.data[0].price.unit_amount = 4900;
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
    assert.equal(
      captured.options.idempotencyKey,
      "myari-base-checkout-cus_synthetic",
    );
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
test("retired add-on preview, saved quote and direct approval are blocked even with old flags enabled", async () => {
  const restore = env({ ...prices, MYARI_AI_ADDON_BILLING_ENABLED: "true" });
  try {
    const f = setup();
    let writes = 0;
    const stripe = stripeMock(f);
    stripe.subscriptions.update = async () => {
      writes++;
    };
    const api = f.load("lib/billing/ai/stripe.ts");
    await assert.rejects(api.previewAiPro(owner), /discontinued/);
    await assert.rejects(
      api.approveAiPro(owner, id(30), "a".repeat(64)),
      /discontinued/,
    );
    assert.equal(writes, 0);
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

function crmSubscription(plan = "starter") {
  const s = subscription(plan);
  s.items.data[0].price = {
    ...s.items.data[0].price,
    id: prices[`STRIPE_PRICE_${plan.toUpperCase()}`],
    unit_amount: { starter: 49, growth: 99, pro: 199 }[plan] * 100,
  };
  return s;
}
function testBillingEnv() {
  return {
    ...prices,
    MYARI_AI_STRIPE_MODE: "test",
    MYARI_AI_BILLING_ENABLED: "true",
    MYARI_AI_ENTITLEMENTS_ENABLED: "true",
    MYARI_AI_METER_DATABASE_VERIFIED: "true",
    MYARI_AI_PLAN_CHANGES_ENABLED: "true",
    MYARI_AI_PLAN_CHANGE_PRORATION: "create_prorations",
    MYARI_AI_PRICING_ENABLED: "true",
    MYARI_AI_LAUNCH_CONFIG: JSON.stringify(launch()),
  };
}
function allPrices(stripe) {
  stripe.prices.retrieve = async (priceId) => {
    for (const plan of ["starter", "growth", "pro"])
      for (const s of [subscription(plan), crmSubscription(plan)])
        if (s.items.data[0].price.id === priceId) return s.items.data[0].price;
    throw Error("Unmapped synthetic price");
  };
}
for (const plan of ["starter", "growth", "pro"])
  for (const choice of ["crm", "ai"])
    test(`${plan} ${choice}: test-mode checkout has one exact base item and correct total, never an add-on`, async () => {
      const restore = env(testBillingEnv());
      try {
        const f = setup(),
          stripe = stripeMock(f);
        allPrices(stripe);
        stripe.subscriptions.list = async () => ({ data: [], has_more: false });
        let payload;
        stripe.checkout.sessions.create = async (p) => {
          payload = p;
          return { url: "https://checkout.stripe.com/c/test" };
        };
        if (choice === "ai")
          await f
            .load("lib/billing/ai/stripe.ts")
            .newAiCheckout(owner, plan, id(60));
        else
          await f
            .load("lib/billing/stripe-checkout.ts")
            .createSubscriptionSession({
              planId: plan,
              billingPeriod: "monthly",
              customerId: "cus_synthetic",
              ownerId: owner,
              successUrl: "https://example.test/ok",
              cancelUrl: "https://example.test/cancel",
            });
        const mapping = f
          .load("lib/billing/ai/choices.ts")
          .monthlyChoice(plan, choice);
        assert.equal(payload.line_items.length, 1);
        assert.equal(payload.line_items[0].price, mapping.priceId);
        assert.equal(payload.line_items[0].quantity, 1);
        const price = await stripe.prices.retrieve(payload.line_items[0].price);
        assert.equal(price.unit_amount, mapping.monthly * 100);
        assert.equal(price.livemode, false);
        assert.equal(
          f
            .load("lib/billing/ai/entitlements.ts")
            .entitlementFromSubscription(
              choice === "ai" ? subscription(plan) : crmSubscription(plan),
              owner,
            ).tier,
          choice === "ai" ? "plus" : null,
        );
      } finally {
        restore();
      }
    });
for (const plan of ["starter", "growth", "pro"])
  test(`${plan}: confirmed monthly upgrade and downgrade replace the same item with exactly $16 difference`, async () => {
    const restore = env(testBillingEnv());
    try {
      const f = setup();
      let current = crmSubscription(plan),
        updates = 0,
        invoicePayload;
      const stripe = stripeMock(f, current);
      allPrices(stripe);
      stripe.subscriptions.list = async () => ({
        data: [current],
        has_more: false,
      });
      stripe.invoices.createPreview = async (p) => {
        invoicePayload = p;
        return { currency: "usd", amount_due: 800 };
      };
      stripe.subscriptions.update = async (subId, p, o) => {
        updates++;
        assert.equal(subId, current.id);
        assert.equal(p.items.length, 1);
        assert.equal(p.items[0].id, current.items.data[0].id);
        assert.equal(p.payment_behavior, "pending_if_incomplete");
        assert.ok(o.idempotencyKey);
        assert.equal(
          p.proration_date,
          invoicePayload.subscription_details.proration_date,
        );
        current =
          p.items[0].price ===
          prices[`STRIPE_PRICE_${plan.toUpperCase()}_AI_MONTHLY`]
            ? subscription(plan)
            : crmSubscription(plan);
        return current;
      };
      const api = f.load("lib/billing/ai/plan-change.ts"),
        quote = await api.previewPlanChange(owner, "ai");
      assert.equal(quote.monthlyDifference, 16);
      assert.equal(updates, 0);
      assert.equal(
        invoicePayload.subscription_details.items[0].id,
        current.items.data[0].id,
      );
      await assert.rejects(
        api.approvePlanChange(owner, quote.quoteId, "b".repeat(64)),
        /expired or changed/,
      );
      assert.equal(updates, 0);
      await api.approvePlanChange(owner, quote.quoteId, quote.digest);
      assert.equal(updates, 1);
      assert.equal(
        f
          .load("lib/billing/ai/entitlements.ts")
          .entitlementFromSubscription(current, owner).tier,
        "plus",
      );
      await assert.rejects(
        api.approvePlanChange(owner, quote.quoteId, quote.digest),
        /changed/,
      );
      const back = await api.previewPlanChange(owner, "crm");
      assert.equal(back.monthlyDifference, -16);
      await api.approvePlanChange(owner, back.quoteId, back.digest);
      assert.equal(updates, 2);
      assert.equal(
        f
          .load("lib/billing/ai/entitlements.ts")
          .entitlementFromSubscription(current, owner).tier,
        null,
      );
      const again = await api.previewPlanChange(owner, "ai");
      await api.approvePlanChange(owner, again.quoteId, again.digest);
      assert.equal(updates, 3);
    } finally {
      restore();
    }
  });
test("annual, custom, duplicate items, pending payments/cancellation and foreign subscriptions cannot use monthly plan replacement", async () => {
  const restore = env(testBillingEnv());
  try {
    for (const edit of [
      (s) => (s.items.data[0].price.recurring.interval = "year"),
      (s) => (s.items.data[0].price.unit_amount = 3900),
      (s) => s.items.data.push(s.items.data[0]),
      (s) => (s.cancel_at_period_end = true),
      (s) => (s.pending_update = {}),
      (s) => (s.metadata.ownerId = "foreign"),
      (s) => (s.status = "past_due"),
    ]) {
      const f = setup(),
        s = crmSubscription();
      edit(s);
      const stripe = stripeMock(f, s);
      allPrices(stripe);
      await assert.rejects(
        f.load("lib/billing/ai/plan-change.ts").previewPlanChange(owner, "ai"),
      );
    }
  } finally {
    restore();
  }
});
test("duplicate CRM/AI price mappings fail closed and retired add-on cannot be mapped as AI Plus", () => {
  const restore = env({
    ...prices,
    STRIPE_PRICE_STARTER: prices.STRIPE_PRICE_STARTER_AI_MONTHLY,
  });
  try {
    const f = setup();
    assert.equal(
      f
        .load("lib/billing/ai/choices.ts")
        .choiceFromPrice(subscription().items.data[0].price),
      null,
    );
    assert.equal(
      f
        .load("lib/billing/ai/entitlements.ts")
        .entitlementFromSubscription(subscription(), owner).tier,
      null,
    );
  } finally {
    restore();
  }
});
test("plan-change endpoint requires an explicit confirmation and tenant-owned quote", async () => {
  const restore = env(testBillingEnv());
  try {
    const f = setup();
    stripeMock(f, crmSubscription());
    const route = f.load("app/api/billing/ai/plan-change/route.ts");
    const response = await route.POST(
      new Request("https://example.test/api/billing/ai/plan-change", {
        method: "POST",
        body: JSON.stringify({
          operation: "confirm",
          quoteId: id(100),
          digest: "a".repeat(64),
        }),
      }),
    );
    assert.equal(response.status, 400);
    const foreign = await route.POST(
      new Request("https://example.test/api/billing/ai/plan-change", {
        method: "POST",
        headers: { "X-MyARI-Owner": "foreign" },
        body: JSON.stringify({ operation: "preview", choice: "ai" }),
      }),
    );
    assert.equal(foreign.status, 409);
  } finally {
    restore();
  }
});

test("webhooks and invoices project exact base choice; stale events refresh the current Stripe subscription", async () => {
  const restore = env({
    ...testBillingEnv(),
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
  });
  try {
    const f = setup();
    let current = subscription("growth"),
      event,
      projection;
    const stripe = stripeMock(f, current);
    stripe.subscriptions.retrieve = async () => current;
    stripe.webhooks = {
      constructEvent: (_body, sig, secret) => {
        assert.equal(sig, "synthetic-signature");
        assert.equal(secret, "whsec_synthetic");
        return event;
      },
    };
    f.stubs["@/lib/billing/settings-store"] = {
      applyBillingPlan: async (o, p, options) => {
        projection = { owner: o, plan: p, ...options };
      },
    };
    const route = f.load("app/api/webhooks/stripe/route.ts");
    const call = () =>
      route.POST(
        new Request("https://example.test/api/webhooks/stripe", {
          method: "POST",
          headers: { "stripe-signature": "synthetic-signature" },
          body: "synthetic",
        }),
      );
    event = {
      type: "customer.subscription.updated",
      data: { object: crmSubscription("growth") },
    };
    assert.equal((await call()).status, 200);
    assert.equal(projection.monthlyPrice, 115);
    assert.equal(projection.planName, "Growth AI");
    current = crmSubscription("growth");
    event = {
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: { subscription_details: { subscription: current.id } },
        },
      },
    };
    current.status = "past_due";
    assert.equal((await call()).status, 200);
    assert.equal(projection.monthlyPrice, 99);
    assert.equal(projection.subscriptionStatus, "canceled");
    current = subscription("growth");
    event = {
      type: "invoice.paid",
      data: {
        object: {
          parent: { subscription_details: { subscription: current.id } },
        },
      },
    };
    assert.equal((await call()).status, 200);
    assert.equal(projection.monthlyPrice, 115);
    current.status = "canceled";
    event = {
      type: "customer.subscription.deleted",
      data: { object: current },
    };
    assert.equal((await call()).status, 200);
    assert.equal(projection.subscriptionStatus, "canceled");
    assert.equal(
      f
        .load("lib/billing/ai/entitlements.ts")
        .entitlementFromSubscription(current, owner).tier,
      null,
    );
  } finally {
    restore();
  }
});
test("CRM checkout cannot create another subscription for an AI customer or bypass an open checkout", async () => {
  const restore = env(testBillingEnv());
  try {
    const f = setup(),
      stripe = stripeMock(f);
    allPrices(stripe);
    let writes = 0;
    stripe.checkout.sessions.create = async () => {
      writes++;
    };
    const checkout = f.load("lib/billing/stripe-checkout.ts");
    const input = {
      ownerId: owner,
      customerId: "cus_synthetic",
      planId: "starter",
      billingPeriod: "monthly",
      successUrl: "https://example.test/ok",
      cancelUrl: "https://example.test/cancel",
    };
    await assert.rejects(
      checkout.createSubscriptionSession(input),
      /existing subscription/,
    );
    assert.equal(writes, 0);
    stripe.subscriptions.list = async () => ({ data: [], has_more: false });
    stripe.checkout.sessions.list = async () => ({
      data: [{ id: "cs_open" }],
      has_more: false,
    });
    await assert.rejects(
      checkout.createSubscriptionSession(input),
      /open checkout/,
    );
    assert.equal(writes, 0);
  } finally {
    restore();
  }
});
test("concurrent quotes share a source-state claim; provider failure cannot trigger a blind second update", async () => {
  const restore = env(testBillingEnv());
  try {
    const f = setup(),
      stripe = stripeMock(f, crmSubscription());
    allPrices(stripe);
    let attempts = 0;
    stripe.subscriptions.update = async () => {
      attempts++;
      throw Error("provider outcome unknown");
    };
    const api = f.load("lib/billing/ai/plan-change.ts");
    const a = await api.previewPlanChange(owner, "ai"),
      b = await api.previewPlanChange(owner, "ai");
    await assert.rejects(
      api.approvePlanChange(owner, a.quoteId, a.digest),
      /unknown/,
    );
    await assert.rejects(
      api.approvePlanChange(owner, b.quoteId, b.digest),
      /already requested/,
    );
    assert.equal(attempts, 1);
  } finally {
    restore();
  }
});

test("retired public add-on route returns 410 for preview and a formerly valid approval", async () => {
  const restore = env({
    ...testBillingEnv(),
    MYARI_AI_ADDON_BILLING_ENABLED: "true",
  });
  try {
    const f = setup();
    stripeMock(f);
    const route = f.load("app/api/billing/ai/upgrade/route.ts");
    assert.equal(
      (
        await route.GET(
          new Request("https://example.test/api/billing/ai/upgrade"),
        )
      ).status,
      410,
    );
    assert.equal(
      (
        await route.POST(
          new Request("https://example.test/api/billing/ai/upgrade", {
            method: "POST",
            body: JSON.stringify({
              quoteId: id(999),
              digest: "a".repeat(64),
              confirmation: "CONFIRM_AI_PRO_UPGRADE",
            }),
          }),
        )
      ).status,
      410,
    );
  } finally {
    restore();
  }
});
