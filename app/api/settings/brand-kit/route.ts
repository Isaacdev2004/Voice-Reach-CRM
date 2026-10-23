import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { subscriberBranding } from "@/lib/settings/branding-service";
/** Changes save through the same version-checked Settings API, not an independent competing store. */
export const GET = withApiHandler(async () =>
  apiOk(await subscriberBranding(await requireUserId())),
);
