import { stripePriceIdForPlan } from "./settings-store";
import { billingAmount, type BillingPeriod } from "./billing-period";
import { planById, type PlanId } from "@/lib/billing/plans";
import {
  checkoutLineItems,
  isRecoverablePriceError,
} from "@/lib/billing/stripe-prices";
import { trialDaysFromEnv } from "@/lib/marketing/founding";
import { getStripe } from "@/lib/stripe/config";
import type Stripe from "stripe";

export function stripeMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return err instanceof Error ? err.message : "Stripe checkout failed";
}

export async function createSubscriptionSession(params: {
  planId: PlanId;
  billingPeriod?: BillingPeriod;
  customerId?: string;
  customerEmail?: string;
  ownerId?: string;
  successUrl: string;
  cancelUrl: string;
  /** When true, charge now (no trial) and collect a payment method. */
  chargeImmediately?: boolean;
}) {
  const plan = planById(params.planId);
  if (!plan) throw new Error("Invalid plan");

  const stripe = getStripe();
  if (params.customerId) {
    const customer = await stripe.customers.retrieve(params.customerId);
    if (
      customer.deleted ||
      (params.ownerId && customer.metadata.ownerId !== params.ownerId)
    )
      throw new Error("Billing customer ownership could not be verified");
    const subscriptions = await stripe.subscriptions.list({
      customer: params.customerId,
      status: "all",
      limit: 100,
    });
    if (
      subscriptions.has_more ||
      subscriptions.data.some(
        (s) => !["canceled", "incomplete_expired"].includes(s.status),
      )
    )
      throw new Error(
        "An existing subscription must be changed in Billing, not purchased again. No duplicate subscription was created.",
      );
  }
  if ((params.billingPeriod ?? "monthly") === "monthly") {
    const priceId = stripePriceIdForPlan(params.planId, "monthly");
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      if (
        !price.active ||
        price.currency !== "usd" ||
        price.unit_amount !== plan.price * 100 ||
        price.recurring?.interval !== "month" ||
        price.recurring.interval_count !== 1
      )
        throw new Error(
          "Configured CRM Only price does not match the advertised monthly plan",
        );
    }
  }
  if (params.billingPeriod === "yearly") {
    const priceId = stripePriceIdForPlan(params.planId, "yearly");
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      if (
        !price.active ||
        price.currency !== "usd" ||
        price.unit_amount !== billingAmount(params.planId, "yearly") * 100 ||
        price.recurring?.interval !== "year" ||
        price.recurring.interval_count !== 1
      )
        throw new Error(
          "Configured yearly Stripe price does not match the advertised annual plan",
        );
    }
  }
  const lineItems = checkoutLineItems(params.planId, params.billingPeriod);

  const metadata: Record<string, string> = {
    planId: params.planId,
    billingPeriod: params.billingPeriod ?? "monthly",
  };
  if (params.ownerId) metadata.ownerId = params.ownerId;

  const trialDays = trialDaysFromEnv();
  const withTrial = !params.chargeImmediately;

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {
      metadata,
      ...(withTrial
        ? {
            trial_period_days: trialDays,
            trial_settings: {
              end_behavior: { missing_payment_method: "pause" },
            },
          }
        : {}),
    };

  if (params.customerId) {
    const pending = await stripe.checkout.sessions.list({
      customer: params.customerId,
      status: "open",
      limit: 100,
    });
    if (pending.has_more || pending.data.length)
      throw new Error(
        "An open checkout already exists. Finish or expire it before choosing another subscription.",
      );
  }
  const checkoutOptions = params.customerId
    ? { idempotencyKey: `myari-base-checkout-${params.customerId}` }
    : undefined;
  const baseSession: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_collection: withTrial ? "if_required" : "always",
    ...(params.customerId
      ? { customer: params.customerId }
      : params.customerEmail
        ? { customer_email: params.customerEmail }
        : {}),
    ...(params.ownerId ? { client_reference_id: params.ownerId } : {}),
    subscription_data: subscriptionData,
    metadata: {
      ...metadata,
      ...(withTrial
        ? { trial_days: String(trialDays) }
        : { charge_immediately: "1" }),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    managed_payments: { enabled: false },
  };

  try {
    return await stripe.checkout.sessions.create(
      {
        ...baseSession,
        line_items: lineItems,
      },
      checkoutOptions,
    );
  } catch (err) {
    const msg = stripeMessage(err);
    if (isRecoverablePriceError(msg)) {
      return await stripe.checkout.sessions.create(
        {
          ...baseSession,
          line_items: checkoutLineItems(params.planId, params.billingPeriod),
        },
        checkoutOptions,
      );
    }
    if (/managed_payments|unknown parameter/i.test(msg)) {
      const { managed_payments: _mp, ...withoutManaged } = baseSession;
      return await stripe.checkout.sessions.create(
        {
          ...withoutManaged,
          line_items: checkoutLineItems(params.planId, params.billingPeriod),
        },
        checkoutOptions,
      );
    }
    throw err;
  }
}

/** Collect a card on file (e.g. before trial ends) without starting a new subscription. */
export async function createPaymentMethodSetupSession(params: {
  customerId: string;
  ownerId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "setup",
    customer: params.customerId,
    client_reference_id: params.ownerId,
    metadata: { ownerId: params.ownerId, purpose: "add_payment_method" },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    billing_address_collection: "auto",
  });
}
