"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import type { VoiceAsset } from "@/lib/hooks/use-voice-assets";
import { useEffect, useState } from "react";

type VoiceProfile = {
  id: string;
  label: string;
  provider_voice_id: string;
  sample_asset_id: string | null;
};

type VoiceCloningStripProps = {
  scriptText: string;
  assets: VoiceAsset[];
  onGenerated?: () => void;
};

export function VoiceCloningStrip({ scriptText, assets, onGenerated }: VoiceCloningStripProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [title, setTitle] = useState("AI generated voicemail");
  const [generating, setGenerating] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneLabel, setCloneLabel] = useState("My voice");
  const [sampleAssetId, setSampleAssetId] = useState("");
  const [cloning, setCloning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const envelope = await safeFetch<{ profiles: VoiceProfile[] }>("/api/voice-assets/profiles");
      if (envelope.success) {
        setProfiles(envelope.data.profiles);
        if (envelope.data.profiles[0]) setSelectedProfileId(envelope.data.profiles[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    if (assets[0] && !sampleAssetId) setSampleAssetId(assets[0].id);
  }, [assets, sampleAssetId]);

  const handleGenerate = async () => {
    if (!scriptText.trim() || scriptText.trim().length < 10) {
      setError("Add at least 10 characters to your script first.");
      return;
    }
    setGenerating(true);
    setError(null);
    setMessage(null);
    const envelope = await safeFetch<{ message: string }>("/api/voice-assets/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: scriptText.trim(),
        title: title.trim() || "AI generated voicemail",
        voiceProfileId: selectedProfileId || undefined,
      }),
    });
    setGenerating(false);
    if (envelope.success) {
      setMessage(envelope.data.message);
      onGenerated?.();
    } else {
      setError(envelope.error);
    }
  };

  const handleClone = async () => {
    if (!sampleAssetId || !cloneLabel.trim()) return;
    setCloning(true);
    setError(null);
    const envelope = await safeFetch<{ message: string; voiceProfile: VoiceProfile }>(
      "/api/voice-assets/clone",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: cloneLabel.trim(), sampleAssetId }),
      },
    );
    setCloning(false);
    if (envelope.success) {
      setProfiles((prev) => [envelope.data.voiceProfile, ...prev]);
      setSelectedProfileId(envelope.data.voiceProfile.id);
      setCloneOpen(false);
      setMessage(envelope.data.message);
    } else {
      setError(envelope.error);
    }
  };

  return (
    <>
      <section className="rounded-[20px] border border-outline-variant/10 bg-ivory px-5 py-4 shadow-card">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze-light text-bronze">
              <Icon name="settings_voice" className="text-[22px]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
                AI voice (ElevenLabs)
              </p>
              <p className="mt-0.5 text-[14px] text-slate-text">
                Generate campaign audio from your script, or clone your voice from an approved
                recording.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[12px] text-taupe">
              <span className="mb-1 block font-medium text-ink">Voice profile</span>
              <select
                className="w-full rounded-xl border border-outline-variant/25 bg-cream px-3 py-2 text-[13px]"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                <option value="">Default AI voice</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-taupe sm:col-span-2">
              <span className="mb-1 block font-medium text-ink">Recording title</span>
              <input
                className="w-full rounded-xl border border-outline-variant/25 bg-cream px-3 py-2 text-[13px]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex-1 rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate audio"}
              </button>
              <button
                type="button"
                onClick={() => setCloneOpen(true)}
                disabled={assets.length === 0}
                className="rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne disabled:opacity-50"
              >
                Clone voice
              </button>
            </div>
          </div>

          {message ? (
            <p className="rounded-xl bg-sage-light/50 px-4 py-3 text-[13px] text-emerald-muted">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[13px] text-error">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <Modal
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        title="Clone your voice"
        description="Use an existing recording as a sample. ElevenLabs creates a voice profile for script-to-speech."
        icon="graphic_eq"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => setCloneOpen(false)}
            primaryLabel={cloning ? "Cloning…" : "Create clone"}
            onPrimary={() => void handleClone()}
            primaryDisabled={cloning || !sampleAssetId}
            primaryLoading={cloning}
          />
        }
      >
        <ModalField label="Profile name" required>
          <input
            className={modalInputClass}
            value={cloneLabel}
            onChange={(e) => setCloneLabel(e.target.value)}
          />
        </ModalField>
        <ModalField label="Sample recording" required>
          <select
            className={cn(modalInputClass, "appearance-auto")}
            value={sampleAssetId}
            onChange={(e) => setSampleAssetId(e.target.value)}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </ModalField>
      </Modal>
    </>
  );
}
