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
  // Serialize overlapping subscriber approvals through the existing optimistic case version.
  const claimed = await mutate(
    owner,
    owner,
    crypto.randomUUID(),
    record.version,
    {},
    "CAMPAIGN_PREPARATION_STARTED",
  );
  const existing = await supabaseAdmin
    .from("campaigns")
    .select("id,status")
    .eq("owner_id", owner)
    .eq("script_id", `builder-${campaign.id}`)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data)
    return apiOk({
      campaignId: existing.data.id,
      alreadyExisted: true,
      message:
        "This reviewed draft already exists. Use the campaign editor; existing content was not overwritten.",
    });
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
  await mutate(
    owner,
    owner,
    crypto.randomUUID(),
    claimed.version,
    { milestones: { preparedCampaignId: result.data.campaignId } },
    "CAMPAIGN_DRAFT_PREPARED",
  );
  return apiOk({
    campaignId: result.data.campaignId,
    alreadyExisted: false,
    message: "Draft only. No enrollment, activation or communication occurred.",
  });
});
