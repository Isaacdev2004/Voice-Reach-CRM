import type { MessageRecord } from "@/lib/delivery/types";
/** Distinct current owned campaigns with an explicit non-mock provider sent event; never message volume. */
export function confirmedCampaignCount(
  campaigns: { id: string }[],
  records: MessageRecord[],
) {
  const owned = new Set(campaigns.map((c) => c.id));
  return new Set(
    records
      .filter(
        (r) =>
          r.provider !== "mock" &&
          r.campaign_id &&
          owned.has(r.campaign_id) &&
          r.events.some((e) => e.event_type === "sent"),
      )
      .map((r) => r.campaign_id),
  ).size;
}
