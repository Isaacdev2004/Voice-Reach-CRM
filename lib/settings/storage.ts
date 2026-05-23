import { DEFAULT_SETTINGS } from "./defaults";
import type { SettingsResponse, UserSettings } from "./types";

const STORAGE_KEY = "voicereach-user-settings";

export function loadSettingsLocal(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as UserSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsLocal(settings: UserSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  const data = (await res.json()) as SettingsResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
  return data;
}

export async function persistSettings(settings: UserSettings): Promise<SettingsResponse> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const data = (await res.json()) as SettingsResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Save failed");
  return data;
}

export function generateApiKey(): { id: string; fullKey: string; record: UserSettings["apiKeys"][0] } {
  const id = `key-${crypto.randomUUID()}`;
  const fullKey = `vr_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  return {
    id,
    fullKey,
    record: {
      id,
      label: "New API key",
      prefix: fullKey.slice(0, 12),
      createdAt: new Date().toISOString(),
    },
  };
}
