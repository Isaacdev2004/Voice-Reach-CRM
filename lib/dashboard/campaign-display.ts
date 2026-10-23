/** Presentation only: enrollment/step counts come from the owned campaign library, not delivery recipients. */
export type DashboardCampaign = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  enrollmentCount?: number;
  stepCount?: number;
};
export type DashboardCampaignMetric = {
  id: string;
  volume: number;
  deliveryRate: number;
};
const count = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? String(v) : "—";
export function dashboardCampaignMetrics(
  campaign: DashboardCampaign,
  metric?: DashboardCampaignMetric,
) {
  return {
    steps: count(campaign.stepCount),
    contacts: count(campaign.enrollmentCount),
    delivery:
      metric &&
      Number.isFinite(metric.volume) &&
      metric.volume > 0 &&
      Number.isFinite(metric.deliveryRate) &&
      metric.deliveryRate >= 0 &&
      metric.deliveryRate <= 100
        ? `${metric.deliveryRate}%`
        : "—",
    reply: "—",
  };
}
export function recentDashboardCampaigns(rows: DashboardCampaign[]) {
  return [...rows]
    .sort(
      (a, b) =>
        (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 6);
}
