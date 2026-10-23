"use client";
import { useEffect, useState } from "react";
import type { VoiceAsset } from "@/lib/hooks/use-voice-assets";
import { TestVoiceScript } from "./test-voice-script";
/** Lazy read-only lookup shares the same preview from campaign surfaces. */
export function CampaignVoiceTest({
  assetId,
  campaignName,
  stepName,
}: {
  assetId?: string | null;
  campaignName: string;
  stepName: string;
}) {
  const [asset, setAsset] = useState<VoiceAsset | null>(null);
  useEffect(() => {
    let live = true;
    if (!assetId) {
      setAsset(null);
      return;
    }
    void fetch("/api/voice-assets")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live)
          setAsset(
            j?.voiceAssets?.find((a: VoiceAsset) => a.id === assetId) ?? null,
          );
      })
      .catch(() => {
        if (live) setAsset(null);
      });
    return () => {
      live = false;
    };
  }, [assetId]);
  return (
    <TestVoiceScript
      asset={asset}
      script={asset?.studio_metadata?.script ?? ""}
      campaignName={campaignName}
      stepName={stepName}
    />
  );
}
