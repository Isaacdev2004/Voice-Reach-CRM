const assert = require("node:assert/strict"),
  { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  let checks = 0;
  const ok = (v) => {
    assert(v);
    checks++;
  };
  const f = fixture();
  process.env.CONTACT_ALLOWANCE_OVERRIDES_ENABLED = "true";
  f.tables.contact_allowance_overrides = [
    { owner_id: f.owner, enabled: true, contacts_limit: 30000 },
  ];
  f.tables.audit_logs.push({
    owner_id: f.owner,
    entity_type: "user_settings",
    action: "SETTINGS_SAVED",
    metadata: {
      settings: { billing: { planId: "growth", subscriptionStatus: "active" } },
    },
    created_at: new Date().toISOString(),
  });
  f.tables.contacts = Array.from({ length: 5000 }, (_, i) => ({
    id: f.id(i + 1),
    owner_id: f.owner,
    first_name: "Synthetic " + i,
    phone: "+15555550100",
  }));
  const service = f.load("lib/billing/plan-limits.ts");
  let result = await service.assertCanAddContacts(f.owner, 1);
  ok(
    result.ok &&
      result.usage.contactsLimit === 30000 &&
      result.usage.planId === "growth",
  );
  ok(result.usage.plan.contactLimit === 5000);
  f.tables.contact_allowance_overrides[0].owner_id = "other";
  result = await service.assertCanAddContacts(f.owner, 1);
  ok(!result.ok && result.usage.contactsLimit === 5000);
  f.tables.contact_allowance_overrides[0].owner_id = f.owner;
  f.fail("contact_allowance_overrides");
  let failed = false;
  try {
    await service.getPlanUsage(f.owner);
  } catch {
    failed = true;
  }
  ok(failed);
  f.fail(null);
  const rows = Array.from({ length: 30000 }, (_, i) => ({
    id: f.id(i + 1),
    owner_id: f.owner,
    first_name: "Synthetic " + String(i).padStart(5, "0"),
    phone: "+15555550100",
    type: i % 2 ? "Cold Lead" : "Active Lead",
    category: i % 2 ? "Commercial" : "Residential",
    source: i % 3 ? "Website" : "Referral",
    dnc: false,
    consent_records: [],
    created_at: new Date(1700000000000 + i * 1000).toISOString(),
  }));
  const handler = f
    .load("lib/contacts/page-handler.ts")
    .createContactPageHandler({
      requireOwnerId: async () => f.owner,
      readContacts: async () => rows,
      loadCategories: async () => ["Residential", "Commercial"],
    });
  const request = (search) =>
    new Request("https://preview.example.test/api/contacts/page?" + search);
  let data = await (await handler(request("page=1200&pageSize=25"))).json();
  ok(
    data.contacts.length === 25 &&
      data.total === 30000 &&
      data.page === 1200 &&
      data.pages === 1200,
  );
  ok(data.counts.all === 30000 && data.counts.activeLead === 15000);
  const validate = f.load(
    "lib/contacts/validate-snapshot.ts",
  ).validateContactSnapshot;
  ok(
    validate(data, { ownerId: f.owner, requireAll: true }).contacts.length ===
      25,
  );
  data = await (
    await handler(request("search=Synthetic+29999&source=Website"))
  ).json();
  ok(data.filtered === 1 && data.contacts[0].first_name === "Synthetic 29999");
  data = await (
    await handler(
      request("category=Residential&segment=active-lead&sort=name-desc"),
    )
  ).json();
  ok(
    data.filtered === 15000 &&
      data.contacts[0].first_name === "Synthetic 29998",
  );
  ok((await handler(request("pageSize=30000"))).status === 400);
  ok((await handler(request("ownerId=foreign"))).status === 400);
  const foreign = f
    .load("lib/contacts/page-handler.ts")
    .createContactPageHandler({
      requireOwnerId: async () => f.owner,
      readContacts: async () => [{ ...rows[0], owner_id: "other" }],
      loadCategories: async () => [],
    });
  ok((await foreign(request(""))).status === 503);
  rows[29999].preferred_area="Apopka";
  data=await(await handler(request(`picker=true&search=Synthetic+29999&includeIds=${rows[0].id}`))).json();
  ok(data.filtered===1&&data.contacts[0].id===rows[29999].id&&data.relatedContacts[0].id===rows[0].id);
  data=await(await handler(request(`picker=true&includeIds=${f.id(90001)}`))).json();
  ok(data.contacts.length===25&&data.relatedContacts.length===0);
  ok((await handler(request("includeIds=not-a-uuid"))).status===400);
  data=await(await handler(request("criteriaOnly=true"))).json();
  ok(data.filtered===1&&data.contacts[0].id===rows[29999].id);
  data=await(await handler(request("summary=true&pageSize=1&monthStart=2000-01-01T00%3A00%3A00.000Z"))).json();
  ok(data.contacts.length===1&&data.summary.addedThisMonth===30000&&data.summary.pipelineBudgets.activeLeadCount===15000);
  ok(validate(data,{ownerId:f.owner}).summary.addedThisMonth===30000);
  let rejected=false;try{validate({...data,relatedContacts:[{...rows[0],owner_id:"foreign"}]},{ownerId:f.owner});}catch{rejected=true;}ok(rejected);
  rows[0].consent_records=[{status:"Yes",consent_date:"2026-11-01",source:"Synthetic",proof_reference:"Fixture"}];
  const recipients=f.load("lib/contacts/recipient-page-handler.ts").createRecipientPageHandler({requireOwnerId:async()=>f.owner,readContacts:async()=>rows,loadCategories:async()=>["Residential","Commercial"]});
  const recipientRequest=body=>new Request("https://preview.example.test/api/contacts/recipients",{method:"POST",body:JSON.stringify(body)});
  data=await(await recipients(recipientRequest({page:600}))).json();
  ok(data.contacts.length===50&&data.total===30000&&data.pages===600&&data.eligibleCount===1&&data.eligibleByCategory.Residential===1);
  ok(data.contacts.every(row=>!("notes" in row)&&row.owner_id===f.owner));
  data=await(await recipients(recipientRequest({excludeIds:[rows[0].id],search:"Synthetic 29999"}))).json();
  ok(data.filtered===1&&data.eligibleCount===0);
  data=await(await recipients(recipientRequest({onlyIds:[f.id(90001),rows[0].id]}))).json();
  ok(data.total===1&&data.contacts[0].id===rows[0].id);
  ok((await recipients(recipientRequest({ownerId:"foreign"}))).status===400);
  const foreignRecipients=f.load("lib/contacts/recipient-page-handler.ts").createRecipientPageHandler({requireOwnerId:async()=>f.owner,readContacts:async()=>[{...rows[0],owner_id:"foreign"}],loadCategories:async()=>[]});
  ok((await foreignRecipients(recipientRequest({}))).status===503);
  const exports = f.load("lib/contacts/export.ts");
  ok(
    exports.selectExportContacts(rows, {
      scope: "selected",
      ids: [rows[0].id, rows[29999].id],
    }).length === 2,
  );
  ok(
    exports.selectExportContacts(rows, {
      scope: "filtered",
      filters: {
        category: "Residential",
        segment: "active-lead",
        sort: "recent",
        q: "",
        search: "",
        source: "all",
        type: "all",
        compliance: "all",
        activity: "all",
      },
    }).length === 15000,
  );
  const csv = await new Response(exports.csvStream(rows)).text();
  ok(csv.split("\r\n").length >= 30001);
  ok(csv.includes("Synthetic 29999"));
  process.env.CONTACT_ALLOWANCE_OVERRIDES_ENABLED = "false";
  console.log(
    JSON.stringify({
      result: "PASS",
      checks,
      records: 30000,
      maxPagePayload: 25,
      scope:
        "Actual policy/filter/export code with synthetic service boundaries; no Production calls",
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
