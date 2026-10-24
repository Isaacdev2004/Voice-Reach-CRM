import { AssistantFailure } from "./store";
export function assistantEnabled(owner: string) {
  return (
    process.env.ASSISTANT_V2_ENABLED === "true" &&
    (process.env.ASSISTANT_V2_OWNER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(owner)
  );
}
export async function assistantAccess(owner: string) {
  if (assistantEnabled(owner)) return true;
  if (
    process.env.ASSISTANT_V2_ENABLED === "true" &&
    process.env.MYARI_AI_PUBLIC_LAUNCH_VERIFIED === "true" &&
    process.env.MYARI_AI_ENTITLEMENTS_ENABLED === "true"
  ) {
    const { aiEntitlement } = await import("@/lib/billing/ai/entitlements");
    const e = await aiEntitlement(owner);
    return e.verified && !!e.tier;
  }
  return false;
}
export async function requireAssistantEnabled(owner: string) {
  if (!(await assistantAccess(owner)))
    throw new AssistantFailure(
      "Assistant 2.0 is not enabled for this subscriber. The existing Claude draft assistant remains available.",
      404,
    );
}
export const configuredProvider = () =>
  process.env.ASSISTANT_REASONING_PROVIDER === "claude" ? "claude" : "openai";
