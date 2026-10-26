const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'staging-assistant-e2e.mjs'), 'utf8').replace(/^import .*;\n/gm, '');
const Run = Object.getPrototypeOf(async function(){}).constructor;
test('enabled acceptance refuses Production, wrong database and live effects before credentials or writes', async () => {
  for (const overrides of [{VERCEL_ENV:'production'}, {NEXT_PUBLIC_SUPABASE_URL:'https://qlochlyyimulyzzrzyac.supabase.co'}, {ALLOW_LIVE_OUTBOUND:'true'}, {STRIPE_SECRET_KEY:'synthetic-forbidden'}]) {
    let calls=0; const reports=[];
    const process={env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/ai-operating-assistant',NEXT_PUBLIC_SUPABASE_URL:'https://jojgdfpmaxvbhobjrsbm.supabase.co',ASSISTANT_V2_ENABLED:'true',ALLOW_LIVE_OUTBOUND:'false',ASSISTANT_APPROVED_SENDS_ENABLED:'false',MYARI_AI_BILLING_ENABLED:'false',MYARI_AI_PUBLIC_LAUNCH_VERIFIED:'false',MYARI_AI_ENTITLEMENTS_ENABLED:'false',...overrides}};
    await new Run('createClerkClient','createClient','randomUUID','assert','process','console',source)(()=>{calls++;},()=>{calls++;},()=> 'synthetic',assert,process,{log:(_,r)=>reports.push(JSON.parse(r))});
    assert.equal(calls,0); assert.equal(process.exitCode,1); assert.equal(reports[0].failedPhase,'safety');
  }
});
