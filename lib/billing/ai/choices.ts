import type Stripe from "stripe";
import { planById } from "@/lib/billing/plans";
import { AI_LAUNCH_PLANS, AI_PLUS_MONTHLY_DIFFERENCE } from "./catalog";
export type MonthlyChoice = "crm" | "ai";
export const MONTHLY_CRM_PLANS = ["starter", "growth", "pro"] as const;
export function monthlyChoice(planId: string, choice: MonthlyChoice) {
  const ai = AI_LAUNCH_PLANS.find((p) => p.id === planId);
  if (!ai) throw Error("Choose a supported monthly CRM plan");
  const crm = planById(ai.id)!;
  if (ai.monthly - crm.price !== AI_PLUS_MONTHLY_DIFFERENCE)
    throw Error("AI pricing difference is inconsistent");
  return {
    planId: ai.id,
    choice,
    name: choice === "ai" ? ai.name : crm.name,
    monthly: choice === "ai" ? ai.monthly : crm.price,
    priceId:
      process.env[
        `STRIPE_PRICE_${planId.toUpperCase()}${choice === "ai" ? "_AI_MONTHLY" : ""}`
      ]?.trim() ?? "",
  };
}
/** Unique exact mapping: metadata and a dollar amount alone never grant AI. */
export function choiceFromPrice(price: Stripe.Price) {
  const mappings = MONTHLY_CRM_PLANS.flatMap((plan) =>
    (["crm", "ai"] as const).map((choice) => monthlyChoice(plan, choice)),
  );
  const matches = mappings.filter((m) => m.priceId && m.priceId === price.id);
  const retired = process.env.STRIPE_PRICE_AI_PRO_MONTHLY?.trim();
  const annual = MONTHLY_CRM_PLANS.some(
    (p) =>
      process.env[`STRIPE_PRICE_${p.toUpperCase()}_YEARLY`]?.trim() ===
      price.id,
  );
  if (matches.length !== 1 || retired === price.id || annual) return null;
  const m = matches[0];
  if (
    price.currency !== "usd" ||
    price.unit_amount !== m.monthly * 100 ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1
  )
    return null;
  return m;
}
/** Display projection only; AI authorization always uses aiEntitlement. */
export function monthlySubscriptionDisplay(subscription: Stripe.Subscription) {
  const item =
    subscription.items?.data?.length === 1 ? subscription.items.data[0] : null;
  const choice = item?.quantity === 1 ? choiceFromPrice(item.price) : null;
  return choice ? { monthlyPrice: choice.monthly, planName: choice.name } : {};
}
