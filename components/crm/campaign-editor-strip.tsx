"use client";

import { Icon } from "@/components/ui/icon";

const EDITOR_FEATURES = [
  { icon: "edit", label: "Edit step copy" },
  { icon: "schedule", label: "Step timing" },
  { icon: "verified_user", label: "Compliance" },
] as const;

export function CampaignEditorStrip() {
  return (
    <section className="rounded-[20px] border border-outline-variant/10 bg-ivory px-5 py-4 shadow-card lg:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-champagne text-rose-gold-deep">
            <Icon name="tune" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
              Sequence editor
            </p>
            <p className="mt-0.5 text-[14px] text-slate-text">
              Click <strong className="text-ink">Edit copy</strong> on any step to change SMS or email
              text. Then Save as template. Live SMS/email/voicemail use Twilio, Resend, and
              Slybroadcast.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {EDITOR_FEATURES.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/15 bg-cream/80 px-3 py-1.5 text-[12px] text-taupe"
            >
              <Icon name={f.icon} className="text-[16px] text-rose-gold-deep" />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 border-t border-outline-variant/10 pt-3 text-center font-serif text-[15px] italic text-taupe/90 lg:text-left">
        Consistency, personalization, and value at every touch.
      </p>
    </section>
  );
}
