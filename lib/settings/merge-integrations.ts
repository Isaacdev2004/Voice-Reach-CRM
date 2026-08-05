import { getGoogleConnection } from "@/lib/calendar/google";
import { getDotloopConnection } from "@/lib/integrations/dotloop";
import type { IntegrationConfig } from "./types";

/** Merge saved integration rows with defaults so new integrations (e.g. Google Calendar) are never dropped. */
export function mergeIntegrationLists(
  defaults: IntegrationConfig[],
  saved: IntegrationConfig[] | undefined,
): IntegrationConfig[] {
  const byId = new Map(defaults.map((item) => [item.id, { ...item }]));
  for (const item of saved ?? []) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...existing, ...item } : item);
  }
  return [...byId.values()];
}

export async function applyLiveIntegrationStatus(
  ownerId: string,
  integrations: IntegrationConfig[],
): Promise<IntegrationConfig[]> {
  const [google, dotloop] = await Promise.all([
    getGoogleConnection(ownerId).catch(() => null),
    getDotloopConnection(ownerId).catch(() => null),
  ]);
  const claudeReady = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  return integrations.map((item) => {
    if (item.id === "google-calendar") {
      if (!google) {
        return { ...item, connected: false, accountLabel: undefined, lastSync: undefined };
      }
      return {
        ...item,
        connected: true,
        accountLabel: google.account_email ?? "Google account",
        lastSync: google.updated_at ?? new Date().toISOString(),
      };
    }
    if (item.id === "dotloop") {
      if (!dotloop) {
        return { ...item, connected: false, accountLabel: undefined, lastSync: undefined };
      }
      return {
        ...item,
        connected: true,
        accountLabel: dotloop.account_label ?? "Dotloop account",
        lastSync: dotloop.updated_at ?? new Date().toISOString(),
      };
    }
    if (item.id === "claude") {
      return {
        ...item,
        connected: claudeReady,
        accountLabel: claudeReady
          ? process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5"
          : undefined,
        lastSync: claudeReady ? new Date().toISOString() : undefined,
      };
    }
    return item;
  });
}
