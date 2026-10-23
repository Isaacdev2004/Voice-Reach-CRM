/* Real billing services, synthetic owner and mocked Stripe. No network or credentials. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript");
const root = path.resolve(__dirname, "..");
function setup() {
  const calls = [],
    cache = new Map();
  let mapped = false,
    badPrice = false,
    existing = false;
  const stripe = {
    customers: {
      retrieve: async () => ({ metadata: { ownerId: "owner_demo" } }),
    },
    products: {
      create: async (p, o) => {
        calls.push({ type: "product", p, o });
        return { id: "prod_demo" };
      },
    },
    prices: {
      retrieve: async () => ({
        active: true,
        currency: "usd",
        unit_amount: 99000,
        recurring: { interval: badPrice ? "month" : "year", interval_count: 1 },
      }),
    },
    subscriptions: {
      list: async () => ({
        data: existing
          ? [
              {
                id: "sub_existing",
                status: "active",
                metadata: { planId: "starter" },
              },
            ]
          : [],
      }),
      create: async (p, o) => {
        calls.push({ type: "subscription", p, o });
        return { id: "sub_demo", status: "trialing" };
      },
    },
    checkout: {
      sessions: {
        create: async (p) => {
          calls.push({ type: "checkout", p });
          return { id: "cs_demo", url: "https://checkout.stripe.test/demo" };
        },
      },
    },
  };
  const settings = {
    stripePriceIdForPlan: (_id, period) =>
      mapped
        ? period === "yearly"
          ? "price_year_demo"
          : "price_month_demo"
        : undefined,
    loadStripeCustomerId: async () => "cus_demo",
    saveStripeCustomerId: async () => {},
    applyBillingPlan: async (...p) => calls.push({ type: "apply", p }),
  };
  function load(file) {
    file = path.resolve(root, file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    function req(name) {
      let resolved = name.startsWith("@/")
        ? path.join(root, name.slice(2))
        : name.startsWith(".")
          ? path.resolve(path.dirname(file), name)
          : null;
      if (resolved?.endsWith("/settings-store")) return settings;
      if (resolved?.endsWith("/supabaseAdmin")) {
        const q = {
          select: () => q,
          eq: () => q,
          order: () => q,
          limit: () => q,
          maybeSingle: async () => ({
            data: { metadata: { customerId: "cus_demo" } },
            error: null,
          }),
        };
        return { supabaseAdmin: { from: () => q } };
      }
      if (resolved?.endsWith("/stripe/config"))
        return { getStripe: () => stripe, isStripeConfigured: () => true };
      if (resolved?.endsWith("/marketing/trial-tracking"))
        return { handleTrialClaimSuccess: () => {} };
      if (resolved?.endsWith("/verification"))
        return { subscriptionStatus: (s) => s };
      if (resolved) return load(resolved + ".ts");
      throw new Error("Unexpected dependency " + name);
    }
    new Function("require", "module", "exports", "process", source)(
      req,
      mod,
      mod.exports,
      { env: {} },
    );
    return mod.exports;
  }
  return {
    load,
    calls,
    stripe,
    setMapped: (v) => (mapped = v),
    setBad: (v) => (badPrice = v),
    setExisting: (v) => (existing = v),
  };
}
(async () => {
  const f = setup(),
    prices = f.load("lib/billing/stripe-prices.ts"),
    config = f.load("lib/billing/plans.ts"),
    period = f.load("lib/billing/billing-period.ts"),
    guidance = f.load("lib/marketing/pricing-guidance.ts");
  for (const p of config.PLAN_OPTIONS.filter((p) => !p.contactSales)) {
    assert.equal(period.billingAmount(p.id, "monthly"), p.price);
    assert.equal(period.billingAmount(p.id, "yearly"), p.price * 10);
    assert.equal(
      prices.checkoutLineItems(p.id, "yearly")[0].price_data.recurring.interval,
      "year",
    );
    assert.equal(
      prices.checkoutLineItems(p.id, "yearly")[0].price_data.unit_amount,
      p.price * 1000,
    );
    assert.equal(
      prices.subscriptionItems(p.id, "yearly", "prod_demo")[0].price_data
        .product,
      "prod_demo",
    );
    assert.equal(
      prices.checkoutLineItems(p.id)[0].price_data.recurring.interval,
      "month",
    );
    assert.ok(
      guidance
        .pricingHighlights(p.id)
        .every((feature) => p.features.includes(feature)),
    );
  }
  for (const [c, u, s, id] of [
    [1000, 1, 0, "starter"],
    [1001, 1, 0, "growth"],
    [1000, 1, 750, "growth"],
    [5000, 1, 751, "pro"],
    [15000, 3, 2000, "pro"],
    [15001, 1, 0, "team"],
    [100, 4, 0, "team"],
    [10, 1, 2001, "team"],
  ])
    assert.equal(guidance.recommendPlan(c, u, s).plan.id, id);
  assert.equal(guidance.recommendPlan(NaN, 1, 0), null);
  assert.equal(guidance.recommendPlan(1, 0, 0), null);
  const trial = f.load("lib/billing/start-trial-subscription.ts");
  let result = await trial.startTrialSubscriptionForOwner({
    ownerId: "owner_demo",
    planId: "growth",
    billingPeriod: "yearly",
  });
  assert.equal(result.ok, true);
  let sub = f.calls.find((c) => c.type === "subscription");
  assert.equal(sub.p.metadata.billingPeriod, "yearly");
  assert.equal(sub.p.items[0].price_data.unit_amount, 99000);
  assert.equal(sub.p.items[0].price_data.recurring.interval, "year");
  assert.equal(
    sub.p.trial_settings.end_behavior.missing_payment_method,
    "pause",
  );
  assert.equal(sub.o.idempotencyKey, "myari-trial-owner_demo");
  assert.equal(sub.p.items[0].price_data.product_data, undefined);
  const checkout = f.load("lib/billing/stripe-checkout.ts");
  await checkout.createSubscriptionSession({
    planId: "growth",
    billingPeriod: "yearly",
    ownerId: "owner_demo",
    successUrl: "https://example.test/success",
    cancelUrl: "https://example.test/cancel",
  });
  let call = f.calls.find((c) => c.type === "checkout");
  assert.equal(call.p.line_items[0].price_data.recurring.interval, "year");
  assert.equal(call.p.metadata.billingPeriod, "yearly");
  assert.equal(call.p.client_reference_id, "owner_demo");
  f.setMapped(true);
  assert.equal(
    prices.checkoutLineItems("growth", "yearly")[0].price,
    "price_year_demo",
  );
  await checkout.createSubscriptionSession({
    planId: "growth",
    billingPeriod: "yearly",
    successUrl: "https://example.test/s",
    cancelUrl: "https://example.test/c",
  });
  f.setBad(true);
  await assert.rejects(
    checkout.createSubscriptionSession({
      planId: "growth",
      billingPeriod: "yearly",
      successUrl: "https://example.test/s",
      cancelUrl: "https://example.test/c",
    }),
    /does not match/,
  );
  result = await trial.startTrialSubscriptionForOwner({
    ownerId: "owner_demo",
    planId: "growth",
    billingPeriod: "yearly",
  });
  assert.equal(result.ok, false);
  f.setExisting(true);
  const before = f.calls.filter((c) => c.type === "subscription").length;
  result = await trial.startTrialSubscriptionForOwner({
    ownerId: "owner_demo",
    planId: "growth",
    billingPeriod: "yearly",
  });
  assert.equal(result.planId, "starter");
  assert.equal(
    f.calls.filter((c) => c.type === "subscription").length,
    before,
    "Existing subscription must not be replaced",
  );
  const storage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    },
  };
  const pending = f.load("lib/billing/pending-plan.ts");
  pending.rememberPendingPlan("pro", "yearly");
  assert.equal(pending.readPendingPlan(), "pro");
  assert.equal(pending.readPendingBillingPeriod(), "yearly");
  let requestBody;
  const savedFetch=global.fetch;
  global.fetch=async (_url,options)=>{requestBody=JSON.parse(options.body);return new Response(JSON.stringify({planId:'pro',planPrice:199,trialing:true}),{status:200});};
  const activate=f.load('lib/billing/activate-trial-client.ts');
  assert.equal(await activate.activatePendingTrialIfNeeded(),true);
  assert.equal(requestBody.billingPeriod,'yearly');assert.equal(requestBody.planId,'pro');
  global.fetch=savedFetch;
  pending.clearPendingPlan();
  assert.equal(pending.readPendingBillingPeriod(), "monthly");
  delete global.window;
  f.stripe.subscriptions.list = async () => ({
    data: [
      {
        status: "trialing",
        items: {
          data: [
            {
              quantity: 1,
              price: {
                currency: "usd",
                unit_amount: 99000,
                recurring: { interval: "year", interval_count: 1 },
              },
            },
          ],
        },
      },
    ],
    has_more: false,
  });
  const read = f.load("lib/billing/read-subscription.ts");
  const quote = await read.readSubscriptionStatus("owner_demo");
  assert.equal(quote.billingPeriod, "yearly");
  assert.equal(quote.billedAmount, 990);
  assert.equal(
    (await read.readSubscriptionStatus("other_owner")).verified,
    false,
  );

  console.log(
    "Pricing and annual billing: plan limits, recommendation boundaries, period persistence, monthly/yearly Stripe payloads, mismatched price rejection, trial pause, idempotency and existing-subscription safety passed. No live Stripe calls.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
