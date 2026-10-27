import { requireUserId } from "@/lib/auth";
import { apiOk, withApiHandler } from "@/lib/api-response";
import { eligible, staffRole } from "@/lib/concierge/access";
export const GET = withApiHandler(async () => {
  const actor = await requireUserId();
  return apiOk({ enabled: eligible(actor), staff: !!staffRole(actor) });
});
