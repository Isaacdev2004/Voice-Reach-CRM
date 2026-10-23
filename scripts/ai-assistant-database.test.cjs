const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table contacts(id uuid primary key,owner_id text,property_address text);
 create table contact_tasks(id uuid primary key,owner_id text,contact_id uuid references contacts(id),title text,notes text,due_at timestamptz,reminder_at timestamptz,completed boolean default false,completed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
 create table contact_notes(id uuid primary key,owner_id text,contact_id uuid references contacts(id),title text,body text,kind text,created_at timestamptz default now(),updated_at timestamptz default now());
 create table audit_logs(id uuid default gen_random_uuid(),owner_id text,action text,entity_type text,entity_id uuid,metadata jsonb,created_at timestamptz default now());
 grant all on contacts,contact_notes,audit_logs to service_role;
 `);
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261023030000_notes_workspace.sql",
        "utf8",
      ),
    );
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261025000000_tasks_workspace.sql",
        "utf8",
      ),
    );
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261028000000_ai_crm_assistant.sql",
        "utf8",
      ),
    );
    await db.exec("set role service_role");
    await db.query("insert into contacts(id,owner_id) values($1,$2),($3,$4)", [
      id(1),
      "a",
      id(2),
      "b",
    ]);
    const c = (
      await db.query(
        "insert into ai_conversations(owner_id,title) values('a','Test') returning id",
      )
    ).rows[0].id;
    const save = (actor, conv, request, actions) =>
      db.query("select save_ai_exchange($1,$2,$3,$4,$5) as result", [
        actor,
        conv,
        request,
        "Prepare a follow-up",
        JSON.stringify({
          answer: "Review these proposals.",
          sourceIds: [id(1)],
          sources: [],
          actions,
        }),
      ]);
    const task = {
      kind: "task",
      title: "Follow up",
      body: "Ask about property search",
      contactId: id(1),
      dueAt: null,
    };
    await assert.rejects(save("b", c, id(4), [task]), /CONVERSATION_NOT_FOUND/);
    await assert.rejects(
      save("a", c, id(4), [{ ...task, contactId: id(2) }]),
      /CONTACT_NOT_FOUND/,
    );
    const first = (await save("a", c, id(4), [task])).rows[0].result;
    assert.equal(first.proposals.length, 1);
    assert.equal(
      (await db.query("select count(*)::int as n from contact_tasks")).rows[0]
        .n,
      0,
    );
    const same = (await save("a", c, id(4), [task])).rows[0].result;
    assert.deepEqual(same, first);
    assert.equal(
      (await db.query("select count(*)::int as n from ai_turns")).rows[0].n,
      2,
    );
    const approve = (actor, p, decision = true) =>
      db.query("select approve_ai_proposal($1,$2,$3) as result", [
        actor,
        p,
        decision,
      ]);
    const p = first.proposals[0].id;
    await assert.rejects(
      db.query("select revise_ai_proposal($1,$2,$3,$4)", [
        "b",
        p,
        JSON.stringify(task),
        JSON.stringify(task),
      ]),
      /PROPOSAL_CONFLICT/,
    );
    const revised = {
      ...first.proposals[0].payload,
      body: "Reviewed follow-up instructions",
    };
    await db.query("select revise_ai_proposal($1,$2,$3,$4)", [
      "a",
      p,
      JSON.stringify(first.proposals[0].payload),
      JSON.stringify(revised),
    ]);
    await assert.rejects(
      db.query("select revise_ai_proposal($1,$2,$3,$4)", [
        "a",
        p,
        JSON.stringify(first.proposals[0].payload),
        JSON.stringify(revised),
      ]),
      /PROPOSAL_CONFLICT/,
    );
    await assert.rejects(approve("b", p), /PROPOSAL_NOT_FOUND/);
    const saved = await approve("a", p);
    assert.equal(saved.rows[0].result.status, "saved");
    const again = await approve("a", p);
    assert.equal(
      again.rows[0].result.record_id,
      saved.rows[0].result.record_id,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from contact_tasks")).rows[0]
        .n,
      1,
    );
    assert.equal(
      (await db.query("select notes from contact_tasks")).rows[0].notes,
      "Reviewed follow-up instructions",
    );
    const drafted = (
      await save("a", c, id(5), [
        { ...task, kind: "email_draft", subject: "Property search" },
      ])
    ).rows[0].result.proposals;
    const email = drafted.find((v) => v.payload.kind === "email_draft");
    assert.equal(
      (await approve("a", email.id)).rows[0].result.status,
      "approved",
    );
    assert.equal(
      (await db.query("select count(*)::int as n from contact_tasks")).rows[0]
        .n,
      1,
    );
    const more = (
      await save("a", c, id(6), [{ ...task, kind: "contact_note" }])
    ).rows[0].result.proposals;
    const note = more.find((v) => v.payload.kind === "contact_note");
    await approve("a", note.id);
    assert.equal(
      (await db.query("select count(*)::int as n from contact_notes")).rows[0]
        .n,
      1,
    );
    const rem = (
      await save("a", c, id(7), [
        { ...task, kind: "reminder", dueAt: "2026-10-24T14:00:00Z" },
      ])
    ).rows[0].result.proposals.find((v) => v.payload.kind === "reminder");
    await approve("a", rem.id, false);
    assert.equal(
      (await approve("a", rem.id)).rows[0].result.status,
      "dismissed",
    );
    const stale = (
      await save("a", c, id(8), [task])
    ).rows[0].result.proposals.filter((v) => v.status === "proposed")[0];
    await db.query("update contacts set owner_id='b' where id=$1", [id(1)]);
    await assert.rejects(approve("a", stale.id), /CONTACT_NOT_FOUND/);
    assert.equal(
      (await db.query("select count(*)::int as n from contact_tasks")).rows[0]
        .n,
      1,
    );
    for (let i = 0; i < 20; i++)
      assert.equal(
        (await db.query("select claim_ai_usage('a') as allowed")).rows[0]
          .allowed,
        true,
      );
    assert.equal(
      (await db.query("select claim_ai_usage('a') as allowed")).rows[0].allowed,
      false,
    );
    assert.equal(
      (await db.query("select claim_ai_usage('b') as allowed")).rows[0].allowed,
      true,
    );
    await db.exec("set role authenticated");
    for (const table of [
      "ai_conversations",
      "ai_turns",
      "ai_proposals",
      "ai_usage",
    ])
      await assert.rejects(
        db.query("select * from " + table),
        /permission denied/,
      );
    await assert.rejects(approve("a", p), /permission denied/);
    await db.exec("reset role");
    console.log(
      "Assistant database checks passed: tenant isolation, exact proposal approval, no pre-approval writes, retry deduplication, atomic tasks/notes, draft-only email, dismissal, changed ownership, owner usage limits and browser-role denial.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
