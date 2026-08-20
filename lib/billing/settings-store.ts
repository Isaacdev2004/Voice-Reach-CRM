import { writeAuditLog } from "@/lib/audit";
import { planById, type PlanId } from "@/lib/billing/plans";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import type { BillingSettings, UserSettings } from "@/lib/settings/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function loadSavedSettings(ownerId: string): Promise<UserSettings | null> {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("metadata, created_at")
    .eq("owner_id", ownerId)
    .eq("entity_type", "user_settings")
    .eq("action", "SETTINGS_SAVED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settings = (data?.metadata as { settings?: UserSettings })?.settings;
  return settings ?? null;
}

export async function loadStripeCustomerId(ownerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", ownerId)
    .eq("entity_type", "billing")
    .eq("action", "STRIPE_CUSTOMER")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerId = (data?.metadata as { customerId?: string })?.customerId;
  return customerId ?? null;
}

export async function saveStripeCustomerId(ownerId: string, customerId: string) {
  await writeAuditLog({
    ownerId,
    action: "STRIPE_CUSTOMER",
    entityType: "billing",
    metadata: { customerId },
  });
}

export function billingFromPlan(planId: PlanId, usedMinutes = 0): BillingSettings {
  const plan = planById(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return {
    planId: plan.id,
    planName: plan.name,
    monthlyPrice: plan.price,
    voiceMinutesLimit: plan.rvmIncluded || plan.smsIncluded || 0,
    voiceMinutesUsed: usedMinutes,
  };
}

export async function applyBillingPlan(ownerId: string, planId: PlanId) {
  const saved = await loadSavedSettings(ownerId);
  const base = saved ?? DEFAULT_SETTINGS;
  const billing = billingFromPlan(planId, base.billing.voiceMinutesUsed);

  const settings: UserSettings = {
    ...base,
    billing,
    updatedAt: new Date().toISOString(),
  };

  await writeAuditLog({
    ownerId,
    action: "SETTINGS_SAVED",
    entityType: "user_settings",
    metadata: { settings, source: "stripe" },
  });

  return settings;
}

export function stripePriceIdForPlan(planId: PlanId): string | undefined {
  const map: Record<PlanId, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER?.trim(),
    growth: process.env.STRIPE_PRICE_GROWTH?.trim(),
    pro: process.env.STRIPE_PRICE_PRO?.trim(),
  };
  return map[planId];
}
