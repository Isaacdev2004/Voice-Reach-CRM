import {
  applyMergeFields,
  findUnresolvedMergeFields,
  type MergeFieldContext,
} from "./merge-fields";
import {
  normalizeOutboundContent,
  shouldBlockRawJsonSend,
} from "./outbound-content";
export type MessageChannel = "sms" | "email" | "voicemail";
export type RenderedMessage = {
  ok: boolean;
  body: string;
  subject: string | null;
  issues: string[];
};
/** Shared preview and final provider-bound text validation. No database writes or delivery. */
export function renderMessage(
  channel: MessageChannel,
  description: unknown,
  title: unknown,
  context?: MergeFieldContext,
): RenderedMessage {
  const raw = typeof description === "string" ? description : "";
  const fallback = typeof title === "string" ? title : "";
  const normalized = normalizeOutboundContent(channel, raw, fallback);
  const merge = (value: string) =>
    context ? applyMergeFields(value, context) : value;
  const body = merge(normalized.body).trim();
  const subject =
    channel === "email" ? merge(normalized.subject ?? fallback).trim() : null;
  const issues: string[] = [];
  if (
    /^(?:Beautifully designed, personalized|Concise, high-touch SMS|Warm introduction with your recorded|AI avatar delivers|Stay visible with co-branded)/i.test(
      body,
    )
  )
    issues.push(
      "Replace the instructional placeholder with actual message copy.",
    );
  if (shouldBlockRawJsonSend(body, subject))
    issues.push(
      "Use a complete plain-text message; structured data and system output cannot be sent.",
    );
  if (
    findUnresolvedMergeFields(`${subject ?? ""}\n${body}`).length ||
    /\{\{|\}\}/.test(`${subject ?? ""}\n${body}`)
  )
    issues.push("Complete or remove unresolved personalization fields.");
  if (channel === "email" && (!subject || /[\r\n]/.test(subject)))
    issues.push("Provide a single-line email subject.");
  if (
    context &&
    /\[AgentPhone\]|\{\{\s*agent_phone\s*\}\}/i.test(raw) &&
    !(typeof context.agentPhone === "string" && context.agentPhone.trim())
  )
    issues.push("Add your actual sender phone before using this signature.");
  if (
    /(?:owner_id|provider_message_id|storage_path|service_role|api_key)\s*[:=]|\b(?:sk_live_|sk_test_|sb_secret_)[a-z0-9_]+/i.test(
      `${body}\n${subject ?? ""}`,
    )
  )
    issues.push("Remove internal system information from message content.");
  for (const link of `${body}\n${subject ?? ""}`.match(
    /https?:\/\/[^\s<>]*/gi,
  ) ?? []) {
    try {
      const u = new URL(link.replace(/[.,;!?]+$/, ""));
      if (!u.hostname || u.username || u.password || /[{}\[\]]/.test(link))
        throw Error();
    } catch {
      issues.push("Fix an incomplete or invalid message link.");
      break;
    }
  }
  return { ok: issues.length === 0, body, subject, issues };
}
