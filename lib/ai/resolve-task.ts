import type { AiTaskType } from "./prompts";

/** An explicit draft request in general suggestion mode is still a draft request. */
export function resolveAiTask(task: AiTaskType, brief?: string): AiTaskType {
  if (task !== "follow_up" && task !== "next_best_action") return task;
  const text = brief?.trim() ?? "";
  if (/\b(?:don't|do not|never|avoid)\s+(?:write|draft|compose|create|generate|prepare)/i.test(text)) return task;
  const requested = /\b(?:write|draft|compose|create|generate|prepare)\b.{0,45}?\b(e-?mail|sms|text(?: message)?)\b/i.exec(text)?.[1];
  if (requested) return /e-?mail/i.test(requested) ? "email_writer" : "sms_writer";
  if (/\be-?mail draft\b/i.test(text)) return "email_writer";
  if (/\bsms draft\b/i.test(text)) return "sms_writer";
  return task;
}
