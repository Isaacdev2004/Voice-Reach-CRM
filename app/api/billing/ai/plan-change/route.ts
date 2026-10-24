import { z } from "zod";
import { assistantBody } from "@/lib/assistant/body";
import { billingAiHandler } from "@/lib/assistant/api";
import { apiOk } from "@/lib/api-response";
import {
  previewPlanChange,
  approvePlanChange,
} from "@/lib/billing/ai/plan-change";
export const POST = billingAiHandler(async (request, owner) => {
  const b = z
    .discriminatedUnion("operation", [
      z
        .object({
          operation: z.literal("preview"),
          choice: z.enum(["crm", "ai"]),
        })
        .strict(),
      z
        .object({
          operation: z.literal("confirm"),
          quoteId: z.string().uuid(),
          digest: z.string().regex(/^[a-f0-9]{64}$/),
          confirmation: z.literal("CONFIRM_REPLACE_MONTHLY_PLAN"),
        })
        .strict(),
    ])
    .parse(await assistantBody(request));
  return apiOk(
    b.operation === "preview"
      ? await previewPlanChange(owner, b.choice)
      : await approvePlanChange(owner, b.quoteId, b.digest),
  );
});
