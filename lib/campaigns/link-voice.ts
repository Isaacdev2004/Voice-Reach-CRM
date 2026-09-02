import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StepRow = {
  id: string;
  type: string;
  step_order: number;
  voice_asset_id?: string | null;
  conditions?: { voiceAssetId?: string } | null;
};

function stepVoiceId(step: StepRow): string | null {
  return step.voice_asset_id || step.conditions?.voiceAssetId || null;
}

/**
 * Links a voice recording to a campaign.
 * - First open slot: campaign default + first voicemail step without a voice
 * - Later recordings: next voicemail step that still needs one
 * - Optional stepId: force-link to that specific step
 */
export async function linkVoiceAssetToCampaign(params: {
  ownerId: string;
  campaignId: string;
  voiceAssetId: string;
  stepId?: string | null;
}) {
  const { ownerId, campaignId, voiceAssetId, stepId } = params;

  const [{ data: campaign, error: campaignError }, { data: steps, error: stepsError }] =
    await Promise.all([
      supabaseAdmin
        .from("campaigns")
        .select("id, voice_asset_id")
        .eq("id", campaignId)
        .eq("owner_id", ownerId)
        .maybeSingle(),
      supabaseAdmin
        .from("campaign_steps")
        .select("id, type, step_order, voice_asset_id, conditions")
        .eq("campaign_id", campaignId)
        .eq("owner_id", ownerId)
        .order("step_order", { ascending: true }),
    ]);

  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) throw new Error("Campaign not found");
  if (stepsError) throw new Error(stepsError.message);

  const vmSteps = ((steps ?? []) as StepRow[]).filter((s) => s.type === "voicemail");

  let targetStep: StepRow | null = null;
  if (stepId) {
    targetStep = vmSteps.find((s) => s.id === stepId) ?? null;
    if (!targetStep) throw new Error("That step is not a voicemail step on this campaign.");
  } else {
    targetStep = vmSteps.find((s) => !stepVoiceId(s)) ?? null;
  }

  // Always keep a campaign-level default for older send paths / first VM
  if (!campaign.voice_asset_id || (!targetStep && vmSteps.length === 0)) {
    const { error } = await supabaseAdmin
      .from("campaigns")
      .update({ voice_asset_id: voiceAssetId, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("owner_id", ownerId);
    if (error) throw new Error(error.message);
  }

  if (targetStep) {
    const nextConditions = {
      ...(targetStep.conditions ?? {}),
      voiceAssetId,
    };
    const { error: stepError } = await supabaseAdmin
      .from("campaign_steps")
      .update({
        voice_asset_id: voiceAssetId,
        conditions: nextConditions,
      })
      .eq("id", targetStep.id)
      .eq("owner_id", ownerId);

    // Older DBs may not have voice_asset_id on steps yet — conditions still works
    if (stepError?.message?.toLowerCase().includes("voice_asset_id")) {
      const { error: fallbackError } = await supabaseAdmin
        .from("campaign_steps")
        .update({ conditions: nextConditions })
        .eq("id", targetStep.id)
        .eq("owner_id", ownerId);
      if (fallbackError) throw new Error(fallbackError.message);
    } else if (stepError) {
      throw new Error(stepError.message);
    }

    const orderLabel = targetStep.step_order + 1;
    return {
      linkedTo: "step" as const,
      stepId: targetStep.id,
      stepOrder: targetStep.step_order,
      message: `Linked to voicemail step ${orderLabel}. You can link another recording to the next voicemail step.`,
    };
  }

  // All voicemail steps already have a voice — update campaign default
  const { error } = await supabaseAdmin
    .from("campaigns")
    .update({ voice_asset_id: voiceAssetId, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);

  return {
    linkedTo: "campaign" as const,
    stepId: null,
    stepOrder: null,
    message:
      vmSteps.length > 1
        ? "All voicemail steps already had recordings — updated the campaign default voice. Open the campaign to reassign per step."
        : "Voice recording linked to campaign.",
  };
}

export async function resolveStepVoiceAssetId(params: {
  step: StepRow;
  campaignVoiceAssetId?: string | null;
  allVmSteps?: StepRow[];
}): Promise<string | null> {
  const fromStep = stepVoiceId(params.step);
  if (fromStep) return fromStep;
  // First voicemail step inherits campaign default when no per-step voice is set
  if (params.step.type === "voicemail" && params.campaignVoiceAssetId) {
    const ordered = (params.allVmSteps ?? []).slice().sort((a, b) => a.step_order - b.step_order);
    if (!ordered.length || ordered[0]?.id === params.step.id) {
      return params.campaignVoiceAssetId;
    }
  }
  return params.campaignVoiceAssetId ?? null;
}
