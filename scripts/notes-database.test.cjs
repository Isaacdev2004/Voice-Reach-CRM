/* Execute the actual proposed migration/functions in isolated embedded PostgreSQL.
   Install @electric-sql/pglite in a temporary test-tools prefix, then set PGLITE_MODULE.
   Never connects to Supabase or loads environment credentials. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("real migration: idempotent saves, stale-client CAS, version restore, tenant checks, task retry, and deletion retention", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create table public.contacts(id uuid primary key,owner_id text not null,first_name text,property_address text);`,
    );
    await pg.exec(fs.readFileSync("supabase/schema-contact-notes.sql", "utf8"));
    await pg.exec(fs.readFileSync("supabase/schema-contact-tasks.sql", "utf8"));
    const migration = fs.readFileSync(
      "supabase/migrations/20261023030000_notes_workspace.sql",
      "utf8",
    );
    await pg.exec(migration);
    await pg.exec(migration);
    await pg.query(
      "insert into contacts(id,owner_id,first_name,property_address) values($1,$2,$3,$4),($5,$6,$7,$8)",
      [
        id(2),
        "a",
        "Synthetic Agent",
        "123 Example Lane",
        id(3),
        "b",
        "Other Owner",
        "456 Private Lane",
      ],
    );
    const meta = {
      contactIds: [id(2)],
      propertyContactIds: [id(2)],
      originalTranscript: "Original synthetic transcript.",
      category: "Clients",
    };
    const save = async ({
      owner = "a",
      note = null,
      key = id(50),
      rev = 0,
      title = "Consultation",
      body = "Garden requested.",
      metadata = meta,
    } = {}) =>
      (
        await pg.query(
          "select public.save_notes_workspace($1,$2,$3,$4,$5,$6,$7,$8) as note",
          [
            owner,
            note,
            key,
            rev,
            title,
            body,
            "note",
            JSON.stringify(metadata),
          ],
        )
      ).rows[0].note;
    const a = await save();
    assert.equal(a.revision, 1);
    const retry = await save();
    assert.equal(a.id, retry.id);
    await assert.rejects(
      () => save({ body: "Different creation retry" }),
      /NOTE_CONFLICT/,
    );
    await assert.rejects(
      () => save({ owner: "b", note: a.id, rev: 1 }),
      /NOTE_NOT_FOUND/,
    );
    await assert.rejects(
      () => save({ key: id(51), metadata: { ...meta, contactIds: [id(3)] } }),
      /NOTE_NOT_FOUND/,
    );
    const b = await save({
      note: a.id,
      rev: 1,
      body: "Updated garden criteria.",
    });
    assert.equal(b.revision, 2);
    // Two clients read revision 2; only one of their differing writes is accepted.
    const results = await Promise.allSettled([
      save({ note: a.id, rev: 2, body: "Client A edit" }),
      save({ note: a.id, rev: 2, body: "Client B edit" }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    const versions = (
      await pg.query(
        "select * from note_versions where note_id=$1 order by revision",
        [a.id],
      )
    ).rows;
    assert.equal(versions.length, 2);
    assert.equal(
      versions[0].metadata.originalTranscript,
      meta.originalTranscript,
    );
    const restored = await save({ note: a.id, rev: 3, body: versions[0].body });
    assert.equal(restored.revision, 4);
    assert.equal(restored.body, a.body);
    // SQL functions are service-role only; anonymous callers cannot spoof owners.
    await pg.exec("set role anon");
    await assert.rejects(() => save(), /permission denied/);
    await pg.exec("reset role");
    const task = async (contact = id(2), action = id(60), owner = "a") =>
      (
        await pg.query(
          "select public.create_note_task($1,$2,$3,$4,$5,$6,$7,$8,$9) as task",
          [
            owner,
            a.id,
            action,
            contact,
            id(2),
            "Review criteria",
            "From note",
            null,
            "high",
          ],
        )
      ).rows[0].task;
    const t = await task(),
      t2 = await task();
    assert.equal(t.id, t2.id);
    assert.equal(t.priority, "high");
    assert.equal(t.source_note_id, a.id);
    assert.equal(
      (await pg.query("select count(*)::int as n from contact_tasks")).rows[0]
        .n,
      1,
    );
    await assert.rejects(() => task(id(3), id(61)), /NOTE_NOT_FOUND/);
    await assert.rejects(() => task(id(3), id(61), "b"), /NOTE_NOT_FOUND/);
    const linked = (
      await pg.query(
        "select id from contact_notes where owner_id=$1 and (contact_id=$2 or metadata->'contactIds' @> $3::jsonb)",
        ["a", id(2), JSON.stringify([id(2)])],
      )
    ).rows;
    assert.equal(linked.length, 1);
    await pg.query("delete from contact_notes where owner_id=$1 and id=$2", [
      "a",
      a.id,
    ]);
    assert.equal(
      (await pg.query("select count(*)::int as n from note_versions")).rows[0]
        .n,
      0,
    );
    assert.equal(
      (await pg.query("select source_note_id from contact_tasks")).rows[0]
        .source_note_id,
      null,
    );
  } finally {
    await pg.close();
  }
});
