const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), crypto = require("node:crypto");
const code = fs.readFileSync(require("node:path").join(__dirname, "staging-host-credentials.mjs"), "utf8").replace(/^import .*;\n/gm, "");
const run = new (Object.getPrototypeOf(async function(){}).constructor)("createHash", "createClerkClient", "createClient", "process", "fetch", "console", "Buffer", code);
function setup(overrides = {}) {
  const env = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/ai-operating-assistant", NEXT_PUBLIC_SUPABASE_URL: "https://jojgdfpmaxvbhobjrsbm.supabase.co", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_" + Buffer.from("synthetic.clerk.accounts.dev$").toString("base64"), CLERK_SECRET_KEY: "sk_test_synthetic", SUPABASE_SERVICE_ROLE_KEY: "synthetic", OPENAI_API_KEY: "synthetic", ...Object.fromEntries(["ALLOW_LIVE_OUTBOUND", "ASSISTANT_V2_ENABLED", "ASSISTANT_APPROVED_SENDS_ENABLED", "MYARI_AI_BILLING_ENABLED", "MYARI_AI_PUBLIC_LAUNCH_VERIFIED"].map(k => [k,"false"])), ...overrides };
  const output = [], process = { env }, keys = [{ kty: "RSA", n: "synthetic-n", e: "AQAB" }];
  let requests = 0;
  const fetch = async url => { requests++; return url.includes("openai") ? Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }], usage: { input_tokens: 5, output_tokens: 2 } }) : Response.json({ keys }); };
  return { process, output, get requests(){return requests;}, execute: () => run(crypto.createHash, () => ({ instance: { get: async () => ({ environmentType: "development" }) }, jwks: { getJwks: async () => ({ keys }) } }), () => ({ rpc: async () => ({ data: 1 }) }), process, fetch, { log: (_,r) => output.push(JSON.parse(r)) }, Buffer) };
}
test("host check refuses Production, production database and live provider credentials before requests", async () => {
  for (const overrides of [{ VERCEL_ENV: "production" }, { NEXT_PUBLIC_SUPABASE_URL: "https://qlochlyyimulyzzrzyac.supabase.co" }, { TWILIO_AUTH_TOKEN: "live-not-allowed" }, { CLERK_SECRET_KEY: "sk_live_not_allowed" }]) {
    const f = setup(overrides); await f.execute(); assert.equal(f.requests, 0); assert.equal(f.process.exitCode, 1); assert.equal(f.output[0].failedPhase, "safety");
  }
});
test("host check compares Clerk public signing keys, verifies service RPC and emits sanitized usage", async () => {
  const f = setup(); await f.execute(); assert.equal(f.output[0].success,true); assert.equal(f.requests,2); assert.equal(f.output[0].inputTokens,5); assert.ok(!JSON.stringify(f.output).includes("sk_test_"));
});
