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

const CLONE_BLOCKED_HINT =
  "API cloning is not on your ElevenLabs plan. Use Link my voice below — paste the voice ID from ElevenCreative.";

export function VoiceCloningStrip({ scriptText, assets, onGenerated }: VoiceCloningStripProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [envVoice, setEnvVoice] = useState<EnvVoice | null>(null);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState("");
  const [title, setTitle] = useState("AI generated voicemail");
  const [generating, setGenerating] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [linkLabel, setLinkLabel] = useState("My voice");
  const [linkVoiceId, setLinkVoiceId] = useState("");
  const [cloneLabel, setCloneLabel] = useState("My voice");
  const [sampleAssetId, setSampleAssetId] = useState("");
  const [linking, setLinking] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = async () => {
    const envelope = await safeFetch<{
      profiles: VoiceProfile[];
      envVoice: EnvVoice | null;
      configured?: boolean;
      defaultProfileId: string | null;
    }>("/api/voice-assets/profiles");
    if (!envelope.success) return;

    const { profiles: loaded, envVoice: env, defaultProfileId, configured } = envelope.data;
    setProfiles(loaded ?? []);
    setEnvVoice(env);
    setApiConfigured(Boolean(configured));

    if (defaultProfileId) {
      setSelectedVoiceKey(defaultProfileId);
    } else if (env?.voiceId) {
      setSelectedVoiceKey(`${ENV_VOICE_PREFIX}${env.voiceId}`);
    } else if (configured) {
      setSelectedVoiceKey("default");
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  useEffect(() => {
    if (assets[0] && !sampleAssetId) setSampleAssetId(assets[0].id);
  }, [assets, sampleAssetId]);

  const handleGenerate = async () => {
    if (!scriptText.trim() || scriptText.trim().length < 10) {
      setError("Add at least 10 characters to your script first.");
      return;
    }
    if (!apiConfigured && !hasVoice) {
      setError(
        "ElevenLabs is not configured. Add ELEVENLABS_API_KEY (sk_…) in Vercel and Redeploy — or Link my voice after the key is set.",
      );
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
    } else if (selectedVoiceKey && selectedVoiceKey !== "default") {
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

  const handleLinkVoice = async () => {
    if (!linkVoiceId.trim() || !linkLabel.trim()) return;
    setLinking(true);
    setError(null);
    const envelope = await safeFetch<{ message: string; voiceProfile: VoiceProfile }>(
      "/api/voice-assets/profiles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: linkLabel.trim(),
          providerVoiceId: linkVoiceId.trim(),
        }),
      },
    );
    setLinking(false);
    if (envelope.success) {
      setProfiles((prev) => [envelope.data.voiceProfile, ...prev]);
      setSelectedVoiceKey(envelope.data.voiceProfile.id);
      setLinkOpen(false);
      setLinkVoiceId("");
      setMessage(envelope.data.message);
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
      if (
        envelope.error.includes("clone_not_allowed") ||
        envelope.error.includes("Link my voice") ||
        envelope.error.includes("API voice cloning")
      ) {
        setCloneOpen(false);
        setLinkOpen(true);
      }
    }
  };

  const hasVoice = Boolean(envVoice?.voiceId || profiles.length > 0);
  const canGenerate = apiConfigured || hasVoice;

  return (
    <>
      <section className="rounded-[20px] border border-outline-variant/10 bg-ivory px-5 py-4 shadow-card">
        <div className="flex w-full min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze-light text-bronze">
              <Icon name="settings_voice" className="text-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
                AI voice (ElevenLabs)
              </p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-slate-text">
                Write any script above, generate audio, approve it, then link it to a campaign for
                ringless voicemail.
              </p>
            </div>
          </div>

          {!apiConfigured ? (
            <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] leading-relaxed text-error">
              <p className="font-medium">ElevenLabs API key missing or invalid</p>
              <p className="mt-1 text-[13px]">
                In Vercel → Environment Variables, set <code>ELEVENLABS_API_KEY</code> to the secret
                starting with <strong>sk_</strong> (not the key ID), optional{" "}
                <code>ELEVENLABS_VOICE_ID</code>, then Redeploy.
              </p>
            </div>
          ) : !hasVoice ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] leading-relaxed text-amber-950">
              <p className="font-medium">Optional: use your own voice</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>In ElevenLabs → Voices → copy your Voice ID</li>
                <li>
                  Click <strong>Link my voice</strong> and paste it
                </li>
                <li>
                  Or generate now with the default voice, then swap later
                </li>
              </ol>
            </div>
          ) : (
            <ol className="grid gap-2 text-[13px] text-slate-text sm:grid-cols-3">
              <li className="rounded-xl bg-cream/80 px-3 py-2">
                <span className="font-medium text-ink">1.</span> Write your script above
              </li>
              <li className="rounded-xl bg-cream/80 px-3 py-2">
                <span className="font-medium text-ink">2.</span> Select voice under Speak as
              </li>
              <li className="rounded-xl bg-cream/80 px-3 py-2">
                <span className="font-medium text-ink">3.</span> Generate → Approve → Campaign
              </li>
            </ol>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[12px] text-taupe">
              <span className="mb-1 block font-medium text-ink">Speak as</span>
              <select
                className="w-full rounded-xl border border-outline-variant/25 bg-cream px-3 py-2 text-[13px]"
                value={selectedVoiceKey}
                onChange={(e) => setSelectedVoiceKey(e.target.value)}
              >
                {apiConfigured && !hasVoice ? (
                  <option value="default">Default ElevenLabs voice</option>
                ) : null}
                {envVoice ? (
                  <option value={`${ENV_VOICE_PREFIX}${envVoice.voiceId}`}>{envVoice.label}</option>
                ) : null}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                {!canGenerate ? <option value="">Configure ElevenLabs first…</option> : null}
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
            <div className="flex flex-wrap items-end gap-2">
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
                onClick={() => {
                  setError(null);
                  setLinkOpen(true);
                }}
                className="rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
              >
                Link my voice
              </button>
            </div>
          </div>

          {message ? (
            <p className="rounded-xl bg-sage-light/50 px-4 py-3 text-[13px] text-emerald-muted">
              {message}
            </p>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[13px] text-error">
              <p>{error.includes("ELEVENLABS_CLONE") ? CLONE_BLOCKED_HINT : error}</p>
              {error.includes("clone") || error.includes("Link my voice") ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setLinkOpen(true);
                  }}
                  className="mt-2 font-medium text-rose-gold-deep underline"
                >
                  Open Link my voice
                </button>
              ) : null}
            </div>
          ) : null}

          <p className="text-[12px] text-taupe">
            Advanced:{" "}
            <button
              type="button"
              onClick={() => setCloneOpen(true)}
              disabled={assets.length === 0}
              className="text-rose-gold-deep hover:underline disabled:opacity-50"
            >
              Clone from recording (requires API cloning on your plan)
            </button>
          </p>
        </div>
      </section>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Link my voice"
        description="Paste the Voice ID from ElevenCreative. This works on all plans — no API cloning required."
        icon="link"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => setLinkOpen(false)}
            primaryLabel={linking ? "Linking…" : "Save voice"}
            onPrimary={() => void handleLinkVoice()}
            primaryDisabled={linking || !linkVoiceId.trim() || !linkLabel.trim()}
            primaryLoading={linking}
          />
        }
      >
        <div className="space-y-4">
          <ModalField label="Profile name" required>
            <input
              className={modalInputClass}
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="My voice"
            />
          </ModalField>
          <ModalField label="ElevenCreative Voice ID" required>
            <input
              className={modalInputClass}
              value={linkVoiceId}
              onChange={(e) => setLinkVoiceId(e.target.value)}
              placeholder="e.g. abc123XYZ…"
            />
          </ModalField>
          <p className="text-[13px] leading-relaxed text-slate-text">
            In ElevenLabs → <strong>Voices</strong> → select your cloned voice → copy{" "}
            <strong>Voice ID</strong>. Or add <code className="text-[12px]">ELEVENLABS_VOICE_ID</code>{" "}
            in Vercel for a workspace-wide default.
          </p>
        </div>
      </Modal>

      <Modal
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        title="Clone from recording"
        description="Only works if your ElevenLabs API key includes instant voice cloning. Most users should use Link my voice instead."
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
