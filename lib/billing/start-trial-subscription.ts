import { monthlySubscriptionDisplay } from "./ai/choices";
import { billingAmount, type BillingPeriod } from "./billing-period";
import { subscriptionStatus as normalizeSubscriptionStatus } from "@/lib/billing/verification";
import {
  applyBillingPlan,
  loadStripeCustomerId,
  saveStripeCustomerId,
  stripePriceIdForPlan,
} from "@/lib/billing/settings-store";
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
  | {
      ok: true;
      planId: PlanId;
      subscriptionStatus: "trialing" | "active" | "canceled";
      subscriptionId: string;
    }
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
  billingPeriod?: BillingPeriod;
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
    const status = normalizeSubscriptionStatus(current.status);
    await applyBillingPlan(params.ownerId, planId, {
      subscriptionStatus: status,
      ...monthlySubscriptionDisplay(current),
    });
    return {
      ok: true,
      planId,
      subscriptionStatus: status,
      subscriptionId: current.id,
    };
  }

  const trialDays = trialDaysFromEnv();
  const metadata = {
    planId: params.planId,
    ownerId: params.ownerId,
    billingPeriod: params.billingPeriod ?? "monthly",
  };

  const base: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    metadata,
    trial_period_days: trialDays,
    payment_settings: { save_default_payment_method: "on_subscription" },
    trial_settings: {
      end_behavior: { missing_payment_method: "pause" },
    },
  };

  async function items() {
    const period = params.billingPeriod ?? "monthly";
    const priceId = stripePriceIdForPlan(params.planId, period);
    if (priceId && period === "yearly") {
      const price = await stripe.prices.retrieve(priceId);
      if (
        !price.active ||
        price.currency !== "usd" ||
        price.unit_amount !== billingAmount(params.planId, period) * 100 ||
        price.recurring?.interval !== "year" ||
        price.recurring.interval_count !== 1
      )
        throw new Error(
          "Configured yearly Stripe price does not match the advertised annual plan",
        );
    }
    if (priceId) return subscriptionItems(params.planId, period);
    const product = await stripe.products.create(
      {
        name: `MyARI ${plan!.name}`,
        tax_code: "txcd_10103001",
      },
      { idempotencyKey: `myari-plan-product-${params.planId}` },
    );
    return subscriptionItems(params.planId, period, product.id);
  }
  try {
    const sub = await stripe.subscriptions.create(
      {
        ...base,
        items: await items(),
      },
      { idempotencyKey: `myari-trial-${params.ownerId}` },
    );
    const subscriptionStatus = normalizeSubscriptionStatus(sub.status);
    await applyBillingPlan(params.ownerId, params.planId, {
      subscriptionStatus,
    });
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
        const sub = await stripe.subscriptions.create(
          {
            ...base,
            items: await items(),
          },
          { idempotencyKey: `myari-trial-${params.ownerId}` },
        );
        const subscriptionStatus = normalizeSubscriptionStatus(sub.status);
        await applyBillingPlan(params.ownerId, params.planId, {
          subscriptionStatus,
        });
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
