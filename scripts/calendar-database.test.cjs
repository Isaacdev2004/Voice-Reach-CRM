const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table audit_logs(id uuid primary key default gen_random_uuid(),owner_id text not null,action text,entity_type text,metadata jsonb,created_at timestamptz default clock_timestamp());`);
    const sql = fs.readFileSync(
      "supabase/migrations/20261028010000_calendar_preference_repair.sql",
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const save = (owner, prefs, expected) =>
      db.query("select save_calendar_preferences($1,$2,$3) as revision", [
        owner,
        JSON.stringify(prefs),
        expected,
      ]);
    const first = (await save("a", { view: "day" }, null)).rows[0].revision;
    const doc = (await db.query("select * from audit_logs where owner_id='a'"))
      .rows[0];
    assert.equal(
      doc.id,
      fixture()
        .load("lib/calendar/preferences-store.ts")
        .preferenceDocumentId("a"),
    );
    const parallel = await Promise.allSettled([
      save("a", { view: "month" }, first),
      save("a", { view: "agenda" }, first),
    ]);
    assert.equal(parallel.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(
      save("a", { view: "week" }, first),
      /stale preferences/,
    );
    await save("b", { view: "week" }, null);
    assert.equal(
      (await db.query("select count(*)::int n from audit_logs")).rows[0].n,
      2,
    );
    const row = (await db.query("select * from audit_logs where owner_id='a'"))
      .rows[0];
    const cas = (expected, view) =>
      db.query(
        "update audit_logs set metadata=jsonb_build_object('revision',gen_random_uuid(),'preferences',jsonb_build_object('view',$1::text)) where owner_id='a' and id=$2 and metadata->>'revision'=$3 returning id",
        [view, row.id, expected],
      );
    assert.equal((await cas(first, "day")).rows.length, 0);
    assert.equal((await cas(row.metadata.revision, "day")).rows.length, 1);
    const latest = (
      await db.query("select metadata from audit_logs where owner_id='a'")
    ).rows[0].metadata;
    await save("a", { view: "agenda" }, latest.revision);
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      await assert.rejects(
        save("a", { view: "day" }, null),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    console.log(
      "Calendar migration: idempotent install, owner-separated documents, one-winner concurrent RPC/CAS, compatible API revisions, browser RPC denial passed.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
