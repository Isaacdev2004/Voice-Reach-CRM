export type OpenAiResponsesProbeResult = {
  success: boolean;
  configured: boolean;
  model?: string;
  error?: string;
  status?: number;
  inputTokens?: number;
  outputTokens?: number;
};

/** Bounded OpenAI Responses ping; never logs keys or error bodies. */
export async function probeOpenAiResponses(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<OpenAiResponsesProbeResult> {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { success: false, configured: false, error: "openai_not_configured" };

  const model = env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5-mini";
  try {
    const response = await fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model,
        input: "Reply with exactly OK.",
        store: false,
        max_output_tokens: 128,
        ...(model.startsWith("gpt-5") ? { reasoning: { effort: "low" } } : {}),
      }),
    });
    if (!response.ok) {
      return {
        success: false,
        configured: true,
        model,
        error: "provider_rejected",
        status: response.status,
      };
    }
    const data = (await response.json()) as {
      status?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      output?: { type?: string; content?: { type?: string; text?: string }[] }[];
    };
    const text = (data.output ?? [])
      .flatMap((item) => (item.type === "message" ? item.content ?? [] : []))
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("")
      .trim();
    if (
      data.status !== "completed" ||
      text !== "OK" ||
      !Number.isSafeInteger(data.usage?.input_tokens) ||
      (data.usage?.input_tokens ?? 0) <= 0 ||
      !Number.isSafeInteger(data.usage?.output_tokens) ||
      (data.usage?.output_tokens ?? 0) < 0
    ) {
      return { success: false, configured: true, model, error: "incomplete_or_invalid_result" };
    }
    return {
      success: true,
      configured: true,
      model,
      inputTokens: data.usage!.input_tokens,
      outputTokens: data.usage!.output_tokens,
    };
  } catch {
    return { success: false, configured: true, model, error: "provider_unavailable" };
  }
}

export function assistantPreflightMustStayDisabled(env: NodeJS.ProcessEnv = process.env): string | null {
  for (const flag of [
    "ASSISTANT_V2_ENABLED",
    "ASSISTANT_APPROVED_SENDS_ENABLED",
    "MYARI_AI_PUBLIC_LAUNCH_VERIFIED",
    "MYARI_AI_ENTITLEMENTS_ENABLED",
    "MYARI_AI_BILLING_ENABLED",
    "MYARI_AI_PRICING_ENABLED",
    "MYARI_AI_PLAN_CHANGES_ENABLED",
  ]) {
    if (env[flag] && env[flag] !== "false") return "assistant_or_billing_flags_must_stay_disabled";
  }
  if (env.ASSISTANT_V2_OWNER_IDS?.trim()) return "owner_allowlist_must_be_empty_before_preflight";
  if (env.ASSISTANT_SEND_OWNER_IDS?.trim() || env.ASSISTANT_SEND_RECIPIENTS?.trim()) {
    return "send_allowlists_must_be_empty";
  }
  return null;
}
