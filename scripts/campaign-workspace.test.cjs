const assert = require("node:assert/strict"),
  test = require("node:test"),
  path = require("node:path"),
  { buildSync } = require("esbuild");
const out = buildSync({
  entryPoints: [path.join(__dirname, "../lib/campaigns/workspace.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
}).outputFiles[0].text;
const mod = { exports: {} };
new Function("module", "exports", "require", out)(mod, mod.exports, require);
const {
  workspaceErrors,
  moveWorkspaceStep,
  splitEmail,
  normalizeWorkspaceSteps,
  emptyWorkspaceDraft,
} = mod.exports;
const fixture = () => ({
  ...emptyWorkspaceDraft(),
  steps: [
    {
      id: "email",
      order: 1,
      type: "email",
      title: "Introduction",
      description: "Subject: Welcome\n\nA warm introduction.",
      delayMinutes: 0,
      timeLabel: "10:00 AM",
      voiceAssetId: null,
    },
    {
      id: "sms",
      order: 2,
      type: "sms",
      title: "Check in",
      description: "How can I help? Reply STOP to opt out.",
      delayMinutes: 1440,
      timeLabel: "11:00 AM",
    },
    {
      id: "vm",
      order: 3,
      type: "voicemail",
      title: "Personal note",
      description: "A natural personal check-in.",
      delayMinutes: 4320,
      timeLabel: "Noon",
      voiceAssetId: "00000000-0000-4000-8000-000000000099",
    },
  ],
});
test("empty and malformed content cannot be saved", () => {
  assert(workspaceErrors(emptyWorkspaceDraft()).length);
  const d = fixture();
  assert.equal(workspaceErrors(d).length, 0);
  d.steps[0].description = "Subject: hello\n\n";
  assert(workspaceErrors(d).some((x) => /body/.test(x)));
  d.steps[0].description = "Just a body";
  assert(workspaceErrors(d).some((x) => /subject/.test(x)));
});
test("reordering moves content and metadata into stable chronological slots", () => {
  const d = fixture(),
    m = moveWorkspaceStep(d, 2, 0);
  assert.deepEqual(
    m.steps.map((s) => s.id),
    ["vm", "email", "sms"],
  );
  assert.deepEqual(
    m.steps.map((s) => s.order),
    [1, 2, 3],
  );
  assert.deepEqual(
    m.steps.map((s) => s.delayMinutes),
    [0, 1440, 4320],
  );
  assert.equal(m.steps[0].voiceAssetId, d.steps[2].voiceAssetId);
  assert.equal(d.steps[0].id, "email");
  assert.equal(workspaceErrors(m).length, 0);
  assert.equal(moveWorkspaceStep(d, -1, 0), d);
});
test("nonchronological timing is rejected; fractional day offsets survive normalization", () => {
  const d = fixture();
  d.steps[1].delayMinutes = 30;
  d.steps[0].delayMinutes = 90;
  assert(workspaceErrors(d).some((x) => /timing/.test(x)));
  const n = normalizeWorkspaceSteps({
    ...fixture(),
    steps: [{ ...fixture().steps[0], delayMinutes: 1500 }],
  });
  assert.equal(n.steps[0].dayLabel, "Day 2");
  assert.equal(n.steps[0].delayMinutes, 1500);
});
test("email parsing preserves content and does not render HTML", () => {
  assert.deepEqual(splitEmail("Subject: Hello\n\n<p>Literal draft</p>"), {
    subject: "Hello",
    body: "<p>Literal draft</p>",
  });
});

test("empty subjects never consume a body line", () => {
  assert.deepEqual(splitEmail("Subject: \n\nBody line\nMore body"), {
    subject: "",
    body: "Body line\nMore body",
  });
});
