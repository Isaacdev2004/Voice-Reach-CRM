import { z } from "zod";
import { assistantBody } from "@/lib/assistant/body";
import { billingAiHandler } from "@/lib/assistant/api";
import { apiOk } from "@/lib/api-response";
import { previewAiPro, approveAiPro } from "@/lib/billing/ai/stripe";
export const GET = billingAiHandler(async (_r, owner) =>
  apiOk(await previewAiPro(owner)),
);
export const POST = billingAiHandler(async (request, owner) => {
  const b = z
    .object({
      quoteId: z.string().uuid(),
      digest: z.string().regex(/^[a-f0-9]{64}$/),
      confirmation: z.literal("CONFIRM_AI_PRO_UPGRADE"),
    })
    .strict()
    .parse(await assistantBody(request));
  return apiOk(await approveAiPro(owner, b.quoteId, b.digest));
});
