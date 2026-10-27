const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table contacts(id uuid primary key default gen_random_uuid(),owner_id text not null,first_name text not null,last_name text,phone text not null,email text,type text,source text,notes text,dnc boolean default false);
 create table consent_records(id uuid primary key default gen_random_uuid(),owner_id text not null,contact_id uuid references contacts(id),status text,source text,notes text);
 grant all on contacts,consent_records to service_role;`);
    const migration = fs
      .readdirSync(path.join(__dirname, "../supabase/migrations"))
      .find((x) => x.endsWith("_concierge_onboarding.sql"));
    await db.exec(
      fs.readFileSync(
        path.join(__dirname, "../supabase/migrations", migration),
        "utf8",
      ),
    );
    await db.exec("set role service_role");
    const change = (owner, actor, request, version, patch) =>
      db.query("select mutate_concierge_case($1,$2,$3,$4,$5::jsonb,$6) as r", [
        owner,
        actor,
        request,
        version,
        JSON.stringify(patch),
        "DISCOVERY_SAVED",
      ]);
    const first = await change("owner-a", "owner-a", id(1), 0, {
      discovery: { agentName: "Synthetic Agent" },
    });
    assert.equal(first.rows[0].r.version, 1);
    await change("owner-a", "owner-a", id(1), 0, {
      discovery: { agentName: "Synthetic Agent" },
    });
    assert.equal(
      (await db.query("select count(*)::int as n from concierge_events"))
        .rows[0].n,
      1,
    );
    await assert.rejects(
      change("owner-b", "owner-b", id(1), 0, {
        discovery: { agentName: "Synthetic Agent" },
      }),
      /REPLAY/,
    );
    await assert.rejects(change("owner-a", "owner-a", id(2), 0, {}), /STALE/);
    await assert.rejects(
      change("owner-a", "owner-a", id(3), 1, { owner_id: "owner-b" }),
      /INVALID_PATCH/,
    );
    await change("owner-b", "owner-b", id(4), 0, {});
    const rows = [
      {
        firstName: "Synthetic",
        phone: "+15555550123",
        email: "synthetic@example.test",
        notes: "Original source note",
      },
      {
        firstName: "Duplicate",
        phone: "+15555550123",
        email: "synthetic@example.test",
      },
    ];
    await db.query(
      "insert into concierge_imports(id,owner_id,fingerprint,rows) values($1,$2,$3,$4::jsonb)",
      [id(10), "owner-a", "synthetic-one", JSON.stringify(rows)],
    );
    const run = (owner, job, limit) =>
      db.query("select execute_concierge_import($1,$2,$3) as r", [
        owner,
        job,
        limit,
      ]);
    await assert.rejects(run("owner-b", id(10), 100), /NOT_FOUND/);
    const result = (await run("owner-a", id(10), 100)).rows[0].r;
    assert.equal(result.imported, 1);
    assert.equal(result.duplicatesSkipped, 1);
    assert.equal((await run("owner-a", id(10), 100)).rows[0].r.imported, 1);
    assert.equal(
      (await db.query("select count(*)::int as n from contacts")).rows[0].n,
      1,
    );
    const contact = (await db.query("select * from contacts")).rows[0];
    assert.equal(contact.dnc, true);
    assert.equal(contact.notes, "Original source note");
    assert.equal(
      (await db.query("select status from consent_records")).rows[0].status,
      "Unknown",
    );
    assert.deepEqual(
      (
        await db.query("select rows from concierge_imports where id=$1", [
          id(10),
        ])
      ).rows[0].rows,
      [],
    );
    await db.query(
      "insert into concierge_imports(id,owner_id,fingerprint,rows) values($1,$2,$3,$4::jsonb)",
      [
        id(11),
        "owner-a",
        "synthetic-limit",
        JSON.stringify([
          { firstName: "Limit", phone: "+15555550124", email: "" },
        ]),
      ],
    );
    await assert.rejects(run("owner-a", id(11), 1), /CONTACT_PLAN_LIMIT/);
    assert.equal(
      (
        await db.query("select state from concierge_imports where id=$1", [
          id(11),
        ])
      ).rows[0].state,
      "preview",
    );
    await db.query(
      "update concierge_imports set state='cancelled' where id=$1",
      [id(11)],
    );
    await assert.rejects(run("owner-a", id(11), 100), /CANCELLED/);
    await db.query(
      "insert into concierge_imports(id,owner_id,fingerprint,rows,expires_at) values($1,'owner-a','expired','[]',now()-interval '1 day')",
      [id(12)],
    );
    await assert.rejects(run("owner-a", id(12), 100), /EXPIRED/);
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from concierge_cases"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select execute_concierge_import($1,$2,100)", [
        "owner-a",
        id(10),
      ]),
      /permission denied/,
    );
    await db.exec("reset role;set role authenticated");
    await assert.rejects(
      db.query("select * from concierge_imports"),
      /permission denied/,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from pg_class where relname in ('concierge_cases','concierge_imports','concierge_events') and relrowsecurity",
        )
      ).rows[0].n,
      3,
    );
    console.log(
      "PASS Concierge PostgreSQL: migration, optimistic concurrency, request replay/content binding, cross-owner denial, atomic import, duplicate prevention, plan limit rollback, cancellation/expiry, Unknown consent, suppressed sending, retention and browser-role denial.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
