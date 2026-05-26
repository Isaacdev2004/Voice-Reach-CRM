import { safeFetch } from "@/lib/api-response";
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

export type CampaignBuilderResult = {
  campaignId: string;
  status: string;
  message: string;
  enrollment?: { enrolled: number; eligible: number; total: number };
  schedule?: { scheduled: number };
};

export async function saveCampaignBuilder(
  action: "template" | "activate",
  campaign: CampaignDefinition,
  campaignId?: string | null,
): Promise<CampaignBuilderResult> {
  const envelope = await safeFetch<CampaignBuilderResult>("/api/campaigns/builder", {
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

  if (envelope.success) return envelope.data;
  if (envelope.code === "no_eligible_contacts" && envelope.details) {
    const details = envelope.details as { campaignId?: string };
    return {
      campaignId: details.campaignId ?? "",
      status: "queued",
      message: envelope.error,
    };
  }
  throw new Error(envelope.error);
}
