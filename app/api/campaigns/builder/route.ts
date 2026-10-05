import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  persistSteps,
  scheduleStepRunsForCampaign,
  type CampaignBlueprintStep,
} from "@/lib/campaigns/engine";
import { enrollContacts } from "@/lib/campaigns/enroll";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const StepSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: z.enum(["voicemail", "sms", "email", "avatar_video", "task", "callback", "wait", "retargeting"]),
  title: z.string(),
  description: z.string().optional().default(""),
  delayMinutes: z.number().int().nonnegative().optional(),
  dayLabel: z.string().optional(),
  timeLabel: z.string().optional(),
  status: z.enum(["sent", "active", "pending", "draft"]).optional(),
  voiceAssetId: z.string().uuid().nullable().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        storagePath: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number().optional(),
      }),
    )
    .optional(),
});

const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  audience: z.string(),
  durationDays: z.number(),
  steps: z.array(StepSchema).min(1, "Add at least one automation step"),
  goals: z.array(z.string()).optional().default([]),
  provider: z.string().optional(),
});

const BodySchema = z.object({
  action: z.enum(["template", "activate"]),
  campaign: BlueprintSchema,
  campaignId: z.string().uuid().optional(),
  /** When set, only these contacts are enrolled (must still pass compliance). */
  contactIds: z.array(z.string().uuid()).optional(),
  /** Explicit opt-in to enroll every eligible contact in the CRM. */
  enrollAllEligible: z.boolean().optional().default(false),
});

async function upsertCampaign(
  ownerId: string,
  blueprint: z.infer<typeof BlueprintSchema>,
  status: "draft" | "queued",
  existingId?: string,
) {
  const scriptId = `builder-${blueprint.id}`;

  if (existingId) {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .update({
        name: blueprint.name,
        script_id: scriptId,
        provider: blueprint.provider === "mock" || !blueprint.provider ? "mock" : blueprint.provider,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId)
      .eq("owner_id", ownerId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      owner_id: ownerId,
      name: blueprint.name,
      script_id: scriptId,
      provider: blueprint.provider === "mock" || !blueprint.provider ? "mock" : blueprint.provider,
      status,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

function mapStepsToBlueprint(steps: z.infer<typeof StepSchema>[]): CampaignBlueprintStep[] {
  return steps.map((step) => {
    const conditions: Record<string, unknown> = {};
    if (step.voiceAssetId) conditions.voiceAssetId = step.voiceAssetId;
    if (step.attachments?.length) conditions.attachments = step.attachments;
    return {
      id: step.id,
      order: step.order,
      type: (step.type === "retargeting" ? "email" : step.type) as CampaignBlueprintStep["type"],
      title: step.title,
      description: step.description,
      delayMinutes: step.delayMinutes ?? guessDelay(step),
      dayLabel: step.dayLabel,
      timeLabel: step.timeLabel,
      conditions: Object.keys(conditions).length ? conditions : undefined,
    };
  });
}

function guessDelay(step: { dayLabel?: string }): number {
  const match = step.dayLabel?.match(/day\s*(\d+)/i);
  if (!match) return 0;
  const day = Number(match[1]);
  if (Number.isNaN(day)) return 0;
  return Math.max(0, (day - 1) * 24 * 60);
}

export const POST = withApiHandler(async (request: Request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  const { action, campaign: blueprint, campaignId: existingId, contactIds, enrollAllEligible } =
    body;

  if (action === "template") {
    const record = await upsertCampaign(ownerId, blueprint, "draft", existingId);
    await persistSteps(ownerId, record.id, mapStepsToBlueprint(blueprint.steps));

    await writeAuditLog({
      ownerId,
      action: "CAMPAIGN_TEMPLATE_SAVED",
      entityType: "campaign",
      entityId: record.id,
      metadata: { blueprint, audience: blueprint.audience, stepCount: blueprint.steps.length },
    });

    return apiSuccess({
      campaignId: record.id,
      status: "draft",
      message: "Template saved. You can activate when ready.",
    });
  }

  if (!enrollAllEligible && (!contactIds || contactIds.length === 0)) {
    return apiError("Select at least one contact before activating, or choose all eligible contacts.", {
      status: 400,
      code: "validation_error",
    });
  }

  const record = await upsertCampaign(ownerId, blueprint, "queued", existingId);
  await persistSteps(ownerId, record.id, mapStepsToBlueprint(blueprint.steps));
  const enrollment = await enrollContacts(ownerId, record.id, {
    contactIds: enrollAllEligible ? undefined : contactIds,
  });
  const schedule = await scheduleStepRunsForCampaign(ownerId, record.id);

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_ACTIVATED",
    entityType: "campaign",
    entityId: record.id,
    metadata: {
      blueprint,
      enrollment,
      schedule,
      stepCount: blueprint.steps.length,
      durationDays: blueprint.durationDays,
    },
  });

  if (enrollment.enrolled === 0) {
    return apiError("Campaign queued, but no eligible contacts to enroll. Add contacts with consent.", {
      status: 200,
      code: "no_eligible_contacts",
      details: { campaignId: record.id, enrollment, schedule },
    });
  }

  return apiSuccess({
    campaignId: record.id,
    status: "queued",
    enrollment,
    schedule,
    message: `Campaign queued - ${schedule.scheduled} step runs scheduled for ${enrollment.enrolled} contact${enrollment.enrolled === 1 ? "" : "s"}.`,
  });
});
