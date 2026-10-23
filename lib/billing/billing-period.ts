import { planById, type PlanId } from "./plans";
export type BillingPeriod = "monthly" | "yearly";
export function normalizeBillingPeriod(value: unknown): BillingPeriod {
  return value === "yearly" ? "yearly" : "monthly";
}
/** Existing advertised annual offer: ten monthly payments, billed once a year. */
export function billingAmount(
  planId: PlanId,
  period: BillingPeriod = "monthly",
) {
  const plan = planById(planId);
  if (!plan) throw new Error("Invalid plan");
  return plan.price * (period === "yearly" ? 10 : 1);
}
