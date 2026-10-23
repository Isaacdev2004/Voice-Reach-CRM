"use client";
import { useUser } from "@clerk/nextjs";

import { EditorialWorkspaceHero } from "@/components/layout/editorial-workspace-hero";
import { AvatarStudioPanel } from "@/components/voice-studio/avatar-studio-panel";
import { VoiceStudioWorkspace } from "@/components/voice-studio/voice-studio-workspace";
import { VoiceScriptLibrary } from "@/components/voice-scripts/voice-script-library";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import type { VoiceAsset } from "@/lib/hooks/use-voice-assets";
import { useEffect, useState } from "react";

type StudioTab = "voice" | "avatar";
type PageMode = "library" | "studio";

export function VoiceScriptsStudioPage() {
  const { user } = useUser();
  return <VoiceScriptsSession key={user?.id || "signed-out"} />;
}
function VoiceScriptsSession() {
  const {user}=useUser();
  const storageKey=`myari:voice-mode:${user?.id}`;
  useEffect(()=>{try{if(localStorage.getItem(storageKey)==="studio")setMode("studio");}catch{/* Mode memory is optional. */}},[storageKey]);
  const rememberMode=(value:PageMode)=>{try{localStorage.setItem(storageKey,value);}catch{/* The editor has its own recovery. */}setMode(value);};
  const [editingAsset, setEditingAsset] = useState<VoiceAsset | undefined>();
  const [mode, setMode] = useState<PageMode>("library");
  const [tab, setTab] = useState<StudioTab>("voice");

  if (mode === "library") {
    return (
      <div className={DASHBOARD_PAGE_BODY}>
        <EditorialWorkspaceHero
          eyebrow="VOICE SCRIPTS"
          title="Find the words that move people."
          description="Confident, natural conversations start with the right approach."
          image="/brand/heroes/voice-scripts-hero.png"
          quote="Good scripts don’t sound like scripts. They sound like you."
        />
        <VoiceScriptLibrary
          onCreateScript={(asset) => {
            setEditingAsset(asset);
            rememberMode("studio");
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_PAGE_BODY, "space-y-3 vs-create-page")}>
      <header className="vs-compact-brand"><p>VOICE SCRIPTS</p><h1>Find the words that move people.</h1><p>Confident, natural conversations start with the right approach.</p></header>
      <button
        type="button"
        onClick={() => {if(document.querySelector("[data-protect-leave=true]") && !window.confirm("Unsaved audio or a draft without device recovery remains here. Download or save it before leaving. Leave anyway?"))return;rememberMode("library");}}
        className="inline-flex items-center gap-1 text-[14px] font-medium text-rose-gold-deep hover:underline"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Back to library
      </button>

      <div className="flex gap-2 rounded-full bg-champagne/60 p-1 w-fit text-xs">
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
              "rounded-full px-4 py-1 text-[12px] font-medium transition-all",
              tab === t.id
                ? "bg-ivory text-ink shadow-sm"
                : "text-taupe hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "voice" ? (
        <VoiceStudioWorkspace initialAsset={editingAsset} />
      ) : (
        <AvatarStudioPanel />
      )}
    </div>
  );
}
