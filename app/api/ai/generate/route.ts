import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generate } from "@/lib/ai/generate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
  brief: z.string().max(6000).optional(),
  context: z
    .object({
      contactName: z.string().optional(),
      contactId: z.string().uuid().optional(),
      contactNotes: z.string().optional(),
      campaignName: z.string().optional(),
      tone: z.enum(["warm", "professional", "concise", "luxury"]).optional(),
      goal: z.string().optional(),
      language: z.string().optional(),
    })
    .optional()
    .default({}),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  if (body.context.contactId) {
    const owned = await supabaseAdmin.from("contacts").select("id,first_name,last_name,notes").eq("owner_id",ownerId).eq("id",body.context.contactId).maybeSingle();
    if (owned.error || !owned.data) return apiError("Selected contact is unavailable.",{status:404});
    body.context.contactName = [owned.data.first_name,owned.data.last_name].filter(Boolean).join(" ");
    body.context.contactNotes = String(owned.data.notes??"").slice(0,2000);
  }
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
