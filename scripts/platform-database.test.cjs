const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;",
    );
    for (const file of [
      "schema.sql",
      "schema-m3.sql",
      "schema-calendar.sql",
      "schema-integrations.sql",
      "schema-contact-tasks.sql",
      "schema-contact-notes.sql",
    ]) {
      await db.exec(
        fs
          .readFileSync("supabase/" + file, "utf8")
          .replace(/create extension if not exists "pgcrypto";/g, ""),
      );
    }
    await db.exec(`insert into contacts(owner_id,first_name,phone) values('private-owner','Synthetic','+15555550123');
 grant usage on schema public to anon,authenticated,service_role;
 grant all on all tables in schema public to anon,authenticated;
 set role anon;`);
    assert.equal((await db.query("select * from contacts")).rows.length, 1); // Reproduce legacy exposure under browser grants.
    await db.exec("reset role");
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261028000000_legacy_server_table_access.sql",
        "utf8",
      ),
    );
    const tables = (
      await db.query(
        "select tablename from pg_tables where schemaname='public'",
      )
    ).rows.map((r) => r.tablename);
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      for (const table of tables)
        await assert.rejects(
          db.query("select * from " + table),
          /permission denied/,
        );
      await assert.rejects(
        db.query(
          "insert into contacts(owner_id,first_name,phone) values('foreign','Synthetic','+15555550124')",
        ),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.equal((await db.query("select * from contacts")).rows.length, 1);
    await db.exec("reset role");
    console.log(
      "Legacy public-role exposure reproduced from repository schemas; browser reads denied on " +
        tables.length +
        " tables and writes denied; server access retained.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
