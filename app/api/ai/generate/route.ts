import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generate } from "@/lib/ai/generate";
import { z } from "zod";

const BodySchema = z.object({
  task: z.enum([
    "email_writer",
    "sms_writer",
    "voicemail_script",
    "follow_up",
    "note_summary",
    "next_best_action",
    "campaign_idea",
    "relationship_pulse",
  ]),
  brief: z.string().max(12000).optional(),
  context: z
    .object({
      contactName: z.string().max(200).optional(),
      contactId: z.string().uuid().optional(),
      contactNotes: z.string().max(12000).optional(),
      campaignName: z.string().max(200).optional(),
      tone: z.enum(["warm", "professional", "concise", "luxury"]).optional(),
      goal: z.string().max(2000).optional(),
      language: z.string().max(80).optional(),
    })
    .optional()
    .default({}),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  const result = await generate(body.task, body.context, body.brief);

  await writeAuditLog({
    ownerId,
    action: "AI_GENERATED",
    entityType: "ai_task",
    entityId: null,
    metadata: { task: body.task, provider: result.provider },
  }).catch(() => undefined);

  return apiSuccess(result);
});
