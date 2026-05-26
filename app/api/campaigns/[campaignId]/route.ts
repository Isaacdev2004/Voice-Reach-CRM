import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ campaignId: string }> };

export const GET = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { campaignId } = await context.params;

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
