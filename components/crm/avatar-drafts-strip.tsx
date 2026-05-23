"use client";

import { Icon } from "@/components/ui/icon";
import Link from "next/link";

const FEATURES = [
  { icon: "videocam", label: "Personalized video" },
  { icon: "smart_display", label: "AI avatar" },
  { icon: "verified", label: "Approval gate" },
] as const;

type AvatarDraftsStripProps = {
  onCreateClick?: () => void;
};

export function AvatarDraftsStrip({ onCreateClick }: AvatarDraftsStripProps) {
  return (
    <section className="rounded-[20px] border border-outline-variant/10 bg-ivory px-5 py-4 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-gold/15 text-rose-gold-deep">
            <Icon name="smart_display" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
                AI avatar drafts
              </p>
              <span className="rounded-full bg-champagne px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                Preview
              </span>
            </div>
            <p className="mt-0.5 text-[14px] text-slate-text">
              Video messages for campaigns — record or generate, then approve before send.
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
          {onCreateClick ? (
            <button
              type="button"
              onClick={onCreateClick}
              className="rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory"
            >
              New avatar draft
            </button>
          ) : (
            <Link
              href="/dashboard/campaigns"
              className="rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory"
            >
              Use in campaign
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
