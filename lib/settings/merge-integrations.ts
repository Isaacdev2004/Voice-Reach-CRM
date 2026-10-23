import type { IntegrationConfig } from "./types";

const SERVER_MANAGED_IDS = new Set([
  "twilio",
  "sendgrid",
  "resend",
  "slybroadcast",
  "slack",
]);

/** Merge saved integration rows with defaults so new integrations (e.g. Google Calendar) are never dropped. */
export function mergeIntegrationLists(
  defaults: IntegrationConfig[],
  saved: IntegrationConfig[] | undefined,
): IntegrationConfig[] {
  const byId = new Map(defaults.map((item) => [item.id, { ...item }]));
  for (const item of saved ?? []) {
    const id = item.id === "sendgrid" ? "resend" : item.id;
    const existing = byId.get(id);
    byId.set(id, existing ? { ...existing, ...item, id } : { ...item, id });
  }
  return [...byId.values()];
}

export function isServerManagedIntegration(id: string): boolean {
  return SERVER_MANAGED_IDS.has(id);
}
