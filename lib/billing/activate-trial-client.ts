import {
  clearPendingPlan,
  readPendingPlan,
  readPendingBillingPeriod,
  rememberPendingPlan,
} from "@/lib/billing/pending-plan";
import { planById, type PlanId } from "@/lib/billing/plans";
import { handleTrialClaimSuccess } from "@/lib/marketing/trial-tracking";

export async function activatePendingTrialIfNeeded(): Promise<boolean> {
  const pending = readPendingPlan();
  if (!pending) return false;

  const res = await fetch("/api/billing/start-trial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId: pending,
      billingPeriod: readPendingBillingPeriod(),
    }),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as {
    planId?: string;
    planPrice?: number;
    trialing?: boolean;
  };

  clearPendingPlan();

  if (data.planId && data.trialing) {
    handleTrialClaimSuccess({
      planId: data.planId,
      planPrice: data.planPrice ?? 0,
      trialing: true,
    });
  }

  return true;
}

export function stashPlanFromQuery(
  planId: string | null | undefined,
  period?: string | null,
) {
  if (!planId || !planById(planId)) return;
  rememberPendingPlan(
    planId as PlanId,
    period === "yearly" ? "yearly" : "monthly",
  );
}
