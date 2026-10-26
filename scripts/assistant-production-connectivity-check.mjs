// Private, explicit CLI preflight only. Not an HTTP route or automatic build hook.
import { pathToFileURL } from "node:url";

export async function checkProductionOpenAI(env = process.env, fetcher = fetch) {
  if (env.MYARI_PRIVATE_PRODUCTION_PROBE !== "approved-connectivity-only" ||
      env.VERCEL_ENV !== "production" ||
      env.VERCEL_PROJECT_ID !== "prj_x619EYFFa4U3AV0irnzkx0jDnN1R" ||
      env.NEXT_PUBLIC_SUPABASE_URL?.trim() !== "https://qlochlyyimulyzzrzyac.supabase.co" ||
      !/^[a-f0-9]{40}$/.test(env.MYARI_APPROVED_PROBE_COMMIT ?? "") ||
      env.VERCEL_GIT_COMMIT_SHA !== env.MYARI_APPROVED_PROBE_COMMIT)
    return { success: false, error: "approved_production_target_required" };
  for (const flag of ["ASSISTANT_V2_ENABLED", "ASSISTANT_APPROVED_SENDS_ENABLED",
    "MYARI_AI_PUBLIC_LAUNCH_VERIFIED", "MYARI_AI_ENTITLEMENTS_ENABLED",
    "MYARI_AI_BILLING_ENABLED", "MYARI_AI_PRICING_ENABLED", "MYARI_AI_PLAN_CHANGES_ENABLED"])
    if (env[flag] && env[flag] !== "false")
      return { success: false, error: "assistant_and_new_billing_must_remain_disabled" };
  if (env.ASSISTANT_V2_OWNER_IDS?.trim() || env.ASSISTANT_SEND_OWNER_IDS?.trim() || env.ASSISTANT_SEND_RECIPIENTS?.trim())
    return { success: false, error: "allowlists_must_remain_empty" };
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { success: false, configured: false, error: "openai_not_configured" };
  const model = env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5-mini";
  try {
    const response = await fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ model, input: "Reply with exactly OK.", store: false,
        max_output_tokens: 128, ...(model.startsWith("gpt-5") ? { reasoning: { effort: "low" } } : {}) }),
    });
    // Never consume or log provider error bodies: authentication errors may quote keys.
    if (!response.ok) return { success: false, configured: true, error: "provider_rejected", status: response.status };
    const data = await response.json();
    const text = (data.output ?? []).flatMap(item => item.type === "message" ? item.content ?? [] : [])
      .filter(item => item.type === "output_text").map(item => item.text).join("").trim();
    if (data.status !== "completed" || text !== "OK" ||
        !Number.isSafeInteger(data.usage?.input_tokens) || data.usage.input_tokens <= 0 ||
        !Number.isSafeInteger(data.usage?.output_tokens) || data.usage.output_tokens < 0)
      return { success: false, configured: true, error: "incomplete_or_invalid_result" };
    return { success: true, configured: true, modelAccessVerified: true,
      inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens,
      scope: "private host-environment connectivity only; not deployed Function acceptance or subscriber usage" };
  } catch {
    return { success: false, configured: true, error: "provider_unavailable" };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkProductionOpenAI();
  console.log("MYARI_PRODUCTION_CONNECTIVITY", JSON.stringify(result));
  if (!result.success) process.exitCode = 1;
}
