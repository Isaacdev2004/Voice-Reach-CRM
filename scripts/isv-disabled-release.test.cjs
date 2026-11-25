/* Release compatibility: disabled managed infrastructure must not need its absent schema. */
const assert = require('node:assert/strict');
const {fixture} = require('./campaign-audit/harness.cjs');
(async()=>{
 const f=fixture();let databaseCalls=0,providerCalls=0,legacyCalls=0,checks=0;
 const db=f.stubs['@/lib/supabaseAdmin'].supabaseAdmin;
 db.from=()=>{databaseCalls++;throw Error('ISV schema deliberately absent');};
 db.rpc=async()=>{databaseCalls++;throw Error('ISV schema deliberately absent');};
 f.stubs['@/lib/communications/webhook']={handleInbound:async()=>{legacyCalls++;return new Response(null,{status:202});}};
 global.fetch=async()=>{providerCalls++;throw Error('Provider forbidden');};
 for(const value of [undefined,'false']){
  for(const key of ['MANAGED_MESSAGING_SETUP_ENABLED','MANAGED_SMS_PILOT_ENABLED','MANAGED_SMS_WEBHOOKS_ENABLED','MANAGED_SMS_REGISTRATION_ENABLED','ALLOW_LIVE_OUTBOUND']){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  const setup=f.load('app/api/messaging/setup/route');
  assert.equal((await setup.GET()).status,404);checks++;
  assert.equal((await setup.POST(new Request('https://synthetic.invalid/api/messaging/setup',{method:'POST',body:'invalid'}))).status,404);checks++;
  const webhook=f.load('lib/messaging/isv/webhook');
  assert.equal((await webhook.managedSmsWebhook(new Request('https://synthetic.invalid/api/webhooks/twilio/sms',{method:'POST'}))).status,503);checks++;
  const delivery=f.load('app/api/messaging/isv/delivery/route');
  assert.equal((await delivery.POST(new Request('https://synthetic.invalid/api/messaging/isv/delivery',{method:'POST'}))).status,503);checks++;
  const service=f.load('lib/messaging/isv/service');
  await assert.rejects(()=>service.prepareSms({}),/disabled/);checks++;
  const auth=f.load('lib/providers/send-authorization');
  assert.deepEqual(await auth.authorizeLiveOutbound({}),['Live outbound is paused.']);checks++;
  const route=f.load('app/api/webhooks/twilio/sms/route');
  assert.equal((await route.POST(new Request('https://synthetic.invalid/api/webhooks/twilio/sms',{method:'POST'}))).status,202);checks++;
 }
 assert.equal(databaseCalls,0);checks++;assert.equal(providerCalls,0);checks++;assert.equal(legacyCalls,2);checks++;
 console.log(JSON.stringify({result:'PASS',checks,databaseCalls,providerCalls,scope:'Actual disabled routes/services with deliberately unavailable ISV schema; synthetic auth and legacy boundary only.'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
