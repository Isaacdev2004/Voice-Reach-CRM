import { apiOk } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { withApiHandler } from "@/lib/api-response";
import { aiEntitlement } from "@/lib/billing/ai/entitlements";
import {
  AI_LIMITS,
  AI_CAPABILITY_LABELS,
  AI_MONITORING_THRESHOLDS,
} from "@/lib/billing/ai/catalog";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId(),
    entitlement = await aiEntitlement(owner);
  if (!entitlement.tier || !entitlement.periodStart)
    return apiOk({
      entitlement,
      usage: null,
      notice:
        "Existing CRM subscriptions are unchanged. AI usage is unavailable without a verified AI entitlement.",
    });
  const r = await supabaseAdmin
    .from("ai_usage_accounts")
    .select("capability,used,reserved,period_end")
    .eq("owner_id", owner)
    .eq("period_start", entitlement.periodStart);
  if (r.error)
    return apiOk({
      entitlement,
      usage: null,
      notice: "Usage storage is unavailable. No counters are fabricated.",
    });
  const adjustments = await supabaseAdmin
    .from("ai_usage_adjustments")
    .select("capability,additional_units")
    .eq("owner_id", owner)
    .eq("period_start", entitlement.periodStart);
  if (adjustments.error)
    return apiOk({
      entitlement,
      usage: null,
      notice: "AI allowance adjustments could not be verified.",
    });
  const history = await supabaseAdmin
    .from("ai_usage_operations")
    .select("capability,units,state,created_at")
    .eq("owner_id", owner)
    .eq("period_start", entitlement.periodStart)
    .order("created_at", { ascending: false })
    .limit(30);
  const limits = AI_LIMITS[entitlement.tier],
    usage = Object.entries(limits).map(([capability, baseLimit]) => {
      const limit =
        baseLimit +
        (adjustments.data ?? [])
          .filter((x) => x.capability === capability)
          .reduce((n, x) => n + x.additional_units, 0);
      const row = r.data.find((x) => x.capability === capability),
        used = row?.used ?? 0,
        reserved = row?.reserved ?? 0;
      return {
        capability,
        label: AI_CAPABILITY_LABELS[capability as keyof typeof limits],
        limit,
        used,
        reserved,
        remaining: Math.max(0, limit - used - reserved),
        state:
          used + reserved >= limit
            ? "limit_reached"
            : used + reserved >= limit * 0.8
              ? "near_limit"
              : "available",
      };
    });
  return apiOk({
    entitlement,
    usage,
    history: history.error ? null : history.data,
    resetAt: entitlement.periodEnd,
    internalCostAlertThreshold: AI_MONITORING_THRESHOLDS[entitlement.tier],
    notice:
      "Limits are per subscriber, not pooled team allowances. Provider cost monitoring is separate from subscriber billing.",
  });
});
