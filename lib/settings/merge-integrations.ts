import { getGoogleConnection } from "@/lib/calendar/google";
import { getDotloopConnection } from "@/lib/integrations/dotloop";
import { isLiveProvidersConfigured } from "@/lib/providers/registry";
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

export async function applyLiveIntegrationStatus(
  ownerId: string,
  integrations: IntegrationConfig[],
): Promise<IntegrationConfig[]> {
  const [google, dotloop] = await Promise.all([
    getGoogleConnection(ownerId).catch(() => null),
    getDotloopConnection(ownerId).catch(() => null),
  ]);
  const claudeReady = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const providers = isLiveProvidersConfigured();

  return integrations.map((item) => {
    const id = item.id === "sendgrid" ? "resend" : item.id;

    if (id === "twilio") {
      return {
        ...item,
        id,
        name: item.name || "Twilio (SMS)",
        connected: providers.sms,
        accountLabel: providers.sms ? "Workspace configured" : undefined,
        secretHint: undefined,
        lastSync: providers.sms ? new Date().toISOString() : undefined,
      };
    }
    if (id === "resend") {
      return {
        ...item,
        id,
        name: item.name || "Resend (Email)",
        connected: providers.email,
        accountLabel: providers.email ? "Workspace configured" : undefined,
        secretHint: undefined,
        lastSync: providers.email ? new Date().toISOString() : undefined,
      };
    }
    if (id === "slybroadcast") {
      return {
        ...item,
        id,
        name: item.name || "Slybroadcast (Voicemail)",
        connected: providers.voicemail,
        accountLabel: providers.voicemail ? "Workspace configured" : undefined,
        secretHint: undefined,
        lastSync: providers.voicemail ? new Date().toISOString() : undefined,
      };
    }
    if (id === "slack") {
      return {
        ...item,
        id,
        connected: false,
        accountLabel: undefined,
        secretHint: undefined,
        lastSync: undefined,
      };
    }

    if (id === "google-calendar") {
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
    if (id === "dotloop") {
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
    if (id === "claude") {
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
