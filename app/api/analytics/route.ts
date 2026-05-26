import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { buildAnalyticsSnapshot } from "@/lib/analytics/compute";
import type { AnalyticsRange } from "@/lib/analytics/types";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const QuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
});

export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const { range } = QuerySchema.parse({ range: searchParams.get("range") ?? "30d" });

  const [contactsRes, campaignsRes, recipientsRes, engagementRes] = await Promise.all([
    supabaseAdmin
      .from("contacts")
      .select("id, dnc, consent_records(status)")
      .eq("owner_id", ownerId),
    supabaseAdmin
      .from("campaigns")
      .select("id, name, status, provider, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("campaign_recipients")
      .select("id, campaign_id, delivery_status, updated_at, created_at")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from("engagement_events")
      .select("event_type, score, occurred_at")
      .eq("owner_id", ownerId)
      .order("occurred_at", { ascending: false })
      .limit(2000),
  ]);

  if (contactsRes.error) return apiError(contactsRes.error.message, { status: 500 });
  if (campaignsRes.error) return apiError(campaignsRes.error.message, { status: 500 });
  if (recipientsRes.error) return apiError(recipientsRes.error.message, { status: 500 });

  const snapshot = buildAnalyticsSnapshot({
    range: range as AnalyticsRange,
    contacts: contactsRes.data ?? [],
    campaigns: campaignsRes.data ?? [],
    recipients: recipientsRes.data ?? [],
  });

  const engagement = engagementRes.data ?? [];
  const engagementSummary = {
    total: engagement.length,
    byEvent: engagement.reduce<Record<string, number>>((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
      return acc;
    }, {}),
    averageScore:
      engagement.length === 0
        ? 0
        : Math.round(
            (engagement.reduce((s, e) => s + (e.score ?? 0), 0) / engagement.length) * 10,
          ) / 10,
  };

  return apiOk({ ...snapshot, engagement: engagementSummary });
});
