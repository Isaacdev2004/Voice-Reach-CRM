import type { CampaignDefinition } from "./types";

const TEMPLATES_KEY = "voicereach-campaign-templates";

export type SavedCampaignTemplate = CampaignDefinition & {
  savedAt: string;
  dbCampaignId?: string;
};

export function saveTemplateLocally(campaign: CampaignDefinition, dbCampaignId?: string) {
  if (typeof window === "undefined") return;
  const existing: SavedCampaignTemplate[] = JSON.parse(
    localStorage.getItem(TEMPLATES_KEY) || "[]",
  );
  const entry: SavedCampaignTemplate = {
    ...campaign,
    savedAt: new Date().toISOString(),
    dbCampaignId,
  };
  const filtered = existing.filter((t) => t.id !== campaign.id);
  filtered.unshift(entry);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered.slice(0, 20)));
}

export async function saveCampaignBuilder(
  action: "template" | "activate",
  campaign: CampaignDefinition,
  campaignId?: string | null,
) {
  const res = await fetch("/api/campaigns/builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        audience: campaign.audience,
        durationDays: campaign.durationDays,
        steps: campaign.steps,
        goals: campaign.goals,
      },
      campaignId: campaignId ?? undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as {
    ok: boolean;
    campaignId: string;
    status: string;
    message: string;
    enrollment?: { enrolled: number; eligible: number; total: number };
  };
}
