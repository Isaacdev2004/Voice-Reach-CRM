import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { applyBillingPlan } from "@/lib/billing/settings-store";
import { linkStripeCustomerFromSession } from "@/lib/billing/payg-usage";
import { planById, type PlanId } from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
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
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return apiError("This checkout session is not paid yet.", {
      status: 400,
      code: "unpaid_session",
    });
  }

  const planId = (session.metadata?.planId ?? "") as PlanId;
  if (!planById(planId)) {
    return apiError("Checkout session is missing a valid plan.", { status: 400 });
  }

  // Link subscription metadata to this owner for future webhooks
  if (typeof session.subscription === "string") {
    await stripe.subscriptions.update(session.subscription, {
      metadata: { ownerId, planId },
    });
  }
  if (typeof session.customer === "string") {
    await stripe.customers.update(session.customer, {
      metadata: { ownerId, planId },
    });
    await linkStripeCustomerFromSession(ownerId, session.customer);
  }

  await applyBillingPlan(ownerId, planId);

  return apiOk({
    planId,
    planName: planById(planId)!.name,
    message: `You're on ${planById(planId)!.name}.`,
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
  const paid = session.payment_status === "paid" || session.status === "complete";

  return apiOk({
    paid,
    planId: plan?.id ?? null,
    planName: plan?.name ?? null,
    price: plan?.price ?? null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
  });
});
