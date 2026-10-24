import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe/config";
import {
  aiPriceId,
  addonPriceId,
  aiEntitlement,
  mappedAiCustomer,
} from "./entitlements";
import { launchPlan, AI_PRO_ADDON_MONTHLY, AI_PLAN_VERSION } from "./catalog";
import { launchEligibility } from "./launch";
import { saveStripeCustomerId } from "@/lib/billing/settings-store";
import { trialDaysFromEnv } from "@/lib/marketing/founding";
import { AssistantFailure, put, entries, digest } from "@/lib/assistant/store";
import { appBaseUrl } from "@/lib/stripe/config";
export async function requireAiBilling() {
  if (
    process.env.MYARI_AI_ENTITLEMENTS_ENABLED !== "true" ||
    process.env.MYARI_AI_METER_DATABASE_VERIFIED !== "true"
  )
    throw new AssistantFailure(
      "AI entitlement and database acceptance must pass before billing is enabled",
      503,
    );
  const database = await supabaseAdmin.rpc("ai_usage_schema_version");
  if (database.error || database.data !== 1)
    throw new AssistantFailure(
      "AI usage database is not ready; no checkout or upgrade was created",
      503,
    );
  if (process.env.MYARI_AI_BILLING_ENABLED !== "true")
    throw new AssistantFailure(
      "AI subscription checkout is staged and not enabled",
      503,
    );
  const mode = process.env.MYARI_AI_STRIPE_MODE ?? "test";
  if (!["test", "live"].includes(mode))
    throw new AssistantFailure(
      "Choose an explicit Stripe AI billing mode",
      503,
    );
  if (mode === "live" && process.env.MYARI_AI_BILLING_LIVE_APPROVED !== "true")
    throw new AssistantFailure(
      "Live AI billing requires separate business approval",
      503,
    );
}
export async function verifyAiPrice(id: string, monthly: number) {
  if (!id)
    throw new AssistantFailure(
      "A verified Stripe AI price ID is required; no inline price will be created",
      503,
    );
  const p = await getStripe().prices.retrieve(id);
  const expectedLive = (process.env.MYARI_AI_STRIPE_MODE ?? "test") === "live";
  if (p.livemode !== expectedLive)
    throw new AssistantFailure(
      "Stripe price mode does not match the approved AI billing mode",
      409,
    );
  if (
    !p.active ||
    p.currency !== "usd" ||
    p.unit_amount !== monthly * 100 ||
    p.recurring?.interval !== "month" ||
    p.recurring.interval_count !== 1
  )
    throw new AssistantFailure(
      "Stripe price does not match the approved monthly catalog",
      409,
    );
  return p;
}
export async function newAiCheckout(
  owner: string,
  planId: string,
  _requestId: string,
) {
  await requireAiBilling();
  const plan = launchPlan(planId);
  if (!plan) throw new AssistantFailure("Choose a supported AI plan");
  const stripe = getStripe();
  let customerId = await mappedAiCustomer(owner);
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || customer.metadata.ownerId !== owner)
      throw new AssistantFailure(
        "Billing ownership could not be verified",
        403,
      );
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    if (subs.has_more || subs.data.length)
      throw new AssistantFailure(
        "Existing subscriptions are preserved. Use a reviewed, informed migration instead of starting a duplicate.",
        409,
      );
  }
  const eligibility = launchEligibility(owner, false);
  if (
    !eligibility.eligible ||
    !eligibility.config?.eligiblePlans.includes(plan.id)
  )
    throw new AssistantFailure(
      eligibility.reason ?? "This plan is not eligible for launch enrollment",
      403,
    );
  await verifyAiPrice(aiPriceId(plan.id), plan.monthly);
  if (!customerId) {
    const customer = await stripe.customers.create(
      { metadata: { ownerId: owner } },
      { idempotencyKey: `ai-customer-${owner}` },
    );
    customerId = customer.id;
    await saveStripeCustomerId(owner, customerId);
  }
  const pending = await stripe.checkout.sessions.list({
    customer: customerId,
    status: "open",
    limit: 100,
  });
  if (pending.has_more || pending.data.length)
    throw new AssistantFailure(
      "An open checkout already exists. Finish or expire it before creating another.",
      409,
    );
  const metadata = {
    ownerId: owner,
    planId: plan.id,
    billingPeriod: "monthly",
    aiVersion: AI_PLAN_VERSION,
    launchStart: eligibility.config.start,
    launchEnd: eligibility.config.end,
  };
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: owner,
      line_items: [{ price: aiPriceId(plan.id), quantity: 1 }],
      subscription_data: {
        metadata,
        trial_period_days: trialDaysFromEnv(),
        trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      },
      metadata,
      payment_method_collection: "if_required",
      success_url: `${appBaseUrl()}/dashboard/settings?tab=billing&aiCheckout=success`,
      cancel_url: `${appBaseUrl()}/dashboard/settings?tab=billing&aiCheckout=cancel`,
    },
    {
      idempotencyKey: `ai-checkout-${owner}-${AI_PLAN_VERSION}-${eligibility.config.start}`,
    },
  );
  if (!session.url)
    throw new AssistantFailure(
      "Stripe did not return a checkout destination",
      503,
    );
  return {
    url: session.url,
    plan: plan.name,
    amount: plan.monthly,
    billingPeriod: "monthly",
  };
}
function proration() {
  const value = process.env.MYARI_AI_ADDON_PRORATION;
  if (!["none", "create_prorations", "always_invoice"].includes(value ?? ""))
    throw new AssistantFailure(
      "An approved add-on proration policy is required",
      503,
    );
  return value as "none" | "create_prorations" | "always_invoice";
}
export async function previewAiPro(owner: string) {
  await requireAiBilling();
  if (process.env.MYARI_AI_ADDON_BILLING_ENABLED !== "true")
    throw new AssistantFailure("AI Pro billing is staged and unavailable", 503);
  const e = await aiEntitlement(owner);
  if (!e.verified || !e.tier || !e.subscriptionId || !e.customerId)
    throw new AssistantFailure(
      "An active verified AI-inclusive subscription is required",
      403,
    );
  if (e.tier === "pro") return { alreadyActive: true };
  const stripe = getStripe(),
    s = await stripe.subscriptions.retrieve(e.subscriptionId);
  if (s.metadata.ownerId !== owner || s.cancel_at_period_end)
    throw new AssistantFailure(
      "Review subscription ownership or pending cancellation in Billing first",
      409,
    );
  await verifyAiPrice(addonPriceId(), AI_PRO_ADDON_MONTHLY);
  const policy = proration();
  const invoice = await stripe.invoices.createPreview({
    customer: e.customerId,
    subscription: s.id,
    subscription_details: {
      items: [{ price: addonPriceId(), quantity: 1 }],
      proration_behavior: policy,
    },
  });
  const id = crypto.randomUUID(),
    snapshot = {
      subscriptionId: s.id,
      customerId: e.customerId,
      items: s.items.data.map((i) => ({
        id: i.id,
        price: i.price.id,
        quantity: i.quantity,
      })),
      policy,
      price: addonPriceId(),
      monthly: AI_PRO_ADDON_MONTHLY,
      currency: invoice.currency,
      amountDue: invoice.amount_due,
      effectiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    },
    hash = digest(snapshot);
  await put(owner, "billing_quote", id, "preview", {
    ...snapshot,
    digest: hash,
  });
  return {
    quoteId: id,
    digest: hash,
    ...snapshot,
    notice:
      "Invoice preview is not a charge. Review current invoice/proration and the additional monthly amount before confirmation.",
  };
}
export async function approveAiPro(
  owner: string,
  quoteId: string,
  hash: string,
) {
  await requireAiBilling();
  if (process.env.MYARI_AI_ADDON_BILLING_ENABLED !== "true")
    throw new AssistantFailure("AI Pro billing is disabled", 503);
  const quote = (await entries(owner, "billing_quote", quoteId, 1))[0]
    ?.metadata;
  if (
    !quote ||
    quote.digest !== hash ||
    Date.parse(String(quote.expiresAt)) < Date.now()
  )
    throw new AssistantFailure(
      "Billing quote expired or changed. Preview again.",
      409,
    );
  const e = await aiEntitlement(owner);
  if (e.tier === "pro") return { alreadyActive: true };
  if (!e.verified || e.subscriptionId !== quote.subscriptionId)
    throw new AssistantFailure("Subscription changed. Preview again.", 409);
  const stripe = getStripe(),
    s = await stripe.subscriptions.retrieve(String(quote.subscriptionId));
  if (
    s.metadata.ownerId !== owner ||
    s.cancel_at_period_end ||
    JSON.stringify(
      s.items.data.map((i) => ({
        id: i.id,
        price: i.price.id,
        quantity: i.quantity,
      })),
    ) !== JSON.stringify(quote.items)
  )
    throw new AssistantFailure("Subscription changed. Preview again.", 409);
  await verifyAiPrice(String(quote.price), AI_PRO_ADDON_MONTHLY);
  if (
    !(await put(owner, "billing_claim", quoteId, "once", {
      state: "requested",
    }))
  )
    throw new AssistantFailure(
      "This upgrade was already requested. Refresh billing before retrying.",
      409,
    );
  const updated = await stripe.subscriptions.update(
    s.id,
    {
      items: [{ price: String(quote.price), quantity: 1 }],
      payment_behavior: "pending_if_incomplete",
      proration_behavior: quote.policy as
        "none" | "create_prorations" | "always_invoice",
    },
    { idempotencyKey: `ai-pro-${owner}-${quoteId}` },
  );
  await put(owner, "billing_outcome", quoteId, "result", {
    subscriptionId: updated.id,
    status: updated.status,
    at: new Date().toISOString(),
  });
  return {
    subscriptionId: updated.id,
    status: updated.status,
    notice:
      "Stripe confirmed the subscription update. Entitlements are re-read from authoritative item records; payment-dependent activation is not assumed.",
  };
}
