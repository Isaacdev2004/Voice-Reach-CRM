import { safeFetch } from "@/lib/api-response";
import { campaignBlueprintFromAiIdea } from "@/lib/ai/campaign-blueprint-from-idea";

export type CreateCampaignFromIdeaMode = "draft" | "activate_all" | "activate_contacts";

export async function createCampaignFromAiIdea(
  output: Record<string, unknown>,
  mode: CreateCampaignFromIdeaMode,
  contactIds?: string[],
): Promise<
  | { ok: true; campaignId: string; message?: string }
  | { ok: false; error: string }
> {
  const blueprint = campaignBlueprintFromAiIdea(output);
  if (!blueprint) {
    return { ok: false, error: "Could not map this idea to campaign steps. Try generating again." };
  }

  if (mode === "activate_contacts" && (!contactIds || contactIds.length === 0)) {
    return { ok: false, error: "No contact selected to enroll." };
  }

  const action = mode === "draft" ? "template" : "activate";
  const envelope = await safeFetch<{ campaignId: string; message?: string }>(
    "/api/campaigns/builder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        campaign: blueprint,
        enrollAllEligible: mode === "activate_all",
        contactIds: mode === "activate_contacts" ? contactIds : undefined,
      }),
    },
  );

  if (!envelope.success) {
    return { ok: false, error: envelope.error };
  }

  const campaignId = envelope.data?.campaignId;
  if (!campaignId) {
    return { ok: false, error: "Campaign saved but no ID was returned." };
  }

  return {
    ok: true,
    campaignId,
    message: envelope.data?.message,
  };
}
