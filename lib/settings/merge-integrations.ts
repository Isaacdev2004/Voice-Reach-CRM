import { getGoogleConnection } from "@/lib/calendar/google";
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
  const connection = await getGoogleConnection(ownerId).catch(() => null);

  return integrations.map((item) => {
    if (item.id !== "google-calendar") return item;
    if (!connection) {
      return { ...item, connected: false, accountLabel: undefined, lastSync: undefined };
    }
    return {
      ...item,
      connected: true,
      accountLabel: connection.account_email ?? "Google account",
      lastSync: connection.updated_at ?? new Date().toISOString(),
    };
  });
}
