"use client";

import { AvatarStudioPanel } from "@/components/voice-studio/avatar-studio-panel";
import { VoiceStudioWorkspace } from "@/components/voice-studio/voice-studio-workspace";
import { cn } from "@/lib/cn";
import { useState } from "react";

type StudioTab = "voice" | "avatar";

export function VoiceScriptsStudioPage() {
  const [tab, setTab] = useState<StudioTab>("voice");

  return (
    <div className="luxury-page mx-auto max-w-[1224px] space-y-8 p-4 pt-2 sm:p-8 sm:pt-4">
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
