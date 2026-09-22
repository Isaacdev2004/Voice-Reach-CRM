"use client";

import { Modal, ModalField, ModalFooterActions } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import type { VoiceAsset } from "@/lib/hooks/use-voice-assets";
import type { CampaignStep } from "@/lib/crm/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ChangeStepVoiceModalProps = {
  open: boolean;
  step: CampaignStep | null;
  campaignId: string | null;
  assets: VoiceAsset[];
  assetsLoading?: boolean;
  onClose: () => void;
  onSaved: (stepId: string, asset: VoiceAsset, message: string) => void;
};

export function ChangeStepVoiceModal({
  open,
  step,
  campaignId,
  assets,
  assetsLoading,
  onClose,
  onSaved,
}: ChangeStepVoiceModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open || !step) return;
    setSelectedId(step.voiceAssetId ?? "");
    setError(null);
  }, [open, step]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!step) return null;

  const approvedAssets = assets.filter((a) => a.approved);

  const playPreview = (asset: VoiceAsset) => {
    if (!asset.playbackUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === asset.id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(asset.playbackUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    void audio.play();
    setPlayingId(asset.id);
  };

  const handleSave = async () => {
    if (!campaignId) {
      setError("Save the campaign as a template first, then you can assign a recording to this step.");
      return;
    }
    if (!selectedId) {
      setError("Choose a recording.");
      return;
    }
    const asset = approvedAssets.find((a) => a.id === selectedId);
    if (!asset) {
      setError("Choose an approved recording.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceAssetId: selectedId, stepId: step.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update recording");
      onSaved(step.id, asset, data.link?.message ?? `Recording linked to ${step.title}.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update recording");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change voicemail recording"
      description={`Pick which recording plays on ${step.dayLabel} · ${step.timeLabel}. No need to rebuild the whole campaign.`}
      icon="voicemail"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : "Save recording"}
          onPrimary={() => void handleSave()}
          primaryDisabled={saving || !selectedId || !campaignId}
          primaryLoading={saving}
        />
      }
    >
      {!campaignId ? (
        <p className="rounded-xl bg-champagne/60 px-4 py-3 text-[14px] text-slate-text">
          Save this campaign as a template first so we have a campaign ID to link recordings to.
        </p>
      ) : null}

      {assetsLoading ? (
        <p className="text-[14px] text-taupe">Loading recordings…</p>
      ) : approvedAssets.length === 0 ? (
        <div className="space-y-3 rounded-xl bg-champagne/60 px-4 py-3 text-[14px] text-slate-text">
          <p>No approved recordings yet.</p>
          <Link href="/dashboard/voice-scripts" className="font-medium text-rose-gold-deep hover:underline">
            Go to Voice Scripts → record or generate one
          </Link>
        </div>
      ) : (
        <ModalField label="Recording for this step" required>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {approvedAssets.map((asset) => {
              const selected = selectedId === asset.id;
              return (
                <li key={asset.id}>
                  <div
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      selected
                        ? "border-rose-gold/50 bg-rose-gold/10"
                        : "border-outline-variant/20 bg-cream/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[14px] font-medium text-ink">{asset.title}</span>
                    </button>
                    {asset.playbackUrl ? (
                      <button
                        type="button"
                        onClick={() => playPreview(asset)}
                        className="shrink-0 text-rose-gold-deep"
                        aria-label={playingId === asset.id ? "Pause preview" : "Preview recording"}
                      >
                        <Icon
                          name={playingId === asset.id ? "pause_circle" : "play_circle"}
                          className="text-[28px]"
                        />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        selected ? "bg-rose-gold text-ivory" : "bg-champagne text-taupe"
                      }`}
                    >
                      {selected ? "Selected" : "Select"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </ModalField>
      )}

      {error ? (
        <p className="mt-3 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[13px] text-error">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
