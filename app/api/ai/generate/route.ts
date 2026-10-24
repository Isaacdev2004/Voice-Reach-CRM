import { legacyAi } from "@/lib/billing/ai/legacy";
import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generate } from "@/lib/ai/generate";
import { ownedContact, rows } from "@/lib/assistant/reads";
import { reserveUsage, AssistantFailure } from "@/lib/assistant/store";
import { assistantBody } from "@/lib/assistant/body";
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
      contactName: z.string().max(6000).optional(),
      contactId: z.string().uuid().optional(),
      contactNotes: z.string().max(6000).optional(),
      campaignId: z.string().uuid().optional(),
      campaignName: z.string().max(6000).optional(),
      tone: z.enum(["warm", "professional", "concise", "luxury"]).optional(),
      goal: z.string().max(6000).optional(),
      language: z.string().max(6000).optional(),
    })
    .optional()
    .default({}),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await assistantBody(request));
  try {
    await reserveUsage(ownerId, crypto.randomUUID());
    const context = {
      ...body.context,
      contactName: undefined as string | undefined,
      contactNotes: undefined as string | undefined,
      campaignName: undefined as string | undefined,
    };
    if (body.context.contactId) {
      const contact = await ownedContact(ownerId, body.context.contactId);
      context.contactName = [contact.first_name, contact.last_name]
        .filter(Boolean)
        .join(" ");
      context.contactNotes = contact.notes ?? undefined;
    }
    if (body.context.campaignId) {
      const campaign = await rows(ownerId, "campaigns", "id,name", {
        id: body.context.campaignId,
      });
      if (!campaign.records[0]) throw new Error("Campaign not found");
      context.campaignName = String(campaign.records[0].name);
    }
    const operation = crypto.randomUUID();
    const generateDraft = () => generate(body.task, context, body.brief);
    const result = await legacyAi(
      ownerId,
      "requests",
      `legacy:${operation}`,
      () =>
        ["sms_writer", "email_writer"].includes(body.task)
          ? legacyAi(
              ownerId,
              "message_drafts",
              `legacy-draft:${operation}`,
              generateDraft,
            )
          : body.task === "campaign_idea"
            ? legacyAi(
                ownerId,
                "campaign_drafts",
                `legacy-campaign:${operation}`,
                generateDraft,
              )
            : generateDraft(),
    );

    await writeAuditLog({
      ownerId,
      action: "AI_GENERATED",
      entityType: "ai_task",
      entityId: null,
      metadata: { task: body.task, provider: result.provider },
    }).catch(() => undefined);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AssistantFailure)
      return apiError(error.message, { status: error.status });
    throw error;
  }
});
