import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { runDueStepRuns } from "@/lib/campaigns/engine";
import { isUuid } from "@/lib/contacts/is-uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ campaignId: string }> };

export const POST = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;

  if (!isUuid(campaignId)) {
    return apiError("Invalid campaign id", { status: 400, code: "invalid_campaign_id" });
  }

  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) return apiError(error.message, { status: 500 });
  if (!campaign) return apiError("Campaign not found", { status: 404, code: "not_found" });

  const result = await runDueStepRuns({ ownerId, campaignId, limit: 50 });
  return apiOk(result);
});
