import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiEntitlement, aiMeteringEnabled } from "./entitlements";
import { AI_LIMITS, type AiCapability } from "./catalog";
import { AssistantFailure } from "@/lib/assistant/store";
export type AiReservation = {
  owner: string;
  period: string;
  key: string;
  capability: AiCapability;
  units: number;
  fresh: boolean;
} | null;
export async function reserveAi(
  owner: string,
  capability: AiCapability,
  key: string,
  units = 1,
): Promise<AiReservation> {
  if (!aiMeteringEnabled()) return null;
  const e = await aiEntitlement(owner);
  if (!e.verified || !e.tier || !e.periodStart || !e.periodEnd)
    throw new AssistantFailure(
      e.reason ?? "An active AI-inclusive subscription is required",
      403,
    );
  if (!Number.isSafeInteger(units) || units <= 0)
    throw new AssistantFailure("Invalid usage units");
  const adjustments = await supabaseAdmin
    .from("ai_usage_adjustments")
    .select("additional_units")
    .eq("owner_id", owner)
    .eq("period_start", e.periodStart)
    .eq("capability", capability);
  if (adjustments.error)
    throw new AssistantFailure(
      "AI allowance adjustments could not be verified",
      503,
    );
  const additional = (adjustments.data ?? []).reduce(
    (n, r) => n + r.additional_units,
    0,
  );
  const r = await supabaseAdmin.rpc("reserve_ai_usage", {
    p_owner: owner,
    p_period: e.periodStart,
    p_end: e.periodEnd,
    p_capability: capability,
    p_key: key,
    p_units: units,
    p_limit: AI_LIMITS[e.tier][capability] + additional,
  });
  if (r.error) {
    if (String(r.error.message).includes("AI_LIMIT"))
      throw new AssistantFailure(
        `${capability.replaceAll("_", " ")} allowance reached. Resets ${new Date(e.periodEnd).toLocaleDateString("en-US", { timeZone: "UTC" })}. Review AI Pro eligibility in AI Usage.`,
        429,
      );
    throw new AssistantFailure(
      "AI usage accounting is unavailable. Existing drafts are preserved.",
      503,
    );
  }
  if (r.data?.fresh === false)
    throw new AssistantFailure(
      "Usage operation already exists. Recover its saved result instead of submitting a duplicate.",
      409,
    );
  return { owner, period: e.periodStart, key, capability, units, fresh: true };
}
export async function settleAi(r: AiReservation, delivered: boolean) {
  if (!r) return;
  const result = await supabaseAdmin.rpc("settle_ai_usage", {
    p_owner: r.owner,
    p_period: r.period,
    p_capability: r.capability,
    p_key: r.key,
    p_delivered: delivered,
  });
  if (result.error)
    throw new AssistantFailure(
      "AI result accounting needs review. Do not repeat this operation.",
      503,
    );
}
export async function meteredAi<T>(
  owner: string,
  capability: AiCapability,
  key: string,
  run: () => Promise<T>,
  units = 1,
) {
  const reservation = await reserveAi(owner, capability, key, units);
  let result: T;
  try {
    result = await run();
  } catch (error) {
    await settleAi(reservation, false);
    throw error;
  }
  await settleAi(reservation, true);
  return result;
}
export async function renderAiDocument<T>(
  owner: string,
  proposal: { id: string; rootId?: string },
  render: () => Promise<T>,
) {
  const { entries, put } = await import("@/lib/assistant/store"),
    key = proposal.rootId ?? proposal.id;
  if ((await entries(owner, "document_render", key, 1)).length) return render();
  return meteredAi(owner, "documents", `document:${key}`, async () => {
    const result = await render();
    await put(owner, "document_render", key, "completed", {
      proposalId: proposal.id,
      completedAt: new Date().toISOString(),
    });
    return result;
  });
}
