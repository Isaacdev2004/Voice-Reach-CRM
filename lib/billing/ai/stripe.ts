import { choiceFromPrice } from "./choices";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe/config";
import { aiPriceId, mappedAiCustomer } from "./entitlements";
import { launchPlan, AI_PLAN_VERSION } from "./catalog";
import { launchEligibility } from "./launch";
import { saveStripeCustomerId } from "@/lib/billing/settings-store";
import { trialDaysFromEnv } from "@/lib/marketing/founding";
import { AssistantFailure } from "@/lib/assistant/store";
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
  if (!choiceFromPrice(p))
    throw new AssistantFailure(
      "Monthly price mappings must be unique and match an approved CRM Only or CRM + AI choice",
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
      idempotencyKey: `myari-base-checkout-${customerId}`,
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
/** Retired endpoint functions deliberately ignore all flags and old saved quotes. */
export async function previewAiPro(_owner: string): Promise<never> {
  throw new AssistantFailure(
    "The AI add-on is discontinued. AI Plus is included in the AI base plan; no additional charge is required.",
    410,
  );
}
export async function approveAiPro(
  _owner: string,
  _quoteId: string,
  _hash: string,
): Promise<never> {
  throw new AssistantFailure(
    "The AI add-on is discontinued. Old quotes cannot be executed.",
    410,
  );
}
