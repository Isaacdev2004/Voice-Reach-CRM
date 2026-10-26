import test from "node:test";
import assert from "node:assert/strict";
import { checkProductionOpenAI } from "./assistant-production-connectivity-check.mjs";
const env = { MYARI_PRIVATE_PRODUCTION_PROBE: "approved-connectivity-only", VERCEL_ENV: "production",
  VERCEL_PROJECT_ID: "prj_x619EYFFa4U3AV0irnzkx0jDnN1R", NEXT_PUBLIC_SUPABASE_URL: "https://qlochlyyimulyzzrzyac.supabase.co",
  MYARI_APPROVED_PROBE_COMMIT: "a".repeat(40), VERCEL_GIT_COMMIT_SHA: "a".repeat(40), OPENAI_API_KEY: "synthetic-not-a-credential" };

test("private Production probe refuses other environments, projects, databases and unapproved commits before network", async () => {
  for (const change of [{MYARI_PRIVATE_PRODUCTION_PROBE:""},{VERCEL_ENV:"preview"},{VERCEL_PROJECT_ID:"other"},
    {NEXT_PUBLIC_SUPABASE_URL:"https://jojgdfpmaxvbhobjrsbm.supabase.co"},{VERCEL_GIT_COMMIT_SHA:"b".repeat(40)}]) {
    let calls=0;const result=await checkProductionOpenAI({...env,...change},async()=>{calls++;});
    assert.equal(calls,0);assert.equal(result.error,"approved_production_target_required");
  }
});
test("private Production probe refuses enabled access, messaging or billing and nonempty allowlists", async () => {
  for (const change of [{ASSISTANT_V2_ENABLED:"true"},{ASSISTANT_APPROVED_SENDS_ENABLED:"true"},
    {MYARI_AI_PUBLIC_LAUNCH_VERIFIED:"true"},{MYARI_AI_BILLING_ENABLED:"true"},{MYARI_AI_ENTITLEMENTS_ENABLED:"true"},
    {ASSISTANT_V2_OWNER_IDS:"synthetic"},{ASSISTANT_SEND_RECIPIENTS:"synthetic"}]) {
    let calls=0;const result=await checkProductionOpenAI({...env,...change},async()=>{calls++;});
    assert.equal(calls,0);assert.equal(result.success,false);
  }
});
test("private Production probe uses a single bounded Responses request and emits verified usage without content or keys", async () => {
  let calls=0;const result=await checkProductionOpenAI(env,async(url,init)=>{
    calls++;assert.equal(url,"https://api.openai.com/v1/responses");
    const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.max_output_tokens,128);
    assert.equal(body.tools,undefined);assert.ok(init.signal);
    return Response.json({status:"completed",usage:{input_tokens:10,output_tokens:8},output:[{type:"message",content:[{type:"output_text",text:"OK"}]}]});
  });
  assert.equal(calls,1);assert.equal(result.success,true);assert.equal(result.inputTokens,10);
  assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));assert.equal(result.output,undefined);
});
test("provider rejection and network failure never disclose errors or retry", async () => {
  let calls=0;const rejected=await checkProductionOpenAI(env,async()=>{calls++;return new Response(env.OPENAI_API_KEY,{status:401});});
  assert.equal(calls,1);assert.equal(rejected.status,401);assert.ok(!JSON.stringify(rejected).includes(env.OPENAI_API_KEY));
  const failed=await checkProductionOpenAI(env,async()=>{throw Error(env.OPENAI_API_KEY);});
  assert.equal(failed.error,"provider_unavailable");assert.ok(!JSON.stringify(failed).includes(env.OPENAI_API_KEY));
});
test("missing credentials, incomplete responses and invalid usage cannot be reported successful", async () => {
  const missing=await checkProductionOpenAI({...env,OPENAI_API_KEY:""},()=>{throw Error("must not call");});
  assert.equal(missing.configured,false);
  for(const data of [{status:"incomplete"},{status:"completed",usage:{input_tokens:1,output_tokens:-1}},{status:"completed",usage:{input_tokens:1,output_tokens:1},output:[{type:"message",content:[{type:"output_text",text:"Unexpected"}]}]}])
    assert.equal((await checkProductionOpenAI(env,async()=>Response.json(data))).success,false);
});
