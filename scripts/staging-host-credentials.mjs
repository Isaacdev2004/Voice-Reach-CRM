// Private Preview build check. No HTTP endpoint, credential export or CRM writes.
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const results = { execution: "preview_build_not_runtime", safety: false, clerk: false, supabase: false, openai: false };
let phase = "safety";
try {
  const e = process.env;
  if (e.VERCEL_ENV !== "preview" || e.VERCEL_GIT_COMMIT_REF !== "feat/ai-operating-assistant") throw Error("scope");
  if (e.NEXT_PUBLIC_SUPABASE_URL !== "https://jojgdfpmaxvbhobjrsbm.supabase.co") throw Error("database_target");
  for (const key of ["ALLOW_LIVE_OUTBOUND", "ASSISTANT_V2_ENABLED", "ASSISTANT_APPROVED_SENDS_ENABLED", "MYARI_AI_BILLING_ENABLED", "MYARI_AI_PUBLIC_LAUNCH_VERIFIED"])
    if (e[key] !== "false") throw Error("release_gate");
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "TWILIO_AUTH_TOKEN", "RESEND_API_KEY", "SLYBROADCAST_PASSWORD", "ELEVENLABS_API_KEY"])
    if (e[key]?.trim()) throw Error("live_credential");
  if (!e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") || !e.CLERK_SECRET_KEY?.startsWith("sk_test_")) throw Error("development_auth_required");
  if (!e.SUPABASE_SERVICE_ROLE_KEY?.trim() || !e.OPENAI_API_KEY?.trim()) throw Error("missing_credential");
  results.safety = true;
  try {
  phase = "clerk_frontend_key";
  const frontend = Buffer.from(e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.slice(8), "base64").toString("utf8").replace(/\$$/, "");
  if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(frontend)) throw Error("development_frontend");
  // Pair the keys cryptographically; do not require optional instance-admin APIs.
  phase = "clerk_backend_jwks";
  const backendResponse = await fetch("https://api.clerk.com/v1/jwks", {
    headers: { Authorization: `Bearer ${e.CLERK_SECRET_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  results.clerkBackendStatus = backendResponse.status;
  if (!backendResponse.ok) throw Error("backend_jwks");
  const backend = await backendResponse.json();
  phase = "clerk_frontend_jwks";
  const r = await fetch(`https://${frontend}/.well-known/jwks.json`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) { results.clerkFrontendStatus = r.status; throw Error("frontend_jwks"); }
  const publicSet = await r.json();
  const fingerprint = k => createHash("sha256").update(JSON.stringify([k.kty,k.n,k.e,k.crv,k.x,k.y])).digest("hex");
  phase = "clerk_instance_match";
  if (!backend.keys?.length || !publicSet.keys?.some(k => backend.keys.some(b => fingerprint(b) === fingerprint(k)))) throw Error("instance_mismatch");
  results.clerkDevelopmentInstance = true;
  results.clerk = true;
  } catch (error) {
    results.clerkFailurePhase = phase;
    const status = error?.status ?? error?.statusCode;
    if (Number.isInteger(status)) results.clerkStatus = status;
    const allowedCodes = new Set(["clerk_key_invalid", "invalid_api_key", "authentication_invalid", "api_key_invalid", "resource_not_found", "authorization_invalid", "form_param_format_invalid"]);
    const code = error?.errors?.find(x => allowedCodes.has(x.code))?.code;
    if (code) results.clerkErrorCode = code;
  }
  try {
  phase = "supabase";
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) } });
  const schema = await db.rpc("ai_usage_schema_version");
  if (schema.error || schema.data !== 1) throw Error("service_rpc");
  results.supabase = true;
  } catch { results.supabaseFailurePhase = phase; }
  try {
  phase = "openai";
  const model = e.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${e.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({ model, input: "Reply with OK.", store: false, max_output_tokens: 512, ...(model.startsWith("gpt-5") ? { reasoning: { effort: "low" } } : {}) }),
  });
  if (!response.ok) {
    results.providerStatus = response.status;
    const error = await response.json().catch(() => null);
    if (["invalid_api_key", "insufficient_quota", "billing_hard_limit_reached", "rate_limit_exceeded", "model_not_found", "permission_denied"].includes(error?.error?.code))
      results.providerErrorCode = error.error.code;
    throw Error("provider_rejected");
  }
  const output = await response.json();
  const text = (output.output ?? []).flatMap(x => x.type === "message" ? x.content ?? [] : []).filter(x => x.type === "output_text").map(x => x.text).join("").trim();
  if (output.status !== "completed" || text !== "OK" || !Number.isInteger(output.usage?.input_tokens) || !Number.isInteger(output.usage?.output_tokens)) throw Error("incomplete_result");
  results.openai = true;
  results.inputTokens = output.usage.input_tokens;
  results.outputTokens = output.usage.output_tokens;
  } catch { results.openaiFailurePhase = phase; }
  const success = results.clerk && results.supabase && results.openai;
  console.log("MYARI_STAGING_CHECK", JSON.stringify({ ...results, success }));
  if (!success) process.exitCode = 1;
} catch (error) {
  // Never log provider bodies, exception text, request headers or any key value.
  const status = Number.isInteger(error?.status) ? error.status : undefined;
  console.log("MYARI_STAGING_CHECK", JSON.stringify({ ...results, success: false, failedPhase: phase, status }));
  process.exitCode = 1;
}
