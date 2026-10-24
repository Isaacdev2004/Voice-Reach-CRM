/* Isolated local PostgreSQL container only. Never reads production database configuration. */
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
  "-v",
  "ON_ERROR_STOP=1",
  "-At",
];
const sql = (s) =>
  execFileSync("docker", args, {
    env,
    input: s,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
(async () => {
  sql(
    "do $$ begin create role anon;exception when duplicate_object then null;end $$;do $$ begin create role authenticated;exception when duplicate_object then null;end $$;do $$ begin create role service_role;exception when duplicate_object then null;end $$;",
  );
  sql(
    fs.readFileSync(
      "supabase/migrations/20261030000000_ai_usage_meter.sql",
      "utf8",
    ),
  );
  sql("truncate ai_usage_operations,ai_usage_accounts,ai_usage_adjustments;");
  const period = "date_trunc('month',now())",
    end = "date_trunc('month',now())+interval '1 month'";
  const reserve = (owner, key, units = 1, cap = 5, kind = "requests") =>
    `select reserve_ai_usage('${owner}',${period},${end},'${kind}','${key}',${units},${cap});`;
  const results = await Promise.all(
    Array.from(
      { length: 12 },
      (_, i) =>
        new Promise((resolve) => {
          const child = execFile(
            "docker",
            args,
            { env },
            (error, stdout, stderr) =>
              resolve({ error, stdout, stderr, key: "concurrent-" + i }),
          );
          child.stdin.end(reserve("synthetic-owner", "concurrent-" + i));
        }),
    ),
  );
  const passed = results.filter((r) => !r.error),
    blocked = results.filter((r) => r.error);
  assert.equal(passed.length, 5);
  assert.equal(blocked.length, 7);
  assert.ok(blocked.every((r) => r.stderr.includes("AI_LIMIT")));
  for (const r of passed)
    sql(
      `select settle_ai_usage('synthetic-owner',${period},'requests','${r.key}',true);`,
    );
  assert.equal(
    sql(
      "select used||':'||reserved from ai_usage_accounts where owner_id='synthetic-owner';",
    ),
    "5:0",
  );
  assert.match(
    sql(reserve("synthetic-owner", passed[0].key)),
    /"fresh": false/,
  );
  assert.throws(() => sql(reserve("synthetic-owner", "blocked")));
  sql(reserve("other-subscriber", "independent"));
  assert.equal(
    sql(
      "select reserved from ai_usage_accounts where owner_id='other-subscriber';",
    ),
    "1",
  );
  sql(
    `select settle_ai_usage('other-subscriber',${period},'requests','independent',false);`,
  );
  assert.equal(
    sql(
      "select used||':'||reserved from ai_usage_accounts where owner_id='other-subscriber';",
    ),
    "0:0",
  );
  assert.match(
    sql(reserve("other-subscriber", "independent")),
    /"fresh": true/,
  );
  assert.match(
    sql(reserve("other-subscriber", "independent")),
    /"fresh": false/,
  );
  sql(reserve("other-subscriber", "retry-new"));
  assert.throws(
    () => sql(reserve("other-subscriber", "retry-new", 2)),
    /Command failed/,
  );
  assert.throws(() =>
    sql(
      reserve("audio-owner", "too-long", 1801, 1800, "transcription_seconds"),
    ),
  );
  sql(reserve("audio-owner", "bounded", 45, 1800, "transcription_seconds"));
  assert.throws(() =>
    sql("set role authenticated; select * from ai_usage_accounts;"),
  );
  assert.throws(() =>
    sql(`set role authenticated; ${reserve("forged-owner", "forged")}`),
  );
  assert.throws(() =>
    sql(
      "select reserve_ai_usage('expired',now()-interval '2 month',now()-interval '1 month','requests','old',1,5);",
    ),
  );
  console.log(
    "PostgreSQL usage transactions passed: 12 concurrent reservations / hard cap 5, idempotency, failed-result release, separate owners, variable audio units, expired periods, RLS and RPC denial. Synthetic local container only.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
