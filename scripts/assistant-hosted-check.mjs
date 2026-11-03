// Explicit private operator run only. Real Clerk Development sessions; no auth stubs or public test endpoint.
// Raw responses, profiles, secrets, tokens and provider error bodies must never reach logs.
import { randomUUID } from "node:crypto";
import { resolveSenderDetails, personalizeDraft } from "../lib/assistant/sender-personalization.ts";
const HOST = "https://voice-reach-df6vy8y8p-magnificent-soless-projects.vercel.app";
const USERS = [
  { id: "user_3LEtQ3fcyVKhts0dV7T4ZIpuEU3", label: "MyARI Synthetic Acceptance A" },
  { id: "user_3LEtQDGZh5tKNfF5PvGbxnUos69", label: "MyARI Synthetic Acceptance B" },
];
const e = process.env, clients = [], createdCampaigns = [], conversations = [], checks = [];
const runId = randomUUID(), mark = "MYARI-SECURITY-" + runId;
const check = (name, ok, extra = {}) => checks.push({ name, result: ok ? "PASS" : "FAIL", ...extra });
const normalize = x => x.trim().replace(/\s+/g, " ").toLowerCase();
async function clerk(path, method = "GET", body) {
  const r = await fetch("https://api.clerk.com/v1" + path, { method,
    headers: { Authorization: "Bearer " + e.CLERK_SECRET_KEY, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error("clerk_request_rejected");
  return r.json();
}
async function app(path, client, method = "GET", body, extra = {}) {
  if (client && (!client.jwt || Date.now() - client.issued > 35000)) {
    const token = await clerk("/sessions/" + client.sessionId + "/tokens", "POST", { expires_in_seconds: 60 });
    if (typeof token.jwt !== "string") throw Error("clerk_token_missing");
    client.jwt = token.jwt; client.issued = Date.now();
  }
  const r = await fetch(HOST + path, { method, headers: {
    ...(e.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": e.VERCEL_OIDC_TOKEN } : {}),
    ...(client ? { Authorization: "Bearer " + client.jwt } : {}), "Content-Type": "application/json", ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: "manual", signal: AbortSignal.timeout(125000) });
  const data = r.headers.get("content-type")?.includes("application/json") ? await r.json() : null;
  return { status: r.status, data };
}
async function db(table, query, method = "GET") {
  const r = await fetch("https://jojgdfpmaxvbhobjrsbm.supabase.co/rest/v1/" + table + "?" + query, {
    method, headers: { apikey: e.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + e.SUPABASE_SERVICE_ROLE_KEY,
      Prefer: "return=representation" }, redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Error("test_database_check_failed");
  return r.json();
}
const actionFor = label => ({ kind: "campaign", name: mark + " Apopka " + label, audience: "Synthetic Apopka buyers",
  description: "Reviewable three-step buyer draft by [Agent Name] at [Brokerage]. Business email [agent_email]; [website].",
  durationDays: 7, steps: [
    { type: "sms", day: 1, title: "Apopka buyer introduction", description: "Hi {{contact.firstName}}, [Agent Name] with [Brokerage]. Call [phone-placeholder] about your Apopka search. Reply STOP to opt out." },
    { type: "email", day: 3, title: "Apopka buyer options", description: "Hi {{contact.firstName}}, review your saved Apopka criteria with [Agent Name]. Contact [agent_email] or [phone-placeholder]." },
    { type: "voicemail", day: 7, title: "Apopka buyer check-in", description: "Hi {{contact.firstName}}, [Agent Name] from [Brokerage]. Call [phone-placeholder]. Text script only." },
  ] });
async function run() {
  if (e.VERCEL_ENV !== "preview" || e.VERCEL_PROJECT_ID !== "prj_x619EYFFa4U3AV0irnzkx0jDnN1R" ||
      e.VERCEL_GIT_COMMIT_REF !== "feat/premium-assistant-workspace" || !e.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
      e.NEXT_PUBLIC_SUPABASE_URL !== "https://jojgdfpmaxvbhobjrsbm.supabase.co" ||
      ["ALLOW_LIVE_OUTBOUND", "ASSISTANT_APPROVED_SENDS_ENABLED", "MYARI_AI_BILLING_ENABLED", "MYARI_AI_PUBLIC_LAUNCH_VERIFIED"].some(k => e[k] !== "false") ||
      e.ASSISTANT_SEND_OWNER_IDS?.trim() || e.ASSISTANT_SEND_RECIPIENTS?.trim()) throw Error("isolated_context_required");
  const health = await app("/api/health"), database = await app("/api/health/db");
  if (health.status !== 200 || health.data?.clerkMode !== "test" || health.data?.liveSending !== false ||
      Object.values(health.data?.providers || {}).some(Boolean) || health.data?.stripe?.configured !== false ||
      database.data?.urlHost !== "jojgdfpmaxvbhobjrsbm.supabase.co") throw Error("target_isolation_required");
  check("target_runtime_isolation", true);
  const unauth = await app("/api/assistant/history");
  check("unauthenticated_denied", unauth.status === 401, { status: unauth.status });
  for (const candidate of USERS) {
    const u = await clerk("/users/" + candidate.id), primary = u.email_addresses?.find(x => x.id === u.primary_email_address_id);
    if (u.id !== candidate.id || normalize([u.first_name,u.last_name].filter(Boolean).join(" ")) !== normalize(candidate.label) ||
        u.banned || u.two_factor_enabled || primary?.verification?.status !== "verified" ||
        !/\+clerk_test[^@]*@/i.test(primary.email_address || "")) throw Error("exact_synthetic_identity_required");
    const s = await clerk("/sessions", "POST", { user_id: candidate.id });
    if (!s.id || s.user_id !== candidate.id) throw Error("session_identity_mismatch");
    const c = { ...candidate, sessionId: s.id, user: u }; clients.push(c);
    const v = await app("/api/assistant/verify", c), config = await app("/api/assistant/config", c);
    if (v.status !== 200 || v.data?.clerkUserId !== c.id || v.data?.clerkMode !== "test" || !config.data?.enabled)
      throw Error("authenticated_test_access_required");
    check(c.label + ": hosted_identity", true);
    check(c.label + ": external_actions_disabled", config.data.externalActionsEnabled === false);
    const rows = await db("audit_logs", new URLSearchParams({ select:"metadata", owner_id:"eq."+c.id,
      entity_type:"eq.user_settings", action:"eq.SETTINGS_SAVED", order:"created_at.desc", limit:"1" }));
    c.settings = rows[0]?.metadata?.settings || null;
    c.sender = resolveSenderDetails(c.settings, { id:c.id, name:[u.first_name,u.last_name].filter(Boolean).join(" "), emailVerified:true, banned:false });
    const branding = await app("/api/settings/brand-kit?ownerId=" + USERS.find(x => x.id !== c.id).id, c);
    check(c.label + ": own_brand_kit_available", branding.status === 200);
    const raw = actionFor(c.label), expected = personalizeDraft(raw,c.sender);
    const p = await app("/api/assistant/proposals",c,"POST",raw);
    if (p.status !== 200 || !p.data?.proposal) throw Error("campaign_proposal_unavailable");
    c.proposal = p.data.proposal;
    check(c.label + ": personalization_matches_authorized_profile", JSON.stringify(c.proposal.action) === JSON.stringify(expected.action));
    check(c.label + ": missing_fields_explicit", JSON.stringify(c.proposal.preview.personalization.missingFields) === JSON.stringify(expected.personalization.missingFields),
      { missingFieldCount:expected.personalization.missingFields.length, conflictNoticeCount:expected.personalization.notices.length });
    check(c.label + ": recipient_merge_fields_preserved", c.proposal.action.steps.every(s=>s.description.includes("{{contact.firstName}}")));
    check(c.label + ": no_activation_supported", c.proposal.preview.activationSupported === false);
  }
  check("distinct_sender_profiles", clients[0].sender.values.agentName !== clients[1].sender.values.agentName);
  for (const c of clients) {
    const other = clients.find(x=>x.id!==c.id);
    const foreign = await app("/api/assistant/proposals?id="+other.proposal.id,c);
    check(c.label+": foreign_proposal_denied",[403,404].includes(foreign.status),{status:foreign.status});
    const foreignApprove=await app("/api/assistant/approve",c,"POST",{proposalId:other.proposal.id,digest:other.proposal.digest,confirmation:"CONFIRM_SAVE"});
    check(c.label+": foreign_approval_denied",[403,404].includes(foreignApprove.status),{status:foreignApprove.status});
    const mismatch=await app("/api/assistant/history",c,"GET",undefined,{"X-MyARI-Owner":other.id});
    check(c.label+": forged_owner_denied",mismatch.status===409);
    const revised={...actionFor(c.label),description:actionFor(c.label).description+" Reviewed revision."};
    const revision=await app("/api/assistant/proposals",c,"POST",{action:revised,revisionOf:c.proposal.id});
    if(revision.status!==200||!revision.data?.proposal)throw Error("revision_unavailable");
    c.revision=revision.data.proposal;
    check(c.label+": revision_same_root",c.revision.rootId===(c.proposal.rootId||c.proposal.id));
    const stale=await app("/api/assistant/approve",c,"POST",{proposalId:c.proposal.id,digest:c.proposal.digest,confirmation:"CONFIRM_SAVE"});
    check(c.label+": superseded_approval_denied",[400,409].includes(stale.status),{status:stale.status});
    const wrong=await app("/api/assistant/approve",c,"POST",{proposalId:c.revision.id,digest:c.revision.digest,confirmation:"CONFIRM_SEND"});
    check(c.label+": wrong_confirmation_denied",wrong.status===400);
    const save=await app("/api/assistant/approve",c,"POST",{proposalId:c.revision.id,digest:c.revision.digest,confirmation:"CONFIRM_SAVE"});
    const outcome=save.data?.outcome, id=outcome?.result?.recordId;
    if(outcome?.state!=="completed"||!id)throw Error("draft_save_unconfirmed");
    createdCampaigns.push({owner:c.id,id,name:c.revision.action.name});
    c.campaignId=id;
    const own=await app("/api/campaigns/"+id,c), denied=await app("/api/campaigns/"+id,other);
    check(c.label+": saved_draft_retrieval",own.status===200&&own.data?.campaign?.status==="draft"&&own.data?.steps?.length===3);
    check(c.label+": foreign_campaign_denied",denied.status===404);
    check(c.label+": no_enrollment_or_scheduling",own.data?.recipients?.length===0&&own.data?.runs?.length===0&&!own.data?.campaign?.live_launched);
    const replay=await app("/api/assistant/approve",c,"POST",{proposalId:c.revision.id,digest:c.revision.digest,confirmation:"CONFIRM_SAVE"});
    check(c.label+": save_replay_idempotent",replay.data?.outcome?.result?.recordId===id);
    const conversationId=randomUUID();conversations.push({c,id:conversationId});
    const chat=await app("/api/assistant/chat",c,"POST",{conversationId,requestId:randomUUID(),message:mark+" "+c.label+". Reply with a short acknowledgement only. Do not call tools or create any proposal."});
    check(c.label+": hosted_provider_response",chat.status===200,{status:chat.status});
    const history=await app("/api/assistant/history?conversationId="+conversationId,c);
    const hidden=await app("/api/assistant/history?conversationId="+conversationId,other);
    check(c.label+": own_history_persists",history.status===200&&history.data?.messages?.some(m=>m.content?.includes(mark)));
    check(c.label+": foreign_history_empty",hidden.status===200&&hidden.data?.messages?.length===0);
    let limited=chat.status===429;
    for(let i=0;i<5&&!limited;i++){
      const r=await app("/api/assistant/chat",c,"POST",{conversationId,requestId:randomUUID(),message:"Reply OK only. No tools."});
      if(r.status===429)limited=true;
      else if(r.status!==200)break;
    }
    check(c.label+": server_usage_limit_enforced",limited);
  }
  return {success:checks.every(x=>x.result==="PASS"),checks,note:"Authenticated hosted API acceptance. Browser UI is not exercised. Saved profiles were read only; existing source-conflict coverage depends on their actual contents."};
}
let result;
try { result=await run(); } catch {result={success:false,code:"private_hosted_acceptance_incomplete",checks};}
finally {
  let historyCleaned=0,campaignsCleaned=0,revoked=0;
  for(const {c,id} of conversations){try{const r=await app("/api/assistant/history",c,"DELETE",{conversationId:id,confirmation:"DELETE_CONVERSATION"});if(r.data?.deleted)historyCleaned++;}catch{}}
  for(const f of createdCampaigns){try{const q=new URLSearchParams({id:"eq."+f.id,owner_id:"eq."+f.owner,name:"eq."+f.name,status:"eq.draft",provider:"eq.mock"});
    const rows=await db("campaigns",q,"DELETE");if(rows.length===1)campaignsCleaned++;}catch{}}
  for(const c of clients){try{await clerk("/sessions/"+c.sessionId+"/revoke","POST");revoked++;}catch{}}
  const cleanup={sessionsCreated:clients.length,sessionsRevoked:revoked,syntheticCampaignsCreated:createdCampaigns.length,syntheticCampaignsRemoved:campaignsCleaned,
    syntheticConversationsCreated:conversations.length,syntheticConversationsRemoved:historyCleaned,usageAndSecurityAuditRetained:true};
  result={...result,cleanup};
  if(revoked!==clients.length||campaignsCleaned!==createdCampaigns.length||historyCleaned!==conversations.length)result.success=false;
  console.log("MYARI_HOSTED_ASSISTANT_ACCEPTANCE",JSON.stringify(result));
  if(!result.success)process.exitCode=1;
}
