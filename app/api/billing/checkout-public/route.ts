import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { planById, type PlanId } from "@/lib/billing/plans";
import { createSubscriptionSession, stripeMessage } from "@/lib/billing/stripe-checkout";
import { appBaseUrl, isStripeConfigured } from "@/lib/stripe/config";
import { z } from "zod";

/**
 * Public (pre-signup) checkout — pick a plan and pay before creating an account.
 * After payment, Stripe redirects to /sign-up?session_id=...&plan=...
 */
const BodySchema = z.object({
  planId: z.enum(["starter", "growth", "pro"]),
  email: z.string().email().optional(),
});

export const POST = withApiHandler(async (request) => {
  if (!isStripeConfigured()) {
    return apiError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel Production, then Redeploy.",
      { status: 503, code: "stripe_not_configured" },
    );
  }

  const body = BodySchema.parse(await request.json());
  const plan = planById(body.planId);
  if (!plan) return apiError("Invalid plan", { status: 400 });

  const base = appBaseUrl();

  try {
    const session = await createSubscriptionSession({
      planId: body.planId as PlanId,
      customerEmail: body.email,
      successUrl: `${base}/sign-up?session_id={CHECKOUT_SESSION_ID}&plan=${body.planId}&paid=1`,
      cancelUrl: `${base}/checkout?plan=${body.planId}&canceled=1`,
    });

    if (!session.url) {
      return apiError("Stripe did not return a checkout URL.", { status: 500 });
    }

    return apiOk({
      url: session.url,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
    });
  } catch (err) {
    return apiError(stripeMessage(err), { status: 500, code: "stripe_checkout_failed" });
  }
});
