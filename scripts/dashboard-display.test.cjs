const assert = require("node:assert/strict"),
  test = require("node:test");
const { fixture, id } = require("./campaign-audit/harness.cjs");
test("dashboard displays actual defined steps/enrollments independently of outreach recipients", () => {
  const { dashboardCampaignMetrics } = fixture().load(
    "lib/dashboard/campaign-display.ts",
  );
  const c = {
    id: id(1),
    name: "Owned",
    status: "draft",
    created_at: "2026-10-20",
    stepCount: 4,
    enrollmentCount: 7,
  };
  assert.deepEqual(
    dashboardCampaignMetrics(c, {
      id: c.id,
      volume: 4,
      contacts: 3,
      deliveryRate: 75,
    }),
    { steps: "4", contacts: "7", delivery: "75%", reply: "—" },
  );
  assert.equal(
    dashboardCampaignMetrics({ ...c, enrollmentCount: 0 }).contacts,
    "0",
  );
});
test("unavailable/malformed delivery metrics remain absent while measured zero is retained", () => {
  const { dashboardCampaignMetrics } = fixture().load(
    "lib/dashboard/campaign-display.ts",
  );
  const c = {
    id: id(1),
    name: "Owned",
    status: "sent",
    created_at: "2026-10-20",
  };
  assert.deepEqual(dashboardCampaignMetrics(c), {
    steps: "—",
    contacts: "—",
    delivery: "—",
    reply: "—",
  });
  for (const metric of [
    { volume: 0, deliveryRate: 0 },
    { volume: 2, deliveryRate: NaN },
    { volume: 2, deliveryRate: -1 },
    { volume: 2, deliveryRate: 101 },
  ])
    assert.equal(dashboardCampaignMetrics(c, metric).delivery, "—");
  assert.equal(
    dashboardCampaignMetrics(c, { id: c.id, volume: 2, deliveryRate: 0 })
      .delivery,
    "0%",
  );
  assert.equal(
    dashboardCampaignMetrics({ ...c, enrollmentCount: -1, stepCount: 1.2 })
      .contacts,
    "—",
  );
});
test("recent dashboard campaigns are chronological and do not mutate library records", () => {
  const { recentDashboardCampaigns } = fixture().load(
    "lib/dashboard/campaign-display.ts",
  );
  const rows = Array.from({ length: 8 }, (_, i) => ({
    id: id(i),
    name: "Campaign " + i,
    status: "draft",
    created_at: `2026-10-${10 + i}`,
  }));
  assert.equal(recentDashboardCampaigns(rows).length, 6);
  assert.equal(recentDashboardCampaigns(rows)[0].id, id(7));
  assert.equal(rows[0].id, id(0));
});
