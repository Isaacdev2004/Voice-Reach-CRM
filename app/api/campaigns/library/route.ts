import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { readLibrary } from "@/lib/campaigns/library-server";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    return apiOk({ campaigns: await readLibrary(owner) });
  } catch {
    return apiError(
      "Campaign information is temporarily unavailable. Please try again.",
      { status: 503 },
    );
  }
});
