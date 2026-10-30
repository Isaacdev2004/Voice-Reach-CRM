"use client";

import { isUuid } from "@/lib/contacts/is-uuid";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState, useRef } from "react";

export type VoiceAsset = {
  id: string;
  title: string;
  script_id: string;
  approved: boolean;
  storage_path: string;
  created_at: string;
  playbackUrl?: string | null;
  studio_metadata?: {
    script?: string;
    transcript?: string;
    source?: string;
    archived?: boolean;
    category?: string;
    approvedAt?: string;
    approvedBy?: string;
  };
};

export function useVoiceAssets() {
  const { user } = useUser();
  const serial = useRef(0);
  const [assets, setAssets] = useState<VoiceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const request = ++serial.current;
    setAssets([]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-assets", {
        headers: { "X-MyARI-Owner": user?.id ?? "" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load recordings");
      if (request !== serial.current) return;
      setAssets(data.voiceAssets ?? []);
    } catch (e) {
      if (request !== serial.current) return;
      setError(e instanceof Error ? e.message : "Failed to load");
      setAssets([]);
    } finally {
      if (request === serial.current) setLoading(false);
    }
  }, [user?.id]);

  const invalidate = useCallback(() => {
    serial.current++;
  }, []);
  useEffect(() => {
    void refresh();
    return invalidate;
  }, [refresh, invalidate]);

  const approve = async (id: string) => {
    const res = await fetch("/api/voice-assets/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceAssetId: id, confirmed: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success!==true || data.voiceAsset?.id!==id || data.voiceAsset?.approved!==true) throw new Error("Approval was not confirmed. Reload the recording and retry.");
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

  const assignToCampaign = async (
    assetId: string,
    campaignId: string,
    stepId?: string,
  ) => {
    if (!isUuid(campaignId)) {
      throw new Error(
        "Pick a real campaign from Campaigns first - demo placeholders can’t be linked.",
      );
    }
    if (!isUuid(assetId)) {
      throw new Error(
        "Save/upload the recording to the cloud before linking it to a campaign.",
      );
    }
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voiceAssetId: assetId,
        stepId: stepId ?? null,
        assignmentConfirmed: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(data.error ?? "Could not link recording to campaign");

    await refresh();
    return data as {
      link?: { message?: string; linkedTo?: string; stepOrder?: number | null };
    };
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

  return {
    assets,
    loading,
    error,
    refresh,
    approve,
    assignScript,
    assignToCampaign,
    remove,
  };
}
