import { z } from "zod";
import type { AiContext, AiTaskType } from "./prompts";

export function stripMarkdownCodeFence(text: string): string {
  let t = text.trim();
  const fullFence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(t);
  if (fullFence) return fullFence[1].trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  }
  return t.trim();
}

export function parseJsonFromLlm(text: string): Record<string, unknown> | null {
  const cleaned = stripMarkdownCodeFence(text);
  const attempts = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    attempts.push(cleaned.slice(start, end + 1));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function parseStructuredAiJson(text: string): Record<string, unknown> | null {
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(text.trim());
  const cleaned = fence ? fence[1].trim() : text.trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch { /* Rejected output is never treated as prose. */ }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string" && v.trim())) return null;
  return value.map((v) => v.trim());
}

/** Subscriber-facing prose must not contain serialized objects or code fences. */
const prose = z.string().trim().min(1).max(12000).refine(
  (value) => !/```|^\s*[{\[]/.test(value),
);
const subject = prose.max(180).refine((value) => !/[\r\n]/.test(value));
const channel = z.enum(["email", "sms", "voicemail", "phone", "call", "task"]);
const schemas = {
  email_writer: z.object({ subject, body: prose }),
  sms_writer: z.object({ body: prose.max(320) }),
  voicemail_script: z.object({ script: prose.max(4000) }),
  follow_up: z.object({ recommendation: prose, reason: prose, suggestedChannel: channel }),
  next_best_action: z.object({ recommendation: prose, reason: prose, suggestedChannel: channel }),
  note_summary: z.object({ bullets: z.array(prose).min(1).max(3) }),
  campaign_idea: z.object({
    name: prose.max(180), description: prose,
    steps: z.array(z.object({ type: z.enum(["email", "sms", "voicemail", "avatar_video", "callback", "task", "wait", "retargeting", "video", "rvm"]), title: prose.max(180), dayLabel: prose.max(60), description: prose })).min(1).max(20),
  }),
  relationship_pulse: z.object({ summary: prose.max(320) }),
} satisfies Record<AiTaskType, z.ZodType>;

/** Remove internal/debug fields before sending to the client. */
export function stripInternalAiFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(record)) {
    if (key.startsWith("_")) continue;
    out[key] = val;
  }
  return out;
}

export type NormalizeResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; reason: "empty" | "wrong_shape" | "unparseable" };

function flattenNestedJsonBody(raw: Record<string, unknown>): Record<string, unknown> {
  const body = raw.body;
  if (typeof body !== "string") return raw;
  const nested = parseStructuredAiJson(body);
  if (!nested) return raw;
  return { ...raw, ...nested };
}

/**
 * Validates LLM JSON against the selected task. Returns null-shaped failure when
 * the model returned the wrong schema (e.g. recommendation JSON for email_writer).
 */
export function normalizeAiOutput(
  task: AiTaskType,
  rawInput: Record<string, unknown>,
  _ctx: AiContext,
): NormalizeResult {
  const raw = flattenNestedJsonBody(stripInternalAiFields(rawInput));

  const normalized = { ...raw };
  // Preserve known historical aliases, but never synthesize missing required content.
  if (task === "sms_writer" || task === "email_writer") normalized.body ??= normalized.message;
  if (task === "voicemail_script") normalized.script ??= normalized.body;
  if (task === "follow_up" || task === "next_best_action") normalized.suggestedChannel ??= normalized.channel;
  if (task === "relationship_pulse") normalized.summary ??= normalized.conciergeHint;
  if (!Object.hasOwn(schemas, task)) return { ok: false, reason: "wrong_shape" };
  const parsed = schemas[task].safeParse(normalized);
  return parsed.success
    ? { ok: true, output: parsed.data as Record<string, unknown> }
    : { ok: false, reason: "wrong_shape" };
}

export function outputToPlainText(task: AiTaskType, output: Record<string, unknown>): string {
  const checked = normalizeAiOutput(task, output, {});
  if (!checked.ok) return "";
  output = checked.output;
  switch (task) {
    case "email_writer": {
      const subject = asString(output.subject);
      const body = asString(output.body);
      if (!subject && !body) return "";
      return [subject ? `Subject: ${subject}` : "", body ?? ""].filter(Boolean).join("\n\n");
    }
    case "sms_writer":
      return asString(output.body) ?? "";
    case "voicemail_script":
      return asString(output.script) ?? "";
    case "follow_up":
    case "next_best_action":
      return [
        asString(output.recommendation)
          ? `Recommendation: ${output.recommendation}`
          : "",
        asString(output.reason) ? `Why: ${output.reason}` : "",
        asString(output.suggestedChannel) ? `Channel: ${output.suggestedChannel}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    case "note_summary": {
      const bullets = asStringArray(output.bullets);
      return bullets ? bullets.map((b) => `• ${b}`).join("\n") : "";
    }
    case "campaign_idea": {
      const name = asString(output.name);
      const description = asString(output.description);
      const steps = Array.isArray(output.steps)
        ? (output.steps as Array<Record<string, unknown>>)
            .map((s, i) => `${i + 1}. [${s.type ?? "step"}] ${s.title ?? ""} — ${s.dayLabel ?? ""}`)
            .join("\n")
        : "";
      return [name, description, steps].filter(Boolean).join("\n\n");
    }
    case "relationship_pulse":
      return asString(output.summary) ?? "";
    default:
      return "";
  }
}
