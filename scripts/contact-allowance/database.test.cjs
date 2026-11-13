const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { PGlite } = require(
  process.env.MYARI_PGLITE_MODULE || "@electric-sql/pglite",
);
(async () => {
  const db = new PGlite();
  let checks = 0;
  const q = async (s, p) => (await db.query(s, p)).rows;
  const ok = (v) => {
    assert(v);
    checks++;
  };
  const denied = async (s, p) => {
    let failed = false;
    try {
      await q(s, p);
    } catch {
      failed = true;
    }
    ok(failed);
  };
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;
 create table contacts(id uuid primary key default gen_random_uuid(),owner_id text not null,first_name text not null,last_name text,phone text,email text,type text,category text,source text,dnc boolean default false,notes text);create index contacts_owner on contacts(owner_id);grant select,insert,update,delete on contacts to service_role;`);
  const migration = fs.readFileSync(
    path.join(
      __dirname,
      "../../supabase/migrations/20261113210902_contact_allowance_override.sql",
    ),
    "utf8",
  );
  await db.exec(
    "begin;" + migration.replace(/^begin;|^commit;/gm, "") + "rollback;",
  );
  ok(
    (
      await q(
        "select to_regclass('contact_allowance_overrides') is null as absent",
      )
    )[0].absent,
  );
  await db.exec(migration);
  ok(
    (await q("select count(*)::int as n from contact_allowance_overrides"))[0]
      .n === 0,
  );
  await q(
    "insert into contacts(owner_id,first_name,phone) select 'A','Synthetic '||n,'+1555'||lpad(n::text,7,'0') from generate_series(1,5000)n",
  );
  const configure = async (limit, enabled, revision) =>
    q(
      "select set_contact_allowance_override('A',$1,$2,'synthetic-workspace-A','test',now(),'synthetic-admin','isolated acceptance',$3) as revision",
      [limit, enabled, revision],
    );
  await db.exec("set role service_role");
  ok((await configure(30000, true, null))[0].revision === 1);
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='A'"))[0]
      .n === 5000,
  );
  await q(
    "insert into contacts(owner_id,first_name,phone) values('A','After 5000','+15555550001')",
  );
  await configure(30000, false, 1);
  await q(
    "insert into contacts(owner_id,first_name,phone) select 'A','Synthetic '||n,'+1666'||lpad(n::text,7,'0') from generate_series(5002,29999)n",
  );
  await configure(30000, true, 2);
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='A'"))[0]
      .n === 29999,
  );
  const before = performance.now();
  await q(
    "insert into contacts(owner_id,first_name,phone) values('A','Boundary','+17775550000')",
  );
  const boundaryMs = performance.now() - before;
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='A'"))[0]
      .n === 30000,
  );
  await denied(
    "insert into contacts(owner_id,first_name,phone) values('A','Must not exist','+17775550001')",
  );
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='A'"))[0]
      .n === 30000,
  );
  await q(
    "update contacts set last_name='Edited at limit' where owner_id='A' and first_name='Boundary'",
  );
  ok(
    (
      await q(
        "select last_name from contacts where owner_id='A' and first_name='Boundary'",
      )
    )[0].last_name === "Edited at limit",
  );
  const duplicate = [
    {
      row: 2,
      first_name: "Boundary",
      phone: "+17775550000",
      last_name: "Edited at limit",
    },
  ];
  ok(
    (
      await q("select import_contact_batch('A',$1,5000) as result", [
        JSON.stringify(duplicate),
      ])
    )[0].result[0].duplicate === true,
  );
  await denied("select import_contact_batch('A',$1,5000)", [
    JSON.stringify([{ row: 2, first_name: "New", phone: "+17775550002" }]),
  ]);
  await q("delete from contacts where owner_id='A' and first_name='Boundary'");
  const batch = JSON.stringify([
    {
      row: 2,
      first_name: "Identical",
      phone: "+17775550003",
      email: "synthetic@example.test",
    },
  ]);
  ok(
    (await q("select import_contact_batch('A',$1,5000) as result", [batch]))[0]
      .result[0].created === true,
  );
  ok(
    (await q("select import_contact_batch('A',$1,5000) as result", [batch]))[0]
      .result[0].duplicate === true,
  );
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='A'"))[0]
      .n === 30000,
  );
  await q(
    "insert into contacts(owner_id,first_name,phone) values('B','Different workspace','+17775550003')",
  );
  await denied("update contacts set owner_id='A' where owner_id='B'");
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='B'"))[0]
      .n === 1,
  );
  await denied(
    "select set_contact_allowance_override('A',30000,false,'A','test',now(),'admin','stale',1)",
  );
  await configure(30000, false, 3);
  ok(
    (await q("select count(*)::int as n from contacts where owner_id='A'"))[0]
      .n === 30000,
  );
  ok(
    (
      await q(
        "select count(*)::int as n from contact_allowance_audit where owner_id='A'",
      )
    )[0].n === 4,
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec("reset role;set role " + role);
    await denied("select * from contact_allowance_overrides");
    await denied(
      "select set_contact_allowance_override('X',30000,true,'X','test',now(),'x','x',null)",
    );
  }
  await db.exec("reset role");
  ok(
    (
      await q(
        "select count(*)::int as n from contact_allowance_overrides where owner_id<>'A'",
      )
    )[0].n === 0,
  );
  await db.close();
  console.log(
    JSON.stringify({
      result: "PASS",
      checks,
      boundaryInsertMs: boundaryMs,
      scope:
        "Isolated PostgreSQL/PGlite; no Production records, overrides or provider calls",
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
