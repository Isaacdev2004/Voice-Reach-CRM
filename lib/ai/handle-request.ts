import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { AI_ERROR_MESSAGES, AiGenerationError, withAiDeadline } from "./errors";
import type { AiResult } from "./generate";
import type { AiContext, AiTaskType } from "./prompts";

const BodySchema = z.object({
  task: z.enum(["email_writer", "sms_writer", "voicemail_script", "follow_up", "note_summary", "next_best_action", "campaign_idea", "relationship_pulse"]),
  brief: z.string().max(4000).optional(),
  context: z.object({
    contactName: z.string().max(200).optional(), contactId: z.string().uuid().optional(),
    contactNotes: z.string().max(6000).optional(), campaignName: z.string().max(200).optional(),
    tone: z.enum(["warm", "professional", "concise", "luxury"]).optional(),
    goal: z.string().max(1000).optional(), language: z.string().max(80).optional(),
  }).optional().default({}),
});

type AiDependencies = {
  requireOwnerId: () => Promise<string>;
  loadContext: (ownerId: string, context: AiContext) => Promise<AiContext>;
  generateDraft: (task: AiTaskType, context: AiContext, brief?: string) => Promise<AiResult>;
  audit: (ownerId: string, task: AiTaskType, provider: string) => Promise<unknown>;
};

/** Injectable boundary permits API tests without real authentication, customer data or providers. */
export function createAiHandler(dependencies: AiDependencies) {
  return async (request: Request) => {
    try {
      const ownerId = await dependencies.requireOwnerId();
      const parsed = BodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return apiError(AI_ERROR_MESSAGES.invalid_request, { status: 400, code: "ai_invalid_request" });
      const body = parsed.data;
      const context = await withAiDeadline(() => dependencies.loadContext(ownerId, body.context), 5000);
      const result = await dependencies.generateDraft(body.task, context, body.brief);
      // Only operational metadata is logged; never briefs, prompts, notes or generated content.
      await withAiDeadline(() => dependencies.audit(ownerId, result.task, result.provider), 1000).catch(() => undefined);
      return apiSuccess(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") return apiError("Sign in required", { status: 401, code: "unauthorized" });
      if (error instanceof AiGenerationError) return apiError(error.message, { status: error.status, code: `ai_${error.code}` });
      return apiError(AI_ERROR_MESSAGES.unavailable, { status: 503, code: "ai_unavailable" });
    }
  };
}
