// Private Preview build runner against an already Ready protected Preview.
// Does not enable Assistant, send communications, change billing, or log sessions.
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const out = { execution: "private_build_runner_against_preview", accounts: 0, sessionsValidated: 0, authenticatedRequests: 0, tenantIsolation: false, assistantRemainsDisabled: false };
const sessions = [], contacts = [];
let clerk, db, phase = "safety";
try {
  const e = process.env;
  if (e.VERCEL_ENV !== "preview" || e.VERCEL_GIT_COMMIT_REF !== "feat/ai-operating-assistant" || e.NEXT_PUBLIC_SUPABASE_URL !== "https://jojgdfpmaxvbhobjrsbm.supabase.co") throw Error("scope");
  if (!e.CLERK_SECRET_KEY?.trim().startsWith("sk_test_") || !e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim().startsWith("pk_test_")) throw Error("development_auth");
  for (const key of ["ALLOW_LIVE_OUTBOUND","ASSISTANT_V2_ENABLED","ASSISTANT_APPROVED_SENDS_ENABLED","MYARI_AI_BILLING_ENABLED"])
    if (e[key] !== "false") throw Error("gate");
  if (e.STRIPE_SECRET_KEY?.trim() || e.TWILIO_AUTH_TOKEN?.trim() || e.RESEND_API_KEY?.trim()) throw Error("live_provider");
  const target = new URL(e.STAGING_ACCEPTANCE_TARGET);
  if (target.protocol !== "https:" || target.pathname !== "/" || !/^voice-reach-[a-z0-9]+-magnificent-soless-projects\.vercel\.app$/.test(target.hostname)) throw Error("target");
  clerk = createClerkClient({ secretKey: e.CLERK_SECRET_KEY.trim(), publishableKey: e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() });
  db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  phase = "development_accounts";
  const users = [];
  for (const label of ["a","b"]) {
    const externalId = `myari-isolated-acceptance-${label}`;
    phase = "development_account_lookup";
    const found = await clerk.users.getUserList({ externalId: [externalId], limit: 2 });
    if (found.data.length > 1) throw Error("ambiguous_user");
    phase = "development_account_create";
    const user = found.data[0] ?? await clerk.users.createUser({ externalId, firstName: "MyARI Synthetic", lastName: `Acceptance ${label.toUpperCase()}`, emailAddress: [`myari_isolation_${label}+clerk_test@example.com`], password: randomUUID().replaceAll("-", "") + "Aa9!", privateMetadata: { myariStagingAcceptance: true } });
    if (user.privateMetadata?.myariStagingAcceptance !== true) throw Error("unowned_test_user");
    users.push(user); out.accounts++;
  }
  phase = "development_sessions";
  const tokens = [];
  for (const user of users) {
    const session = await clerk.sessions.createSession({ userId: user.id }); sessions.push(session.id);
    const token = await clerk.sessions.getToken(session.id);
    const auth = await clerk.authenticateRequest(new Request(new URL("/api/assistant/config", target), { headers: { Authorization: `Bearer ${token.jwt}` } }));
    if (auth.toAuth()?.userId !== user.id) throw Error("session_validation");
    tokens.push(token.jwt); out.sessionsValidated++;
  }
  async function request(path, token) {
    const headers = { Authorization: `Bearer ${token}` };
    if (e.VERCEL_OIDC_TOKEN) headers["x-vercel-trusted-oidc-idp-token"] = e.VERCEL_OIDC_TOKEN;
    const response = await fetch(new URL(path, target), { headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
    const isJSON = response.headers.get("content-type")?.includes("application/json");
    const body = isJSON ? await response.json() : null;
    if (!isJSON) {
      out.protectedPreviewStatus = response.status;
      out.trustedSourceTokenAvailable = !!e.VERCEL_OIDC_TOKEN;
      throw Error("protected_preview_access");
    }
    return { status: response.status, body: body?.data ?? body };
  }
  phase = "preview_access";
  for (const token of tokens) {
    const r = await request("/api/assistant/config", token);
    if (r.status !== 200) { out.applicationStatus = r.status; throw Error("application_auth"); }
    if (r.body.enabled !== false || r.body.externalActionsEnabled !== false) throw Error("assistant_gate");
    if (r.body.safetyLimits?.dailyInteractions !== 5 || r.body.safetyLimits?.dailyProviderCalls !== 10) throw Error("daily_policy");
    out.authenticatedRequests++;
  }
  out.assistantRemainsDisabled = true;
  phase = "synthetic_contacts";
  const marker = `synthetic:hosted-acceptance:${randomUUID()}`;
  for (let i=0;i<users.length;i++) {
    const row = { id: randomUUID(), owner_id: users[i].id, first_name: `Synthetic acceptance ${i}`, phone: `+1555555010${i+1}`, dnc: true, notes: marker };
    contacts.push(row);
    const r = await db.from("contacts").insert(row);
    if (r.error) throw Error("test_contact_insert");
  }
  phase = "http_tenant_isolation";
  for (let i=0;i<users.length;i++) {
    const own = await request(`/api/contacts/${contacts[i].id}`,tokens[i]);
    const foreign = await request(`/api/contacts/${contacts[1-i].id}`,tokens[i]);
    if (own.status !== 200 || own.body.contact?.id !== contacts[i].id || foreign.status !== 404) throw Error("tenant_isolation");
  }
  out.tenantIsolation = true;
  out.success = true;
} catch (error) {
  out.success = false; out.failedPhase = phase;
  const status = error?.status ?? error?.statusCode;
  if (Number.isInteger(status)) out.providerStatus = status;
  const codes = new Set(["form_identifier_exists","form_param_format_invalid","form_param_missing","form_identifier_missing","form_password_missing","form_param_unknown","form_param_value_not_allowed","form_param_nil","form_password_not_strong_enough","form_username_invalid_length","form_identifier_not_allowed","form_identifier_not_found","form_param_array_size_exceeds_maximum"]);
  const first = error?.errors?.find(e => codes.has(e.code));
  if (first) out.providerErrorCode = first.code;
  const safeCodes = error?.errors?.map(e => e.code).filter(c => typeof c === "string" && /^[a-z][a-z_]{2,79}$/.test(c));
  if (safeCodes?.length) out.providerValidationCodes = safeCodes.slice(0,4);
  const validationText = error?.errors?.map(e => `${e.message ?? ""} ${e.longMessage ?? ""}`).join(" ").toLowerCase() ?? "";
  const hintedFields = ["username","password","phone","email","first name","last name","legal","terms"].filter(word => validationText.includes(word));
  if (hintedFields.length) out.validationFieldHints = hintedFields;
  const parameter = error?.errors?.map(e => e.meta?.paramName ?? e.meta?.param_name).find(p => ["email_address","phone_number","username","password","first_name","last_name","external_id","limit"].includes(p));
  if (parameter) out.providerParameter = parameter;
} finally {
  let cleaned = true;
  for (const c of contacts) {
    try { const r = await db.from("contacts").delete().eq("id",c.id).eq("owner_id",c.owner_id).eq("notes",c.notes); if(r.error) cleaned=false; } catch { cleaned=false; }
  }
  for (const id of sessions) { try { await clerk.sessions.revokeSession(id); } catch { cleaned=false; } }
  out.syntheticContactsAndSessionsCleaned = cleaned;
  if (!cleaned) out.success=false;
  console.log("MYARI_STAGING_AUTH",JSON.stringify(out));
  if (!out.success) process.exitCode=1;
}
