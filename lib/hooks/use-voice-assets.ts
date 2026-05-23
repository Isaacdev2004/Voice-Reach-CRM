"use client";

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

  return { assets, loading, error, refresh, approve, assignScript };
}
