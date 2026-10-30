const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const commit='a'.repeat(40);
const flags=['ALLOW_LIVE_OUTBOUND','ASSISTANT_V2_ENABLED','CONCIERGE_ENABLED','CONCIERGE_RETENTION_ENABLED','ASSISTANT_APPROVED_SENDS_ENABLED','MYARI_AI_BILLING_ENABLED','MYARI_AI_PUBLIC_LAUNCH_VERIFIED','MYARI_AI_ENTITLEMENTS_ENABLED','MYARI_AI_PRICING_ENABLED','MYARI_AI_PLAN_CHANGES_ENABLED'];
const base=()=>Object.assign({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_x619EYFFa4U3AV0irnzkx0jDnN1R',VERCEL_GIT_COMMIT_REF:'feat/concierge-pilot-readiness',VERCEL_GIT_COMMIT_SHA:commit,NEXT_PUBLIC_SUPABASE_URL:'https://jojgdfpmaxvbhobjrsbm.supabase.co'},Object.fromEntries(flags.map(k=>[k,'false'])));
function reject(env,code){const r=spawnSync(process.execPath,['scripts/concierge-preview-auth-check.mjs','--commit='+commit],{env,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stdout,new RegExp(code),r.stderr);assert.doesNotMatch(r.stdout,/synthetic-secret/);}
test('private auth guard refuses Production before provider requests',()=>reject({...base(),VERCEL_ENV:'production'},'deployment_identity_mismatch'));
test('private auth guard refuses sending and inherited credentials before provider requests',()=>{reject({...base(),ALLOW_LIVE_OUTBOUND:'true'},'isolation_flags_mismatch');reject({...base(),TWILIO_AUTH_TOKEN:'synthetic-secret'},'unsafe_inherited_configuration');});
test('private auth guard refuses non-test database before provider requests',()=>reject({...base(),NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid'},'test_database_mismatch'));
test('private auth guard refuses missing Development credentials before provider requests',()=>reject(base(),'clerk_development_required'));
