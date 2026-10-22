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
    const { data: contact, error } = await supabaseAdmin
      .from("contacts")
      .select("id, owner_id, phone, email, dnc, opt_out_requested")
      .eq("owner_id", request.ownerId)
      .eq("id", request.contactId)
      .maybeSingle();
    if (error || !contact)
      return ["Contact authorization could not be verified."];
    if(!request.campaignId.startsWith('automation-')){const {data:campaign,error:campaignError}=await supabaseAdmin.from('campaigns').select('id, provider, status, live_launched').eq('owner_id',request.ownerId).eq('id',request.campaignId).maybeSingle();if(campaignError||!campaign||!campaign.live_launched||!['sending','queued'].includes(campaign.status))return ['This campaign is not authorized for live delivery.'];}
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
