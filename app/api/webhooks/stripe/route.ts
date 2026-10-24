import { choiceFromPrice } from "@/lib/billing/ai/choices";
import {
  checkoutIsEligible,
  subscriptionStatus,
} from "@/lib/billing/verification";
import { apiOk, withApiHandler } from "@/lib/api-response";
import { applyBillingPlan } from "@/lib/billing/settings-store";
import type { PlanId } from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

function planFromMetadata(
  meta: Stripe.Metadata | null | undefined,
): PlanId | null {
  const id = meta?.planId;
  if (id === "starter" || id === "growth" || id === "pro") return id;
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const ownerId = session.client_reference_id || session.metadata?.ownerId;
  const planId = planFromMetadata(session.metadata);
  if (!ownerId || !planId) return;

  const stripe = getStripe();
  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["subscription"],
  });
  if (!checkoutIsEligible(expanded)) return;
  if (typeof expanded.customer === "string") {
    const { saveStripeCustomerId } =
      await import("@/lib/billing/settings-store");
    await saveStripeCustomerId(ownerId, expanded.customer);
  }
  const sub = expanded.subscription as Stripe.Subscription;
  await handleSubscriptionChange(sub);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const ownerId = subscription.metadata?.ownerId;
  const planId = planFromMetadata(subscription.metadata);
  if (!ownerId || !planId) return;
  const choice =
    subscription.items.data.length === 1 &&
    subscription.items.data[0].quantity === 1
      ? choiceFromPrice(subscription.items.data[0].price)
      : null;
  if (choice && choice.planId !== planId)
    throw Error("Subscription plan mapping does not match ownership metadata");
  await applyBillingPlan(ownerId, planId, {
    subscriptionStatus: subscriptionStatus(subscription.status),
    ...(choice ? { monthlyPrice: choice.monthly, planName: choice.name } : {}),
  });
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET missing" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
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
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(
          await stripe.subscriptions.retrieve(
            (event.data.object as Stripe.Subscription).id,
          ),
        );
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const reference = invoice.parent?.subscription_details?.subscription;
        if (reference)
          await handleSubscriptionChange(
            await stripe.subscriptions.retrieve(
              typeof reference === "string" ? reference : reference.id,
            ),
          );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const GET = withApiHandler(async () =>
  apiOk({
    message: "Stripe webhook endpoint. POST signed events from Stripe.",
  }),
);
