"use client";

import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { useState } from "react";
import { Modal, ModalFooterActions, modalInputClass } from "./modal";

const FOCUS_ITEMS = [
  { label: "Warm follow-ups", value: "3", href: "/dashboard/contacts" },
  { label: "Campaign ready", value: "1", href: "/dashboard/campaigns" },
  { label: "Leads cooling", value: "2", href: "/dashboard/contacts" },
] as const;

export function DashboardConcierge() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  return (
    <>
      <section className="rounded-[24px] border border-outline-variant/10 bg-ivory p-6 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 sm:max-w-md sm:shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-gold/15 text-rose-gold-deep">
              <Icon name="auto_awesome" className="text-[22px]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
                AI concierge · today&apos;s focus
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-text">
                Stay consistent — personalization keeps you top of mind.
              </p>
            </div>
          </div>

          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[320px] sm:grid-cols-3">
            {FOCUS_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-cream/80 px-4 py-3 transition-colors hover:border-rose-gold/30 hover:bg-champagne sm:flex-col sm:items-start sm:justify-start sm:gap-1"
              >
                <span className="font-serif text-[26px] font-semibold leading-none text-rose-gold-deep">
                  {item.value}
                </span>
                <span className="text-[13px] leading-snug text-taupe">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-outline-variant/10 pt-5">
          <button
            type="button"
            onClick={() => setWorkspaceOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[13px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            Open AI workspace
          </button>
        </div>
      </section>

      <Modal
        open={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        title="AI workspace"
        description="Draft notes, scripts, and follow-ups — generation connects in a future release."
        icon="auto_awesome"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => setWorkspaceOpen(false)}
            primaryLabel="Generate"
            primaryDisabled
            onPrimary={() => {}}
          />
        }
      >
        <textarea
          className={`${modalInputClass} min-h-[140px] resize-none py-3`}
          rows={5}
          placeholder="Draft a warm follow-up…"
        />
        <p className="mt-3 text-[12px] text-taupe">
          AI generation will be available in a future release.
        </p>
      </Modal>
    </>
  );
}
