// Private CLI only. Never expose as an HTTP route or use a production credential.
import { pathToFileURL } from "node:url";
export async function probeOpenAI(env = process.env, fetcher = fetch) {
  if (env.MYARI_PRIVATE_PROBE_ENV !== "isolated-staging" || env.NODE_ENV === "production")
    return { success: false, error: "isolated_staging_required" };
  const key = env.OPENAI_STAGING_API_KEY?.trim();
  if (!key) return { success: false, error: "nonproduction_credential_missing" };
  const model = env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5-mini";
  try {
    const response = await fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ model, input: "Reply with OK.", store: false, max_output_tokens: 512,
        ...(model.startsWith("gpt-5") ? { reasoning: { effort: "low" } } : {}) }),
    });
    if (!response.ok) return { success: false, error: "provider_rejected", status: response.status };
    const r = await response.json();
    const text = (r.output ?? []).flatMap(x => x.type === "message" ? x.content ?? [] : []).filter(x => x.type === "output_text").map(x => x.text).join("").trim();
    if (r.status !== "completed" || text !== "OK" || !Number.isInteger(r.usage?.input_tokens) || r.usage.input_tokens < 0 || !Number.isInteger(r.usage?.output_tokens) || r.usage.output_tokens < 0)
      return { success: false, error: "incomplete_or_invalid_result" };
    // Only verified usage, never the provider response, request headers or key.
    return { success: true, model: String(r.model ?? model), inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens, testedAt: new Date().toISOString(), scope: "private connectivity probe; not CRM usage" };
  } catch { return { success: false, error: "provider_unavailable" }; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await probeOpenAI();
  console.log(JSON.stringify(result));
  if (!result.success) process.exitCode = 1;
}
