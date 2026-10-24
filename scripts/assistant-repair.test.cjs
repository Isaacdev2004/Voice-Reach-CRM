const test = require("node:test"),
  assert = require("node:assert/strict");
const { setup, id, owner } = require("./assistant-messaging/fixture.cjs");
test("superseded tasks cannot save and concurrent revisions have only one current version", async () => {
  const s = setup();
  try {
    const service = s.f.load("lib/assistant/proposals.ts"),
      a = await service.prepareAction(owner, {
        kind: "task",
        contactId: id(2),
        title: "Call Jordan",
        dueAt: "2026-11-06T15:00:00Z",
        notes: "",
      });
    const attempts = await Promise.allSettled([
      service.prepareAction(
        owner,
        { ...a.action, title: "First revision" },
        { revisionOf: a.id },
      ),
      service.prepareAction(
        owner,
        { ...a.action, title: "Second revision" },
        { revisionOf: a.id },
      ),
    ]);
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(
      service.assertApproval(owner, a.id, a.digest),
      /superseded/,
    );
  } finally {
    s.restore();
  }
});
test("cancelled and claimed roots cannot be revived by editing a sibling", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    await s.f.load("lib/assistant/execution.ts").cancelProposal(owner, p.id);
    await assert.rejects(
      s.f
        .load("lib/assistant/proposals.ts")
        .prepareAction(
          owner,
          { ...p.action, body: "Revived message" },
          { revisionOf: p.id },
        ),
    );
    assert.equal(s.transmissions.length, 0);
  } finally {
    s.restore();
  }
});
test("message delivery projection reflects authenticated failures without rewriting submission history", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    await s.approve(p);
    const row = s.f.tables.outbound_messages[0];
    await s.f.load("lib/delivery/store.ts").insertDeliveryEvent({
      owner_id: owner,
      message_id: row.id,
      provider: "twilio",
      event_key: "signed-failure",
      event_type: "undelivered",
      occurred_at: new Date().toISOString(),
      source: "webhook",
      error_code: "30003",
    });
    const r = await s.f
      .load("app/api/assistant/proposals/route.ts")
      .GET(new Request("http://qa/api/assistant/proposals?id=" + p.id));
    const d = await r.json();
    assert.equal(d.outcome.state, "completed");
    assert.equal(d.outcome.delivery.state, "failed");
    assert.match(d.outcome.delivery.message, /Delivery failed/);
    s.f.actor("foreign");
    process.env.ASSISTANT_V2_OWNER_IDS = owner + ",foreign";
    const foreign = await s.f
      .load("app/api/assistant/proposals/route.ts")
      .GET(new Request("http://qa/api/assistant/proposals?id=" + p.id));
    assert.equal(foreign.status, 404);
  } finally {
    s.restore();
  }
});
test("messaging requires both explicit account and recipient cohort membership", async () => {
  const s = setup();
  try {
    delete process.env.ASSISTANT_SEND_OWNER_IDS;
    assert.equal((await s.preview()).executable, false);
    process.env.ASSISTANT_SEND_OWNER_IDS = owner;
    delete process.env.ASSISTANT_SEND_RECIPIENTS;
    assert.equal((await s.preview()).executable, false);
    assert.equal(s.transmissions.length, 0);
  } finally {
    s.restore();
  }
});
test("OpenAI Responses preserves reasoning/function continuation and requests encrypted state without storing it", async () => {
  const s = setup();
  try {
    let payload;
    global.fetch = async (_url, o) => {
      payload = JSON.parse(o.body);
      return new Response(
        JSON.stringify({
          status: "completed",
          model: "gpt-5-mini",
          usage: { input_tokens: 10, output_tokens: 4 },
          output: [
            {
              type: "reasoning",
              id: "rs_synthetic",
              encrypted_content: "synthetic-opaque-context",
              summary: [],
            },
            {
              type: "function_call",
              id: "fc_synthetic",
              call_id: "call_synthetic",
              name: "search_contacts",
              arguments: '{"query":"Jordan"}',
            },
          ],
        }),
        { status: 200 },
      );
    };
    const adapter = s.f.load("lib/assistant/provider.ts"),
      r = await adapter.openaiProvider.respond({
        system: "Synthetic",
        messages: [{ role: "user", content: "Find Jordan" }],
        tools: [],
      });
    assert.equal(payload.store, false);
    assert.deepEqual(payload.include, ["reasoning.encrypted_content"]);
    const wire = adapter.responsesInput([
      { role: "assistant", content: r.content, providerItems: r.continuation },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "call_synthetic",
            content: '{"records":[]}',
          },
        ],
      },
    ]);
    assert.equal(wire[0].encrypted_content, "synthetic-opaque-context");
    assert.equal(wire[1].id, "fc_synthetic");
    assert.equal(wire[2].call_id, "call_synthetic");
  } finally {
    s.restore();
  }
});
test("a claimed root with a missing outcome is never advertised as awaiting approval", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    await s.f.load("lib/assistant/roots.ts").advanceProposal(owner, p, "claim");
    const response = await s.f
      .load("app/api/assistant/work/route.ts")
      .GET(new Request("http://qa/api/assistant/work"));
    const d = await response.json();
    assert.equal(d.work[0].status, "Needs Attention");
    assert.equal(s.transmissions.length, 0);
  } finally {
    s.restore();
  }
});
test("an invalid or missing database safety acknowledgement fails closed", async () => {
  const s = setup();
  try {
    s.f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => ({
      data: 1,
      error: null,
    });
    await assert.rejects(s.preview(), /Proposal changed/);
    assert.equal(s.transmissions.length, 0);
  } finally {
    s.restore();
  }
});
