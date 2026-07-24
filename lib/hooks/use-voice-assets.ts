"use client";

import { isUuid } from "@/lib/contacts/is-uuid";
import { useCallback, useEffect, useState } from "react";

export type VoiceAsset = {
  id: string;
  title: string;
  script_id: string;
  approved: boolean;
  storage_path: string;
  created_at: string;
  playbackUrl?: string | null;
};

export function useVoiceAssets() {
  const [assets, setAssets] = useState<VoiceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-assets");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load recordings");
      setAssets(data.voiceAssets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = async (id: string) => {
    const res = await fetch("/api/voice-assets/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceAssetId: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Approval failed");
    await refresh();
    return data.voiceAsset as VoiceAsset;
  };

  const assignScript = async (id: string, scriptId: string) => {
    const res = await fetch(`/api/voice-assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    await refresh();
  };

  const assignToCampaign = async (assetId: string, campaignId: string) => {
    if (!isUuid(campaignId)) {
      throw new Error(
        "Pick a real campaign from Campaigns first — demo placeholders can’t be linked.",
      );
    }
    if (!isUuid(assetId)) {
      throw new Error("Save/upload the recording to the cloud before linking it to a campaign.");
    }
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceAssetId: assetId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not link recording to campaign");
    await assignScript(assetId, campaignId);
    await refresh();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/voice-assets/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data.error ??
          (res.status === 404
            ? "Recording not found"
            : "Could not delete recording. Try again or unlink it from the campaign first."),
      );
    }
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return { assets, loading, error, refresh, approve, assignScript, assignToCampaign, remove };
}
