import { normalizeBillingPeriod, type BillingPeriod } from "./billing-period";
import { planById, type PlanId } from "@/lib/billing/plans";

const STORAGE_KEY = "ari_pending_plan";

export function rememberPendingPlan(
  planId: string | null | undefined,
  billingPeriod: BillingPeriod = "monthly",
) {
  if (typeof window === "undefined") return;
  if (!planId || !planById(planId)) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("ari_pending_billing_period");
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, planId);
  window.localStorage.setItem("ari_pending_billing_period", billingPeriod);
}

export function readPendingPlan(): PlanId | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return planById(raw) ? (raw as PlanId) : null;
}

export function readPendingBillingPeriod(): BillingPeriod {
  return typeof window === "undefined"
    ? "monthly"
    : normalizeBillingPeriod(
        window.localStorage.getItem("ari_pending_billing_period"),
      );
}

export function clearPendingPlan() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem("ari_pending_billing_period");
}
