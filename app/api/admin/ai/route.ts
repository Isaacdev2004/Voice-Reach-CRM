import { assistantHandler } from "@/lib/assistant/api";
import { assistantBody } from "@/lib/assistant/body";
import { apiOk } from "@/lib/api-response";
import { requireAiAdmin } from "@/lib/billing/ai/admin";
import { aiEntitlement } from "@/lib/billing/ai/entitlements";
import {
  AI_CAPABILITY_LABELS,
  AI_MONITORING_THRESHOLDS,
} from "@/lib/billing/ai/catalog";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { digest, entries, AssistantFailure, put } from "@/lib/assistant/store";
import { z } from "zod";
export const GET = assistantHandler(async (_request, actor) => {
  const owners = requireAiAdmin(actor),
    accounts = [];
  for (const owner of owners.slice(0, 50)) {
    const entitlement = await aiEntitlement(owner),
      usage = entitlement.periodStart
        ? await supabaseAdmin
            .from("ai_usage_accounts")
            .select("capability,used,reserved")
            .eq("owner_id", owner)
            .eq("period_start", entitlement.periodStart)
        : null,
      tokens = await entries(owner, "tokens", undefined, 100);
    const costs = tokens.map((e) => e.metadata.estimatedCostUSD);
    accounts.push({
      accountReference: digest(owner).slice(0, 12),
      tier: entitlement.tier,
      verified: entitlement.verified,
      usage: usage?.error ? null : (usage?.data ?? null),
      estimatedTokenCostSampleUSD:
        costs.length && costs.every((c) => typeof c === "number")
          ? costs.reduce<number>((n, c) => n + Number(c), 0)
          : null,
      costCoverage:
        "Latest 100 recorded calls; not a monthly provider invoice reconciliation.",
      monthlyMonitoringThresholdUSD: entitlement.tier
        ? AI_MONITORING_THRESHOLDS[entitlement.tier]
        : null,
    });
  }
  return apiOk({
    limited: owners.length > 50,
    scope:
      "Explicitly authorized reporting cohort only; not platform-wide totals.",
    accounts,
    aiPlusSubscribers:
      owners.length && owners.length <= 50 && accounts.every((a) => a.verified)
        ? accounts.filter((a) => a.verified && a.tier === "plus").length
        : null,
    aiProSubscribers:
      owners.length && owners.length <= 50 && accounts.every((a) => a.verified)
        ? accounts.filter((a) => a.verified && a.tier === "pro").length
        : null,
    recognizedAiRevenue: null,
    directProviderBilledCosts: null,
    contributionMargin: null,
    trialConversion: null,
    upgradeConversion: null,
    limitations: [
      "Revenue allocation for bundled CRM/AI plans and provider invoice reconciliation are not verified. Unavailable financial metrics are not fabricated.",
      "Cost alert thresholds are monitoring signals, not subscriber entitlement limits.",
      "No automatic notifications, charges, grants or subscription updates occur on this read.",
    ],
  });
});
export const POST = assistantHandler(async (request, actor) => {
  const b = z
    .object({
      requestId: z.string().uuid(),
      ownerId: z.string().min(1).max(200),
      capability: z.enum(
        Object.keys(AI_CAPABILITY_LABELS) as [
          keyof typeof AI_CAPABILITY_LABELS,
          ...(keyof typeof AI_CAPABILITY_LABELS)[],
        ],
      ),
      additionalUnits: z.number().int().positive().max(60000),
      reason: z.string().trim().min(10).max(1000),
      confirmation: z.literal("CONFIRM_ALLOWANCE_ADJUSTMENT"),
    })
    .strict()
    .parse(await assistantBody(request));
  requireAiAdmin(actor, b.ownerId);
  const e = await aiEntitlement(b.ownerId);
  if (!e.verified || !e.tier || !e.periodStart)
    throw new AssistantFailure(
      "An active authoritative AI entitlement is required",
      409,
    );
  await put(actor, "admin_adjustment", b.requestId, "approved", {
    targetReference: digest(b.ownerId),
    capability: b.capability,
    units: b.additionalUnits,
    reason: b.reason,
  });
  const r = await supabaseAdmin.from("ai_usage_adjustments").insert({
    id: b.requestId,
    owner_id: b.ownerId,
    period_start: e.periodStart,
    capability: b.capability,
    additional_units: b.additionalUnits,
    approved_by: actor,
    reason: b.reason,
  });
  if (r.error && r.error.code !== "23505")
    throw new AssistantFailure(
      "Allowance adjustment could not be confirmed",
      503,
    );
  if (r.error?.code === "23505") {
    const previous = await supabaseAdmin
      .from("ai_usage_adjustments")
      .select("capability,additional_units")
      .eq("owner_id", b.ownerId)
      .eq("id", b.requestId)
      .maybeSingle();
    if (
      previous.error ||
      !previous.data ||
      previous.data.capability !== b.capability ||
      previous.data.additional_units !== b.additionalUnits
    )
      throw new AssistantFailure(
        "Adjustment key already refers to a different operation",
        409,
      );
  }
  return apiOk({
    adjusted: true,
    duplicate: r.error?.code === "23505",
    notice:
      "Additional allowance only; CRM permissions, subscription pricing and actual usage history were not changed.",
  });
});
