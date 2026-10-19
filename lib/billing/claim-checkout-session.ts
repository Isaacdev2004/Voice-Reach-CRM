import { writeAuditLog } from "@/lib/audit";
import { applyBillingPlan } from "@/lib/billing/settings-store";
import { linkStripeCustomerFromSession } from "@/lib/billing/payg-usage";
import { planById, type PlanId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/stripe/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type Stripe from "stripe";

const CLAIM_ACTION = "CHECKOUT_CLAIMED";
const CLAIM_ENTITY = "checkout_session";

export async function findCheckoutSessionClaimOwner(sessionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("owner_id")
    .eq("entity_type", CLAIM_ENTITY)
    .eq("entity_id", sessionId)
    .eq("action", CLAIM_ACTION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.owner_id ?? null;
}

export type ClaimCheckoutResult =
  | { ok: true; planId: PlanId; subscriptionStatus: "trialing" | "active" }
  | { ok: false; status: number; code: string; message: string };

/**
 * Bind a completed Stripe Checkout session to exactly one Clerk user.
 * Prevents re-claiming the same session or hijacking another user's checkout.
 */
export async function claimCheckoutSessionForOwner(
  ownerId: string,
  sessionId: string,
  options?: { clerkEmail?: string | null },
): Promise<ClaimCheckoutResult> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.status !== "complete") {
    return {
      ok: false,
      status: 400,
      code: "unpaid_session",
      message: "This checkout session is not complete yet.",
    };
  }

  const paid =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) {
    return {
      ok: false,
      status: 400,
      code: "unpaid_session",
      message: "This checkout session has not been paid.",
    };
  }

  const planId = (session.metadata?.planId ?? "") as PlanId;
  if (!planById(planId)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_plan",
      message: "Checkout session is missing a valid plan.",
    };
  }

  const metadataClaimed = session.metadata?.claimedOwnerId?.trim();
  const auditClaimed = await findCheckoutSessionClaimOwner(sessionId);
  const priorOwner = metadataClaimed || auditClaimed;

  if (priorOwner && priorOwner !== ownerId) {
    return {
      ok: false,
      status: 403,
      code: "session_already_claimed",
      message: "This checkout session is already linked to another account.",
    };
  }

  const boundOwner =
    session.client_reference_id?.trim() || session.metadata?.ownerId?.trim() || null;

  if (boundOwner && boundOwner !== ownerId) {
    return {
      ok: false,
      status: 403,
      code: "session_owner_mismatch",
      message: "This checkout session belongs to a different account.",
    };
  }

  const checkoutEmail =
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    null;
  const clerkEmail = options?.clerkEmail?.trim().toLowerCase() || null;

  if (!boundOwner && !priorOwner && checkoutEmail && clerkEmail && checkoutEmail !== clerkEmail) {
    return {
      ok: false,
      status: 403,
      code: "email_mismatch",
      message: "Sign in with the email used at checkout to activate this plan.",
    };
  }

  if (typeof session.subscription === "string") {
    await stripe.subscriptions.update(session.subscription, {
      metadata: { ownerId, planId, claimedOwnerId: ownerId },
    });
  } else if (session.subscription && typeof session.subscription === "object") {
    await stripe.subscriptions.update(session.subscription.id, {
      metadata: { ownerId, planId, claimedOwnerId: ownerId },
    });
  }

  if (typeof session.customer === "string") {
    await stripe.customers.update(session.customer, {
      metadata: { ownerId, planId, claimedOwnerId: ownerId },
    });
    await linkStripeCustomerFromSession(ownerId, session.customer);
  }

  await stripe.checkout.sessions.update(sessionId, {
    metadata: {
      ...(session.metadata ?? {}),
      planId,
      ownerId,
      claimedOwnerId: ownerId,
      claimedAt: new Date().toISOString(),
    },
    ...(boundOwner ? {} : { client_reference_id: ownerId }),
  });

  let subscriptionStatus: "trialing" | "active" = "active";
  const subscription = session.subscription as Stripe.Subscription | string | null;
  if (subscription && typeof subscription === "object" && "status" in subscription) {
    subscriptionStatus = subscription.status === "trialing" ? "trialing" : "active";
  }

  await applyBillingPlan(ownerId, planId, { subscriptionStatus });

  if (!priorOwner) {
    await writeAuditLog({
      ownerId,
      action: CLAIM_ACTION,
      entityType: CLAIM_ENTITY,
      entityId: sessionId,
      metadata: { planId, checkoutEmail, boundOwner },
    });
  }

  return { ok: true, planId, subscriptionStatus };
}
