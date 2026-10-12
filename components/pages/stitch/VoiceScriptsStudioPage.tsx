"use client";

import { AvatarStudioPanel } from "@/components/voice-studio/avatar-studio-panel";
import { VoiceStudioWorkspace } from "@/components/voice-studio/voice-studio-workspace";
import { VoiceScriptLibrary } from "@/components/voice-scripts/voice-script-library";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { useState } from "react";

type StudioTab = "voice" | "avatar";
type PageMode = "library" | "studio";

export function VoiceScriptsStudioPage() {
  const [mode, setMode] = useState<PageMode>("library");
  const [tab, setTab] = useState<StudioTab>("voice");

  if (mode === "library") {
    return (
      <div className={DASHBOARD_PAGE_BODY}>
        <VoiceScriptLibrary onCreateScript={() => setMode("studio")} />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_PAGE_BODY, "mx-auto max-w-[1224px] space-y-6")}>
      <button
        type="button"
        onClick={() => setMode("library")}
        className="inline-flex items-center gap-1 text-[14px] font-medium text-rose-gold-deep hover:underline"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Back to library
      </button>

      <div className="flex gap-2 rounded-full bg-champagne/60 p-1 w-fit">
        {(
          [
            { id: "voice" as const, label: "Voice recordings" },
            { id: "avatar" as const, label: "AI avatar drafts" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-5 py-2 text-[14px] font-medium transition-all",
              tab === t.id ? "bg-ivory text-ink shadow-sm" : "text-taupe hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "voice" ? <VoiceStudioWorkspace /> : <AvatarStudioPanel />}
    </div>
  );
}
