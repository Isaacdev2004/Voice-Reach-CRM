import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  isLiveCampaignProvider,
  isLiveOutboundAllowed,
  liveOutboundBlockedMessage,
} from "@/lib/billing/live-outbound";
import { evaluateEligibility } from "@/lib/compliance";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { dispatch } from "@/lib/providers/registry";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ campaignId: string }> };

export const POST = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .select("*, voice_assets(*)")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .single();

  if (campaignError || !campaign) {
    return apiError(campaignError?.message || "Campaign not found", { status: 404 });
  }

  if (isLiveCampaignProvider(campaign.provider) && !isLiveOutboundAllowed()) {
    return apiError(liveOutboundBlockedMessage(), {
      status: 403,
      code: "live_outbound_paused",
    });
  }

  if (!campaign.voice_assets?.approved) {
    return apiError("Campaign voice asset must be approved before sending.", {
      status: 400,
      code: "voice_asset_not_approved",
    });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const { data: signedAudio, error: signedError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(campaign.voice_assets.storage_path, 60 * 60);

  if (signedError || !signedAudio?.signedUrl) {
    return apiError(signedError?.message || "Unable to sign audio URL", { status: 500 });
  }

  const { data: recipients, error: recipientsError } = await supabaseAdmin
    .from("campaign_recipients")
    .select("*, contacts(*, consent_records(*))")
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId);

  if (recipientsError) return apiError(recipientsError.message, { status: 500 });

  await supabaseAdmin
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)
    .eq("owner_id", ownerId);

  const results: { recipientId: string; contactId: string; status: string; issues?: string[] }[] = [];

  for (const recipient of recipients || []) {
    const contact = recipient.contacts;
    const check = evaluateEligibility(contact);

    if (!check.eligible) {
      await supabaseAdmin
        .from("campaign_recipients")
        .update({
          eligibility_status: "blocked",
          eligibility_issues: check.issues,
          delivery_status: "blocked",
        })
        .eq("id", recipient.id)
        .eq("owner_id", ownerId);

      results.push({
        recipientId: recipient.id,
        contactId: contact.id,
        status: "blocked",
        issues: check.issues,
      });
      continue;
    }

    if (campaign.provider !== "mock") {
      const { assertCanSendChannel } = await import("@/lib/billing/plan-limits");
      const quota = await assertCanSendChannel(ownerId, "voicemail");
      if (!quota.ok) {
        results.push({
          recipientId: recipient.id,
          contactId: contact.id,
          status: "failed",
          issues: [quota.error],
        });
        continue;
      }
    }

    const voicemailProvider =
      campaign.provider === "mock"
        ? "mock"
        : campaign.provider || process.env.VOICE_PROVIDER || "mock";

    const providerResult = await dispatch(
      {
        channel: "voicemail",
        to: contact.phone,
        from: process.env.SLYBROADCAST_CALLER_ID ?? process.env.VOICE_PROVIDER_FROM_NUMBER,
        audioUrl: signedAudio.signedUrl,
        campaignId,
        recipientId: recipient.id,
      },
      voicemailProvider,
    );

    await supabaseAdmin
      .from("campaign_recipients")
      .update({
        eligibility_status: "eligible",
        eligibility_issues: [],
        delivery_status: providerResult.status,
        provider_message_id: providerResult.providerMessageId || null,
        provider_response: providerResult.rawResponse || {},
      })
      .eq("id", recipient.id)
      .eq("owner_id", ownerId);

    if (providerResult.ok) {
      await supabaseAdmin
        .from("contacts")
        .update({ last_contacted: new Date().toISOString().slice(0, 10) })
        .eq("id", contact.id)
        .eq("owner_id", ownerId);

      await recordEngagementEvent({
        ownerId,
        contactId: contact.id,
        campaignId,
        eventType: "delivered",
        channel: "voicemail",
        metadata: { provider: campaign.provider, providerMessageId: providerResult.providerMessageId },
      }).catch(() => undefined);

      if (providerResult.status !== "mock_sent" && campaign.provider !== "mock") {
        const { billPaygUsage } = await import("@/lib/billing/payg-usage");
        await billPaygUsage({
          ownerId,
          channel: "voicemail",
          idempotencyKey: `payg-voicemail-${recipient.id}-${providerResult.providerMessageId ?? "ok"}`,
          metadata: { campaignId, recipientId: recipient.id },
        }).catch(() => undefined);
      }
    }

    results.push({
      recipientId: recipient.id,
      contactId: contact.id,
      status: providerResult.status,
    });
  }

  const sentCount = results.filter((item) => item.status === "sent" || item.status === "mock_sent" || item.status === "queued").length;
  const blockedCount = results.filter((item) => item.status === "blocked").length;
  const failedCount = results.filter((item) => item.status === "failed").length;
  const finalStatus = failedCount > 0 || blockedCount > 0 ? "partial" : "sent";

  await supabaseAdmin
    .from("campaigns")
    .update({ status: finalStatus })
    .eq("id", campaignId)
    .eq("owner_id", ownerId);

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_SEND_ATTEMPTED",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { sentCount, blockedCount, failedCount },
  });

  return apiOk({ campaignId, finalStatus, sentCount, blockedCount, failedCount, results });
});
