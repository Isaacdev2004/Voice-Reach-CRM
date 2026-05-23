"use client";

import { AvatarStudioPanel } from "@/components/voice-studio/avatar-studio-panel";
import { VoiceStudioWorkspace } from "@/components/voice-studio/voice-studio-workspace";
import { cn } from "@/lib/cn";
import { useState } from "react";

type StudioTab = "voice" | "avatar";

export function VoiceScriptsStudioPage() {
  const [tab, setTab] = useState<StudioTab>("voice");

  return (
    <div className="luxury-page p-8 max-w-[1224px] mx-auto space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
          Voice script studio
        </p>
        <h1 className="font-serif text-[36px] font-semibold text-ink">Creator workspace</h1>
        <p className="mt-2 text-body-lg text-slate-text">
          Record, preview, and assign scripts — voice and AI avatar drafts live side by side.
        </p>
      </header>

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
