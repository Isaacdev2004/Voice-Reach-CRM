import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { buildAnalyticsSnapshot } from "@/lib/analytics/compute";
import { requireUserId } from "@/lib/auth";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { readDelivery } from "@/lib/delivery/store";
import { z } from "zod";
export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const range = z
    .enum(["7d", "30d", "90d", "all"])
    .parse(new URL(request.url).searchParams.get("range") ?? "30d");
  try {
    const [contacts, campaigns, evidence] = await Promise.all([
      ownedRows<{ id: string }>("contacts", "id", ownerId),
      ownedRows<{ id: string; name: string; status: string }>(
        "campaigns",
        "id, name, status",
        ownerId,
      ),
      readDelivery(ownerId),
    ]);
    return apiOk({
      ...buildAnalyticsSnapshot({
        range,
        contacts,
        campaigns,
        records: evidence.records,
      }),
      confirmedSentCampaigns: new Set(
        evidence.records
          .filter((r) => r.events.some((e) => e.event_type === "sent"))
          .map((r) => r.campaign_id)
          .filter(Boolean),
      ).size,
      coverage: evidence.coverage,
      health: evidence.health,
    });
  } catch {
    return apiError(
      "Analytics evidence is unavailable. Delivery tracking must be configured before these metrics can be verified.",
      { status: 503 },
    );
  }
});
