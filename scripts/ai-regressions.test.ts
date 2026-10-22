import assert from "node:assert/strict";
import test from "node:test";
import { generate } from "../lib/ai/generate";
import { normalizeAiOutput, outputToPlainText, parseStructuredAiJson } from "../lib/ai/parse-output";
import { requestAiDraft } from "../lib/ai/request-draft";
import { AiGenerationError } from "../lib/ai/errors";
import { resolveAiTask } from "../lib/ai/resolve-task";
import { loadAiContext } from "../lib/ai/load-context";
import type { supabaseAdmin } from "../lib/supabaseAdmin";

const email = { subject: "Your waterfront home search", body: "Hi Alex,\n\nI can prepare a shortlist based on your preferred neighborhood. Would a brief call this week suit you?\n\nKind regards,\n[Your name]" };
const recommendation = { recommendation: "Confirm their preferred channel before following up.", reason: "No communication preference is available.", suggestedChannel: "phone" };
const providerReply = (text: string, extra = {}) => new Response(JSON.stringify({ content: [{ type: "text", text }], stop_reason: "end_turn", ...extra }), { status: 200 });
const fetchReturning = (response: () => Response): typeof fetch => async () => response();
async function withKey(run: () => Promise<void>) {
  const original = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key-do-not-expose";
  try { await run(); } finally { if (original === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = original; }
}

test("email drafting validates fenced provider JSON, enforces email instructions, and strips debug fields", async () => withKey(async () => {
  let sent: Record<string, unknown> = {};
  const result = await generate("email_writer", { contactName: "Alex Bennett", contactNotes: "Prefers waterfront homes", language: "English" }, "Draft a viewing follow-up", {
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(String(options?.body));
      return providerReply('```json\n' + JSON.stringify({ ...email, _system: "private prompt", debug: "internal" }) + '\n```');
    },
  });
  assert.deepEqual(result.output, email);
  assert.equal(result.provider, "claude");
  assert.match(String(sent.system), /complete ready-to-edit email/);
  assert.match(JSON.stringify(sent.messages), /Alex Bennett/);
  assert.match(JSON.stringify(sent.messages), /Draft a viewing follow-up/);
  assert.match(outputToPlainText("email_writer", result.output), /^Subject: Your waterfront home search\n\nHi Alex/);
  assert.doesNotMatch(JSON.stringify(result), /private prompt|test-key-do-not-expose|debug/);
}));

test("an explicit email brief in general follow-up mode yields an email, never recommendation JSON", async () => withKey(async () => {
  const result = await generate("follow_up", {}, "Please draft an email introducing suitable listings.", { fetchImpl: fetchReturning(() => providerReply(JSON.stringify(email))) });
  assert.equal(result.task, "email_writer");
  assert.deepEqual(result.output, email);
  assert.equal(resolveAiTask("email_writer", "Recommend a property"), "email_writer");
  assert.equal(resolveAiTask("follow_up", "Write a text asking if my email arrived"), "sms_writer");
  assert.equal(resolveAiTask("follow_up", "Do not write an email; suggest a call"), "follow_up");
}));

test("SMS drafting enforces body-only shape and the 320 character limit", async () => withKey(async () => {
  const result = await generate("sms_writer", {}, "Write a short text", { fetchImpl: fetchReturning(() => providerReply('{"body":"Hi Alex, would a viewing this week suit you?"}')) });
  assert.equal(result.output.body, "Hi Alex, would a viewing this week suit you?");
  assert.equal(normalizeAiOutput("sms_writer", { body: "a".repeat(321) }, {}).ok, false);
  assert.equal(normalizeAiOutput("sms_writer", recommendation, {}).ok, false);
}));

test("follow-up recommendations render complete prose fields with a validated channel", async () => withKey(async () => {
  const result = await generate("follow_up", {}, undefined, { fetchImpl: fetchReturning(() => providerReply(JSON.stringify(recommendation))) });
  assert.deepEqual(result.output, recommendation);
  assert.match(outputToPlainText("follow_up", result.output), /Recommendation: Confirm/);
  assert.equal(normalizeAiOutput("follow_up", { recommendation: "Call" }, {}).ok, false);
  assert.equal(normalizeAiOutput("follow_up", { ...recommendation, suggestedChannel: { secret: "oops" } }, {}).ok, false);
}));

