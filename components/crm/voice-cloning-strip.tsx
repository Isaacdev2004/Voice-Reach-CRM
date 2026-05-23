"use client";

import { Icon } from "@/components/ui/icon";
import { saveNotifyEmail } from "@/lib/voice-studio/storage";
import { useState } from "react";
import { Modal, ModalField, ModalFooterActions, modalInputClass } from "./modal";

const FEATURES = [
  { icon: "graphic_eq", label: "Clone from samples" },
  { icon: "description", label: "Script-to-speech" },
  { icon: "campaign", label: "Campaign-ready" },
] as const;

export function VoiceCloningStrip() {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <section className="rounded-[20px] border border-outline-variant/10 bg-ivory px-5 py-4 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bronze-light text-bronze">
              <Icon name="settings_voice" className="text-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
                  AI voice clone
                </p>
                <span className="rounded-full bg-champagne px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                  Coming soon
                </span>
              </div>
              <p className="mt-0.5 text-[14px] text-slate-text">
                Synthesize new scripts in your voice — no re-recording each time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/15 bg-cream/80 px-3 py-1.5 text-[12px] text-taupe"
              >
                <Icon name={f.icon} className="text-[16px] text-rose-gold-deep" />
                {f.label}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setNotifyOpen(true)}
              className="rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-champagne"
            >
              Get notified
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        title="AI voice cloning"
        description="Provider integration arrives in a future release."
        icon="settings_voice"
        size="md"
        footer={
          submitted ? (
            <ModalFooterActions
              onCancel={() => {
                setNotifyOpen(false);
                setSubmitted(false);
                setEmail("");
              }}
              cancelLabel="Close"
              primaryLabel="Done"
              onPrimary={() => {
                setNotifyOpen(false);
                setSubmitted(false);
              }}
            />
          ) : (
            <ModalFooterActions
              onCancel={() => setNotifyOpen(false)}
              primaryLabel="Notify me"
              onPrimary={() => {
                if (!email.trim() || !email.includes("@")) return;
                saveNotifyEmail(email.trim());
                setSubmitted(true);
              }}
              primaryDisabled={!email.includes("@")}
            />
          )
        }
      >
        {submitted ? (
          <p className="rounded-xl bg-sage-light/50 px-4 py-4 text-[14px] text-emerald-muted">
            You&apos;re on the list. We&apos;ll email you when AI voice cloning is available.
          </p>
        ) : (
          <>
            <p className="text-[14px] leading-relaxed text-slate-text">
              Upload a short voice sample once, then generate campaign scripts in your voice.
            </p>
            <ModalField label="Email" required>
              <input
                type="email"
                className={modalInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </ModalField>
          </>
        )}
      </Modal>
    </>
  );
}
