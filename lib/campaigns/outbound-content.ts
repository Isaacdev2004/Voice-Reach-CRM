import { parseJsonFromLlm } from "@/lib/ai/parse-output";
import { splitEmailSubjectBody } from "@/lib/campaigns/merge-fields";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/** True when copy looks like an AI/LLM JSON blob rather than human message text. */
export function looksLikeStructuredAiPayload(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("```") || t.startsWith("{")) return true;
  if (/^Subject:\s*.+\n/i.test(t) && t.includes('"recommendation"')) return true;
  return (
    /"recommendation"\s*:/.test(t) ||
    /"suggestedChannel"\s*:/.test(t) ||
    (/^\s*\{\s*"/.test(t) && /"body"\s*:/.test(t))
  );
}

export type NormalizedOutbound = {
  body: string;
  subject: string | null;
  extractedFromJson: boolean;
};

/**
 * Turn step copy into send-ready text. If someone pasted raw AI JSON into a step,
 * extract subject/body/script instead of delivering JSON to leads.
 */
export function normalizeOutboundContent(
  channel: "email" | "sms" | "voicemail",
  rawDescription: string,
  titleFallback: string,
): NormalizedOutbound {
  const trimmed = rawDescription.trim();

  if (!looksLikeStructuredAiPayload(trimmed)) {
    if (channel === "email") {
      const parts = splitEmailSubjectBody(trimmed);
      return {
        body: parts.body,
        subject: parts.subject ?? (titleFallback.trim() || null),
        extractedFromJson: false,
      };
    }
    return {
      body: trimmed,
      subject: null,
      extractedFromJson: false,
    };
  }

  const parsed = parseJsonFromLlm(trimmed);
  if (!parsed) {
    return {
      body: trimmed,
      subject: channel === "email" ? titleFallback.trim() || null : null,
      extractedFromJson: false,
    };
  }

  if (channel === "email") {
    const subject =
      asString(parsed.subject) ??
      asString(parsed.title) ??
      (titleFallback.trim() || null);
    const body =
      asString(parsed.body) ??
      asString(parsed.message) ??
      asString(parsed.emailBody) ??
      null;

    if (body && !body.trim().startsWith("{")) {
      return { body, subject, extractedFromJson: true };
    }

  }

  if (channel === "sms") {
    const body =
      asString(parsed.body) ??
      asString(parsed.message) ??
      asString(parsed.sms) ??
      asString(parsed.recommendation);
    if (body) return { body, subject: null, extractedFromJson: true };
  }

  if (channel === "voicemail") {
    const body =
      asString(parsed.script) ??
      asString(parsed.body) ??
      asString(parsed.message) ??
      asString(parsed.recommendation);
    if (body) return { body, subject: null, extractedFromJson: true };
  }

  return {
    body: trimmed,
    subject: channel === "email" ? titleFallback.trim() || null : null,
    extractedFromJson: false,
  };
}

/** Block send when content is still clearly raw JSON after normalization. */
export function shouldBlockRawJsonSend(body: string, subject?: string | null): boolean {
  const combined = `${subject ?? ""}\n${body}`.trim();
  if (!combined) return true;
  if (combined.startsWith("```")) return true;
  if (/^\{\s*"/.test(combined) && /"recommendation"|"suggestedChannel"/.test(combined)) {
    return true;
  }
  if (parseJsonFromLlm(combined) && looksLikeStructuredAiPayload(combined)) {
    const p = parseJsonFromLlm(combined)!;
    if (asString(p.recommendation) && !asString(p.body) && !asString(p.subject)) {
      return true;
    }
  }
  return false;
}
