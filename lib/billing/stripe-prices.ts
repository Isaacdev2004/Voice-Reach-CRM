import { planById, type PlanId } from "@/lib/billing/plans";
import { stripePriceIdForPlan } from "@/lib/billing/settings-store";
import type Stripe from "stripe";

/** SaaS / electronically supplied services - satisfies Stripe Tax + Managed Payments rules */
export const SAAS_TAX_CODE = "txcd_10103001";

export function checkoutLineItems(planId: PlanId): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const plan = planById(planId);
  if (!plan) throw new Error("Invalid plan");

  const priceId = stripePriceIdForPlan(planId);
  if (priceId) return [{ price: priceId, quantity: 1 }];

  return [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: plan.price * 100,
        recurring: { interval: "month" },
        product_data: {
          name: `MyARI ${plan.name}`,
          description: plan.description,
          tax_code: SAAS_TAX_CODE,
        },
      },
    },
  ];
}

export function subscriptionItems(planId: PlanId): Stripe.SubscriptionCreateParams.Item[] {
  const plan = planById(planId);
  if (!plan) throw new Error("Invalid plan");

  const priceId = stripePriceIdForPlan(planId);
  if (priceId) return [{ price: priceId }];

  // Stripe API accepts product_data here; Subscription Item PriceData types omit it.
  const priceData = {
    currency: "usd",
    unit_amount: plan.price * 100,
    recurring: { interval: "month" as const },
    product_data: {
      name: `MyARI ${plan.name}`,
      description: plan.description,
      tax_code: SAAS_TAX_CODE,
    },
  } as unknown as Stripe.SubscriptionCreateParams.Item["price_data"];

  return [{ price_data: priceData }];
}

export function isRecoverablePriceError(msg: string) {
  return /No such price|resource_missing|Invalid price|tax code is missing|Managed Payments/i.test(
    msg,
  );
}
