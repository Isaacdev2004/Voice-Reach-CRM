import { z } from "zod";
import { apiOk, readApiResponse } from "@/lib/api-response";
import {
  conciergeHandler,
  ConciergeError,
  jsonBody,
} from "@/lib/concierge/access";
import { PREMIUM_CAMPAIGN_DRAFTS } from "@/lib/campaigns/premium-drafts";
import { loadCase, mutate } from "@/lib/concierge/store";
import { resolveOwnerPlan } from "@/lib/billing/plan-limits";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPreparedDraft } from "@/lib/concierge/campaign-recovery";
import { POST as saveBlueprint } from "@/app/api/campaigns/builder/route";
export const POST = conciergeHandler(async (request, owner) => {
  const body = z
    .object({ templateKey: z.string().max(100), confirmed: z.literal(true) })
    .strict()
    .parse(await jsonBody(request));
  const campaign = PREMIUM_CAMPAIGN_DRAFTS.find(
    (t) => t.revisionKey === body.templateKey,
  );
  if (!campaign)
    throw new ConciergeError("Choose an existing reviewed MyARI draft.");
  const record = await loadCase(owner);
  if (!record)
    throw new ConciergeError(
      "Save your discovery before preparing a campaign.",
    );
  const plan = await resolveOwnerPlan(owner);
  if (plan.id === "starter" && campaign.steps.length > 1)
    throw new ConciergeError(
      "Multi-step Concierge campaign drafts require an eligible CRM plan. You can review the template without changing your subscription.",
      403,
    );
  const existing = await supabaseAdmin
    .from("campaigns").select("id,status,provider").eq("owner_id", owner)
    .eq("script_id", `builder-${campaign.id}`).maybeSingle();
  if (existing.error) throw existing.error;
  if (record.milestones.campaignPreparation?.status === "pending" && !existing.data)
    throw new ConciergeError("An earlier save is pending or unconfirmed. Ask your authorized manager to inspect the campaign library before another attempt; no automatic retry occurred.", 409);
  // The optimistic claim persists across requests: a second request cannot start another builder write.
  const preparation = { templateKey: campaign.revisionKey, status: "pending" as const, startedAt: new Date().toISOString() };
  const claimed = await mutate(owner, owner, crypto.randomUUID(), record.version,
    { milestones: { campaignPreparation: preparation } }, "CAMPAIGN_PREPARATION_STARTED");
  if (existing.data) {
    await verifyPreparedDraft(owner, existing.data.id, campaign);
    await mutate(owner, owner, crypto.randomUUID(), claimed.version,
      { milestones: { preparedCampaignId: existing.data.id, campaignPreparation: { ...preparation, status: "complete" } } }, "CAMPAIGN_DRAFT_RECOVERED");
    return apiOk({ campaignId: existing.data.id, alreadyExisted: true,
      message: "Existing complete draft verified and linked. Existing content was not overwritten." });
  }
  const response = await saveBlueprint(
    new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "template",
        campaign: { ...campaign, provider: "mock" },
        enrollAllEligible: false,
      }),
    }),
    undefined,
  );
  const result = await readApiResponse<{ campaignId: string }>(response);
  if (!response.ok || !result.success)
    throw new ConciergeError(
      "The draft save could not be confirmed. Review your campaign library before retrying.",
      503,
    );
  await verifyPreparedDraft(owner, result.data.campaignId, campaign);
  await mutate(
    owner,
    owner,
    crypto.randomUUID(),
    claimed.version,
    { milestones: { preparedCampaignId: result.data.campaignId, campaignPreparation: { ...preparation, status: "complete" } } },
    "CAMPAIGN_DRAFT_PREPARED",
  );
  return apiOk({
    campaignId: result.data.campaignId,
    alreadyExisted: false,
    message: "Draft only. No enrollment, activation or communication occurred.",
  });
});
