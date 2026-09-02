import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  isLiveCampaignProvider,
  isLiveOutboundAllowed,
  liveOutboundBlockedMessage,
} from "@/lib/billing/live-outbound";
import { isUuid } from "@/lib/contacts/is-uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ campaignId: string }> };

function requireCampaignUuid(campaignId: string) {
  if (!isUuid(campaignId)) {
    return apiError("Invalid campaign id. Create a campaign in Campaigns, then link your voice.", {
      status: 400,
      code: "invalid_campaign_id",
    });
  }
  return null;
}

export const GET = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;
  const invalid = requireCampaignUuid(campaignId);
  if (invalid) return invalid;

  const [campaignRes, stepsRes, recipientsRes, runsRes, engagementRes] = await Promise.all([
    supabaseAdmin
      .from("campaigns")
      .select("*, voice_assets(id, title, approved, storage_path, audio_url)")
      .eq("id", campaignId)
      .eq("owner_id", ownerId)
      .maybeSingle(),
    supabaseAdmin
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .order("step_order", { ascending: true }),
    supabaseAdmin
      .from("campaign_recipients")
      .select(
        "id, eligibility_status, eligibility_issues, delivery_status, provider_message_id, updated_at, contacts(id, first_name, last_name, phone, email, dnc)",
      )
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false }),
    supabaseAdmin
      .from("campaign_step_runs")
      .select("id, step_id, recipient_id, status, scheduled_at, executed_at, result")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .order("scheduled_at", { ascending: true }),
    supabaseAdmin
      .from("engagement_events")
      .select("id, event_type, channel, contact_id, occurred_at, score")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);

  if (campaignRes.error) return apiError(campaignRes.error.message, { status: 500 });
  if (!campaignRes.data)
    return apiError("Campaign not found", { status: 404, code: "not_found" });

  const recipients = recipientsRes.data ?? [];
  const runs = runsRes.data ?? [];

  const counts = {
    total: recipients.length,
    eligible: recipients.filter((r) => r.eligibility_status === "eligible").length,
    blocked: recipients.filter(
      (r) => r.eligibility_status === "blocked" || r.delivery_status === "blocked",
    ).length,
    sent: recipients.filter((r) =>
      ["sent", "mock_sent", "queued", "delivered"].includes(r.delivery_status),
    ).length,
    failed: recipients.filter((r) => r.delivery_status === "failed").length,
    notSent: recipients.filter((r) => r.delivery_status === "not_sent").length,
  };

  const blockedReport = recipients
    .filter(
      (r) =>
        r.eligibility_status === "blocked" ||
        r.delivery_status === "blocked" ||
        (Array.isArray(r.eligibility_issues) && r.eligibility_issues.length > 0),
    )
    .map((r) => {
      const contact = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
      return {
        id: r.id,
        contactId: contact?.id ?? null,
        name: contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() : "Contact",
        phone: contact?.phone ?? "",
        email: contact?.email ?? "",
        dnc: contact?.dnc ?? false,
        issues: Array.isArray(r.eligibility_issues) ? r.eligibility_issues : [],
        deliveryStatus: r.delivery_status,
        eligibilityStatus: r.eligibility_status,
        updatedAt: r.updated_at,
      };
    });

  const runCounts = {
    total: runs.length,
    scheduled: runs.filter((r) => r.status === "scheduled").length,
    sent: runs.filter((r) => r.status === "sent").length,
    failed: runs.filter((r) => r.status === "failed").length,
    blocked: runs.filter((r) => r.status === "blocked").length,
    skipped: runs.filter((r) => r.status === "skipped").length,
  };

  return apiOk({
    campaign: campaignRes.data,
    steps: stepsRes.data ?? [],
    recipients,
    runs,
    engagement: engagementRes.data ?? [],
    counts,
    runCounts,
    blockedReport,
  });
});

const PatchSchema = z.object({
  voiceAssetId: z.string().uuid().nullable().optional(),
  /** When set with voiceAssetId, link that recording to this voicemail step */
  stepId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).optional(),
  /** mock = simulation; any other id (e.g. slybroadcast) = live when ALLOW_LIVE_OUTBOUND=true */
  provider: z.string().min(1).optional(),
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;
  const invalid = requireCampaignUuid(campaignId);
  if (invalid) return invalid;
  const body = PatchSchema.parse(await request.json());

  let linkResult: Awaited<ReturnType<typeof linkVoiceAssetToCampaign>> | null = null;

  if (body.voiceAssetId) {
    const { data: asset, error: assetError } = await supabaseAdmin
      .from("voice_assets")
      .select("id, approved")
      .eq("id", body.voiceAssetId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (assetError) return apiError(assetError.message, { status: 500 });
    if (!asset) return apiError("Voice asset not found", { status: 404 });
    if (!asset.approved) {
      return apiError("Approve the voice recording before linking it to a campaign.", {
        status: 400,
        code: "voice_asset_not_approved",
      });
    }

    try {
      const { linkVoiceAssetToCampaign } = await import("@/lib/campaigns/link-voice");
      linkResult = await linkVoiceAssetToCampaign({
        ownerId,
        campaignId,
        voiceAssetId: body.voiceAssetId,
        stepId: body.stepId,
      });
    } catch (e) {
      return apiError(e instanceof Error ? e.message : "Could not link voice", { status: 400 });
    }
  } else if (body.voiceAssetId === null) {
    // Explicit unlink of campaign default only
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.voiceAssetId === null) updates.voice_asset_id = null;
  if (body.name) updates.name = body.name;
  if (body.provider !== undefined) {
    if (isLiveCampaignProvider(body.provider) && !isLiveOutboundAllowed()) {
      return apiError(liveOutboundBlockedMessage(), {
        status: 403,
        code: "live_outbound_paused",
      });
    }
    updates.provider = body.provider;
  }

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .update(updates)
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .select("*, voice_assets(id, title, approved, storage_path)")
    .single();

  if (error) return apiError(error.message, { status: 500 });
  if (!data) return apiError("Campaign not found", { status: 404 });

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_UPDATED",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { ...body, linkResult },
  });

  return apiOk({ campaign: data, link: linkResult });
});
