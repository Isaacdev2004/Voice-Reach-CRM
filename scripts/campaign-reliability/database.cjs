const { PGlite } = require(
  process.env.MYARI_PGLITE_MODULE || "@electric-sql/pglite",
);
const fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const db = new PGlite(),
    q = async (s, p) => (await db.query(s, p)).rows;
  let checks = 0;
  const ok = (v) => {
    assert(v);
    checks++;
  };
  const denied = async (s, p) => {
    await assert.rejects(() => q(s, p));
    checks++;
  };
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;
create table campaigns(id uuid primary key,owner_id text,name text,script_id text,provider text,status text,live_launched boolean default false,updated_at timestamptz default now());
create table campaign_steps(id uuid primary key,owner_id text,campaign_id uuid references campaigns,step_order int,type text,title text,description text,delay_minutes int,day_label text,time_label text,conditions jsonb,voice_asset_id uuid,status text);
create table voice_assets(id uuid primary key,owner_id text);grant select on voice_assets to service_role;
create table campaign_step_runs(id uuid,campaign_id uuid);create table audit_logs(owner_id text,action text,entity_type text,entity_id uuid,metadata jsonb,created_at timestamptz default now());
grant select,insert,update on campaigns,campaign_steps,audit_logs to service_role;grant delete on campaign_steps to service_role;grant select on campaign_step_runs to service_role;`);
  const sql = fs.readFileSync(
    "supabase/migrations/20261123170442_campaign_editor_drafts.sql",
    "utf8",
  );
  await db.exec("begin;" + sql.replace(/^begin;|^commit;/gm, "") + "rollback;");
  ok((await q("select to_regclass('campaign_editor_drafts') x"))[0].x === null);
  await db.exec(sql);
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const bp = {
    id: "editor-1",
    name: "Commercial synthetic",
    description: "unsent copy",
    audience: "Synthetic",
    goals: [],
    durationDays: 1,
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: [
      {
        id: id(2),
        order: 1,
        type: "email",
        title: "Email",
        description: "Recovered draft test",
        dayLabel: "Day 1",
        timeLabel: "9:00 AM",
        status: "draft",
      },
    ],
  };
  const save = async (owner, campaign, revision, operation, bp) => {
    const baseline =
      revision === 0
        ? ((
            await q(
              "select updated_at::text as value from campaigns where id=$1",
              [campaign],
            )
          )[0]?.value ?? null)
        : null;
    return q("select save_campaign_editor_draft($1,$2,$3,$4,$5,$6) result", [
      owner,
      campaign,
      revision,
      operation,
      JSON.stringify(bp),
      baseline,
    ]);
  };

  await db.exec("set role service_role");
  let r = await save("A", id(1), 0, id(3), bp);
  ok(r[0].result.revision === 1);
  ok((await save("A", id(1), 0, id(3), bp))[0].result.revision === 1);
  await denied("select save_campaign_editor_draft($1,$2,0,$3,$4)", [
    "B",
    id(1),
    id(4),
    JSON.stringify(bp),
  ]);
  await denied("select save_campaign_editor_draft($1,$2,0,$3,$4)", [
    "A",
    id(1),
    id(4),
    JSON.stringify({ ...bp, name: "stale" }),
  ]);
  r = await save("A", id(1), 1, id(5), { ...bp, description: "second saved" });
  ok(r[0].result.revision === 2);
  ok(
    (await q("select id from campaign_steps where campaign_id=$1", [id(1)]))[0]
      .id === id(2),
  );
  await denied("select claim_campaign_editor_activation($1,$2,1,$3,$4)", [
    "A",
    id(1),
    id(6),
    JSON.stringify(bp),
  ]);
  let snapshot = { ...bp, description: "second saved" };
  ok(
    (
      await q("select claim_campaign_editor_activation($1,$2,2,$3,$4) r", [
        "A",
        id(1),
        id(6),
        JSON.stringify(snapshot),
      ])
    )[0].r.claimed,
  );
  await denied("select save_campaign_editor_draft($1,$2,2,$3,$4)", [
    "A",
    id(1),
    id(7),
    JSON.stringify(bp),
  ]);
  await denied("select claim_campaign_editor_activation($1,$2,2,$3,$4)", [
    "A",
    id(1),
    id(7),
    JSON.stringify(snapshot),
  ]);
  await q("select finish_campaign_editor_activation($1,$2,$3,$4,true)", [
    "A",
    id(1),
    id(6),
    JSON.stringify({ status: "queued" }),
  ]);
  ok(
    (
      await q("select claim_campaign_editor_activation($1,$2,2,$3,$4) r", [
        "A",
        id(1),
        id(6),
        JSON.stringify(snapshot),
      ])
    )[0].r.status === "queued",
  );
  ok(
    (await q("select count(*)::int n from campaign_editor_versions"))[0].n ===
      2,
  );
  await db.exec("reset role;set role anon");
  await denied("select * from campaign_editor_versions");
  await denied("select save_campaign_editor_draft($1,$2,0,$3,$4)", [
    "A",
    id(8),
    id(9),
    JSON.stringify(bp),
  ]);
  await db.exec("reset role;set role authenticated");
  await denied("select * from campaign_editor_drafts");
  await db.exec("reset role");
  // Existing draft initial version is retained, failed saves roll back all changes.
  await q(
    "insert into campaigns(id,owner_id,name,script_id,provider,status) values($1,'A','Original','original','mock','draft')",
    [id(10)],
  );
  await save("A", id(10), 0, id(11), { ...bp, steps: [] });
  ok(
    (
      await q(
        "select snapshot from campaign_editor_versions where campaign_id=$1 and revision=0",
        [id(10)],
      )
    )[0].snapshot.name === "Original",
  );
  const before = await q(
    "select revision,snapshot from campaign_editor_drafts where campaign_id=$1",
    [id(10)],
  );
  await denied("select save_campaign_editor_draft($1,$2,1,$3,$4)", [
    "A",
    id(10),
    id(12),
    JSON.stringify(bp),
  ]); // step belongs to another campaign
  assert.deepEqual(
    await q(
      "select revision,snapshot from campaign_editor_drafts where campaign_id=$1",
      [id(10)],
    ),
    before,
  );
  checks++;
  await save("A", id(10), 1, id(13), {
    ...bp,
    name: "Restored original",
    steps: [],
  });
  ok(
    (
      await q(
        "select count(*)::int n from campaign_editor_versions where campaign_id=$1",
        [id(10)],
      )
    )[0].n === 3,
  );
  await db.exec("set role service_role");
  await denied("update campaign_editor_versions set snapshot='{}'");
  await denied(
    "update campaigns set name='unversioned overwrite' where id=$1",
    [id(10)],
  );
  await denied("select save_campaign_editor_draft($1,$2,2,$3,$4)", [
    "A",
    id(10),
    id(13),
    JSON.stringify({ ...bp, name: "operation reused", steps: [] }),
  ]);
  const contenders = await Promise.allSettled([
    save("A", id(10), 2, id(14), {
      ...bp,
      name: "Concurrent first",
      steps: [],
    }),
    save("A", id(10), 2, id(15), {
      ...bp,
      name: "Concurrent second",
      steps: [],
    }),
  ]);
  ok(
    contenders.filter((x) => x.status === "fulfilled").length === 1 &&
      contenders.filter((x) => x.status === "rejected").length === 1,
  );
  ok((await q("select count(*)::int n from campaign_step_runs"))[0].n === 0);
  await db.exec("reset role");
  await q(
    "insert into campaigns(id,owner_id,name,script_id,provider,status) values($1,'A','Existing active','original','mock','queued')",
    [id(20)],
  );
  await denied("select save_campaign_editor_draft($1,$2,0,$3,$4)", [
    "A",
    id(20),
    id(21),
    JSON.stringify({ ...bp, steps: [] }),
  ]);
  ok(
    (await q("select name from campaigns where id=$1", [id(20)]))[0].name ===
      "Existing active",
  );
  await q("insert into voice_assets(id,owner_id) values($1,'B')", [id(30)]);
  await db.exec("set role service_role");
  await denied("select save_campaign_editor_draft($1,$2,3,$3,$4)", [
    "A",
    id(10),
    id(31),
    JSON.stringify({
      ...bp,
      steps: [{ ...bp.steps[0], id: id(32), voiceAssetId: id(30) }],
    }),
  ]);
  await save("A", id(40), 0, id(41), {
    ...bp,
    steps: [{ ...bp.steps[0], id: "template-step" }],
  });
  const projected = (
    await q("select id from campaign_steps where campaign_id=$1", [id(40)])
  )[0].id;
  await save("A", id(40), 1, id(42), {
    ...bp,
    name: "Next edit",
    steps: [{ ...bp.steps[0], id: "template-step" }],
  });
  ok(
    (await q("select id from campaign_steps where campaign_id=$1", [id(40)]))[0]
      .id === projected,
  );
  await db.exec("reset role");
  await q(
    "insert into campaigns(id,owner_id,name,script_id,provider,status) values($1,'A','Transition baseline','original','mock','draft')",
    [id(50)],
  );
  const baselineTime = (
    await q("select updated_at::text value from campaigns where id=$1", [
      id(50),
    ])
  )[0].value;
  await q(
    "update campaigns set name='Saved by legacy tab',updated_at=updated_at+interval '1 second' where id=$1",
    [id(50)],
  );
  await denied("select save_campaign_editor_draft($1,$2,0,$3,$4,$5)", [
    "A",
    id(50),
    id(51),
    JSON.stringify({ ...bp, steps: [] }),
    baselineTime,
  ]);
  ok(
    (await q("select name from campaigns where id=$1", [id(50)]))[0].name ===
      "Saved by legacy tab",
  );
  await db.close();
  console.log(
    `PASS ${checks} isolated PostgreSQL checks: CAS, replay, ownership, retained step IDs, atomic rollback, history, activation locks, client denials. No hosted data.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
