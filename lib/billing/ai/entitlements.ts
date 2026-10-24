import type Stripe from "stripe";
import { choiceFromPrice } from "./choices";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AssistantFailure } from "@/lib/assistant/store";
import { AI_LIMITS, AI_PLAN_VERSION, type AiTier } from "./catalog";
export type AiEntitlement = {
  verified: boolean;
  tier: AiTier | null;
  crmPlan: string | null;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  subscriptionId: string | null;
  addonItemId?: string;
  customerId?: string;
  reason?: string;
  beta?: boolean;
};
export function aiPriceId(plan: string) {
  return (
    process.env[`STRIPE_PRICE_${plan.toUpperCase()}_AI_MONTHLY`]?.trim() ?? ""
  );
}
export const addonPriceId = () =>
  process.env.STRIPE_PRICE_AI_PRO_MONTHLY?.trim() ?? "";
export function entitlementFromSubscription(
  s: Stripe.Subscription,
  owner: string,
): AiEntitlement {
  const none = {
    verified: true,
    tier: null,
    crmPlan: null,
    status: s.status,
    periodStart: null,
    periodEnd: null,
    subscriptionId: s.id,
  } as AiEntitlement;
  if (
    s.metadata.ownerId !== owner ||
    !["active", "trialing"].includes(s.status)
  )
    return { ...none, reason: "No active authorized AI subscription." };
  const base = s.items.data.filter(
    (i) => choiceFromPrice(i.price)?.choice === "ai",
  );
  if (base.length !== 1)
    return {
      ...none,
      reason:
        "CRM Only or unrecognized pricing is preserved; AI Plus requires an exact AI-inclusive base price.",
    };
  const item = base[0],
    plan = choiceFromPrice(item.price)!;
  if (item.quantity !== 1)
    return {
      ...none,
      reason: "AI subscription quantity requires billing review.",
    };
  // Historical add-on references are retained for reconciliation, never sold or
  // interpreted as a second AI purchase. Included AI Plus comes from the base item.
  const extra = s.items.data.filter((i) => i.id !== item.id);
  if (extra.some((i) => !addonPriceId() || i.price.id !== addonPriceId()))
    return {
      ...none,
      reason: "Multiple or unknown subscription items require billing review.",
    };
  const start = item.current_period_start,
    end = item.current_period_end;
  if (!start || !end || end <= start)
    return { ...none, reason: "Stripe billing period could not be verified." };
  return {
    verified: true,
    tier: "plus",
    crmPlan: plan.planId,
    status: s.status,
    periodStart: new Date(start * 1000).toISOString(),
    periodEnd: new Date(end * 1000).toISOString(),
    subscriptionId: s.id,
    addonItemId: extra[0]?.id,
    ...(extra.length
      ? {
          reason:
            "Historical AI add-on detected; billing review required. No add-on is required for AI Plus.",
        }
      : {}),
  };
}
export async function aiEntitlement(owner: string): Promise<AiEntitlement> {
  if (
    process.env.NODE_ENV !== "production" &&
    (process.env.AI_BETA_PLUS_OWNER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .includes(owner)
  ) {
    const n = new Date(),
      start = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)),
      end = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1));
    return {
      verified: true,
      tier: "plus",
      crmPlan: "starter",
      status: "internal_beta",
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      subscriptionId: null,
      beta: true,
    };
  }
  const none: AiEntitlement = {
    verified: false,
    tier: null,
    crmPlan: null,
    status: "unverified",
    periodStart: null,
    periodEnd: null,
    subscriptionId: null,
  };
  if (!isStripeConfigured())
    return { ...none, reason: "Stripe access is not configured." };
  try {
    const customerId = await mappedAiCustomer(owner);
    if (!customerId)
      return {
        ...none,
        verified: true,
        status: "none",
        reason: "No mapped billing customer.",
      };
    const stripe = getStripe(),
      customer = await stripe.customers.retrieve(
        customerId,
        {},
        { timeout: 5000, maxNetworkRetries: 0 },
      );
    if (customer.deleted || customer.metadata.ownerId !== owner)
      return {
        ...none,
        reason: "Billing customer ownership could not be verified.",
      };
    const subscriptions = await stripe.subscriptions.list(
      { customer: customerId, status: "all", limit: 100 },
      { timeout: 5000, maxNetworkRetries: 0 },
    );
    if (subscriptions.has_more)
      return { ...none, reason: "Subscription list is incomplete." };
    const candidates = subscriptions.data.filter(
      (s) =>
        s.metadata.ownerId === owner &&
        !["canceled", "incomplete_expired"].includes(s.status),
    );
    if (candidates.length !== 1)
      return {
        ...none,
        verified: true,
        status: candidates.length ? "ambiguous" : "inactive",
        reason: "A unique active subscription is required.",
      };
    return { ...entitlementFromSubscription(candidates[0], owner), customerId };
  } catch {
    return {
      ...none,
      reason:
        "Authoritative Stripe status is unavailable; existing CRM access is unchanged.",
    };
  }
}
export const aiMeteringEnabled = () =>
  process.env.MYARI_AI_ENTITLEMENTS_ENABLED === "true";
export function aiCaps(e: AiEntitlement) {
  return e.tier ? AI_LIMITS[e.tier] : null;
}
export const aiVersion = AI_PLAN_VERSION;

export async function mappedAiCustomer(owner: string) {
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "billing")
    .eq("action", "STRIPE_CUSTOMER")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r.error)
    throw new AssistantFailure("Billing customer mapping is unavailable", 503);
  const id = r.data?.metadata?.customerId;
  return typeof id === "string" ? id : null;
}
