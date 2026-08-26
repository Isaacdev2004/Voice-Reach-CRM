import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  loadSavedSettings,
  loadStripeCustomerId,
  saveStripeCustomerId,
} from "@/lib/billing/settings-store";
import { planById, type PlanId } from "@/lib/billing/plans";
import { createSubscriptionSession, stripeMessage } from "@/lib/billing/stripe-checkout";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const BodySchema = z.object({
  planId: z.enum(["starter", "growth", "pro"]),
});

/** Authenticated checkout (logged-in upgrade / retry). */
export const POST = withApiHandler(async (request) => {
  if (!isStripeConfigured()) {
    return apiError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY (live sk_live_…) in Vercel Production, then Redeploy.",
      { status: 503, code: "stripe_not_configured" },
    );
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
    try {
      const customer = await stripe.customers.create({
        email: email || undefined,
        name: name || undefined,
        metadata: { ownerId },
      });
      customerId = customer.id;
      await saveStripeCustomerId(ownerId, customerId);
    } catch (err) {
      return apiError(stripeMessage(err), { status: 500, code: "stripe_customer_failed" });
    }
  }

  const base = appBaseUrl();
  const saved = await loadSavedSettings(ownerId);

  async function run(customer: string) {
    return createSubscriptionSession({
      planId: planId as PlanId,
      customerId: customer,
      ownerId,
      successUrl: `${base}/dashboard/settings?tab=billing&checkout=success&plan=${planId}`,
      cancelUrl: `${base}/dashboard/settings?tab=billing&checkout=cancel`,
    });
  }

  try {
    const session = await run(customerId);
    if (!session.url) {
      return apiError("Stripe did not return a checkout URL.", { status: 500 });
    }
    return apiOk({
      url: session.url,
      planId,
      planName: plan.name,
      currentPlanId: saved?.billing.planId ?? null,
    });
  } catch (err) {
    const msg = stripeMessage(err);
    if (/No such customer/i.test(msg)) {
      try {
        const customer = await stripe.customers.create({
          email: email || undefined,
          name: name || undefined,
          metadata: { ownerId },
        });
        await saveStripeCustomerId(ownerId, customer.id);
        const session = await run(customer.id);
        if (!session.url) {
          return apiError("Stripe did not return a checkout URL.", { status: 500 });
        }
        return apiOk({
          url: session.url,
          planId,
          planName: plan.name,
          currentPlanId: saved?.billing.planId ?? null,
        });
      } catch (retryErr) {
        return apiError(stripeMessage(retryErr), { status: 500, code: "stripe_checkout_failed" });
      }
    }
    return apiError(msg, { status: 500, code: "stripe_checkout_failed" });
  }
});
