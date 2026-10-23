/* Isolated PostgreSQL, no network/production records. */
const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create table contacts(id uuid primary key,owner_id text,property_address text);
create table contact_notes(id uuid primary key,owner_id text);
create table audit_logs(id uuid primary key default gen_random_uuid(),owner_id text,action text,entity_type text,entity_id uuid,metadata jsonb,created_at timestamptz default now());
create table contact_tasks(id uuid primary key default gen_random_uuid(),owner_id text not null,contact_id uuid references contacts(id),title text,notes text,due_at timestamptz,reminder_at timestamptz,completed boolean not null default false,completed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
grant all on contacts,contact_notes,audit_logs to service_role;`);
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261025000000_tasks_workspace.sql",
        "utf8",
      ),
    );
    await db.query("insert into contacts values($1,$2,$3),($4,$5,$6)", [
      id(1),
      "a",
      "Actual A",
      id(2),
      "b",
      "Actual B",
    ]);
    await db.exec("set role service_role");
    const put = (n, contact, workspace = {}, due = null, repeat = "none") =>
      db.query(
        "insert into contact_tasks(id,owner_id,contact_id,title,workspace,due_at,recurrence) values($1,$2,$3,$4,$5,$6,$7)",
        [
          id(n),
          "a",
          contact,
          "Task " + n,
          JSON.stringify(workspace),
          due,
          repeat,
        ],
      );
    await assert.rejects(put(10, id(2)), /TASK_NOT_FOUND/);
    await assert.rejects(
      put(10, id(1), { propertyContactId: id(2) }),
      /TASK_NOT_FOUND/,
    );
    await put(10, id(1));
    await put(11, id(1), { dependencies: [id(10)] });
    await assert.rejects(
      db.query("update contact_tasks set completed=true where id=$1", [id(11)]),
      /TASK_BLOCKED/,
    );
    await assert.rejects(
      db.query("update contact_tasks set workspace=$1 where id=$2", [
        JSON.stringify({ dependencies: [id(11)] }),
        id(10),
      ]),
      /TASK_CYCLE/,
    );
    await db.query("update contact_tasks set completed=true where id=$1", [
      id(10),
    ]);
    await db.query("update contact_tasks set completed=true where id=$1", [
      id(11),
    ]);
    const stamp = (
      await db.query("select completed_at from contact_tasks where id=$1", [
        id(11),
      ])
    ).rows[0].completed_at;
    await db.query("update contact_tasks set completed=true where id=$1", [
      id(11),
    ]);
    assert.equal(
      String(
        (
          await db.query("select completed_at from contact_tasks where id=$1", [
            id(11),
          ])
        ).rows[0].completed_at,
      ),
      String(stamp),
    );
    await put(
      12,
      id(1),
      { timezone: "America/New_York" },
      "2026-03-07T14:00Z",
      "daily",
    );
    await db.query("update contact_tasks set completed=true where id=$1", [
      id(12),
    ]);
    let occurrences = await db.query(
      "select due_at from contact_tasks where workspace->>'recurrenceParentId'=$1",
      [id(12)],
    );
    assert.equal(occurrences.rows.length, 1);
    assert.equal(
      new Date(occurrences.rows[0].due_at).toISOString(),
      "2026-03-08T13:00:00.000Z",
    );
    await db.query("update contact_tasks set completed=false where id=$1", [
      id(12),
    ]);
    await db.query("update contact_tasks set completed=true where id=$1", [
      id(12),
    ]);
    assert.equal(
      (
        await db.query(
          "select id from contact_tasks where workspace->>'recurrenceParentId'=$1",
          [id(12)],
        )
      ).rows.length,
      1,
    );
    await put(
      14,
      id(1),
      { timezone: "America/New_York" },
      "2026-01-31T14:00Z",
      "monthly",
    );
    await db.query("update contact_tasks set completed=true where id=$1", [
      id(14),
    ]);
    assert.equal(
      new Date(
        (
          await db.query(
            "select due_at from contact_tasks where workspace->>'recurrenceParentId'=$1",
            [id(14)],
          )
        ).rows[0].due_at,
      ).toISOString(),
      "2026-03-31T13:00:00.000Z",
    );
    await db.query(
      "insert into contact_tasks(id,owner_id,contact_id,title) values($1,$2,$3,$4)",
      [id(15), "b", id(2), "Foreign prerequisite"],
    );
    await assert.rejects(
      put(16, id(1), { dependencies: [id(15)] }),
      /TASK_NOT_FOUND/,
    );
    await assert.rejects(
      db.query(
        "insert into contact_tasks(owner_id,contact_id,title,property_contact_id) values($1,$2,$3,$4)",
        ["a", id(1), "Foreign property", id(2)],
      ),
      /TASK_NOT_FOUND/,
    );
    await assert.rejects(
      db.query("update contact_tasks set completed=false where id=$1", [
        id(10),
      ]),
      /TASK_BLOCKED/,
    );
    const payload = { name: "Reviewed", taskIds: [id(21), id(22)] },
      tasks = [
        { id: id(21), title: "First", workspace: { transactionId: id(20) } },
        {
          id: id(22),
          title: "Next",
          workspace: { transactionId: id(20), dependencies: [id(21)] },
        },
      ];
    const assign = () =>
      db.query("select assign_task_checklist($1,$2,$3,$4,$5,$6) v", [
        "a",
        id(20),
        id(1),
        "unique",
        JSON.stringify(payload),
        JSON.stringify(tasks),
      ]);
    await assign();
    await assign();
    assert.equal(
      (
        await db.query(
          "select id from contact_tasks where workspace->>'transactionId'=$1",
          [id(20)],
        )
      ).rows.length,
      2,
    );
    assert.equal(
      (
        await db.query(
          "select id from audit_logs where action='TASK_CHECKLIST_ASSIGNED'",
        )
      ).rows.length,
      1,
    );
    const invalid = [
      { id: id(31), title: "Rollback", workspace: { transactionId: id(30) } },
      {
        id: id(32),
        title: "Foreign",
        workspace: { transactionId: id(30), dependencies: [id(99)] },
      },
    ];
    await assert.rejects(
      db.query("select assign_task_checklist($1,$2,$3,$4,$5,$6)", [
        "a",
        id(30),
        id(1),
        "bad",
        JSON.stringify({}),
        JSON.stringify(invalid),
      ]),
      /TASK_NOT_FOUND/,
    );
    assert.equal(
      (await db.query("select id from contact_tasks where id=$1", [id(31)]))
        .rows.length,
      0,
    );
    const batch = [
      { id: id(40), contactId: id(1), title: "Approved", workspace: {} },
    ];
    for (let i = 0; i < 2; i++)
      await db.query("select create_reviewed_tasks($1,$2,$3)", [
        "a",
        id(41),
        JSON.stringify(batch),
      ]);
    assert.equal(
      (await db.query("select id from contact_tasks where id=$1", [id(40)]))
        .rows.length,
      1,
    );
    await assert.rejects(
      db.query("select create_reviewed_tasks($1,$2,$3)", [
        "a",
        id(41),
        JSON.stringify([{ ...batch[0], title: "Different approved payload" }]),
      ]),
      /TASK_CONFLICT/,
    );
    await db.exec("reset role;set role authenticated");
    await assert.rejects(
      db.query("select * from task_transactions"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from contact_tasks"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select create_reviewed_tasks($1,$2,$3)", ["a", id(42), "[]"]),
      /permission denied/,
    );
    console.log(
      "PASS Tasks PostgreSQL: ownership, dependency cycles/blocking, completion timestamps, DST recurrence/idempotency, atomic checklist rollback, AI batch retries, browser-role isolation.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
