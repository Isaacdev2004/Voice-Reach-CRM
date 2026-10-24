import { z } from "zod";
import { assistantBody } from "@/lib/assistant/body";
import { billingAiHandler } from "@/lib/assistant/api";
import { apiOk } from "@/lib/api-response";
import { newAiCheckout } from "@/lib/billing/ai/stripe";
export const POST = billingAiHandler(async (request, owner) => {
  const b = z
    .object({
      planId: z.enum(["starter", "growth", "pro"]),
      requestId: z.string().uuid(),
      confirmation: z.literal("CONFIRM_NEW_AI_SUBSCRIPTION"),
    })
    .strict()
    .parse(await assistantBody(request));
  return apiOk(await newAiCheckout(owner, b.planId, b.requestId));
});
