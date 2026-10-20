import { applyBillingPlan, loadStripeCustomerId, saveStripeCustomerId } from "@/lib/billing/settings-store";
import { planById, type PlanId } from "@/lib/billing/plans";
import {
  isRecoverablePriceError,
  subscriptionItems,
} from "@/lib/billing/stripe-prices";
import { stripeMessage } from "@/lib/billing/stripe-checkout";
import { trialDaysFromEnv } from "@/lib/marketing/founding";
import { getStripe } from "@/lib/stripe/config";
import type Stripe from "stripe";

export type StartTrialResult =
  | { ok: true; planId: PlanId; subscriptionStatus: "trialing" | "active"; subscriptionId: string }
  | { ok: false; message: string; code: string };

async function ensureCustomer(params: {
  ownerId: string;
  email?: string;
  name?: string;
}): Promise<string> {
  const existing = await loadStripeCustomerId(params.ownerId);
  if (existing) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: params.email || undefined,
    name: params.name || undefined,
    metadata: { ownerId: params.ownerId },
  });
  await saveStripeCustomerId(params.ownerId, customer.id);
  return customer.id;
}

function activeSubscription(
  subs: Stripe.Subscription[],
): Stripe.Subscription | undefined {
  return subs.find(
    (s) =>
      s.status === "trialing" ||
      s.status === "active" ||
      s.status === "past_due" ||
      s.status === "paused",
  );
}

/**
 * Start a cardless free trial: Stripe subscription with trial_period_days and
 * missing_payment_method → pause when the trial ends until a card is added.
 */
export async function startTrialSubscriptionForOwner(params: {
  ownerId: string;
  planId: PlanId;
  email?: string;
  name?: string;
}): Promise<StartTrialResult> {
  const plan = planById(params.planId);
  if (!plan || plan.contactSales) {
    return { ok: false, code: "invalid_plan", message: "Invalid plan." };
  }

  const stripe = getStripe();
  const customerId = await ensureCustomer(params);

  const existing = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const current = activeSubscription(existing.data);
  if (current) {
    const metaPlan = current.metadata?.planId as PlanId | undefined;
    const planId = metaPlan && planById(metaPlan) ? metaPlan : params.planId;
    const status = current.status === "trialing" ? "trialing" : "active";
    await applyBillingPlan(params.ownerId, planId, { subscriptionStatus: status });
    return {
      ok: true,
      planId,
      subscriptionStatus: status,
      subscriptionId: current.id,
    };
  }

  const trialDays = trialDaysFromEnv();
  const metadata = { planId: params.planId, ownerId: params.ownerId };

  const base: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    metadata,
    trial_period_days: trialDays,
    payment_settings: { save_default_payment_method: "on_subscription" },
    trial_settings: {
      end_behavior: { missing_payment_method: "pause" },
    },
  };

  try {
    const sub = await stripe.subscriptions.create({
      ...base,
      items: subscriptionItems(params.planId),
    });
    const subscriptionStatus = sub.status === "trialing" ? "trialing" : "active";
    await applyBillingPlan(params.ownerId, params.planId, { subscriptionStatus });
    return {
      ok: true,
      planId: params.planId,
      subscriptionStatus,
      subscriptionId: sub.id,
    };
  } catch (err) {
    const msg = stripeMessage(err);
    if (isRecoverablePriceError(msg)) {
      try {
        const sub = await stripe.subscriptions.create({
          ...base,
          items: subscriptionItems(params.planId),
        });
        const subscriptionStatus = sub.status === "trialing" ? "trialing" : "active";
        await applyBillingPlan(params.ownerId, params.planId, { subscriptionStatus });
        return {
          ok: true,
          planId: params.planId,
          subscriptionStatus,
          subscriptionId: sub.id,
        };
      } catch (retryErr) {
        return {
          ok: false,
          code: "stripe_trial_failed",
          message: stripeMessage(retryErr),
        };
      }
    }
    return { ok: false, code: "stripe_trial_failed", message: msg };
  }
}
