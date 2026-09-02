import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  isLiveOutboundAllowed,
  liveOutboundBlockedMessage,
} from "@/lib/billing/live-outbound";
import { runDueStepRuns } from "@/lib/campaigns/engine";
import { enrollContacts, scheduleStepRunsForRecipients } from "@/lib/campaigns/enroll";
import { isLiveProvidersConfigured } from "@/lib/providers/registry";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ campaignId: string }> };

const BodySchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1).max(25),
  /** mock = pipeline check only; live = real Twilio / Slybroadcast / Resend when configured */
  mode: z.enum(["mock", "live"]).optional().default("mock"),
});

export const POST = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;
  const body = BodySchema.parse(await request.json());
  const live = body.mode === "live";
  const providers = isLiveProvidersConfigured();

  if (live && !isLiveOutboundAllowed()) {
    return apiError(liveOutboundBlockedMessage(), {
      status: 403,
      code: "live_outbound_paused",
    });
  }

  if (live && !providers.voicemail && !providers.sms && !providers.email) {
    return apiError(
      "Live sending is not configured yet. Add Twilio (SMS), Slybroadcast (ringless voicemail), and/or Resend (email) in Vercel env, then redeploy. Until then use Simulation mode.",
      { status: 400, code: "providers_not_configured" },
    );
  }

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, status, voice_asset_id, voice_assets(id, approved, storage_path)")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (campaignError) return apiError(campaignError.message, { status: 500 });
  if (!campaign) return apiError("Campaign not found", { status: 404, code: "not_found" });

  const { data: steps, error: stepsError } = await supabaseAdmin
    .from("campaign_steps")
    .select("id, type, voice_asset_id, conditions")
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId);

  if (stepsError) return apiError(stepsError.message, { status: 500 });
  if (!steps?.length) {
    return apiError("This campaign has no steps yet. Save/activate the sequence from the builder first.", {
      status: 400,
      code: "no_steps",
    });
  }

  const needsVoicemail = steps.some((s) => s.type === "voicemail");
  const needsSms = steps.some((s) => s.type === "sms");
  const needsEmail = steps.some((s) => s.type === "email");

  if (live) {
    if (needsSms && !providers.sms) {
      return apiError(
        "This sequence has SMS steps, but Twilio is not configured (TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM_NUMBER).",
        { status: 400, code: "sms_not_configured" },
      );
    }
    if (needsEmail && !providers.email) {
      return apiError(
        "This sequence has email steps, but Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).",
        { status: 400, code: "email_not_configured" },
      );
    }
    if (needsVoicemail && !providers.voicemail) {
      return apiError(
        "This sequence has ringless voicemail steps, but Slybroadcast is not configured.",
        { status: 400, code: "voicemail_not_configured" },
      );
    }
  }

  const voice = Array.isArray(campaign.voice_assets)
    ? campaign.voice_assets[0]
    : campaign.voice_assets;

  // Voice recording is only required when the sequence includes a voicemail step.
  const anyStepHasVoice = (steps ?? []).some((s) => {
    if (s.type !== "voicemail") return false;
    const conditions = s.conditions as { voiceAssetId?: string } | null;
    return Boolean(s.voice_asset_id || conditions?.voiceAssetId);
  });
  if (needsVoicemail && !campaign.voice_asset_id && !anyStepHasVoice) {
    return apiError(
      "This sequence has ringless voicemail steps. Approve a voice recording and tap Use for campaign for each voicemail step (or link one as the campaign default).",
      { status: 400, code: "voice_asset_required" },
    );
  }

  const provider = live
    ? process.env.VOICE_PROVIDER?.trim() || "slybroadcast"
    : "mock";

  await supabaseAdmin
    .from("campaigns")
    .update({
      provider,
      status: "queued",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("owner_id", ownerId);

  const enrollment = await enrollContacts(ownerId, campaignId, {
    contactIds: body.contactIds,
    documentTestConsent: true,
  });

  if (enrollment.eligible === 0) {
    return apiError(
      "Could not make those contacts eligible (check phone numbers and do-not-contact flags).",
      { status: 400, code: "no_eligible_contacts" },
    );
  }

  let recipientIds = enrollment.recipientIds;
  if (!recipientIds.length) {
    const { data: existing } = await supabaseAdmin
      .from("campaign_recipients")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .in("contact_id", body.contactIds)
      .eq("eligibility_status", "eligible");
    recipientIds = (existing ?? []).map((r) => r.id as string);
  }

  if (!recipientIds.length) {
    return apiError("No recipients available to schedule for this test.", {
      status: 400,
      code: "no_recipients",
    });
  }

  await supabaseAdmin
    .from("campaign_step_runs")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId)
    .in("recipient_id", recipientIds)
    .eq("status", "scheduled");

  const schedule = await scheduleStepRunsForRecipients(ownerId, campaignId, recipientIds, {
    accelerated: true,
  });

  let processed = 0;
  for (let i = 0; i < 5; i++) {
    const tick = await runDueStepRuns({ ownerId, limit: 50 });
    processed += tick.processed;
    if (tick.processed === 0) break;
  }

  await writeAuditLog({
    ownerId,
    action: live ? "CAMPAIGN_LIVE_TEST_RUN" : "CAMPAIGN_TEST_RUN",
    entityType: "campaign",
    entityId: campaignId,
    metadata: {
      enrollment,
      schedule,
      processed,
      contactIds: body.contactIds,
      mode: body.mode,
      providers,
    },
  }).catch(() => undefined);

  const modeLabel = live
    ? "LIVE delivery (check the contact’s phone/inbox)"
    : "simulation only — nothing was sent to a real phone";

  return apiOk({
    enrollment,
    schedule,
    processed,
    mode: body.mode,
    providers,
    message: `Run finished (${modeLabel}): ${processed} step(s) processed for ${recipientIds.length} contact(s).`,
  });
});
