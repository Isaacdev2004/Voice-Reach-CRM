import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { enrollContacts } from "@/lib/campaigns/enroll";
import { scheduleStepRunsForCampaign } from "@/lib/campaigns/engine";
import {
  contactIdsForPulseLane,
  loadRelationshipPulseForOwner,
} from "@/lib/contacts/load-relationship-pulse";
import type { PulseLaneId } from "@/lib/contacts/relationship-pulse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  laneId: z.enum(["needs_attention", "heating_up", "ready_for_business"]),
  campaignId: z.string().uuid(),
  activate: z.boolean().optional().default(false),
});

export const POST = withApiHandler(async (request: Request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  const laneId = body.laneId as PulseLaneId;

  const pulse = await loadRelationshipPulseForOwner(ownerId);
  const contactIds = contactIdsForPulseLane(pulse, laneId);
  if (contactIds.length === 0) {
    return apiError("No contacts in this lane to enroll.", { status: 400, code: "empty_lane" });
  }

  const { data: campaign, error: campErr } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, status")
    .eq("owner_id", ownerId)
    .eq("id", body.campaignId)
    .maybeSingle();

  if (campErr) return apiError("Information could not be saved or loaded. Please try again.", { status: 500 });
  if (!campaign) return apiError("Campaign not found.", { status: 404 });

  const enrollment = await enrollContacts(ownerId, body.campaignId, { contactIds });

  let schedule: { scheduled: number } | null = null;
  if (body.activate) {
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "queued", updated_at: new Date().toISOString() })
      .eq("id", body.campaignId)
      .eq("owner_id", ownerId);
    schedule = await scheduleStepRunsForCampaign(ownerId, body.campaignId);
  }

  await writeAuditLog({
    ownerId,
    action: "PULSE_LANE_ENROLLED",
    entityType: "campaign",
    entityId: body.campaignId,
    metadata: { laneId, contactIds: contactIds.length, enrollment, activate: body.activate },
  }).catch(() => undefined);

  if (enrollment.enrolled === 0) {
    return apiError(
      "No eligible contacts enrolled. Check consent and do-not-contact flags for this lane.",
      {
        status: 200,
        code: "no_eligible_contacts",
        details: { enrollment, laneId, requested: contactIds.length },
      },
    );
  }

  return apiOk({
    campaignId: body.campaignId,
    laneId,
    enrollment,
    schedule,
    message: body.activate
      ? `Enrolled ${enrollment.enrolled} contact${enrollment.enrolled === 1 ? "" : "s"} and queued step runs.`
      : `Enrolled ${enrollment.enrolled} contact${enrollment.enrolled === 1 ? "" : "s"} in "${campaign.name}".`,
  });
});
