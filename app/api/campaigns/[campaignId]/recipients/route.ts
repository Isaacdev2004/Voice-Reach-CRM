import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { enrollContacts, scheduleStepRunsForRecipients } from "@/lib/campaigns/enroll";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ campaignId: string }> };

const BodySchema = z.object({
  enrollAllEligible: z.boolean().optional().default(false),
  contactIds: z.array(z.string().uuid()).optional(),
});

export const POST = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;
  const body = BodySchema.parse(await request.json());

  if (!body.enrollAllEligible && (!body.contactIds || body.contactIds.length === 0)) {
    return apiError("Select at least one contact, or choose all eligible contacts.", {
      status: 400,
      code: "validation_error",
    });
  }

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, status")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (campaignError) return apiError(campaignError.message, { status: 500 });
  if (!campaign) return apiError("Campaign not found", { status: 404, code: "not_found" });

  const enrollment = await enrollContacts(ownerId, campaignId, {
    contactIds: body.enrollAllEligible ? undefined : body.contactIds,
  });

  let schedule = { scheduled: 0 };
  const shouldSchedule = ["queued", "sending", "partial", "sent"].includes(campaign.status);
  if (shouldSchedule && enrollment.recipientIds.length > 0) {
    schedule = await scheduleStepRunsForRecipients(
      ownerId,
      campaignId,
      enrollment.recipientIds,
    );
  }

  // If campaign was draft and now has people, leave as draft until they activate;
  // if it was sent/partial and we added more people, move back to queued so scheduler can run.
  if (enrollment.enrolled > 0 && (campaign.status === "sent" || campaign.status === "partial")) {
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "queued", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("owner_id", ownerId);
  } else if (enrollment.enrolled > 0) {
    await supabaseAdmin
      .from("campaigns")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("owner_id", ownerId);
  }

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_RECIPIENTS_ADDED",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { enrollment, schedule },
  }).catch(() => undefined);

  const message =
    enrollment.enrolled === 0
      ? enrollment.eligible === 0
        ? "No eligible contacts found. Mark consent valid on Contacts first."
        : "Those contacts are already on this campaign."
      : `Added ${enrollment.enrolled} contact${enrollment.enrolled === 1 ? "" : "s"} to the campaign.`;

  return apiOk({
    enrollment,
    schedule,
    message,
  });
});
