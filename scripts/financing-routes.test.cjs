const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
function setup() {
  const f = fixture();
  f.tables.financing_partners = [];
  f.tables.financing_reports = [];
  f.tables.contacts.push(
    { ...f.contact },
    { ...f.contact, id: id(3), owner_id: "other" },
  );
  f.stubs["@/lib/billing/settings-store"] = {
    loadSavedSettings: async () => f.settings,
  };
  const db = f.stubs["@/lib/supabaseAdmin"].supabaseAdmin;
  f.rpc = [];
  db.rpc = async (name, p) => {
    f.rpc.push({ name, p });
    return {
      data:
        name === "save_financing_report"
          ? { id: p.p_id, payload: p.p_payload }
          : {
              id: p.p_id,
              payload: p.p_payload,
              kind: p.p_payload.kind,
              preferred: p.p_payload.preferred,
            },
      error: null,
    };
  };
  return f;
}
const request = (path, body) =>
  new Request("http://localhost/api/financing/" + path, {
    method: body ? "POST" : "GET",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
const report = (patch = {}) => ({
  id: id(100),
  calculation: {
    kind: "seller",
    price: 300000,
    payoff: 100000,
    commissionPercent: 0,
    commissionFlat: 0,
    credits: 0,
    adjustments: 0,
    fees: [],
  },
  context: { contactId: id(2), propertyContactId: id(2), ...patch },
});
test("partners and reports read only owned records", async () => {
  const f = setup();
  f.tables.financing_partners.push(
    {
      id: id(10),
      owner_id: owner,
      kind: "title",
      preferred: true,
      payload: { name: "Own" },
    },
    {
      id: id(11),
      owner_id: "other",
      kind: "title",
      payload: { name: "Foreign" },
    },
  );
  f.tables.financing_reports.push(
    { id: id(20), owner_id: owner },
    { id: id(21), owner_id: "other" },
  );
  const partners = await (
    await f.load("app/api/financing/partners/route").GET(request("partners"))
  ).json();
  assert.equal(partners.data.partners.length, 1);
  assert.equal(partners.data.partners[0].name, "Own");
  const reports = await (
    await f.load("app/api/financing/reports/route").GET(request("reports"))
  ).json();
  assert.equal(reports.data.reports.length, 1);
  assert.equal(reports.data.reports[0].id, id(20));
});
test("foreign contact, saved property and partner cannot enter a report", async () => {
  for (const patch of [
    { contactId: id(3) },
    { propertyContactId: id(3) },
    { lenderId: id(90) },
    { titleId: id(91) },
  ]) {
    const f = setup(),
      r = await f
        .load("app/api/financing/reports/route")
        .POST(request("reports", report(patch)));
    assert.equal(r.status, 404);
    assert.equal(f.rpc.length, 0);
  }
});
test("report server rejects injected totals and independently recalculates", async () => {
  const f = setup(),
    route = f.load("app/api/financing/reports/route");
  const bad = { ...report(), result: { total: 1 } };
  assert.equal((await route.POST(request("reports", bad))).status, 400);
  const res = await route.POST(request("reports", report()));
  assert.equal(res.status, 200);
  assert.equal(f.rpc[0].p.p_owner, owner);
  assert.equal(f.rpc[0].p.p_payload.result.total, 200000);
  assert.equal(f.rpc[0].p.p_payload.branding.name, "Avery Agent");
});
test("manual property needs no fabricated contact and empty saved property is rejected", async () => {
  const f = setup(),
    route = f.load("app/api/financing/reports/route");
  f.tables.contacts[0].property_address = "";
  assert.equal((await route.POST(request("reports", report()))).status, 404);
  assert.equal(
    (
      await route.POST(
        request(
          "reports",
          report({
            contactId: null,
            propertyContactId: null,
            address: "Manual entered address",
          }),
        ),
      )
    ).status,
    200,
  );
});
test("foreign partner deletion is owner-scoped and cannot delete another record", async () => {
  const f = setup();
  f.tables.financing_partners.push({ id: id(10), owner_id: "other" });
  const r = await f.load("app/api/financing/partners/route").DELETE(
    new Request("http://localhost/api/financing/partners?id=" + id(10), {
      method: "DELETE",
    }),
  );
  assert.equal(r.status, 404);
  assert.equal(f.tables.financing_partners.length, 1);
});
test("partner saves call atomic owner-bound preferred/default transaction", async () => {
  const f = setup();
  const r = await f.load("app/api/financing/partners/route").POST(
    request("partners", {
      name: "Authorized title company",
      kind: "title",
      preferred: true,
    }),
  );
  assert.equal(r.status, 200);
  assert.equal(f.rpc[0].name, "save_financing_partner");
  assert.equal(f.rpc[0].p.p_owner, owner);
  assert.equal(f.rpc[0].p.p_payload.preferred, true);
});
test("outages return safe error instead of private database details or empty success", async () => {
  const f = setup();
  f.fail("financing_reports");
  const res = await f
    .load("app/api/financing/reports/route")
    .GET(request("reports"));
  assert.equal(res.status, 503);
  const text = await res.text();
  assert.ok(!text.includes("private database trace"));
  assert.ok(!text.includes("SUPABASE"));
});
test("signed-out API requests are rejected", async () => {
  const f = setup();
  f.stubs["@/lib/auth"] = {
    requireUserId: async () => {
      throw new Error("Unauthorized");
    },
  };
  assert.equal(
    (await f.load("app/api/financing/partners/route").GET(request("partners")))
      .status,
    401,
  );
});
