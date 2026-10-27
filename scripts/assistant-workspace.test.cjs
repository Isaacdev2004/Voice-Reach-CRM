const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { buildSync } = require("esbuild");
const out = buildSync({
  entryPoints: [path.join(__dirname, "../lib/assistant/workspace-ui.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
}).outputFiles[0].text;
const mod = { exports: {} };
new Function("module", "exports", out)(mod, mod.exports);
const {
  workspaceActions,
  conversationId,
  conversationPointerKey,
  recentConversations,
} = mod.exports;
assert.notEqual(
  conversationPointerKey("owner_a"),
  conversationPointerKey("owner_b"),
);
assert.equal(conversationId("javascript:alert(1)"), null);
assert.equal(conversationId("private-user-id"), null);
assert.equal(
  conversationId("00000000-0000-4000-8000-000000000001"),
  "00000000-0000-4000-8000-000000000001",
);
const recent = recentConversations([
  { conversationId: "a", message: "new", at: "2026-10-27" },
  { conversationId: "b", message: "second", at: "2026-10-26" },
  { conversationId: "a", message: "old", at: "2026-10-25" },
]);
assert.deepEqual(
  recent.map((x) => x.message),
  ["new", "second"],
);
assert.equal(
  new Set(workspaceActions.map((a) => a.id)).size,
  workspaceActions.length,
);
for (const a of workspaceActions) {
  assert.ok(a.title && a.detail && a.prompt.length > 35);
  assert.doesNotMatch(a.prompt, /zillow\.com\/reviews|X1-ZU/);
}
assert.match(
  workspaceActions.find((a) => a.id === "referral").prompt,
  /own verified review destination/,
);
const src = fs.readFileSync(
  path.join(__dirname, "../components/assistant/operating-assistant.tsx"),
  "utf8",
);
assert.match(src, /allowSending=\{false\}/);
assert.match(src, /revision|proposals/);
assert.doesNotMatch(src, /<pre>\{JSON.stringify\(r.data/);
const preview = fs.readFileSync(
  path.join(__dirname, "../components/assistant/preview.tsx"),
  "utf8",
);
assert.match(preview, /revisionOf: p.id/);
assert.match(preview, /digest: p.digest/);
assert.match(preview, /CONFIRM_SAVE/);
console.log(
  "PASS workspace actions and history pointers: no cross-owner keys, invalid pointers rejected, latest title grouping, scoped review destination, server revision/digest confirmations retained. Browser mode/approval tests are separate.",
);
