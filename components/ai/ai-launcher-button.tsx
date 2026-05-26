"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useAiAssistant } from "./ai-assistant-context";

type AiLauncherButtonProps = {
  label?: string;
  className?: string;
  task?: import("./ai-assistant-context").AiTaskType;
  contactName?: string;
  contactNotes?: string;
  campaignName?: string;
  goal?: string;
};

export function AiLauncherButton({
  label = "Ask VoiceReach AI",
  className,
  task = "follow_up",
  contactName,
  contactNotes,
  campaignName,
  goal,
}: AiLauncherButtonProps) {
  const { openAssistant } = useAiAssistant();
  return (
    <button
      type="button"
      onClick={() =>
        openAssistant({
          task,
          context: { contactName, contactNotes, campaignName, goal, tone: "luxury" },
        })
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-rose-gold/40 bg-gradient-to-r from-rose-gold/20 to-bronze-light/30 px-4 py-2 text-[13px] font-medium text-rose-gold-deep shadow-sm transition-all hover:from-rose-gold/30 hover:to-bronze-light/50",
        className,
      )}
    >
      <Icon name="auto_awesome" className="text-[18px]" />
      {label}
    </button>
  );
}

export function AiFloatingButton() {
  const { openAssistant } = useAiAssistant();
  return (
    <button
      type="button"
      onClick={() =>
        openAssistant({
          task: "follow_up",
          context: { tone: "luxury" },
        })
      }
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-rose-gold px-5 py-3 text-[13px] font-semibold text-ivory shadow-card transition-all hover:scale-105 hover:shadow-lg active:scale-95"
      aria-label="Open AI assistant"
    >
      <Icon name="auto_awesome" className="text-[20px]" />
      AI assist
    </button>
  );
}
