import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  loadSavedSettings,
  loadStripeCustomerId,
  saveStripeCustomerId,
  stripePriceIdForPlan,
} from "@/lib/billing/settings-store";
import { planById, type PlanId } from "@/lib/billing/plans";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const BodySchema = z.object({
  planId: z.enum(["starter", "growth", "pro"]),
});

export const POST = withApiHandler(async (request) => {
  if (!isStripeConfigured()) {
    return apiError("Stripe is not configured on the server.", {
      status: 503,
      code: "stripe_not_configured",
    });
  }

  const ownerId = await requireUserId();
  const { planId } = BodySchema.parse(await request.json());
  const plan = planById(planId);
  if (!plan) return apiError("Invalid plan", { status: 400 });

  const { userId } = await auth();
  let email = "";
  let name = "";
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress ?? "";
      name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    } catch {
      /* optional */
    }
  }

  const stripe = getStripe();
  let customerId = await loadStripeCustomerId(ownerId);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
      metadata: { ownerId },
    });
    customerId = customer.id;
    await saveStripeCustomerId(ownerId, customerId);
  }

  const base = appBaseUrl();
  const priceId = stripePriceIdForPlan(planId as PlanId);
  const saved = await loadSavedSettings(ownerId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: ownerId,
    line_items: priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: plan.price * 100,
              recurring: { interval: "month" },
              product_data: {
                name: `ARI ${plan.name}`,
                description: plan.description,
              },
            },
          },
        ],
    subscription_data: {
      metadata: { ownerId, planId },
    },
    metadata: { ownerId, planId },
    success_url: `${base}/dashboard/settings?tab=billing&checkout=success&plan=${planId}`,
    cancel_url: `${base}/dashboard/settings?tab=billing&checkout=cancel`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: email ? { address: "auto", name: "auto" } : undefined,
  });

  if (!session.url) {
    return apiError("Stripe did not return a checkout URL.", { status: 500 });
  }

  return apiOk({
    url: session.url,
    planId,
    planName: plan.name,
    currentPlanId: saved?.billing.planId ?? null,
  });
});
