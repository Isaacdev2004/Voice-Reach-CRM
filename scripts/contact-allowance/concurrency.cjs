const { spawn } = require("node:child_process"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
if (
  process.env.MYARI_CONTACT_QUOTA_TEST !== "1" ||
  process.env.PGHOST !== "127.0.0.1" ||
  process.env.PGDATABASE !== "myari_contact_quota_test"
)
  throw Error("A disposable loopback contact quota database is required.");
function sql(input) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "psql",
      [
        "-X",
        "-q",
        "-t",
        "-A",
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        "127.0.0.1",
        "-p",
        process.env.PGPORT || "5432",
        "-U",
        "postgres",
        "-d",
        "myari_contact_quota_test",
      ],
      {
        env: {
          PATH: process.env.PATH,
          PGPASSWORD: process.env.PGPASSWORD,
          PGSSLMODE: "disable",
        },
      },
    );
    let out = "",
      err = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (err += b));
    p.on("error", reject);
    p.on("exit", (c) => (c ? reject(Error(err)) : resolve(out.trim())));
    p.stdin.end(input);
  });
}
(async () => {
  await sql(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;
 create table contacts(id uuid primary key default gen_random_uuid(),owner_id text not null,first_name text not null,last_name text,phone text,email text,type text,category text,source text,dnc boolean default false,notes text);create index contacts_owner on contacts(owner_id);grant select,insert,update,delete on contacts to service_role;`);
  await sql(
    fs.readFileSync(
      path.join(
        __dirname,
        "../../supabase/migrations/20261113210902_contact_allowance_override.sql",
      ),
      "utf8",
    ),
  );
  await sql(
    "insert into contacts(owner_id,first_name,phone) select 'A','Synthetic '||n,'+1555'||lpad(n::text,7,'0') from generate_series(1,29999)n;select set_contact_allowance_override('A',30000,true,'synthetic-A','test',now(),'synthetic-admin','isolated CI',null);",
  );
  const insert = (name) =>
    `set role service_role;insert into contacts(owner_id,first_name,phone) values('A','${name}','+17775550101');`;
  const simultaneous = await Promise.allSettled([
    sql(insert("Concurrent1")),
    sql(insert("Concurrent2")),
  ]);
  assert.equal(simultaneous.filter((r) => r.status === "fulfilled").length, 1);
  assert(
    simultaneous.some(
      (r) =>
        r.status === "rejected" &&
        r.reason.message.includes("contact_allowance_exceeded"),
    ),
  );
  assert.equal(
    await sql("select count(*) from contacts where owner_id='A';"),
    "30000",
  );
  await sql(
    "delete from contacts where owner_id='A' and first_name like 'Concurrent%';",
  );
  const batch = `set role service_role;select import_contact_batch('A','[{"row":2,"first_name":"Import duplicate","phone":"+17775550102"}]'::jsonb,5000);`;
  const imports = await Promise.all([sql(batch), sql(batch)]);
  assert.equal(
    imports.filter((r) => JSON.parse(r)[0].created === true).length,
    1,
  );
  assert.equal(
    imports.filter((r) => JSON.parse(r)[0].duplicate === true).length,
    1,
  );
  assert.equal(
    await sql("select count(*) from contacts where owner_id='A';"),
    "30000",
  );
  await sql(
    "delete from contacts where owner_id='A' and first_name='Import duplicate';",
  );
  const first = sql(
    "begin;select pg_advisory_xact_lock(987654);select pg_sleep(1);" +
      insert("Snapshot winner") +
      "commit;",
  );
  let locked = false;
  for (let n = 0; n < 100; n++) {
    if (
      (await sql(
        "select count(*) from pg_locks where locktype='advisory' and granted;",
      )) !== "0"
    ) {
      locked = true;
      break;
    }
  }
  assert(locked);
  const stale = sql(
    "begin isolation level repeatable read;select count(*) from contacts;select pg_advisory_xact_lock(987654);" +
      insert("Stale must fail") +
      "commit;",
  );
  await first;
  let rejected = false;
  try {
    await stale;
  } catch (e) {
    rejected = /could not serialize/.test(e.message);
  }
  assert(rejected);
  assert.equal(
    await sql("select count(*) from contacts where owner_id='A';"),
    "30000",
  );
  for (const role of ["anon", "authenticated"]) {
    let denied = false;
    try {
      await sql(
        "set role " + role + ";select * from contact_allowance_overrides;",
      );
    } catch (e) {
      denied = /permission denied/.test(e.message);
    }
    assert(denied);
  }
  console.log(
    JSON.stringify({
      result: "PASS",
      engine: "PostgreSQL multi-connection",
      assertions: [
        "30000 ceiling",
        "concurrent manual inserts",
        "concurrent identical imports",
        "duplicate idempotency",
        "REPEATABLE READ serialization",
        "client role denial",
      ],
    }),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
