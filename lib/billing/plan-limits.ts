import {
  overageRatesForPlan,
  planById,
  type PlanId,
  type PlanOption,
} from "@/lib/billing/plans";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PlanUsage = {
  plan: PlanOption;
  planId: PlanId;
  contactsUsed: number;
  contactsLimit: number | null;
  smsUsed: number;
  smsIncluded: number;
  rvmUsed: number;
  rvmIncluded: number;
  emailUsed: number;
  emailIncluded: number;
  /** Estimated Starter PAYG charges for SMS+RVM this month (cents) */
  paygEstimatedCents: number;
  paygSmsCents: number;
  paygRvmCents: number;
  periodStart: string;
};

function startOfMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function resolveOwnerPlan(ownerId: string): Promise<PlanOption> {
  const saved = await loadSavedSettings(ownerId);
  const planId = (saved?.billing.planId ?? DEFAULT_SETTINGS.billing.planId) as PlanId;
  return planById(planId) ?? planById("starter")!;
}

/** Free trial or unpaid accounts — apply hard SMS/RVM/email caps. */
export async function isTrialUsagePeriod(ownerId: string): Promise<boolean> {
  const saved = await loadSavedSettings(ownerId);
  const status = saved?.billing.subscriptionStatus ?? "none";
  return status === "trialing" || status === "none";
}

async function countChannelSends(ownerId: string, channel: "sms" | "email" | "voicemail") {
  const since = startOfMonthIso();
  const { count, error } = await supabaseAdmin
    .from("engagement_events")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("channel", channel)
    .in("event_type", ["delivered", "sent", "queued"])
    .gte("occurred_at", since);

  if (error) {
    // Table may differ in older DBs — fall back to 0 so we don't hard-crash trials
    return 0;
  }
  return count ?? 0;
}

export async function getPlanUsage(ownerId: string): Promise<PlanUsage> {
  const plan = await resolveOwnerPlan(ownerId);
  const [{ count: contactsUsed }, smsUsed, emailUsed, rvmUsed] = await Promise.all([
    supabaseAdmin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId),
    countChannelSends(ownerId, "sms"),
    countChannelSends(ownerId, "email"),
    countChannelSends(ownerId, "voicemail"),
  ]);

  const overage = overageRatesForPlan(plan.id);
  const paygSmsCents =
    plan.smsIncluded <= 0
      ? Math.round(smsUsed * overage.sms * 100)
      : smsUsed > plan.smsIncluded
        ? Math.round((smsUsed - plan.smsIncluded) * overage.sms * 100)
        : 0;
  const paygRvmCents =
    plan.rvmIncluded <= 0
      ? Math.round(rvmUsed * overage.rvm * 100)
      : rvmUsed > plan.rvmIncluded
        ? Math.round((rvmUsed - plan.rvmIncluded) * overage.rvm * 100)
        : 0;

  return {
    plan,
    planId: plan.id,
    contactsUsed: contactsUsed ?? 0,
    contactsLimit: plan.contactLimit,
    smsUsed,
    smsIncluded: plan.smsIncluded,
    rvmUsed,
    rvmIncluded: plan.rvmIncluded,
    emailUsed,
    emailIncluded: plan.emailIncluded,
    paygSmsCents,
    paygRvmCents,
    paygEstimatedCents: paygSmsCents + paygRvmCents,
    periodStart: startOfMonthIso(),
  };
}

/** Block adding contacts over the plan ceiling. */
export async function assertCanAddContacts(ownerId: string, adding = 1) {
  const usage = await getPlanUsage(ownerId);
  if (usage.contactsLimit == null) return { ok: true as const, usage };
  if (usage.contactsUsed + adding > usage.contactsLimit) {
    return {
      ok: false as const,
      usage,
      error: `${usage.plan.name} allows up to ${usage.contactsLimit.toLocaleString()} contacts. You have ${usage.contactsUsed.toLocaleString()}. Upgrade to add more.`,
      code: "plan_contact_limit",
    };
  }
  return { ok: true as const, usage };
}

/**
 * Gate live SMS / RVM against included monthly allotment.
 * Starter is pay-as-you-go ($0.03 SMS / $0.10 RVM) → allowed (included = 0).
 * Growth/Pro: block when included allotment is exhausted (upgrade or wait for next month).
 */
export async function assertCanSendChannel(
  ownerId: string,
  channel: "sms" | "email" | "voicemail",
) {
  const usage = await getPlanUsage(ownerId);
  const plan = usage.plan;
  const onTrial = await isTrialUsagePeriod(ownerId);
  const caps = FOUNDING_100.trialUsageCaps;

  if (onTrial && channel === "sms" && usage.smsUsed >= caps.sms) {
    return {
      ok: false as const,
      usage,
      error: `Free trial includes ${caps.sms} SMS total. Upgrade or wait until your trial converts to send more.`,
      code: "trial_sms_limit",
    };
  }

  if (onTrial && channel === "voicemail" && usage.rvmUsed >= caps.rvm) {
    return {
      ok: false as const,
      usage,
      error: `Free trial includes ${caps.rvm} ringless voicemails total. Upgrade or wait until your trial converts to send more.`,
      code: "trial_rvm_limit",
    };
  }

  if (onTrial && channel === "email" && usage.emailUsed >= caps.email) {
    return {
      ok: false as const,
      usage,
      error: `Free trial includes ${caps.email} emails total. Upgrade or wait until your trial converts to send more.`,
      code: "trial_email_limit",
    };
  }

  if (channel === "sms") {
    if (plan.smsIncluded <= 0) return { ok: true as const, usage, payAsYouGo: true };
    if (usage.smsUsed >= plan.smsIncluded) {
      return {
        ok: false as const,
        usage,
        error: `${plan.name} includes ${plan.smsIncluded.toLocaleString()} SMS/mo. You've used ${usage.smsUsed.toLocaleString()}. Upgrade or wait until next month.`,
        code: "plan_sms_limit",
      };
    }
  }

  if (channel === "voicemail") {
    if (plan.rvmIncluded <= 0) return { ok: true as const, usage, payAsYouGo: true };
    if (usage.rvmUsed >= plan.rvmIncluded) {
      return {
        ok: false as const,
        usage,
        error: `${plan.name} includes ${plan.rvmIncluded.toLocaleString()} ringless drops/mo. You've used ${usage.rvmUsed.toLocaleString()}. Upgrade or wait until next month.`,
        code: "plan_rvm_limit",
      };
    }
  }

  if (channel === "email") {
    if (plan.emailIncluded <= 0) return { ok: true as const, usage };
    if (usage.emailUsed >= plan.emailIncluded) {
      return {
        ok: false as const,
        usage,
        error: `${plan.name} includes ${plan.emailIncluded.toLocaleString()} emails/mo. You've used ${usage.emailUsed.toLocaleString()}. Upgrade for higher limits.`,
        code: "plan_email_limit",
      };
    }
  }

  return { ok: true as const, usage };
}
