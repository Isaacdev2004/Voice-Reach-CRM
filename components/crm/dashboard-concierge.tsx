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
      <section className="rounded-[20px] border border-outline-variant/10 bg-ivory px-5 py-4 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-gold/15 text-rose-gold-deep">
              <Icon name="auto_awesome" className="text-[22px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
                AI concierge · today&apos;s focus
              </p>
              <p className="mt-0.5 truncate text-[15px] text-ink">
                Stay consistent — personalization keeps you top of mind.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            {FOCUS_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-cream/80 px-4 py-2 text-[13px] transition-colors hover:border-rose-gold/30 hover:bg-champagne"
              >
                <span className="font-serif text-[18px] font-semibold leading-none text-rose-gold-deep">
                  {item.value}
                </span>
                <span className="text-taupe">{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setWorkspaceOpen(true)}
              className="rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory whitespace-nowrap"
            >
              AI workspace
            </button>
          </div>
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
        <p className="mt-3 text-[12px] text-taupe">AI generation will be available in a future release.</p>
      </Modal>
    </>
  );
}
