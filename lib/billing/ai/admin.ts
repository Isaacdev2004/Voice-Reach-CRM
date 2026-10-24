import { AssistantFailure } from "@/lib/assistant/store";
export function requireAiAdmin(actor: string, target?: string) {
  const admins = (process.env.MYARI_AI_ADMIN_OWNER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!admins.includes(actor))
    throw new AssistantFailure("Administrative access is required", 403);
  const scope = (process.env.MYARI_AI_ADMIN_REPORT_OWNER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (target && !scope.includes(target))
    throw new AssistantFailure(
      "Subscriber is outside the authorized reporting scope",
      403,
    );
  return scope;
}
