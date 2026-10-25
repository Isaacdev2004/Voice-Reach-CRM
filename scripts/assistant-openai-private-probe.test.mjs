import test from "node:test";
import assert from "node:assert/strict";
import { probeOpenAI } from "./assistant-openai-private-probe.mjs";
const env = { MYARI_PRIVATE_PROBE_ENV: "isolated-staging", OPENAI_STAGING_API_KEY: "synthetic-not-a-credential" };
test("private probe refuses production and missing staging credentials without calling provider", async () => {
  const noCall = () => { throw Error("must not call"); };
  assert.equal((await probeOpenAI({}, noCall)).error, "isolated_staging_required");
  assert.equal((await probeOpenAI({ ...env, NODE_ENV: "production" }, noCall)).error, "isolated_staging_required");
  assert.equal((await probeOpenAI({ ...env, OPENAI_STAGING_API_KEY: "" }, noCall)).error, "nonproduction_credential_missing");
});
test("private probe uses Responses and emits only validated model usage", async () => {
  const result = await probeOpenAI(env, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(JSON.parse(init.body).store, false);
    return Response.json({ status: "completed", model: "gpt-5-mini", output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }], usage: { input_tokens: 8, output_tokens: 2 } });
  });
  assert.equal(result.success, true);
  assert.equal(result.inputTokens, 8);
  assert.ok(!JSON.stringify(result).includes(env.OPENAI_STAGING_API_KEY));
});
test("provider errors and malformed results never disclose raw bodies or credentials", async () => {
  assert.deepEqual(await probeOpenAI(env, async () => new Response(env.OPENAI_STAGING_API_KEY, { status: 401 })), { success: false, error: "provider_rejected", status: 401 });
  assert.equal((await probeOpenAI(env, async () => Response.json({ status: "incomplete" }))).error, "incomplete_or_invalid_result");
  assert.equal((await probeOpenAI(env, async () => { throw Error(env.OPENAI_STAGING_API_KEY); })).error, "provider_unavailable");
});
