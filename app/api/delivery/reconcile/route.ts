import { z } from "zod";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { reconcileChannel } from "@/lib/delivery/reconcile";
export const maxDuration = 60;
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const body = z
    .object({
      channel: z.enum(["sms", "email", "voicemail"]),
      confirmReadOnly: z.literal(true),
    })
    .parse(await request.json());
  try {
    return apiOk(await reconcileChannel(owner, body.channel));
  } catch {
    return apiError(
      "Provider reconciliation is unavailable or awaiting approval. No resend was attempted.",
      { status: 503 },
    );
  }
});
