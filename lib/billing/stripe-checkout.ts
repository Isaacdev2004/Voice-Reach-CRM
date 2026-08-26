import { stripePriceIdForPlan } from "@/lib/billing/settings-store";
import { planById, type PlanId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/stripe/config";
import type Stripe from "stripe";

/** SaaS / electronically supplied services — satisfies Stripe Tax + Managed Payments rules */
const SAAS_TAX_CODE = "txcd_10103001";

export function stripeMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return err instanceof Error ? err.message : "Stripe checkout failed";
}

function isRecoverablePriceError(msg: string) {
  return /No such price|resource_missing|Invalid price|tax code is missing|Managed Payments/i.test(
    msg,
  );
}

export async function createSubscriptionSession(params: {
  planId: PlanId;
  customerId?: string;
  customerEmail?: string;
  ownerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const plan = planById(params.planId);
  if (!plan) throw new Error("Invalid plan");

  const stripe = getStripe();
  const priceId = stripePriceIdForPlan(params.planId);

  const metadata: Record<string, string> = { planId: params.planId };
  if (params.ownerId) metadata.ownerId = params.ownerId;

  const inlinePriceItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: plan.price * 100,
      recurring: { interval: "month" },
      product_data: {
        name: `ARI ${plan.name}`,
        description: plan.description,
        tax_code: SAAS_TAX_CODE,
      },
    },
  };

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [inlinePriceItem];

  const baseSession: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    ...(params.customerId
      ? { customer: params.customerId }
      : params.customerEmail
        ? { customer_email: params.customerEmail }
        : {}),
    ...(params.ownerId ? { client_reference_id: params.ownerId } : {}),
    subscription_data: { metadata },
    metadata,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    // Account has Managed Payments on by default; we sell SaaS as merchant of record.
    managed_payments: { enabled: false },
  };

  try {
    return await stripe.checkout.sessions.create({
      ...baseSession,
      line_items: lineItems,
    });
  } catch (err) {
    const msg = stripeMessage(err);
    // Bad env price IDs or tax-code issues on catalog products → fall back to inline SaaS price
    if (priceId && isRecoverablePriceError(msg)) {
      return await stripe.checkout.sessions.create({
        ...baseSession,
        line_items: [inlinePriceItem],
      });
    }
    // Older Stripe SDK may not accept managed_payments — retry without it but keep tax_code
    if (/managed_payments|unknown parameter/i.test(msg)) {
      const { managed_payments: _mp, ...withoutManaged } = baseSession;
      return await stripe.checkout.sessions.create({
        ...withoutManaged,
        line_items: [inlinePriceItem],
      });
    }
    throw err;
  }
}
