import { stripePriceIdForPlan } from "@/lib/billing/settings-store";
import { planById, type PlanId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/stripe/config";

export function stripeMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return err instanceof Error ? err.message : "Stripe checkout failed";
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

  const inlinePriceItem = {
    quantity: 1,
    price_data: {
      currency: "usd" as const,
      unit_amount: plan.price * 100,
      recurring: { interval: "month" as const },
      product_data: {
        name: `ARI ${plan.name}`,
        description: plan.description,
      },
    },
  };

  const lineItems = priceId ? [{ price: priceId, quantity: 1 }] : [inlinePriceItem];

  const baseSession = {
    mode: "subscription" as const,
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
    billing_address_collection: "auto" as const,
  };

  try {
    return await stripe.checkout.sessions.create({
      ...baseSession,
      line_items: lineItems,
    });
  } catch (err) {
    const msg = stripeMessage(err);
    if (priceId && /No such price|resource_missing|Invalid price/i.test(msg)) {
      return await stripe.checkout.sessions.create({
        ...baseSession,
        line_items: [inlinePriceItem],
      });
    }
    throw err;
  }
}
