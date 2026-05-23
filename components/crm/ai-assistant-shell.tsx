"use client";

import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import { LuxuryCard } from "./luxury-card";

type AiAssistantShellProps = {
  summary?: string;
  className?: string;
};

export function AiAssistantShell({
  summary = "You have 3 warm follow-ups and 1 campaign ready to activate. Consistency keeps you top of mind.",
  className,
}: AiAssistantShellProps) {
  const [draftOpen, setDraftOpen] = useState(false);

  return (
    <>
      <LuxuryCard
        padding="lg"
        className={`luxury-gradient-hero border-rose-gold/10 ${className ?? ""}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-gold/20 text-rose-gold-deep">
              <Icon name="psychology" className="text-[26px]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
                AI Concierge
              </p>
              <p className="mt-2 max-w-xl font-serif text-[22px] leading-snug text-ink md:text-[26px]">
                {summary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDraftOpen(true)}
            className="shrink-0 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            Open AI workspace
          </button>
        </div>
      </LuxuryCard>

      {draftOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="ai-draft-title"
        >
          <LuxuryCard padding="lg" className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <h2 id="ai-draft-title" className="font-serif text-[24px] font-semibold text-ink">
                AI Draft Workspace
              </h2>
              <button
                type="button"
                onClick={() => setDraftOpen(false)}
                className="rounded-full p-2 text-taupe hover:bg-champagne"
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="mt-2 text-body-md text-slate-text">
              Placeholder for AI-generated notes, scripts, and avatar message drafts. Connect your
              provider in a future milestone.
            </p>
            <textarea
              className="mt-4 w-full resize-none rounded-2xl border border-outline-variant/30 bg-cream p-4 text-body-md outline-none focus:border-rose-gold/50"
              rows={6}
              placeholder="Draft a warm follow-up for Elena Reyes…"
              readOnly
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-full bg-rose-gold py-3 text-[14px] font-medium text-ivory opacity-60"
                disabled
              >
                Generate (coming soon)
              </button>
              <button
                type="button"
                onClick={() => setDraftOpen(false)}
                className="rounded-full border border-outline-variant px-6 py-3 text-[14px] text-taupe"
              >
                Save draft
              </button>
            </div>
          </LuxuryCard>
        </div>
      ) : null}
    </>
  );
}
