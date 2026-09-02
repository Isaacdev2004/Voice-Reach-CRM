import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { persistSteps, type CampaignBlueprintStep } from "@/lib/campaigns/engine";
import { getTemplate, instantiateTemplate } from "@/lib/crm/campaign-templates";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  templateKey: z.string().min(1).default("cold-lead-reengage"),
  createAutomation: z.boolean().optional().default(true),
});

/** Supports "Day 1", "Day 30", "Day 180" etc. */
export function delayFromDayLabel(dayLabel?: string): number {
  const match = dayLabel?.match(/day\s*(\d+)/i);
  if (!match) return 0;
  const day = Number(match[1]);
  return Number.isNaN(day) ? 0 : Math.max(0, (day - 1) * 24 * 60);
}

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json().catch(() => ({})));
  const template = getTemplate(body.templateKey);
  const campaign = instantiateTemplate(body.templateKey);
  if (!template || !campaign) return apiError("Unknown campaign template.", { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id, name")
    .eq("owner_id", ownerId)
    .eq("name", campaign.name)
    .maybeSingle();

  if (existing?.id) {
    return apiOk({
      campaignId: existing.id,
      alreadyExisted: true,
      message: `"${campaign.name}" is already in your library.`,
    });
  }

  // Always start in Simulation so template campaigns never auto-fire live RVM.
  const provider = "mock";
  const { data: latestVoice } = await supabaseAdmin
    .from("voice_assets")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: record, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      owner_id: ownerId,
      name: campaign.name,
      script_id: `template-${body.templateKey}`,
      provider,
      status: "draft",
      voice_asset_id: latestVoice?.id ?? null,
    })
    .select("*")
    .single();

  if (error) return apiError(error.message, { status: 500 });

  const steps: CampaignBlueprintStep[] = campaign.steps.map((step) => ({
    id: step.id,
    order: step.order,
    type: (step.type === "retargeting" ? "email" : step.type) as CampaignBlueprintStep["type"],
    title: step.title,
    description: step.description,
    delayMinutes: delayFromDayLabel(step.dayLabel),
    dayLabel: step.dayLabel,
    timeLabel: step.timeLabel,
  }));

  await persistSteps(ownerId, record.id, steps);

  let automationRuleId: string | null = null;
  if (body.createAutomation && template.automation) {
    const { data: rule } = await supabaseAdmin
      .from("automation_rules")
      .insert({
        owner_id: ownerId,
        name: template.automation.name,
        description: template.automation.description,
        trigger_type: template.automation.triggerType,
        trigger_config: template.automation.triggerConfig ?? {},
        actions: [{ type: "start_campaign", config: { campaignId: record.id } }],
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    automationRuleId = rule?.id ?? null;
  }

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_CREATED_FROM_TEMPLATE",
    entityType: "campaign",
    entityId: record.id,
    metadata: { templateKey: body.templateKey, automationRuleId },
  }).catch(() => undefined);

  return apiOk(
    {
      campaignId: record.id,
      automationRuleId,
      alreadyExisted: false,
      voiceAttached: Boolean(latestVoice?.id),
      message: latestVoice?.id
        ? `"${campaign.name}" is ready with your latest approved voice. Add consented contacts, then Run sequence → Live send.`
        : `"${campaign.name}" is ready. Add consented contacts, approve a voice if needed, then Run sequence → Live send.`,
    },
    { status: 201 },
  );
});
