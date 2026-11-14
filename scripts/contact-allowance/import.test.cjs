const assert = require("node:assert/strict"),
  { fixture } = require("../campaign-audit/harness.cjs");
(async () => {
  const f = fixture(),
    db = f.stubs["@/lib/supabaseAdmin"].supabaseAdmin;
  let checks = 0,
    calls = 0,
    mode = "success";
  const ok = (v) => {
    assert(v);
    checks++;
  };
  process.env.CONTACT_ALLOWANCE_OVERRIDES_ENABLED = "true";
  f.tables.contact_allowance_overrides = [
    { owner_id: f.owner, enabled: true, contacts_limit: 30000 },
  ];
  db.rpc = async (name, p) => {
    ok(
      name === "import_contact_batch" &&
        p.p_owner === f.owner &&
        p.p_rows.length <= 100 &&
        p.p_base_limit === 30000,
    );
    calls++;
    if (mode === "quota" && calls === 2)
      return { error: { message: "contact_allowance_exceeded" } };
    return {
      data: p.p_rows.map((r, i) =>
        i === 0 && calls === 1
          ? { created: false, duplicate: true, row: r.row }
          : {
              created: true,
              row: r.row,
              contact: {
                ...r,
                id: f.id(40000 + r.row),
                owner_id: mode === "foreign" ? "other" : f.owner,
              },
            },
      ),
      error: null,
    };
  };
  delete f.stubs["@/lib/billing/plan-limits"];
  const service = f.load("lib/contacts/import-batches.ts");
  const rows = Array.from({ length: 301 }, (_, i) => ({
    firstName: "Synthetic " + i,
    phone: "+15555550100",
  }));
  let result = await service.importContactBatches(
    f.owner,
    rows,
    "synthetic.csv",
    2,
  );
  ok(
    result.imported === 300 &&
      result.duplicates === 1 &&
      result.errors.length === 0 &&
      calls === 4,
  );
  ok(f.tables.consent_records.every((r) => r.owner_id === f.owner));
  ok(f.payloads.length === 0 && f.tables.campaign_recipients.length === 0);
  calls = 0;
  mode = "quota";
  result = await service.importContactBatches(
    f.owner,
    rows,
    "synthetic.csv",
    2,
  );
  ok(
    result.imported === 99 &&
      result.duplicates === 1 &&
      result.errors.length === 201,
  );
  ok(result.errors[0].row === 102 && result.errors.at(-1).row === 302);
  calls = 0;
  mode = "foreign";
  let rejected = false;
  try {
    await service.importContactBatches(
      f.owner,
      rows.slice(0, 2),
      "synthetic.csv",
      2,
    );
  } catch {
    rejected = true;
  }
  ok(rejected);
  calls = 0;
  mode = "success";
  result = await service.importContactBatches(
    f.owner,
    [{ firstName: "Invalid", phone: "x" }],
    "synthetic.csv",
    2,
  );
  ok(result.errors.length === 1 && result.imported === 0 && calls === 0);
  process.env.CONTACT_ALLOWANCE_OVERRIDES_ENABLED = "false";
  console.log(
    JSON.stringify({
      result: "PASS",
      checks,
      scope:
        "Real batch import service with synthetic RPC responses; no enrollment, provider delivery or Production writes",
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
