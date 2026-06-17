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

type EnvVoice = {
  voiceId: string;
  label: string;
};

type VoiceCloningStripProps = {
  scriptText: string;
  assets: VoiceAsset[];
  onGenerated?: () => void;
};

const ENV_VOICE_PREFIX = "env:";

export function VoiceCloningStrip({ scriptText, assets, onGenerated }: VoiceCloningStripProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [envVoice, setEnvVoice] = useState<EnvVoice | null>(null);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState("");
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
      const envelope = await safeFetch<{
        profiles: VoiceProfile[];
        envVoice: EnvVoice | null;
        defaultProfileId: string | null;
        defaultVoiceId: string | null;
      }>("/api/voice-assets/profiles");
      if (!envelope.success) return;

      const { profiles: loaded, envVoice: env, defaultProfileId } = envelope.data;
      setProfiles(loaded);
      setEnvVoice(env);

      if (defaultProfileId) {
        setSelectedVoiceKey(defaultProfileId);
      } else if (env?.voiceId) {
        setSelectedVoiceKey(`${ENV_VOICE_PREFIX}${env.voiceId}`);
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

    const payload: Record<string, string> = {
      script: scriptText.trim(),
      title: title.trim() || "AI generated voicemail",
    };

    if (selectedVoiceKey.startsWith(ENV_VOICE_PREFIX)) {
      payload.voiceId = selectedVoiceKey.slice(ENV_VOICE_PREFIX.length);
    } else if (selectedVoiceKey) {
      payload.voiceProfileId = selectedVoiceKey;
    }

    const envelope = await safeFetch<{ message: string }>("/api/voice-assets/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      setSelectedVoiceKey(envelope.data.voiceProfile.id);
      setCloneOpen(false);
      setMessage(envelope.data.message);
    } else {
      setError(envelope.error);
    }
  };

  const hasVoice = Boolean(envVoice?.voiceId || profiles.length > 0);

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
                AI voice (ElevenCreative)
              </p>
              <p className="mt-0.5 text-[14px] text-slate-text">
                Write any script above, then generate audio in your voice. Set up your voice once —
                every new script uses it automatically.
              </p>
            </div>
          </div>

          <ol className="grid gap-2 text-[13px] text-slate-text sm:grid-cols-3">
            <li className="rounded-xl bg-cream/80 px-3 py-2">
              <span className="font-medium text-ink">1.</span> Record or import a sample (optional
              if voice is already set up)
            </li>
            <li className="rounded-xl bg-cream/80 px-3 py-2">
              <span className="font-medium text-ink">2.</span> Select <strong>My voice</strong>{" "}
              below
            </li>
            <li className="rounded-xl bg-cream/80 px-3 py-2">
              <span className="font-medium text-ink">3.</span> Click Generate audio — approve, then
              assign to a campaign
            </li>
          </ol>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[12px] text-taupe">
              <span className="mb-1 block font-medium text-ink">Speak as</span>
              <select
                className="w-full rounded-xl border border-outline-variant/25 bg-cream px-3 py-2 text-[13px]"
                value={selectedVoiceKey}
                onChange={(e) => setSelectedVoiceKey(e.target.value)}
              >
                {envVoice ? (
                  <option value={`${ENV_VOICE_PREFIX}${envVoice.voiceId}`}>
                    {envVoice.label}
                  </option>
                ) : null}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                {!hasVoice ? (
                  <option value="">Default voice (set up My voice first)</option>
                ) : null}
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
                title={assets.length === 0 ? "Save a recording first" : "Clone from a recording"}
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
        description="Optional: create a voice profile from a saved recording. If cloning is blocked by your API plan, use ElevenCreative to create your voice and we’ll use it via Generate audio."
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
