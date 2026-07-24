import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { runDueStepRuns } from "@/lib/campaigns/engine";
import { enrollContacts, scheduleStepRunsForRecipients } from "@/lib/campaigns/enroll";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ campaignId: string }> };

const BodySchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1).max(25),
});

/**
 * End-to-end dry run: document test consent, enroll contacts, schedule steps
 * on an accelerated timeline, force mock provider, and process due runs.
 */
export const POST = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;
  const body = BodySchema.parse(await request.json());

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, status, voice_asset_id, voice_assets(id, approved, storage_path)")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (campaignError) return apiError(campaignError.message, { status: 500 });
  if (!campaign) return apiError("Campaign not found", { status: 404, code: "not_found" });

  const voice = Array.isArray(campaign.voice_assets)
    ? campaign.voice_assets[0]
    : campaign.voice_assets;

  if (!campaign.voice_asset_id || !voice?.approved) {
    return apiError(
      "Approve a voice recording and link it to this campaign (Voice Scripts → Approve → Use for campaign) before running a test.",
      { status: 400, code: "voice_asset_required" },
    );
  }

  const { count: stepCount } = await supabaseAdmin
    .from("campaign_steps")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId);

  if (!stepCount) {
    return apiError("This campaign has no steps yet. Save/activate the sequence from the builder first.", {
      status: 400,
      code: "no_steps",
    });
  }

  // Force mock delivery so the full sequence can be verified without live SMS/email/VM keys.
  await supabaseAdmin
    .from("campaigns")
    .update({
      provider: "mock",
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

  // Prefer newly enrolled recipients; if already enrolled, schedule for existing ones.
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

  // Clear prior scheduled runs for these recipients so the test is clean.
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

  // Process a few ticks in case step count exceeds the runner limit.
  let processed = 0;
  for (let i = 0; i < 5; i++) {
    const tick = await runDueStepRuns({ ownerId, limit: 50 });
    processed += tick.processed;
    if (tick.processed === 0) break;
  }

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_TEST_RUN",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { enrollment, schedule, processed, contactIds: body.contactIds },
  }).catch(() => undefined);

  return apiOk({
    enrollment,
    schedule,
    processed,
    message: `Test run finished: ${enrollment.enrolled || recipientIds.length} contact(s), ${schedule.scheduled} step(s) scheduled, ${processed} processed (mock delivery).`,
  });
});
