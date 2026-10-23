"use client";
import { AudioWaveform } from "./audio-waveform";
import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/crm/modal";
import type { VoiceAsset } from "@/lib/hooks/use-voice-assets";
import {
  previewPersonalization,
  voiceChecks,
} from "@/lib/voice-studio/verification";

/** Shared preview: deliberately has no mutation or delivery callbacks. */
export function TestVoiceScript({
  asset,
  script = "",
  campaignName,
  stepName,
}: {
  asset: VoiceAsset | null;
  script?: string;
  campaignName?: string;
  stepName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState("1");
  const preview = previewPersonalization(script, {
    first_name: "Alex",
    agent_name: "Sample Agent",
    brokerage: "Sample Brokerage",
    city: "Sample City",
  });
  return (
    <>
      <button type="button" className="vs-button" onClick={() => setOpen(true)}>
        Test Voice Script
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Test Voice Script"
        description="Safe preview · synthetic contact · no voicemail is sent"
        size="lg"
        icon="headphones"
      >
        <div className="vs-verification">
          <h3>{asset?.title || "No recording selected"}</h3>
          <p>
            {campaignName || "No campaign selected"} ·{" "}
            {stepName || "No sequence step selected"} · Voicemail
          </p>
          {asset?.playbackUrl && <AudioWaveform url={asset.playbackUrl} />}
          {asset?.playbackUrl ? (
            <audio
              controls
              src={asset.playbackUrl}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = Number(speed);
              }}
              aria-label="Selected recording"
            />
          ) : (
            <p>Select an uploaded recording to listen.</p>
          )}
          <label>
            Playback speed
            <select
              value={speed}
              onChange={(e) => {
                setSpeed(e.target.value);
                const audio = e.currentTarget
                  .closest(".vs-verification")
                  ?.querySelector("audio");
                if (audio) audio.playbackRate = Number(e.target.value);
              }}
            >
              {[0.75, 1, 1.25, 1.5, 2].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <h4>Original script text</h4>
          <p className="vs-script-preview">
            {script ||
              "No script text is stored for this recording. A transcript has not been verified."}
          </p>
          <h4>Synthetic text preview</h4>
          <p className="vs-script-preview">
            {preview.resolved || "Unavailable"}
          </p>
          <p>
            This is a text-only preview. It does not change the prerecorded
            audio. Synthetic sample values are explicitly shown; no fallback is
            inserted for real recipients.
          </p>
          {!!preview.missing.length && (
            <p>Missing: {preview.missing.join(", ")}</p>
          )}
          {!!preview.unsupported.length && (
            <p>Unsupported: {preview.unsupported.join(", ")}</p>
          )}
          <h4>Readiness checks</h4>
          {voiceChecks(asset, script).map((check) => (
            <div className="vs-check" key={check.label}>
              <strong>{check.label}</strong>
              <span data-status={check.status}>{check.status}</span>
              <p>{check.detail}</p>
            </div>
          ))}
          <Link href="/dashboard/voice-scripts">Open Voice Studio</Link>
        </div>
      </Modal>
    </>
  );
}
