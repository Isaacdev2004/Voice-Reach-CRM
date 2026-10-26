// Authenticated HTTP acceptance against the approved synthetic-only Preview.
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const out = { execution: "authenticated_preview_http", tests: {}, statuses: {}, cleanup: false };
const sessions = [], owners = [], contacts = [];
const cleanupTables = ["campaigns","contact_tasks","assistant_proposal_roots","ai_usage_operations","ai_usage_accounts","ai_usage_adjustments","audit_logs","contacts"];
let clerk, db, target, phase = "safety", allowedCleanup = false;
const e = process.env, nonce = randomUUID();
async function check(name, fn) {
  phase = name;
  try { await fn(); out.tests[name] = "PASS"; }
  catch (error) { out.tests[name] = "FAIL"; if (error?.code === "ERR_ASSERTION") out.statuses[name] ??= "assertion_failed"; }
}
try {
  assert.equal(e.VERCEL_ENV,"preview"); assert.equal(e.VERCEL_GIT_COMMIT_REF,"feat/ai-operating-assistant");
  assert.equal(e.NEXT_PUBLIC_SUPABASE_URL,"https://jojgdfpmaxvbhobjrsbm.supabase.co");
  assert.equal(e.ASSISTANT_V2_ENABLED,"true");
  for (const key of ["ALLOW_LIVE_OUTBOUND","ASSISTANT_APPROVED_SENDS_ENABLED","MYARI_AI_BILLING_ENABLED","MYARI_AI_PUBLIC_LAUNCH_VERIFIED","MYARI_AI_ENTITLEMENTS_ENABLED"]) assert.equal(e[key],"false");
  for (const key of ["STRIPE_SECRET_KEY","TWILIO_AUTH_TOKEN","RESEND_API_KEY"]) assert.ok(!e[key]?.trim());
  assert.ok(e.CLERK_SECRET_KEY?.trim().startsWith("sk_test_")); assert.ok(e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim().startsWith("pk_test_"));
  target = new URL(e.STAGING_ACCEPTANCE_TARGET);
  assert.equal(target.protocol,"https:"); assert.match(target.hostname,/^voice-reach-[a-z0-9]+-magnificent-soless-projects\.vercel\.app$/);
  clerk = createClerkClient({ secretKey: e.CLERK_SECRET_KEY.trim(), publishableKey: e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() });
  db = createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  phase = "synthetic_identity_and_empty_baseline";
  for (const label of ["a","b"]) {
    const r = await clerk.users.getUserList({ externalId:[`myari-isolated-acceptance-${label}`],limit:2 });
    assert.equal(r.data.length,1); assert.equal(r.data[0].privateMetadata?.myariStagingAcceptance,true);
    owners.push(r.data[0].id);
    await clerk.users.unlockUser(r.data[0].id);
  }
  assert.deepEqual((e.ASSISTANT_V2_OWNER_IDS??"").split(",").map(x=>x.trim()).sort(),[...owners].sort());
  for (const owner of owners) for (const table of cleanupTables) {
    const r = await db.from(table).select("*",{count:"exact",head:true}).eq("owner_id",owner);
    assert.ok(!r.error); assert.equal(r.count,0);
  }
  allowedCleanup = true;
  const tokens = [];
  for (const owner of owners) {
    const s = await clerk.sessions.createSession({userId:owner}); sessions.push(s.id);
    const t = await clerk.sessions.getToken(s.id); tokens.push(t.jwt);
    const auth = await clerk.authenticateRequest(new Request(new URL("/api/assistant/config",target),{headers:{Authorization:`Bearer ${t.jwt}`}}));
    assert.equal(auth.toAuth()?.userId,owner);
  }
  async function http(actor,path,method="GET",body) {
    const freshToken = await clerk.sessions.getToken(sessions[actor]);
    const headers = {Authorization:`Bearer ${freshToken.jwt}`};
    if (e.VERCEL_OIDC_TOKEN) headers["x-vercel-trusted-oidc-idp-token"]=e.VERCEL_OIDC_TOKEN;
    if (body!==undefined) headers["content-type"]="application/json";
    const r=await fetch(new URL(path,target),{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual",signal:AbortSignal.timeout(115000)});
    out.statuses[phase]=r.status;
    assert.ok(r.headers.get("content-type")?.includes("application/json"));
    const data=await r.json(); out.statuses[phase]=r.status;
    return {status:r.status,data:data?.data??data};
  }
  for (let i=0;i<2;i++) {
    const row={id:randomUUID(),owner_id:owners[i],first_name:i===0?"SyntheticAcceptanceA":"SyntheticAcceptanceB",phone:`+1555555010${i+1}`,dnc:true,notes:i===0?"Synthetic verified preference: courtyard homes.":"Synthetic verified preference: waterfront homes."};
    contacts.push(row); const r=await db.from("contacts").insert(row); assert.ok(!r.error);
  }
  await check("auth_allowlist_and_disabled_effects",async()=>{
    for (let i=0;i<2;i++) {const r=await http(i,"/api/assistant/config");assert.equal(r.status,200);assert.equal(r.data.enabled,true);assert.equal(r.data.externalActionsEnabled,false);assert.equal(r.data.configured,true);assert.equal(r.data.provider,"openai");assert.equal(r.data.safetyLimits.dailyInteractions,5);assert.equal(r.data.safetyLimits.dailyProviderCalls,10);}
  });
  await check("http_contact_tenant_isolation",async()=>{
    for(let i=0;i<2;i++){const own=await http(i,`/api/contacts/${contacts[i].id}`),foreign=await http(i,`/api/contacts/${contacts[1-i].id}`);assert.equal(own.status,200);assert.equal(foreign.status,404);}
  });
  const conversationId=randomUUID(); let initialCampaign,revisedCampaign,editedCampaign;
  const chat=message=>({conversationId,requestId:randomUUID(),message,context:{path:"/dashboard/campaigns"}});
  await check("live_ai_contact_search_and_factual_summary",async()=>{
    const body=chat("Find the contact named SyntheticAcceptanceA and summarize only their recorded home preferences in one sentence. Do not prepare actions or send anything."); body.context.path="/dashboard/contacts";
    const r=await http(0,"/api/assistant/chat","POST",body);assert.equal(r.status,200);assert.match(r.data.message,/courtyard/i);assert.ok(r.data.results.some(x=>x.name==="search_contacts"));assert.ok(r.data.usage.inputTokens>0);assert.equal(r.data.usage.provider,"openai");
  });
  await check("conversation_persistence_and_isolation",async()=>{
    const own=await http(0,`/api/assistant/history?conversationId=${conversationId}`),foreign=await http(1,`/api/assistant/history?conversationId=${conversationId}`);
    assert.ok(own.data.messages.length>=2);assert.equal(foreign.data.messages.length,0);assert.ok(own.data.messages.some(x=>x.role==="assistant"&&/courtyard/i.test(x.content)));
  });
  await check("live_ai_21day_campaign_draft",async()=>{
    const r=await http(0,"/api/assistant/chat","POST",chat("Prepare a 21-day campaign for a synthetic cold buyer audience with exactly three complete SMS messages on days 1, 10 and 21. Use supported personalization placeholders and SMS opt-out wording. No attachments, enrollment, activation or sending. Use the campaign preparation tool to create the reviewable draft."));
    assert.equal(r.status,200);initialCampaign=r.data.proposals.find(x=>x.action.kind==="campaign");assert.ok(initialCampaign);assert.equal(initialCampaign.action.durationDays,21);assert.equal(initialCampaign.action.steps.length,3);
    const count=await db.from("campaigns").select("*",{count:"exact",head:true}).eq("owner_id",owners[0]);assert.equal(count.count,0);
  });
  await check("live_ai_campaign_revision",async()=>{
    assert.ok(initialCampaign);
    const r=await http(0,"/api/assistant/chat","POST",chat(`Revise the unsaved campaign proposal ${initialCampaign.id}: make the messages warmer, keep its three SMS steps and 21-day duration. Read the proposal first and use revisionOf to replace that preview; do not create a separate campaign or save anything.`));
    assert.equal(r.status,200);revisedCampaign=r.data.proposals.find(x=>x.action.kind==="campaign");assert.ok(revisedCampaign);assert.equal(revisedCampaign.rootId,initialCampaign.rootId);assert.notEqual(revisedCampaign.id,initialCampaign.id);
  });
  await check("editable_preview_and_supersession",async()=>{
    assert.ok(revisedCampaign);
    const action=structuredClone(revisedCampaign.action);action.name="Synthetic acceptance campaign "+nonce.slice(0,8);action.steps[1].day=12;
    const r=await http(0,"/api/assistant/proposals","POST",{action,revisionOf:revisedCampaign.id});assert.equal(r.status,200);editedCampaign=r.data.proposal;assert.equal(editedCampaign.action.steps[1].day,12);
    const old=await http(0,"/api/assistant/approve","POST",{proposalId:revisedCampaign.id,digest:revisedCampaign.digest,confirmation:"CONFIRM_SAVE"});assert.ok(old.status>=400);
  });
  await check("campaign_confirm_save_and_replay",async()=>{
    assert.ok(editedCampaign);const body={proposalId:editedCampaign.id,digest:editedCampaign.digest,confirmation:"CONFIRM_SAVE"};
    const saved=await http(0,"/api/assistant/approve","POST",body);assert.equal(saved.status,200);assert.equal(saved.data.outcome.state,"completed");
    const replay=await http(0,"/api/assistant/approve","POST",body);assert.equal(replay.data.outcome.state,"completed");
    const rows=await db.from("campaigns").select("id,status").eq("owner_id",owners[0]);assert.equal(rows.data.length,1);assert.equal(rows.data[0].status,"draft");
    const recipients=await db.from("campaign_recipients").select("*",{count:"exact",head:true}).eq("owner_id",owners[0]);assert.equal(recipients.count,0);
  });
  let taskProposal;
  await check("task_preview_tamper_and_foreign_approval_denied",async()=>{
    const r=await http(0,"/api/assistant/proposals","POST",{kind:"task",contactId:contacts[0].id,title:"Synthetic E2E call "+nonce,dueAt:new Date(Date.now()+86400000).toISOString(),notes:"Synthetic task; no communications."});assert.equal(r.status,200);taskProposal=r.data.proposal;
    const wrong=await http(0,"/api/assistant/approve","POST",{proposalId:taskProposal.id,digest:"0".repeat(64),confirmation:"CONFIRM_SAVE"});assert.ok(wrong.status>=400);
    const foreign=await http(1,"/api/assistant/approve","POST",{proposalId:taskProposal.id,digest:taskProposal.digest,confirmation:"CONFIRM_SAVE"});assert.equal(foreign.status,404);
  });
  await check("task_confirm_save_replay_and_recovery",async()=>{
    assert.ok(taskProposal);const body={proposalId:taskProposal.id,digest:taskProposal.digest,confirmation:"CONFIRM_SAVE"};
    const saved=await http(0,"/api/assistant/approve","POST",body);assert.equal(saved.status,200);assert.equal(saved.data.outcome.state,"completed");
    const replay=await http(0,"/api/assistant/approve","POST",body);assert.equal(replay.data.outcome.state,"completed");
    const rows=await db.from("contact_tasks").select("id").eq("owner_id",owners[0]);assert.equal(rows.data.length,1);
  });
  await check("proposal_rejection_and_cancel_replay",async()=>{
    const p=await http(1,"/api/assistant/proposals","POST",{kind:"task",contactId:contacts[1].id,title:"Synthetic cancelled task",dueAt:new Date(Date.now()+86400000).toISOString(),notes:"Do not save"});assert.equal(p.status,200);
    const cancelled=await http(1,"/api/assistant/approve","DELETE",{proposalId:p.data.proposal.id});assert.equal(cancelled.data.outcome.state,"cancelled");
    const replay=await http(1,"/api/assistant/approve","POST",{proposalId:p.data.proposal.id,digest:p.data.proposal.digest,confirmation:"CONFIRM_SAVE"});assert.equal(replay.data.outcome.state,"cancelled");
    const count=await db.from("contact_tasks").select("*",{count:"exact",head:true}).eq("owner_id",owners[1]);assert.equal(count.count,0);
  });
  await check("expired_preview_rejected",async()=>{
    const p=await http(1,"/api/assistant/proposals","POST",{kind:"task",contactId:contacts[1].id,title:"Synthetic expired task",dueAt:new Date(Date.now()+86400000).toISOString(),notes:"Do not save"});assert.equal(p.status,200);
    const metadata={...p.data.proposal,expiresAt:new Date(Date.now()-60000).toISOString()};
    const update=await db.from("audit_logs").update({metadata}).eq("owner_id",owners[1]).eq("entity_id",p.data.proposal.id).eq("entity_type","assistant_proposal");assert.ok(!update.error);
    const expired=await http(1,"/api/assistant/approve","POST",{proposalId:p.data.proposal.id,digest:p.data.proposal.digest,confirmation:"CONFIRM_SAVE"});assert.ok(expired.status>=400);
  });
  await check("invalid_input_error_and_read_recovery",async()=>{
    const bad=await http(0,"/api/assistant/chat","POST",{message:"invalid body"});assert.equal(bad.status,400);
    const good=await http(0,"/api/assistant/work");assert.equal(good.status,200);assert.ok(good.data.work.length>0);
    const foreign=await http(1,"/api/assistant/work");assert.ok(foreign.data.work.every(x=>x.proposal.action.kind!=="campaign"));
  });
  await check("verified_token_usage_records",async()=>{
    const r=await http(0,"/api/assistant/history");assert.equal(r.status,200);assert.ok(r.data.usage.length>0);assert.ok(r.data.usage.every(x=>Number.isFinite(x.inputTokens)&&Number.isFinite(x.outputTokens)));
    out.providerInputTokens=r.data.usage.reduce((n,x)=>n+x.inputTokens,0);out.providerOutputTokens=r.data.usage.reduce((n,x)=>n+x.outputTokens,0);
  });
  const store=await import("../lib/assistant/store.ts");
  await check("daily_request_hard_cap_and_foreign_context",async()=>{
    const foreign=await http(1,"/api/assistant/chat","POST",{conversationId:randomUUID(),requestId:randomUUID(),message:"Summarize selected contact",context:{path:"/dashboard/contacts",contactId:contacts[0].id}});assert.equal(foreign.status,404);
    for(let i=0;i<4;i++)await store.reserveUsage(owners[1],randomUUID());
    await assert.rejects(store.reserveUsage(owners[1],randomUUID()),/Daily assistant request limit/);
    const capped=await http(1,"/api/assistant/chat","POST",{conversationId:randomUUID(),requestId:randomUUID(),message:"This must be blocked by the daily allowance"});assert.equal(capped.status,429);assert.match(capped.data.error,/Daily/i);
  });
  await check("daily_provider_call_hard_cap",async()=>{
    for(let i=0;i<10;i++)await store.reserveProviderCall(owners[1],randomUUID());
    await assert.rejects(store.reserveProviderCall(owners[1],randomUUID()),/provider-call limit/);
  });
  await check("observed_token_threshold",async()=>{
    await store.put(owners[1],"tokens",randomUUID(),"synthetic-threshold",{inputTokens:19000,outputTokens:1000});
    await assert.rejects(store.checkObservedBudget(owners[1]),/observed token threshold/);
  });
  await check("monthly_rpc_idempotency_cap_release_and_future_period_guard",async()=>{
    const n=new Date(),start=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),1)).toISOString(),end=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()+1,1)).toISOString(),nextEnd=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()+2,1)).toISOString();
    const reserve=(key,units,period=start,periodEnd=end)=>db.rpc("reserve_ai_usage",{p_owner:owners[1],p_period:period,p_end:periodEnd,p_capability:"requests",p_key:key,p_units:units,p_limit:200});
    const settle=(key,success)=>db.rpc("settle_ai_usage",{p_owner:owners[1],p_period:start,p_capability:"requests",p_key:key,p_delivered:success});
    const first=await reserve("synthetic-monthly",199);assert.ok(!first.error);const paid=await settle("synthetic-monthly",true);assert.ok(!paid.error);
    const duplicate=await reserve("synthetic-monthly",199);assert.equal(duplicate.data.fresh,false);
    const cap=await reserve("synthetic-over",2);assert.ok(cap.error);
    assert.ok(!(await reserve("synthetic-release",1)).error);assert.ok(!(await settle("synthetic-release",false)).error);
    const reset=await reserve("synthetic-next",1,end,nextEnd);assert.ok(reset.error);
  });
  await check("provider_outage_safe_failure_component",async()=>{
    const {openaiProvider}=await import("../lib/assistant/provider.ts"),original=globalThis.fetch;let calls=0;
    globalThis.fetch=async()=>{calls++;return new Response("synthetic provider unavailable",{status:503});};
    try{await assert.rejects(openaiProvider.respond({system:"Synthetic outage test",messages:[{role:"user",content:"Test"}],tools:[]}),/OpenAI/);assert.equal(calls,2);}finally{globalThis.fetch=original;}
  });
  out.success=Object.values(out.tests).every(x=>x==="PASS");
} catch(error) {out.success=false;out.failedPhase=phase;if(error?.code==="ERR_ASSERTION")out.failureKind="assertion_failed";}
finally {
  let cleaned=true;
  if(allowedCleanup)for(const owner of owners)for(const table of cleanupTables){try{const r=await db.from(table).delete().eq("owner_id",owner);if(r.error)cleaned=false;}catch{cleaned=false;}}
  for(const id of sessions){try{await clerk.sessions.revokeSession(id);}catch{cleaned=false;}}
  if(allowedCleanup)for(const owner of owners)for(const table of cleanupTables){try{const r=await db.from(table).select("*",{count:"exact",head:true}).eq("owner_id",owner);if(r.error||r.count!==0)cleaned=false;}catch{cleaned=false;}}
  for(const owner of owners){try{await clerk.users.lockUser(owner);}catch{cleaned=false;}}
  out.syntheticAccountsLocked=cleaned;
  out.cleanup=cleaned;if(!cleaned)out.success=false;
  console.log("MYARI_ASSISTANT_E2E",JSON.stringify(out));if(!out.success)process.exitCode=1;
}
