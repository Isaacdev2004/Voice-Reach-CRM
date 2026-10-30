/* Actual PostgreSQL, isolated and credential-free. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("Notes 2: actual migrations, history, tags, verified associations, task retries, RLS and rollback", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create table contacts(id uuid primary key,owner_id text,first_name text,property_address text);create table campaigns(id uuid primary key,owner_id text,name text);",
    );
    for (const f of [
      "supabase/schema-contact-notes.sql",
      "supabase/schema-contact-tasks.sql",
      "supabase/migrations/20261023030000_notes_workspace.sql",
      "supabase/migrations/20261030163255_notes_strategy_2.sql",
    ])
      await db.exec(fs.readFileSync(f, "utf8"));
    // Replay must be safe and preserve schema/data.
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261030163255_notes_strategy_2.sql",
        "utf8",
      ),
    );
    await db.query(
      "insert into contacts values($1,'a','A','Example'),($2,'b','B',null)",
      [id(1), id(2)],
    );
    await db.query(
      "insert into campaigns values($1,'a','Owned'),($2,'b','Foreign')",
      [id(3), id(4)],
    );
    const baseline = await db.query(
      "select jsonb_agg(to_jsonb(c) order by id) data from contacts c",
    );
    await db.exec("begin");
    const save = async ({
      owner = "a",
      note = null,
      key = id(10),
      rev = 0,
      title = "Buyer notes",
      body = "Preapproval follow-up",
      meta = {
        contactIds: [id(1)],
        tags: [" Buyer ", "buyer", "BUYER"],
        campaignIds: [id(3)],
      },
    } = {}) =>
      (
        await db.query(
          "select save_notes_workspace($1,$2,$3,$4,$5,$6,'note',$7) n",
          [owner, note, key, rev, title, body, JSON.stringify(meta)],
        )
      ).rows[0].n;
    const fail = async (fn, re) => {
      await db.exec("savepoint failure");
      await assert.rejects(fn, re);
      await db.exec("rollback to savepoint failure;release savepoint failure");
    };
    const a = await save();
    assert.deepEqual(a.metadata.tags, ["Buyer"]);
    assert.equal(a.last_edited_by, "a");
    assert.equal((await save()).id, a.id);
    await fail(
      () => save({ owner: "b", note: a.id, rev: 1 }),
      /NOTE_NOT_FOUND/,
    );
    await fail(
      () => save({ key: id(11), meta: { campaignIds: [id(4)] } }),
      /NOTE_NOT_FOUND/,
    );
    await fail(
      () => save({ key: id(11), meta: { contactIds: [id(2)] } }),
      /NOTE_NOT_FOUND/,
    );
    const b = await save({ note: a.id, rev: 1, body: "Second revision" });
    assert.equal(b.revision, 2);
    await fail(
      () => save({ note: a.id, rev: 1, body: "Concurrent edit" }),
      /NOTE_CONFLICT/,
    );
    const old = (
      await db.query("select * from note_versions where note_id=$1", [a.id])
    ).rows[0];
    assert.equal(old.edited_by, "a");
    assert.equal(old.contact_id, id(1));
    const restored = await save({
      note: a.id,
      rev: 2,
      body: old.body,
      meta: old.metadata,
    });
    assert.equal(restored.revision, 3);
    assert.equal(
      (
        await db.query(
          "select body from note_versions where note_id=$1 and revision=2",
          [a.id],
        )
      ).rows[0].body,
      "Second revision",
    );
    const tag = (await db.query("select * from note_tags where owner_id='a'"))
      .rows[0];
    await db.query(
      "select manage_note_tag('a','rename',$1,'Preapproval','Buyer')",
      [tag.id],
    );
    assert.deepEqual(
      (await db.query("select metadata from contact_notes where id=$1", [a.id]))
        .rows[0].metadata.tags,
      ["Preapproval"],
    );
    await fail(
      () =>
        db.query("select manage_note_tag('b','delete',$1,'','Preapproval')", [
          tag.id,
        ]),
      /NOTE_NOT_FOUND/,
    );
    await db.query("select manage_note_tag('a','delete',$1,'','Preapproval')", [
      tag.id,
    ]);
    assert.deepEqual(
      (await db.query("select metadata from contact_notes where id=$1", [a.id]))
        .rows[0].metadata.tags,
      [],
    );
    assert.equal(
      (await db.query("select count(*)::int n from contact_notes")).rows[0].n,
      1,
    );
    const task = async (
      title = "Review preapproval",
      owner = "a",
      contact = id(1),
    ) =>
      (
        await db.query(
          "select create_note_task_v2($1,$2,$3,$4,null,$5,'Source context',null,'high',true) t",
          [owner, a.id, id(20), contact, title],
        )
      ).rows[0].t;
    const t = await task();
    assert.equal(t.completed, true);
    assert.equal(t.source_note_id, a.id);
    assert.equal((await task()).id, t.id);
    await fail(() => task("Changed payload"), /NOTE_TASK_CONFLICT/);
    await fail(() => task("Review preapproval", "b", id(2)), /NOTE_NOT_FOUND/);
    await fail(
      () => save({ key: id(11), meta: { taskIds: [id(999)] } }),
      /NOTE_NOT_FOUND/,
    );
    const linked = await save({
      key: id(12),
      meta: { taskIds: [t.id], tags: [] },
    });
    assert.deepEqual(linked.metadata.taskIds, [t.id]);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await fail(
        () => db.query("select * from contact_notes"),
        /permission denied/,
      );
      await fail(
        () => db.query("select * from note_tags"),
        /permission denied/,
      );
      await fail(
        () => db.query("select * from contact_tasks"),
        /permission denied/,
      );
      await fail(() => task(), /permission denied/);
      await db.exec("reset role");
    }
    const rls = (
      await db.query(
        "select relname,relrowsecurity from pg_class where relname in ('contact_notes','note_versions','note_tags','contact_tasks')",
      )
    ).rows;
    assert.equal(rls.length, 4);
    assert.ok(rls.every((x) => x.relrowsecurity));
    await db.exec("rollback");
    assert.deepEqual(
      (
        await db.query(
          "select jsonb_agg(to_jsonb(c) order by id) data from contacts c",
        )
      ).rows,
      baseline.rows,
    );
    for (const table of [
      "contact_notes",
      "note_versions",
      "note_tags",
      "contact_tasks",
    ])
      assert.equal(
        (await db.query(`select count(*)::int n from ${table}`)).rows[0].n,
        0,
      );
  } finally {
    await db.close();
  }
});
