import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AssistantFailure } from "@/lib/assistant/store";
import {
  AI_LIMITS,
  AI_PRO_ADDON_MONTHLY,
  AI_LAUNCH_PLANS,
  AI_PLAN_VERSION,
  type AiTier,
} from "./catalog";
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
  const base = s.items.data.filter((i) =>
    AI_LAUNCH_PLANS.some(
      (p) => !!aiPriceId(p.id) && aiPriceId(p.id) === i.price.id,
    ),
  );
  if (base.length !== 1)
    return {
      ...none,
      reason:
        "Legacy or unrecognized pricing is preserved; no AI-inclusive entitlement is inferred.",
    };
  const item = base[0],
    plan = AI_LAUNCH_PLANS.find((p) => aiPriceId(p.id) === item.price.id)!,
    price = item.price;
  if (
    item.quantity !== 1 ||
    price.currency !== "usd" ||
    price.unit_amount !== plan.monthly * 100 ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1
  )
    return {
      ...none,
      reason: "AI price does not match approved monthly configuration.",
    };
  const addon = s.items.data.filter(
    (i) => !!addonPriceId() && i.price.id === addonPriceId(),
  );
  if (
    addon.length > 1 ||
    addon.some(
      (i) =>
        i.quantity !== 1 ||
        i.price.unit_amount !== AI_PRO_ADDON_MONTHLY * 100 ||
        i.price.currency !== "usd" ||
        i.price.recurring?.interval !== "month" ||
        i.price.recurring.interval_count !== 1,
    )
  )
    return { ...none, reason: "AI Pro add-on configuration is inconsistent." };
  const start = item.current_period_start,
    end = item.current_period_end;
  if (!start || !end || end <= start)
    return { ...none, reason: "Stripe billing period could not be verified." };
  return {
    verified: true,
    tier: addon.length ? "pro" : "plus",
    crmPlan: plan.id,
    status: s.status,
    periodStart: new Date(start * 1000).toISOString(),
    periodEnd: new Date(end * 1000).toISOString(),
    subscriptionId: s.id,
    addonItemId: addon[0]?.id,
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
        ["active", "trialing"].includes(s.status),
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
