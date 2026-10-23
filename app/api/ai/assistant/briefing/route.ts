import { privateSuccess } from "@/lib/ai/assistant/http";
import { requireUserId } from "@/lib/auth";
import { withApiHandler } from "@/lib/api-response";
import { readBusinessBriefing } from "@/lib/ai/assistant/briefing-server";
export const GET = withApiHandler(async () =>
  privateSuccess(await readBusinessBriefing(await requireUserId())),
);
