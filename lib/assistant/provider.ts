import { z } from "zod";
import { AssistantFailure } from "./store";
export type ProviderMessage = {
  role: "user" | "assistant";
  content: unknown;
  providerItems?: Record<string, unknown>[];
};
export type ProviderTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};
export type ProviderReply = {
  continuation?: Record<string, unknown>[];
  content: (
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  )[];
  usage: { inputTokens: number; outputTokens: number };
  model: string;
};
export interface ReasoningProvider {
  name: string;
  respond(input: {
    system: string;
    messages: ProviderMessage[];
    tools: ProviderTool[];
  }): Promise<ProviderReply>;
}
const ReplySchema = z.object({
  model: z.string(),
  usage: z.object({
    input_tokens: z.number().nonnegative(),
    output_tokens: z.number().nonnegative(),
  }),
  content: z
    .array(
      z.union([
        z.object({ type: z.literal("text"), text: z.string().max(20000) }),
        z.object({
          type: z.literal("tool_use"),
          id: z.string().max(200),
          name: z.string().max(100),
          input: z.unknown(),
        }),
      ]),
    )
    .max(12),
});
export const claudeProvider: ReasoningProvider = {
  name: "claude",
  async respond(input) {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key)
      throw new AssistantFailure(
        "Claude is not configured. Your drafts and conversation are preserved.",
        503,
      );
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
          max_tokens: 1800,
          system: input.system,
          messages: input.messages,
          tools: input.tools,
        }),
      });
    } catch {
      throw new AssistantFailure(
        "Claude could not be reached. Retry without changing saved work.",
        503,
      );
    }
    if (!response.ok)
      throw new AssistantFailure(
        response.status === 429
          ? "Claude is busy; please retry shortly."
          : "Claude could not complete this request.",
        response.status === 429 ? 429 : 503,
      );
    const parsed = ReplySchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success)
      throw new AssistantFailure(
        "Claude returned an unsupported response. Nothing was executed.",
        502,
      );
    return {
      model: parsed.data.model,
      content: parsed.data.content,
      usage: {
        inputTokens: parsed.data.usage.input_tokens,
        outputTokens: parsed.data.usage.output_tokens,
      },
    };
  },
};
/** Responses API adapter; canonical messages/tool contracts stay independent of provider wire formats. */
export function responsesInput(messages: ProviderMessage[]) {
  return messages.flatMap<Record<string, unknown>>((message) => {
    if (message.role === "assistant" && message.providerItems)
      return message.providerItems;
    if (typeof message.content === "string")
      return [{ role: message.role, content: message.content }];
    if (!Array.isArray(message.content))
      throw new AssistantFailure("Invalid conversation encoding", 400);
    return message.content.flatMap<Record<string, unknown>>(
      (part: Record<string, unknown>) =>
        part.type === "tool_use"
          ? [
              {
                type: "function_call",
                call_id: part.id,
                name: part.name,
                arguments: JSON.stringify(part.input),
              },
            ]
          : part.type === "tool_result"
            ? [
                {
                  type: "function_call_output",
                  call_id: part.tool_use_id,
                  output: String(part.content),
                },
              ]
            : part.type === "text"
              ? [{ role: message.role, content: String(part.text) }]
              : [],
    );
  });
}
// OpenAI's schema validator rejects JS Unicode property escapes (\p{L},
// \p{N}). Omit only those provider hints; runTool's Zod validation remains
// authoritative and retains the full Unicode-aware input restrictions.
export function openaiToolSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema, (key, value) =>
    key === "pattern" && typeof value === "string" && /\\[pP]\{/.test(value)
      ? undefined
      : value,
  ));
}
export const openaiProvider: ReasoningProvider = {
  name: "openai",
  async respond(input) {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key)
      throw new AssistantFailure(
        "OpenAI API access is not configured. ChatGPT subscriptions do not supply API credits. Existing drafts remain available.",
        503,
      );
    const model = process.env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5-mini";
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            model,
            instructions: input.system,
            input: responsesInput(input.messages),
            tools: input.tools.map((t) => ({
              type: "function",
              name: t.name,
              description: t.description,
              parameters: openaiToolSchema(t.input_schema),
              strict: false,
            })),
            max_output_tokens: 2400,
            store: false,
            include: ["reasoning.encrypted_content"],
            ...(model.startsWith("gpt-5")
              ? { reasoning: { effort: "low" } }
              : {}),
          }),
        });
      } catch {
        throw new AssistantFailure(
          "OpenAI could not be reached. No provider switch or CRM execution occurred.",
          503,
        );
      }
      if (![429, 503].includes(response.status) || attempt) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!response?.ok)
      throw new AssistantFailure(
        response?.status === 429
          ? "OpenAI rate limit reached. Retry shortly."
          : "OpenAI could not complete this request.",
        response?.status === 429 ? 429 : 503,
      );
    const r = await response.json().catch(() => null);
    if (
      !r ||
      r.status !== "completed" ||
      !Array.isArray(r.output) ||
      !Number.isFinite(r.usage?.input_tokens) ||
      !Number.isFinite(r.usage?.output_tokens)
    )
      throw new AssistantFailure(
        "OpenAI returned an incomplete response. Nothing was executed.",
        502,
      );
    const content: ProviderReply["content"] = [];
    for (const item of r.output) {
      if (item.type === "message")
        for (const p of item.content ?? [])
          if (p.type === "output_text" && typeof p.text === "string")
            content.push({ type: "text", text: p.text });
      if (item.type === "function_call") {
        let args;
        try {
          args = JSON.parse(item.arguments);
        } catch {
          throw new AssistantFailure(
            "Invalid OpenAI tool arguments. Nothing was executed.",
            502,
          );
        }
        if (typeof item.call_id !== "string" || typeof item.name !== "string")
          throw new AssistantFailure("Invalid OpenAI tool call", 502);
        content.push({
          type: "tool_use",
          id: item.call_id,
          name: item.name,
          input: args,
        });
      }
    }
    if (
      content.length > 12 ||
      content.some((p) => p.type === "text" && p.text.length > 20000)
    )
      throw new AssistantFailure("OpenAI output exceeded the safe limit", 502);
    return {
      content,
      continuation: r.output.filter((p: Record<string, unknown>) =>
        ["message", "function_call", "reasoning"].includes(String(p.type)),
      ),
      model: r.model ?? model,
      usage: {
        inputTokens: r.usage.input_tokens,
        outputTokens: r.usage.output_tokens,
      },
    };
  },
};