test("malformed, nested malformed, array and wrong-task JSON never become subscriber prose", async () => withKey(async () => {
  for (const text of ['{"subject":', '```json\n{"body":"Hi"}', '[]', 'null', 'Recommendation: call', JSON.stringify(recommendation), JSON.stringify({ subject: "Hi", body: '```json\n{"recommendation":' }), JSON.stringify({ subject: "Hi", body: '{"reason":"internal"}' })]) {
    await assert.rejects(generate("email_writer", {}, undefined, { fetchImpl: fetchReturning(() => providerReply(text)) }), (error: unknown) => error instanceof AiGenerationError && error.code === "invalid_output");
  }
  assert.equal(parseStructuredAiJson('[{"body":"Hi"}]'), null);
  assert.equal(outputToPlainText("email_writer", { subject: "Hi", body: '```json\n{"recommendation":' }), "");
  assert.equal(normalizeAiOutput("note_summary", { bullets: [{ secret: "internal" }] }, {}).ok, false);
  assert.equal(normalizeAiOutput("campaign_idea", { name: "Test", description: "Draft", steps: [null] }, {}).ok, false);
}));

test("empty output, missing fields and provider truncation fail safely without a silent fallback", async () => withKey(async () => {
  for (const text of ["", "   ", "{}", '{"subject":"Hi","body":""}', '{"subject":"Hi"}']) {
    await assert.rejects(generate("email_writer", {}, undefined, { fetchImpl: fetchReturning(() => providerReply(text)) }), AiGenerationError);
  }
  await assert.rejects(generate("email_writer", {}, undefined, { fetchImpl: fetchReturning(() => providerReply(JSON.stringify(email), { stop_reason: "max_tokens" })) }), AiGenerationError);
}));

test("API errors, transport failures, invalid envelopes and timeouts expose only approved messages", async () => withKey(async () => {
  for (const fetchImpl of [fetchReturning(() => new Response("test-key-do-not-expose; customer-private-notes", { status: 429 })), (async () => { throw new Error("customer-private-notes; test-key-do-not-expose"); }) as typeof fetch]) {
    await assert.rejects(generate("email_writer", {}, undefined, { fetchImpl }), (error: unknown) => error instanceof AiGenerationError && !/test-key|customer-private/.test(error.message));
  }
  await assert.rejects(generate("email_writer", {}, undefined, { timeoutMs: 5, fetchImpl: () => new Promise(() => {}) }), (error: unknown) => error instanceof AiGenerationError && error.code === "timeout");
  for (const response of [new Response("", { status: 200 }), new Response("upstream secret", { status: 500 }), new Response(JSON.stringify({ success: false, error: "private notes; api key" }), { status: 500 })]) {
    await assert.rejects(requestAiDraft("email_writer", {}, undefined, { fetchImpl: fetchReturning(() => response) }), (error: unknown) => error instanceof AiGenerationError && !/private notes|api key|upstream secret/.test(error.message));
  }
  await assert.rejects(requestAiDraft("email_writer", {}, undefined, { timeoutMs: 5, fetchImpl: () => new Promise(() => {}) }), (error: unknown) => error instanceof AiGenerationError && error.code === "timeout");
}));

test("frontend revalidates task and fields, unwraps known nested JSON, and copies edits", async () => {
  const response = (data: unknown) => fetchReturning(() => Response.json({ success: true, data }));
  const draft = await requestAiDraft("email_writer", {}, undefined, { fetchImpl: response({ task: "email_writer", provider: "claude", output: email }) });
  const edited = { ...draft.output, subject: "Edited subject", body: "Hi Alex,\n\nHere is the revised shortlist." };
  assert.equal(outputToPlainText("email_writer", edited), "Subject: Edited subject\n\nHi Alex,\n\nHere is the revised shortlist.");
  assert.equal(normalizeAiOutput("email_writer", { body: '```json\n' + JSON.stringify(email) + '\n```' }, {}).ok, true);
  for (const output of [recommendation, { subject: "Hi", body: { secret: "internal" } }, null]) {
    await assert.rejects(requestAiDraft("email_writer", {}, undefined, { fetchImpl: response({ task: "email_writer", provider: "claude", output }) }), AiGenerationError);
  }
  await assert.rejects(requestAiDraft("email_writer", {}, undefined, { fetchImpl: response({ task: "follow_up", provider: "claude", output: recommendation }) }), AiGenerationError);
});

