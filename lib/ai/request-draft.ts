import type { AiContext, AiTaskType } from "./prompts";
import type { AiResult } from "./generate";
import { AI_ERROR_MESSAGES, AiGenerationError, withAiDeadline } from "./errors";
import { normalizeAiOutput } from "./parse-output";
import { resolveAiTask } from "./resolve-task";

export async function requestAiDraft(task: AiTaskType, context: AiContext, brief?: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<AiResult> {
  const expectedTask = resolveAiTask(task, brief);
  try {
    return await withAiDeadline(async (deadline) => {
      const response = await (options.fetchImpl ?? fetch)("/api/ai/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
        body: JSON.stringify({ task: expectedTask, context, brief }),
      });
      const envelope: unknown = await response.json();
      if (!response.ok || !envelope || typeof envelope !== "object" || !("success" in envelope) || envelope.success !== true) {
        const code = envelope && typeof envelope === "object" && "code" in envelope ? String(envelope.code).replace(/^ai_/, "") : "unavailable";
        throw new AiGenerationError(Object.hasOwn(AI_ERROR_MESSAGES, code) ? code as keyof typeof AI_ERROR_MESSAGES : "unavailable");
      }
      if (!("data" in envelope) || !envelope.data || typeof envelope.data !== "object") throw new AiGenerationError("invalid_output");
      const data = envelope.data as Record<string, unknown>;
      if (data.task !== expectedTask || !data.output || typeof data.output !== "object" || Array.isArray(data.output) || !["claude", "template"].includes(String(data.provider))) {
        throw new AiGenerationError("invalid_output");
      }
      const normalized = normalizeAiOutput(expectedTask, data.output as Record<string, unknown>, context);
      if (!normalized.ok) throw new AiGenerationError("invalid_output");
      return { task: expectedTask, output: normalized.output, provider: String(data.provider), generatedAt: new Date().toISOString() };
    }, options.timeoutMs ?? 35000);
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    throw new AiGenerationError("unavailable");
  }
}
