const esbuild = require("esbuild"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const output = path.join(os.tmpdir(), "myari-draft-api-test.cjs"),
    root = process.cwd(),
    fixture = path.join(root, "scripts/campaign-reliability/api-fixture.ts");
  await esbuild.build({
    entryPoints: ["app/api/campaigns/drafts/route.ts"],
    bundle: true,
    platform: "node",
    outfile: output,
    alias: { "@/lib/auth": fixture, "@/lib/supabaseAdmin": fixture },
    tsconfig: "tsconfig.json",
  });
  const { GET, POST } = require(output);
  let checks = 0;
  global.__draftTestQueries = [];
  const request = (body) =>
    new Request("http://localhost/api/campaigns/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const b = {
    campaignId: "00000000-0000-4000-8000-000000000001",
    expectedRevision: 0,
    operationId: "00000000-0000-4000-8000-000000000002",
    ownerId: "attacker",
    snapshot: {
      id: "draft",
      name: "",
      description: "Incomplete work",
      audience: "",
      goals: [],
      durationDays: 1,
      stats: { reach: 0, replies: 0, responseRate: 0 },
      steps: [],
    },
  };
  assert.equal((await POST(request(b))).status, 401);
  checks++;
  global.__draftTestOwner = "A";
  assert.equal((await POST(request(b))).status, 200);
  checks++;
  assert.equal(global.__draftTestRPC.args.p_owner, "A");
  assert.equal(
    global.__draftTestRPC.args.p_snapshot.description,
    "Incomplete work",
  );
  checks += 2;
  global.__draftTestRPCError = "revision_conflict";
  assert.equal((await POST(request(b))).status, 409);
  checks++;
  global.__draftTestRPCError = "database unavailable";
  const failure = await POST(request(b));
  assert.equal(failure.status, 503);
  assert.equal((await failure.json()).success, false);
  checks += 2;
  global.__draftTestRPCError = undefined;
  let response = await GET(
    new Request("http://localhost/api/campaigns/drafts?id=" + b.campaignId),
  );
  assert.equal((await response.json()).data.draft, null);
  checks++;
  assert.ok(
    global.__draftTestQueries.every(
      (q) =>
        q.filters.owner_id === "A" && q.filters.campaign_id === b.campaignId,
    ),
  );
  checks++;
  global.__draftTestOwner = "B";
  response = await GET(
    new Request("http://localhost/api/campaigns/drafts?id=" + b.campaignId),
  );
  assert.equal((await response.json()).data.draft, null);
  checks++;
  assert.equal(
    (
      await POST(
        request({
          ...b,
          snapshot: { ...b.snapshot, steps: [{ id: "x", order: 2 }] },
        }),
      )
    ).status,
    400,
  );
  checks++;
  assert.equal(
    (await POST(request({ ...b, padding: "x".repeat(1500001) }))).status,
    413,
  );
  checks++;
  fs.unlinkSync(output);
  console.log(
    `PASS ${checks} actual route checks with synthetic auth/database: signed-out denial, session-derived owner, empty/incomplete draft saves, conflicts, safe errors and scoped reads.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
