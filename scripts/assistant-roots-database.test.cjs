/* Only the hardcoded local synthetic PostgreSQL container. Never reads production DB configuration. */
const fs = require("node:fs"),
  { execFileSync, execFile } = require("node:child_process"),
  assert = require("node:assert/strict");
const env = { ...process.env };
for (const k of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[k];
const args = [
  "--host=unix:///var/run/docker.sock",
  "exec",
  "-i",
  "myari-ai-usage-qa",
  "psql",
  "-U",
  "postgres",
  "-At",
  "-v",
  "ON_ERROR_STOP=1",
];
const sql = (s) =>
  execFileSync("docker", args, {
    env,
    input: s,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
const root = "00000000-0000-4000-8000-000000000001",
  a = "00000000-0000-4000-8000-000000000002",
  b = "00000000-0000-4000-8000-000000000003";
const advance = (owner, target, expected, op) =>
  `select advance_assistant_proposal('${owner}','${root}','${target}',${expected ? `'${expected}'` : "null"},'${op}');`;
(async () => {
  sql(
    "do $$ begin create role anon;exception when duplicate_object then null;end $$;do $$ begin create role authenticated;exception when duplicate_object then null;end $$;do $$ begin create role service_role;exception when duplicate_object then null;end $$;create table if not exists outbound_messages(owner_id text,logical_key text);",
  );
  sql(
    fs.readFileSync(
      "supabase/migrations/20261031000000_assistant_proposal_roots.sql",
      "utf8",
    ),
  );
  sql("truncate assistant_proposal_roots,outbound_messages;");
  sql(advance("synthetic", root, null, "create"));
  sql(advance("synthetic", a, root, "revise"));
  assert.throws(() => sql(advance("synthetic", root, null, "claim")));
  assert.throws(() => sql(advance("synthetic", b, root, "revise")));
  const results = await Promise.all(
    Array.from(
      { length: 12 },
      () =>
        new Promise((resolve) => {
          const p = execFile("docker", args, { env }, (error) =>
            resolve(!error),
          );
          p.stdin.end(advance("synthetic", a, null, "claim"));
        }),
    ),
  );
  assert.equal(results.filter(Boolean).length, 1);
  assert.throws(() => sql(advance("synthetic", b, a, "revise")));
  assert.throws(() => sql(advance("synthetic", a, null, "cancel")));
  sql(advance("other-subscriber", root, null, "create"));
  sql(advance("other-subscriber", root, null, "cancel"));
  assert.throws(() => sql(advance("other-subscriber", a, root, "revise")));
  assert.throws(() =>
    sql("set role authenticated;select * from assistant_proposal_roots;"),
  );
  assert.throws(() =>
    sql("set role authenticated;" + advance("forged", root, null, "create")),
  );
  sql(
    "insert into outbound_messages(owner_id,logical_key)values('synthetic','assistant-unique');",
  );
  assert.throws(() =>
    sql(
      "insert into outbound_messages(owner_id,logical_key)values('synthetic','assistant-unique');",
    ),
  );
  sql(
    "insert into outbound_messages(owner_id,logical_key)values('other-subscriber','assistant-unique');",
  );
  console.log(
    "PASS: atomic proposal supersession; 12 concurrent claims yield exactly one winner; cancelled/claimed roots cannot revise; tenant separation; client RPC/table access denied; unique assistant transport key. Synthetic PostgreSQL only.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
