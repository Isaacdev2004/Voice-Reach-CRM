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

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((v) => String(v).trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

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
  const nested = parseJsonFromLlm(body);
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

  switch (task) {
    case "email_writer": {
      if (asString(raw.recommendation) && !asString(raw.subject)) {
        return { ok: false, reason: "wrong_shape" };
      }
      const subject = asString(raw.subject);
      const body = asString(raw.body) ?? asString(raw.message);
      if (!subject || !body) return { ok: false, reason: "wrong_shape" };
      return { ok: true, output: { subject, body } };
    }
    case "sms_writer": {
      const body = asString(raw.body) ?? asString(raw.message);
      if (!body) return { ok: false, reason: "wrong_shape" };
      return { ok: true, output: { body } };
    }
    case "voicemail_script": {
      const script = asString(raw.script) ?? asString(raw.body);
      if (!script) return { ok: false, reason: "wrong_shape" };
      return { ok: true, output: { script } };
    }
    case "follow_up":
    case "next_best_action": {
      const recommendation = asString(raw.recommendation);
      const reason = asString(raw.reason) ?? "";
      const suggestedChannel = asString(raw.suggestedChannel) ?? asString(raw.channel) ?? "";
      if (!recommendation) return { ok: false, reason: "wrong_shape" };
      return {
        ok: true,
        output: { recommendation, reason, suggestedChannel },
      };
    }
    case "note_summary": {
      const bullets = asStringArray(raw.bullets);
      if (!bullets) return { ok: false, reason: "wrong_shape" };
      return { ok: true, output: { bullets } };
    }
    case "campaign_idea": {
      const name = asString(raw.name);
      const description = asString(raw.description) ?? "";
      const steps = Array.isArray(raw.steps) ? raw.steps : null;
      if (!name || !steps?.length) return { ok: false, reason: "wrong_shape" };
      return { ok: true, output: { name, description, steps } };
    }
    default:
      return { ok: false, reason: "wrong_shape" };
  }
}

export function outputToPlainText(task: AiTaskType, output: Record<string, unknown>): string {
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
    default:
      return "";
  }
}
