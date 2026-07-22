"use client";

import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l1.4 4.2L18 7.6l-4.2 1.4L12 13l-1.4-4.2L6 7.6l4.6-1.4L12 2z" />
      </svg>
      {label}
    </button>
  );
}

export function AiFloatingButton() {
  const { state, openAssistant } = useAiAssistant();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || state.open) return null;

  return createPortal(
    <button
      type="button"
      onClick={() =>
        openAssistant({
          task: "follow_up",
          context: { tone: "luxury" },
        })
      }
      className="fixed bottom-6 right-6 z-[190] flex items-center gap-2 rounded-full bg-rose-gold px-5 py-3 text-[13px] font-semibold text-ivory shadow-card transition-all hover:scale-105 hover:shadow-lg active:scale-95"
      aria-label="Open AI assistant"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l1.4 4.2L18 7.6l-4.2 1.4L12 13l-1.4-4.2L6 7.6l4.6-1.4L12 2zm7 9l.9 2.7 2.7.9-2.7.9L19 18l-.9-2.7L15.4 14l2.7-.9L19 11zM5 14l.8 2.4 2.4.8-2.4.8L5 20.4l-.8-2.4L1.8 17l2.4-.8L5 14z" />
      </svg>
      AI assist
    </button>,
    document.body,
  );
}
