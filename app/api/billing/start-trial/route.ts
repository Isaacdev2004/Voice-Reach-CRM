import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { planById, type PlanId } from "@/lib/billing/plans";
import { startTrialSubscriptionForOwner } from "@/lib/billing/start-trial-subscription";
import { isStripeConfigured } from "@/lib/stripe/config";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const BodySchema = z.object({
  planId: z.enum(["starter", "growth", "pro"]),
});

/**
 * Authenticated cardless trial — no Stripe Checkout, no payment method until trial ends.
 */
export const POST = withApiHandler(async (request) => {
  if (!isStripeConfigured()) {
    return apiError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel, then redeploy.",
      { status: 503, code: "stripe_not_configured" },
    );
  }

  const ownerId = await requireUserId();
  const { planId } = BodySchema.parse(await request.json());
  if (!planById(planId)) return apiError("Invalid plan", { status: 400 });

  let email = "";
  let name = "";
  const { userId } = await auth();
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

  const result = await startTrialSubscriptionForOwner({
    ownerId,
    planId: planId as PlanId,
    email,
    name,
  });

  if (!result.ok) {
    return apiError(result.message, { status: 502, code: result.code });
  }

  const plan = planById(result.planId)!;
  return apiOk({
    planId: result.planId,
    planName: plan.name,
    planPrice: plan.price,
    trialing: result.subscriptionStatus === "trialing",
    subscriptionStatus: result.subscriptionStatus,
  });
});
