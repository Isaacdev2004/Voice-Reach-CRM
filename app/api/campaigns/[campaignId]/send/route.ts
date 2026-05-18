import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";
import { evaluateEligibility } from "@/lib/compliance";
import { sendVoicemail } from "@/lib/providerAdapter";

export async function POST(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .select("*, voice_assets(*)")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .single();

  if (campaignError || !campaign) return NextResponse.json({ error: campaignError?.message || "Campaign not found" }, { status: 404 });

  if (!campaign.voice_assets?.approved) {
    return NextResponse.json({ error: "Campaign voice asset must be approved before sending." }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const { data: signedAudio, error: signedError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(campaign.voice_assets.storage_path, 60 * 60);

  if (signedError || !signedAudio?.signedUrl) {
    return NextResponse.json({ error: signedError?.message || "Unable to sign audio URL" }, { status: 500 });
  }

  const { data: recipients, error: recipientsError } = await supabaseAdmin
    .from("campaign_recipients")
    .select("*, contacts(*, consent_records(*))")
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId);

  if (recipientsError) return NextResponse.json({ error: recipientsError.message }, { status: 500 });

  await supabaseAdmin.from("campaigns").update({ status: "sending" }).eq("id", campaignId).eq("owner_id", ownerId);

  const results = [];

  for (const recipient of recipients || []) {
    const contact = recipient.contacts;
    const check = evaluateEligibility(contact);

    if (!check.eligible) {
      await supabaseAdmin.from("campaign_recipients").update({
        eligibility_status: "blocked",
        eligibility_issues: check.issues,
        delivery_status: "blocked",
      }).eq("id", recipient.id).eq("owner_id", ownerId);

      results.push({ recipientId: recipient.id, contactId: contact.id, status: "blocked", issues: check.issues });
      continue;
    }

    const providerResult = await sendVoicemail({
      to: contact.phone,
      from: process.env.VOICE_PROVIDER_FROM_NUMBER || "",
      audioUrl: signedAudio.signedUrl,
      campaignId,
      recipientId: recipient.id,
    });

    await supabaseAdmin.from("campaign_recipients").update({
      eligibility_status: "eligible",
      eligibility_issues: [],
      delivery_status: providerResult.status,
      provider_message_id: providerResult.providerMessageId || null,
      provider_response: providerResult.raw || {},
    }).eq("id", recipient.id).eq("owner_id", ownerId);

    if (providerResult.ok) {
      await supabaseAdmin.from("contacts").update({ last_contacted: new Date().toISOString().slice(0, 10) }).eq("id", contact.id).eq("owner_id", ownerId);
    }

    results.push({ recipientId: recipient.id, contactId: contact.id, status: providerResult.status });
  }

  const sentCount = results.filter((item) => item.status === "sent" || item.status === "mock_sent").length;
  const blockedCount = results.filter((item) => item.status === "blocked").length;
  const failedCount = results.filter((item) => item.status === "failed").length;
  const finalStatus = failedCount > 0 || blockedCount > 0 ? "partial" : "sent";

  await supabaseAdmin.from("campaigns").update({ status: finalStatus }).eq("id", campaignId).eq("owner_id", ownerId);
  await writeAuditLog({ ownerId, action: "CAMPAIGN_SEND_ATTEMPTED", entityType: "campaign", entityId: campaignId, metadata: { sentCount, blockedCount, failedCount } });

  return NextResponse.json({ campaignId, finalStatus, sentCount, blockedCount, failedCount, results });
}
