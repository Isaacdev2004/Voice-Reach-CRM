/* Real, embedded PostgreSQL execution. PGlite is an optional QA tool, not an app dependency.
   Run with PGLITE_MODULE=/path/to/@electric-sql/pglite node scripts/financing-database.test.cjs */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table public.contacts(id uuid primary key,owner_id text not null,property_address text);
 create table public.audit_logs(id uuid primary key default gen_random_uuid(),owner_id text not null,action text,entity_type text,entity_id uuid,metadata jsonb,created_at timestamptz default now());
 grant all on public.contacts,public.audit_logs to service_role;`);
    await db.exec(
      fs.readFileSync(
        path.join(
          __dirname,
          "../supabase/migrations/20261024000000_financing_studio.sql",
        ),
        "utf8",
      ),
    );
    await db.query(
      "insert into contacts(id,owner_id,property_address) values($1,$2,$3),($4,$5,$6)",
      [
        id(1),
        "owner-a",
        "Synthetic address",
        id(2),
        "owner-b",
        "Other address",
      ],
    );
    const partner = async (
      owner,
      pid,
      name,
      preferred,
      kind = "title",
      existing = false,
    ) =>
      db.query("select save_financing_partner($1,$2,$3::jsonb,$4) as value", [
        owner,
        pid,
        JSON.stringify({ kind, name, preferred, brandingAuthorized: false }),
        existing,
      ]);
    await db.exec("set role service_role");
    await partner("owner-a", id(10), "Title A", true);
    await partner("owner-a", id(11), "Title B", true);
    await partner("owner-a", id(12), "Lender", true, "lender");
    await partner("owner-b", id(13), "Other Title", true);
    let defaults = await db.query(
      "select id from financing_partners where owner_id=$1 and kind=$2 and preferred",
      ["owner-a", "title"],
    );
    assert.equal(defaults.rows.length, 1);
    assert.equal(defaults.rows[0].id, id(11));
    assert.equal(
      (
        await db.query(
          "select id from financing_partners where owner_id=$1 and preferred",
          ["owner-a"],
        )
      ).rows.length,
      2,
    );
    await assert.rejects(
      partner("owner-a", id(13), "Attack", true, "title", true),
      /NOT_FOUND/,
    );
    await partner("owner-a", id(11), "Edited Title", true, "title", true);
    const payload = {
      context: {
        contactId: id(1),
        propertyContactId: id(1),
        titleId: id(11),
        lenderId: null,
      },
      result: { title: "Seller Net Sheet", total: 1234.56 },
    };
    const save = async (owner, rid, contact, body) =>
      db.query("select save_financing_report($1,$2,$3,$4::jsonb) as value", [
        owner,
        rid,
        contact,
        JSON.stringify(body),
      ]);
    await save("owner-a", id(50), id(1), payload);
    await save("owner-a", id(50), id(1), payload);
    assert.equal(
      (await db.query("select * from financing_reports")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query("select * from audit_logs where action=$1", [
          "FINANCING_REPORT_SAVED",
        ])
      ).rows.length,
      1,
    );
    await assert.rejects(
      save("owner-a", id(51), id(2), {
        ...payload,
        context: { ...payload.context, contactId: id(2) },
      }),
      /NOT_FOUND/,
    );
    await assert.rejects(
      save("owner-a", id(52), id(1), {
        ...payload,
        context: { ...payload.context, titleId: id(13) },
      }),
      /NOT_FOUND/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from financing_reports"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from financing_partners"),
      /permission denied/,
    );
    await db.exec("reset role;set role authenticated");
    await assert.rejects(
      db.query("select save_financing_partner($1,$2,$3::jsonb,false)", [
        "owner-a",
        id(20),
        "{}",
      ]),
      /permission denied/,
    );
    console.log(
      "Embedded PostgreSQL: migration, default uniqueness, edit ownership, report idempotency, timeline event, cross-owner associations and anonymous/authenticated denial passed.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
