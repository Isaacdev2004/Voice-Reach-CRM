// Operator-only Development authentication probe. No credentials, tokens, profiles or raw errors are logged.
const HOST = "https://voice-reach-m7kd10iv5-magnificent-soless-projects.vercel.app";
const USERS = [
  { id: "user_3LEtQ3fcyVKhts0dV7T4ZIpuEU3", label: "MyARI Synthetic Acceptance A" },
  { id: "user_3LEtQDGZh5tKNfF5PvGbxnUos69", label: "MyARI Synthetic Acceptance B" },
];
const e = process.env, sessions = [], checks = [];
const emit = result => console.log("MYARI_DEV_SESSION_CHECK", JSON.stringify(result));
const normalize = x => x.trim().replace(/\s+/g, " ").toLowerCase();
async function clerk(path, method = "GET", body) {
  const r = await fetch("https://api.clerk.com/v1" + path, {
    method, headers: { Authorization: "Bearer " + e.CLERK_SECRET_KEY, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("clerk_request_rejected_" + r.status);
  return r.json();
}
async function app(path, jwt, extra = {}) {
  const r = await fetch(HOST + path, {
    headers: { ...(e.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": e.VERCEL_OIDC_TOKEN } : {}),
      ...(jwt ? { Authorization: "Bearer " + jwt } : {}), ...extra },
    redirect: "manual", signal: AbortSignal.timeout(20000),
  });
  let data = null;
  if (r.headers.get("content-type")?.includes("application/json")) data = await r.json();
  return { status: r.status, data };
}
async function run() {
  if (e.VERCEL_ENV !== "preview" || e.VERCEL_PROJECT_ID !== "prj_x619EYFFa4U3AV0irnzkx0jDnN1R" ||
      e.VERCEL_GIT_COMMIT_REF !== "feat/premium-assistant-workspace" || !e.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
      e.NEXT_PUBLIC_SUPABASE_URL !== "https://jojgdfpmaxvbhobjrsbm.supabase.co" ||
      ["ALLOW_LIVE_OUTBOUND", "ASSISTANT_APPROVED_SENDS_ENABLED", "MYARI_AI_BILLING_ENABLED", "MYARI_AI_PUBLIC_LAUNCH_VERIFIED"].some(k => e[k] !== "false"))
    throw new Error("isolated_development_context_required");
  const health = await app("/api/health");
  if (health.status !== 200 || !health.data) return { success: false, code: "protected_preview_runner_access_unavailable", status: health.status, sessionsCreated: 0 };
  const db = await app("/api/health/db");
  if (health.data.clerkMode !== "test" || health.data.liveSending !== false ||
      Object.values(health.data.providers || {}).some(Boolean) || health.data.stripe?.configured !== false ||
      db.status !== 200 || db.data?.urlHost !== "jojgdfpmaxvbhobjrsbm.supabase.co")
    return { success: false, code: "target_runtime_isolation_required", sessionsCreated: 0 };
  checks.push({ name: "protected_preview_access_and_isolation", result: "PASS" });
  for (const candidate of USERS) {
    const user = await clerk("/users/" + candidate.id);
    const primary = user.email_addresses?.find(x => x.id === user.primary_email_address_id);
    if (user.id !== candidate.id || normalize([user.first_name, user.last_name].filter(Boolean).join(" ")) !== normalize(candidate.label) ||
        user.banned || user.two_factor_enabled || primary?.verification?.status !== "verified" ||
        !/\+clerk_test[^@]*@/i.test(primary.email_address || "")) throw new Error("exact_authorized_synthetic_identity_required");
  }
  for (const candidate of USERS) {
    const session = await clerk("/sessions", "POST", { user_id: candidate.id });
    if (!session.id || session.user_id !== candidate.id) throw new Error("clerk_session_identity_mismatch");
    sessions.push(session.id);
    const token = await clerk("/sessions/" + session.id + "/tokens", "POST", { expires_in_seconds: 60 });
    if (typeof token.jwt !== "string") throw new Error("clerk_session_token_missing");
    const verify = await app("/api/assistant/verify", token.jwt);
    const verified = verify.status === 200 && verify.data?.clerkUserId === candidate.id &&
      verify.data?.clerkMode === "test" && verify.data?.myariWorkspace?.supabaseHost === "jojgdfpmaxvbhobjrsbm.supabase.co" &&
      verify.data?.myariWorkspace?.ownerScoped === true;
    checks.push({ account: candidate.label, name: "hosted_development_session", result: verified ? "PASS" : "BLOCKED", status: verify.status });
    if (!verified) continue;
    const config = await app("/api/assistant/config", token.jwt);
    checks.push({ account: candidate.label, name: "assistant_test_access", result: config.data?.enabled ? "PASS" : "BLOCKED",
      externalActionsDisabled: config.data?.externalActionsEnabled === false, status: config.status });
    const foreign = USERS.find(x => x.id !== candidate.id).id;
    const ownership = await app("/api/assistant/history", token.jwt, { "X-MyARI-Owner": foreign });
    checks.push({ account: candidate.label, name: "foreign_owner_header_denied", result: ownership.status === 409 ? "PASS" : "FAIL", status: ownership.status });
  }
  return { success: checks.every(x => x.result === "PASS"), checks, note: "Clerk-issued API sessions; this is not browser acceptance. No CRM records or profiles changed." };
}
let result;
try { result = await run(); }
catch (error) { result = { success: false, code: /^clerk_request_rejected_\d+$|^isolated_development_context_required$|^exact_authorized_synthetic_identity_required$|^clerk_session_identity_mismatch$|^clerk_session_token_missing$/.test(error?.message || "") ? error.message : "private_development_probe_unavailable", checks }; }
finally {
  let revoked = 0;
  for (const id of sessions) { try { await clerk("/sessions/" + id + "/revoke", "POST"); revoked++; } catch {} }
  result = { ...result, sessionsCreated: sessions.length, sessionsRevoked: revoked };
  emit(result);
  if (revoked !== sessions.length) process.exitCode = 1;
}
