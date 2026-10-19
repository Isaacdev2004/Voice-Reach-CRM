import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { claimCheckoutSessionForOwner } from "@/lib/billing/claim-checkout-session";
import { planById } from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const BodySchema = z.object({
  sessionId: z.string().min(1),
});

/** After signup: attach a paid Checkout session to this user and activate the plan. */
export const POST = withApiHandler(async (request) => {
  if (!isStripeConfigured()) {
    return apiError("Stripe is not configured.", { status: 503 });
  }

  const ownerId = await requireUserId();
  const { sessionId } = BodySchema.parse(await request.json());

  let clerkEmail: string | null = null;
  const { userId } = await auth();
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      clerkEmail = user.emailAddresses[0]?.emailAddress ?? null;
    } catch {
      /* optional */
    }
  }

  const result = await claimCheckoutSessionForOwner(ownerId, sessionId, { clerkEmail });
  if (!result.ok) {
    return apiError(result.message, { status: result.status, code: result.code });
  }

  const plan = planById(result.planId)!;

  return apiOk({
    planId: result.planId,
    planName: plan.name,
    planPrice: plan.price,
    trialing: result.subscriptionStatus === "trialing",
    message: `You're on ${plan.name}.`,
  });
});

/** Public: verify a Checkout session before showing sign-up. */
export const GET = withApiHandler(async (request) => {
  if (!isStripeConfigured()) {
    return apiError("Stripe is not configured.", { status: 503 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return apiError("session_id is required", { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const planId = session.metadata?.planId ?? "";
  const plan = planById(planId);
  const subscription = session.subscription;
  const trialing =
    typeof subscription === "object" &&
    subscription !== null &&
    "status" in subscription &&
    subscription.status === "trialing";
  const paid = session.status === "complete";

  return apiOk({
    paid,
    trialing,
    planId: plan?.id ?? null,
    planName: plan?.name ?? null,
    price: plan?.price ?? null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
  });
});
