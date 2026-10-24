import { aiEntitlement, aiMeteringEnabled } from "./entitlements";
import { meteredAi } from "./meter";
import type { AiCapability } from "./catalog";
import { AssistantFailure } from "@/lib/assistant/store";
/** Grandfather existing authorized basic AI; paid AI-inclusive accounts cannot escape caps via legacy routes. */
export async function legacyAi<T>(
  owner: string,
  capability: AiCapability,
  key: string,
  run: () => Promise<T>,
) {
  if (!aiMeteringEnabled()) return run();
  const e = await aiEntitlement(owner);
  if (e.verified && e.tier) return meteredAi(owner, capability, key, run);
  if (e.verified && ["active", "trialing"].includes(e.status)) return run();
  throw new AssistantFailure(
    "AI subscription status could not be verified. Existing CRM records are unchanged.",
    403,
  );
}
