import { planById, type PlanId } from "@/lib/billing/plans";

const STORAGE_KEY = "ari_pending_plan";

export function rememberPendingPlan(planId: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!planId || !planById(planId)) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, planId);
}

export function readPendingPlan(): PlanId | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return planById(raw) ? (raw as PlanId) : null;
}

export function clearPendingPlan() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
