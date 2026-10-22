"use client";

import { safeFetch } from "@/lib/api-response";
import { campaignBlueprintFromAiIdea } from "@/lib/ai/campaign-blueprint-from-idea";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CampaignIdeaActionsProps = {
  output: Record<string, unknown>;
};

export function CampaignIdeaActions({ output }: CampaignIdeaActionsProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraft = async () => {
    setCreating(true);
    setError(null);
    const blueprint = campaignBlueprintFromAiIdea(output);
    if (!blueprint) {
      setError("Could not map this idea to campaign steps. Try generating again.");
      setCreating(false);
      return;
    }

    const envelope = await safeFetch<{ campaignId: string }>("/api/campaigns/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "template",
        campaign: blueprint,
      }),
    });

    setCreating(false);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    const id = envelope.data?.campaignId;
    if (!id) {
      setError("Campaign was saved but no ID was returned.");
      return;
    }
    router.push(`/dashboard/campaigns/${id}`);
  };

  return (
    <div className="mt-4 border-t border-outline-variant/10 pt-4">
      <button
        type="button"
        disabled={creating}
        onClick={() => void createDraft()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold py-2.5 text-[13px] font-medium text-ivory transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {creating ? "Creating draft…" : "Create draft campaign"}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-taupe">
        Saves a simulation-mode draft in Campaigns — review steps, then activate when ready. Nothing
        sends automatically.
      </p>
      {error ? <p className="mt-2 text-[12px] text-error">{error}</p> : null}
    </div>
  );
}
