import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { isUuid } from "@/lib/contacts/is-uuid";
import { readPreview } from "@/lib/campaigns/library-server";
export const GET = withApiHandler<{ params: Promise<{ campaignId: string }> }>(
  async (_request, context) => {
    const owner = await requireUserId();
    const { campaignId } = await context.params;
    if (!isUuid(campaignId))
      return apiError("Invalid campaign.", { status: 400 });
    try {
      const data = await readPreview(owner, campaignId);
      return data
        ? apiOk(data)
        : apiError("Campaign not found.", { status: 404 });
    } catch {
      return apiError(
        "Campaign information is temporarily unavailable. Please try again.",
        { status: 503 },
      );
    }
  },
);
