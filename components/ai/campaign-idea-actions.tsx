"use client";

import {
  createCampaignFromAiIdea,
  type CreateCampaignFromIdeaMode,
} from "@/lib/ai/create-campaign-from-idea";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CampaignIdeaActionsProps = {
  output: Record<string, unknown>;
  contactId?: string;
};

export function CampaignIdeaActions({ output, contactId }: CampaignIdeaActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<CreateCampaignFromIdeaMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: CreateCampaignFromIdeaMode) => {
    setBusy(mode);
    setError(null);
    const result = await createCampaignFromAiIdea(
      output,
      mode,
      mode === "activate_contacts" && contactId ? [contactId] : undefined,
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/dashboard/campaigns/${result.campaignId}`);
  };

  return (
    <div className="mt-4 space-y-2 border-t border-outline-variant/10 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("draft")}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-gold/40 bg-ivory py-2.5 text-[13px] font-medium text-rose-gold-deep hover:bg-champagne disabled:opacity-60 sm:min-w-[140px]"
        >
          {busy === "draft" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("activate_all")}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-rose-gold py-2.5 text-[13px] font-medium text-ivory hover:opacity-90 disabled:opacity-60 sm:min-w-[140px]"
        >
          {busy === "activate_all" ? "Activating…" : "Create & activate (eligible)"}
        </button>
        {contactId ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("activate_contacts")}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-ink py-2.5 text-[13px] font-medium text-ivory hover:opacity-90 disabled:opacity-60 sm:min-w-[140px]"
          >
            {busy === "activate_contacts" ? "Activating…" : "Create for this contact"}
          </button>
        ) : null}
      </div>
      <p className="text-[11px] leading-relaxed text-taupe">
        Draft saves in simulation mode. Activate enrolls contacts with valid consent and schedules
        step runs — review copy before going live with real providers.
      </p>
      {error ? <p className="text-[12px] text-error">{error}</p> : null}
    </div>
  );
}
