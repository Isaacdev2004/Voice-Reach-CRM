"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { VoiceCloningStrip } from "@/components/crm/voice-cloning-strip";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isUuid } from "@/lib/contacts/is-uuid";
import { useCampaignOptions } from "@/lib/hooks/use-campaign-options";
import { useVoiceAssets, type VoiceAsset } from "@/lib/hooks/use-voice-assets";
import {
  addLocalRecording,
  DEFAULT_VOICE_SCRIPT,
  formatDuration,
  loadCampaignAssignment,
  loadLocalRecordings,
  loadScriptText,
  removeLocalRecording,
  saveCampaignAssignment,
  saveScriptText,
  type LocalRecording,
} from "@/lib/voice-studio/storage";
import { uploadVoiceRecording } from "@/lib/voice-studio/upload";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type RecState = "idle" | "recording" | "paused";

type Toast = { message: string; tone: "success" | "error" };

export function VoiceStudioWorkspace() {
  const { assets, loading, error, refresh, approve, assignToCampaign, remove } = useVoiceAssets();
  const { options: campaigns, loading: campaignsLoading } = useCampaignOptions();
  const [localRecordings, setLocalRecordings] = useState<LocalRecording[]>([]);
  const [scriptText, setScriptText] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [waveSeed, setWaveSeed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    remote: boolean;
    url?: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setScriptText(loadScriptText());
    setLocalRecordings(loadLocalRecordings());

    const stored = loadCampaignAssignment();
    const validStored = isUuid(stored) ? stored : "";
    if (stored && !validStored) saveCampaignAssignment("");

    const nextId =
      (validStored && campaigns.some((c) => c.id === validStored) ? validStored : "") ||
      campaigns[0]?.id ||
      "";
    setCampaignId(nextId);
    if (nextId) saveCampaignAssignment(nextId);
  }, [campaigns]);

  useEffect(() => {
    if (recState !== "recording") return;
    const id = window.setInterval(() => {
      setElapsed((e) => e + 1);
      setWaveSeed((s) => s + 1);
    }, 1000);
    timerRef.current = id;
    return () => {
      window.clearInterval(id);
      timerRef.current = null;
    };
  }, [recState]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setPendingBlob(blob);
        setSaveTitle(`Recording ${new Date().toLocaleDateString()}`);
        setSaveOpen(true);
        stopStream();
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setElapsed(0);
      setRecState("recording");
      showToast("Recording started");
    } catch {
      showToast("Microphone access denied or unavailable", "error");
    }
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (recState === "recording") {
      rec.pause();
      setRecState("paused");
    } else if (recState === "paused") {
      rec.resume();
      setRecState("recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recState !== "idle") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecState("idle");
    }
  };

  const handleSaveRecording = async () => {
    if (!pendingBlob || !saveTitle.trim()) return;
    setUploading(true);
    const scriptId = campaignId || "studio-default";
    try {
      const asset = await uploadVoiceRecording(pendingBlob, saveTitle.trim(), scriptId);
      setActiveAssetId(asset.id);
      await refresh();
      showToast("Recording saved and uploaded");
      setSaveOpen(false);
      setPendingBlob(null);
    } catch (err) {
      const url = URL.createObjectURL(pendingBlob);
      const local: LocalRecording = {
        id: `local-${crypto.randomUUID()}`,
        title: saveTitle.trim(),
        blobUrl: url,
        durationSec: elapsed,
        createdAt: new Date().toISOString(),
        approved: false,
      };
      addLocalRecording(local);
      setLocalRecordings(loadLocalRecordings());
      showToast(
        err instanceof Error
          ? `${err.message} — saved locally on this device`
          : "Saved locally on this device",
        "error",
      );
      setSaveOpen(false);
      setPendingBlob(null);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(wav|mp3|webm|m4a)$/i)) {
      showToast("Please choose an audio file (WAV, MP3, or WebM)", "error");
      return;
    }
    setUploading(true);
    const title = file.name.replace(/\.[^.]+$/, "");
    const scriptId = campaignId || "studio-default";
    try {
      const asset = await uploadVoiceRecording(file, title, scriptId);
      setActiveAssetId(asset.id);
      await refresh();
      showToast(`Imported ${file.name}`);
    } catch (err) {
      const url = URL.createObjectURL(file);
      const local: LocalRecording = {
        id: `local-${crypto.randomUUID()}`,
        title,
        blobUrl: url,
        durationSec: 0,
        createdAt: new Date().toISOString(),
        approved: false,
      };
      addLocalRecording(local);
      setLocalRecordings(loadLocalRecordings());
      showToast(
        err instanceof Error ? `${err.message} — kept local copy` : "Saved locally",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const playAudio = useCallback((id: string, url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    void audio.play();
    setPlayingId(id);
  }, [playingId]);

  const handleCampaignChange = async (id: string) => {
    setCampaignId(id);
    saveCampaignAssignment(id);
    if (!id) {
      showToast("Campaign cleared");
      return;
    }
    if (!isUuid(id)) {
      showToast("Create a real campaign in Campaigns before linking a voice.", "error");
      return;
    }
    if (activeAssetId && id) {
      try {
        await assignToCampaign(activeAssetId, id);
        showToast("Voice recording linked to campaign");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Could not link to campaign", "error");
      }
    } else {
      showToast("Campaign selected for next recording");
    }
  };

  const handleApprove = async (asset: VoiceAsset) => {
    try {
      await approve(asset.id);
      showToast(`"${asset.title}" approved`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Approval failed", "error");
    }
  };

  const handleUseForCampaign = async (asset: VoiceAsset) => {
    if (!campaignId || !isUuid(campaignId)) {
      showToast("Select a real campaign in Assign to campaign first.", "error");
      return;
    }
    setActiveAssetId(asset.id);
    try {
      if (!asset.approved) {
        await approve(asset.id);
      }
      await assignToCampaign(asset.id, campaignId);
      showToast(`"${asset.title}" approved and linked to campaign`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not link to campaign", "error");
    }
  };

  const confirmDelete = async () => {
    const item = deleteTarget;
    if (!item) return;

    if (playingId === item.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }

    if (!item.remote) {
      if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
      setLocalRecordings(removeLocalRecording(item.id));
      setDeleteTarget(null);
      showToast("Local recording deleted");
      return;
    }

    setDeleting(true);
    try {
      await remove(item.id);
      if (activeAssetId === item.id) setActiveAssetId(null);
      setDeleteTarget(null);
      showToast("Recording deleted");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not delete recording", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleScriptBlur = () => saveScriptText(scriptText);

  const allItems = [
    ...assets.map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.approved ? "Approved" : "Pending approval",
      approved: a.approved,
      url: a.playbackUrl,
      remote: true as const,
      asset: a,
    })),
    ...localRecordings.map((l) => ({
      id: l.id,
      title: l.title,
      subtitle: `${formatDuration(l.durationSec)} · Local`,
      approved: l.approved,
      url: l.blobUrl,
      remote: false as const,
      asset: null as VoiceAsset | null,
    })),
  ];

  const displayTime = formatDuration(elapsed);
  const isLive = recState === "recording";

  return (
    <>
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30 bg-ivory",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 md:col-span-2 space-y-4">
          <LuxuryCard padding="md" className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={recState === "idle" ? startRecording : stopRecording}
              disabled={uploading}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full text-ivory shadow-card transition-transform active:scale-95 disabled:opacity-50",
                recState === "idle" ? "bg-rose-gold" : "bg-error",
              )}
              aria-label={recState === "idle" ? "Start recording" : "Stop recording"}
            >
              <Icon name={recState === "idle" ? "mic" : "stop"} className="text-4xl" />
            </button>
            <button
              type="button"
              onClick={pauseRecording}
              disabled={recState === "idle" || uploading}
              className="rounded-full border border-outline-variant/40 p-3 text-taupe disabled:opacity-40 hover:bg-champagne"
              aria-label={recState === "paused" ? "Resume" : "Pause"}
            >
              <Icon name={recState === "paused" ? "play_arrow" : "pause"} />
            </button>
            <p className="text-center text-[11px] text-taupe">
              {recState === "idle" ? "Tap mic to record" : recState === "paused" ? "Paused" : "Recording…"}
            </p>
          </LuxuryCard>
        </div>

        <LuxuryCard
          padding="lg"
          className="col-span-12 md:col-span-7 min-h-[360px] bg-gradient-to-br from-taupe/90 to-ink flex flex-col justify-center relative overflow-hidden border-0"
        >
          <div className="absolute top-6 left-8 flex items-center gap-2 text-ivory">
            {isLive ? (
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-gold" />
            ) : null}
            <span className="font-mono text-[18px]">{displayTime}</span>
          </div>
          <div className="flex h-40 items-end justify-center gap-1 px-8">
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-rose-gold/60 transition-all duration-300"
                style={{
                  height: `${isLive ? 20 + Math.abs(Math.sin(i + waveSeed)) * 80 : 15 + Math.abs(Math.sin(i)) * 40}%`,
                }}
              />
            ))}
          </div>
          <p className="absolute bottom-6 left-8 text-[13px] text-ivory/70">
            {uploading ? "Uploading…" : "Podcast-quality workspace · WebM / WAV"}
          </p>
        </LuxuryCard>

        <div className="col-span-12 md:col-span-3 space-y-4">
          <LuxuryCard padding="md">
            <h3 className="font-medium text-ink mb-3">Current script</h3>
            <p className="mb-2 text-[12px] text-taupe">
              Neutral sample for any agent — replace merge fields or rewrite before you record.
            </p>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              onBlur={handleScriptBlur}
              rows={8}
              className="w-full resize-y rounded-xl border border-outline-variant/20 bg-champagne/40 p-4 text-[14px] leading-relaxed text-ink outline-none focus:border-rose-gold/40"
            />
            <button
              type="button"
              onClick={() => {
                setScriptText(DEFAULT_VOICE_SCRIPT);
                saveScriptText(DEFAULT_VOICE_SCRIPT);
              }}
              className="mt-2 text-[12px] font-medium text-rose-gold-deep hover:underline"
            >
              Reset to neutral sample
            </button>
          </LuxuryCard>
          <LuxuryCard padding="md">
            <h3 className="font-medium text-ink mb-3">Assign to campaign</h3>
            {campaignsLoading ? (
              <p className="text-[13px] text-taupe">Loading campaigns…</p>
            ) : campaigns.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[13px] leading-relaxed text-taupe">
                  No campaigns yet. Create one first, then link your approved voice recording here.
                </p>
                <Link
                  href="/dashboard/campaigns"
                  className="inline-flex text-[13px] font-medium text-rose-gold-deep hover:underline"
                >
                  Go to Campaigns →
                </Link>
              </div>
            ) : (
              <select
                className="w-full rounded-xl border border-outline-variant/40 bg-cream px-4 py-2.5 text-[14px] outline-none focus:border-rose-gold/50"
                value={campaignId}
                onChange={(e) => void handleCampaignChange(e.target.value)}
              >
                <option value="">Select a campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {activeAssetId && campaigns.length > 0 ? (
              <p className="mt-2 text-[12px] text-emerald-muted">Linked to selected recording</p>
            ) : null}
          </LuxuryCard>
        </div>
      </div>

      <section>
        <h2 className="font-serif text-[22px] font-semibold text-ink mb-4">Saved recordings</h2>
        {error ? (
          <p className="mb-4 rounded-xl bg-champagne px-4 py-3 text-[14px] text-taupe">
            Cloud sync unavailable — local recordings still work. ({error})
          </p>
        ) : null}
        {loading ? <p className="text-taupe">Loading recordings…</p> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {allItems.map((item) => (
            <LuxuryCard
              key={item.id}
              padding="md"
              className={cn(
                "transition-shadow hover:shadow-nav",
                activeAssetId === item.id && "ring-2 ring-rose-gold/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  disabled={!item.url}
                  onClick={() => item.url && playAudio(item.id, item.url)}
                  className="text-rose-gold-deep disabled:opacity-40"
                  aria-label={playingId === item.id ? "Pause" : "Play"}
                >
                  <Icon
                    name={playingId === item.id ? "pause_circle" : "play_circle"}
                    className="text-[32px]"
                  />
                </button>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    item.approved ? "text-emerald-muted" : "text-taupe",
                  )}
                >
                  {item.approved ? "Approved" : "Pending"}
                </span>
              </div>
              <button
                type="button"
                className="mt-3 text-left font-medium text-ink hover:text-rose-gold-deep"
                onClick={() => item.remote && item.asset && setActiveAssetId(item.asset.id)}
              >
                {item.title}
              </button>
              <p className="text-[12px] text-taupe">{item.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.remote && item.asset && !item.asset.approved ? (
                  <button
                    type="button"
                    onClick={() => void handleApprove(item.asset!)}
                    className="rounded-full bg-sage-light px-3 py-1 text-[12px] font-medium text-emerald-muted"
                  >
                    Approve
                  </button>
                ) : null}
                {item.remote && item.asset ? (
                  <button
                    type="button"
                    onClick={() => void handleUseForCampaign(item.asset!)}
                    className="rounded-full border border-outline-variant/30 px-3 py-1 text-[12px] text-taupe hover:bg-champagne"
                  >
                    Use for campaign
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      id: item.id,
                      title: item.title,
                      remote: item.remote,
                      url: item.url,
                    })
                  }
                  className="rounded-full border border-error/25 bg-error/5 px-3 py-1 text-[12px] font-medium text-error hover:bg-error/10"
                >
                  Delete
                </button>
              </div>
            </LuxuryCard>
          ))}
          <button
            type="button"
            className="w-full text-left"
            onClick={() => importRef.current?.click()}
          >
            <LuxuryCard
              padding="md"
              className="flex flex-col items-center justify-center border-2 border-dashed border-rose-gold/30 bg-cream/50 hover:bg-cream"
            >
              <input
                ref={importRef}
                type="file"
                accept="audio/*,.wav,.mp3,.webm,.m4a"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = "";
                }}
              />
              <Icon name="upload" className="text-[32px] text-taupe" />
              <p className="mt-2 font-medium text-ink">Import audio</p>
              <p className="text-[12px] text-taupe">WAV, MP3, or WebM</p>
            </LuxuryCard>
          </button>
        </div>
      </section>

      <VoiceCloningStrip
        scriptText={scriptText}
        assets={assets}
        onGenerated={() => void refresh()}
      />

      <Modal
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
          setPendingBlob(null);
        }}
        title="Save recording"
        description="Name your take before adding it to the library."
        icon="save"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => {
              setSaveOpen(false);
              setPendingBlob(null);
            }}
            primaryLabel={uploading ? "Saving…" : "Save recording"}
            onPrimary={handleSaveRecording}
            primaryDisabled={uploading || !saveTitle.trim()}
            primaryLoading={uploading}
          />
        }
      >
        <ModalField label="Recording title" required>
          <input
            className={modalInputClass}
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            autoFocus
          />
        </ModalField>
        <p className="text-[13px] text-taupe">Duration: {displayTime}</p>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        title="Delete recording"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.title}”? This cannot be undone.`
            : "Delete this recording?"
        }
        icon="delete"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => setDeleteTarget(null)}
            primaryLabel={deleting ? "Deleting…" : "Delete permanently"}
            onPrimary={() => void confirmDelete()}
            primaryDisabled={deleting}
            primaryLoading={deleting}
          />
        }
      >
        <p className="text-[14px] leading-relaxed text-slate-text">
          The file will be removed from your library
          {deleteTarget?.remote ? " and cloud storage" : ""}. Linked campaigns will be unlinked.
        </p>
      </Modal>
    </>
  );
}
