import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { applyBillingPlan } from "@/lib/billing/settings-store";
import type { PlanId } from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

function planFromMetadata(meta: Stripe.Metadata | null | undefined): PlanId | null {
  const id = meta?.planId;
  if (id === "starter" || id === "growth" || id === "pro") return id;
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const ownerId = session.client_reference_id || session.metadata?.ownerId;
  const planId = planFromMetadata(session.metadata);
  if (!ownerId || !planId) return;

  await applyBillingPlan(ownerId, planId);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const ownerId = subscription.metadata?.ownerId;
  if (!ownerId) return;

  if (subscription.status === "active" || subscription.status === "trialing") {
    const planId = planFromMetadata(subscription.metadata);
    if (planId) await applyBillingPlan(ownerId, planId);
    return;
  }

  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    const saved = await applyBillingPlan(ownerId, "starter");
    // Downgrade is still a known plan; mark canceled so paywall can prompt upgrade again
    const { writeAuditLog } = await import("@/lib/audit");
    await writeAuditLog({
      ownerId,
      action: "SETTINGS_SAVED",
      entityType: "user_settings",
      metadata: {
        settings: {
          ...saved,
          billing: { ...saved.billing, subscriptionStatus: "canceled", monthlyPrice: 0, planName: "Choose a plan" },
        },
        source: "stripe_canceled",
      },
    });
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET missing" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const GET = withApiHandler(async () =>
  apiOk({ message: "Stripe webhook endpoint. POST signed events from Stripe." }),
);
