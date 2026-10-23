"use client";
import { Icon } from "@/components/ui/icon";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
import { LuxuryCard } from "./luxury-card";
export function AiAssistantShell({
  summary = "Review your CRM, plan your next step, and prepare drafts with Ask MyARI.",
  className,
}: {
  summary?: string;
  className?: string;
}) {
  const { openAssistant } = useAiAssistant();
  return (
    <LuxuryCard
      padding="lg"
      className={`luxury-gradient-hero border-rose-gold/10 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <Icon name="psychology" className="text-[26px] text-rose-gold-deep" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
              Ask MyARI
            </p>
            <p className="mt-2 font-serif text-[22px] text-ink">{summary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openAssistant({})}
          className="rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
        >
          Open AI workspace
        </button>
      </div>
    </LuxuryCard>
  );
}
