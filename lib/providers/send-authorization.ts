import { sharedReplyHeld } from "@/lib/communications/safety";
import { normalizeE164 } from "@/lib/communications/inbound";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { evaluateEligibility } from "@/lib/compliance";
import { isInQuietHours } from "@/lib/compliance/quiet-hours";
import { isLiveOutboundAllowed } from "@/lib/billing/live-outbound";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace";
import type { SendRequest } from "./types";
/** Last live-delivery boundary, including automations and legacy manual sends. */
export async function authorizeLiveOutbound(
  request: SendRequest,
): Promise<string[]> {
  if (!isLiveOutboundAllowed()) return ["Live outbound is paused."];
  if (!request.ownerId || !request.contactId)
    return ["An authorized subscriber and contact are required."];
  try {
    if (request.channel === "sms") {
      const phone = normalizeE164(request.to);
      if (!phone) return ["The SMS destination could not be verified."];
      const sender = request.from || process.env.TWILIO_FROM_NUMBER;
      if (sender && (await sharedReplyHeld(sender, phone)))
        return [
          "SMS is paused for this number while an inbound reply awaits authorized routing review.",
        ];
      const suppression = await supabaseAdmin
        .from("communication_suppressions")
        .select("phone")
        .eq("owner_id", request.ownerId)
        .eq("phone", phone)
        .eq("channel", "sms")
        .limit(1);
      if (suppression.error) return ["SMS suppression could not be verified."];
      if (suppression.data?.length)
        return ["This phone number has opted out of SMS."];
    }
    const { data: contact, error } = await supabaseAdmin
      .from("contacts")
      .select("id, owner_id, phone, email, dnc, opt_out_requested")
      .eq("owner_id", request.ownerId)
      .eq("id", request.contactId)
      .maybeSingle();
    if (error || !contact)
      return ["Contact authorization could not be verified."];
    if (!request.campaignId.startsWith("automation-")) {
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("campaigns")
        .select("id, provider, status, live_launched")
        .eq("owner_id", request.ownerId)
        .eq("id", request.campaignId)
        .maybeSingle();
      if (
        campaignError ||
        !campaign ||
        !campaign.live_launched ||
        !["sending", "queued"].includes(campaign.status)
      )
        return ["This campaign is not authorized for live delivery."];
    }
    if (!request.campaignId.startsWith("automation-")) {
      const recipient = await supabaseAdmin
        .from("campaign_recipients")
        .select("created_at")
        .eq("owner_id", request.ownerId)
        .eq("id", request.recipientId)
        .eq("campaign_id", request.campaignId)
        .eq("contact_id", request.contactId)
        .maybeSingle();
      if (recipient.error || !recipient.data?.created_at)
        return ["Recipient enrollment could not be verified."];
      const replies = await supabaseAdmin
        .from("engagement_events")
        .select("id")
        .eq("owner_id", request.ownerId)
        .eq("contact_id", request.contactId)
        .in("event_type", ["replied", "callback", "opt_out"])
        .gte("occurred_at", recipient.data.created_at)
        .limit(1);
      if (replies.error) return ["Reply stopping could not be verified."];
      if (replies.data?.length)
        return [
          "Contact responded or opted out after enrollment. Review before further outreach.",
        ];
    }
    const { workspace, profile } = await loadWorkspaceSettings(
      request.ownerId,
      { outbound: true },
    );
    const { data: records, error: consentError } = await supabaseAdmin
      .from("consent_records")
      .select("status, consent_date, source, proof_reference, created_at")
      .eq("owner_id", request.ownerId)
      .eq("contact_id", request.contactId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (consentError) return ["Contact consent could not be verified."];
    const issues = evaluateEligibility({
      ...contact,
      consent_records: records ?? [],
    }).issues.filter(
      (issue) =>
        workspace.requireConsentProof ||
        issue !== "Missing consent proof/reference",
    );
    if (issues.length)
      return ["Contact consent or suppression requirements are not met."];
    if (!workspace.defaultSenderName && !profile.fullName)
      return ["Configure your actual sender identity before delivery."];
    if (
      isInQuietHours({
        quietHoursStart: workspace.quietHoursStart,
        quietHoursEnd: workspace.quietHoursEnd,
        timeZone: profile.timezone,
      })
    )
      return ["Delivery is restricted by the workspace quiet hours."];
    const actual = request.channel === "email" ? contact.email : contact.phone;
    const normalize = (v: unknown) =>
      typeof v === "string"
        ? request.channel === "email"
          ? v.trim().toLowerCase()
          : v.replace(/\D/g, "")
        : "";
    if (!normalize(actual) || normalize(actual) !== normalize(request.to))
      return ["The destination no longer matches the authorized contact."];
    return [];
  } catch {
    return ["Delivery authorization is temporarily unavailable."];
  }
}