test("missing contact information produces a complete labeled template without invented details or private notes", async () => {
  const original = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  try {
    for (const context of [{}, { contactName: "   " }, { contactName: "Alex Bennett", contactNotes: "INTERNAL CONFIDENTIAL PERSONAL NOTE" }]) {
      const result = await generate("email_writer", context);
      assert.equal(result.provider, "template");
      assert.equal(normalizeAiOutput("email_writer", result.output, {}).ok, true);
      assert.doesNotMatch(String(result.output.body), /INTERNAL|CONFIDENTIAL|great connecting|Tuesday|Thursday/);
      assert.match(String(result.output.body), /\[Your name\]/);
    }
  } finally { if (original !== undefined) process.env.ANTHROPIC_API_KEY = original; }
});

test("saved contact context is fetched with an owner filter; absent or foreign contacts never reach the provider", async () => {
  const filters: Record<string, string> = {};
  const database = (data: unknown) => ({ from(table: string) { assert.equal(table, "contacts"); return { select(fields: string) { assert.equal(fields, "first_name, last_name, notes"); return { eq(key: string, value: string) { filters[key] = value; return this; }, async maybeSingle() { return { data, error: null }; } }; } }; } }) as unknown as typeof supabaseAdmin;
  const context = { contactId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", contactName: "Spoofed", contactNotes: "Spoofed notes" };
  const result = await loadAiContext("owner-a", context, database({ first_name: "Alex", last_name: "Bennett", notes: "Prefers waterfront" }));
  assert.equal(filters.owner_id, "owner-a"); assert.equal(filters.id, context.contactId);
  assert.equal(result.contactName, "Alex Bennett"); assert.equal(result.contactNotes, "Prefers waterfront");
  await assert.rejects(loadAiContext("owner-b", context, database(null)), (error: unknown) => error instanceof AiGenerationError && error.code === "contact_unavailable");
});

test("other existing AI task outputs stay supported", async () => {
  const original = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  try { for (const task of ["voicemail_script", "note_summary", "campaign_idea", "relationship_pulse"] as const) assert.equal(normalizeAiOutput(task, (await generate(task, {})).output, {}).ok, true); }
  finally { if (original !== undefined) process.env.ANTHROPIC_API_KEY = original; }
});

test("API boundary authenticates before access, redacts failures, rejects invalid input and logs metadata only", async () => {
  const { createAiHandler } = await import("../lib/ai/handle-request");
  let generated = false; let audit: unknown[] = [];
  const dependencies = {
    requireOwnerId: async () => "owner-a",
    loadContext: async (owner: string) => { assert.equal(owner, "owner-a"); return { contactName: "Authorized Alex" }; },
    generateDraft: async () => { generated = true; return { task: "email_writer" as const, output: email, provider: "claude", generatedAt: new Date().toISOString() }; },
    audit: async (...args: unknown[]) => { audit = args; },
  };
  const request = (body: string) => new Request("http://localhost/api/ai/generate", { method: "POST", body, headers: { "content-type": "application/json" } });
  const handler = createAiHandler(dependencies);
  const good = await handler(request(JSON.stringify({ task: "email_writer", brief: "Confidential brief" })));
  assert.equal(good.status, 200); assert.equal(generated, true);
  assert.deepEqual(audit, ["owner-a", "email_writer", "claude"]);
  for (const body of ["", "{", '{"task":"email_writer","brief":' + JSON.stringify("x".repeat(4001)) + '}', '{"task":"unknown"}']) {
    const response = await handler(request(body)); assert.equal(response.status, 400);
    const data = await response.json(); assert.equal(data.code, "ai_invalid_request"); assert.equal(data.details, undefined);
  }
  generated = false;
  const unauthorized = createAiHandler({ ...dependencies, requireOwnerId: async () => { throw new Error("Unauthorized"); } });
  assert.equal((await unauthorized(request('{"task":"email_writer"}'))).status, 401); assert.equal(generated, false);
  for (const source of ["auth", "context", "provider"] as const) {
    const fail = async (): Promise<never> => { throw new Error("sk-secret; customer-private-notes; stacktrace"); };
    const failing = createAiHandler({ ...dependencies,
      ...(source === "auth" ? { requireOwnerId: fail } : source === "context" ? { loadContext: fail } : { generateDraft: fail }),
    });
    const response = await failing(request('{"task":"email_writer"}'));
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /sk-secret|customer-private|stacktrace/);
  }
});
