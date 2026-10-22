"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { PulseLane, PulseLaneId, RelationshipPulseResult } from "@/lib/contacts/relationship-pulse";
import { PulseEnrollModal } from "@/components/crm/pulse-enroll-modal";
import Link from "next/link";
import { useState } from "react";

type RelationshipPulseSectionProps = {
  pulse: RelationshipPulseResult | null;
  loading: boolean;
  activeLane: PulseLaneId | null;
  onSelectLane: (lane: PulseLaneId | null) => void;
  onOpenContact: (contactId: string) => void;
  onEnrollSuccess?: (message: string) => void;
};

const LANE_STYLES: Record<PulseLaneId, { accent: string; icon: string }> = {
  needs_attention: { accent: "border-rose-gold/35 bg-champagne/40", icon: "notification_important" },
  heating_up: { accent: "border-sage/30 bg-sage-light/30", icon: "local_fire_department" },
  ready_for_business: { accent: "border-bronze/25 bg-bronze-light/20", icon: "handshake" },
};

function LaneCard({
  lane,
  active,
  onSelect,
}: {
  lane: PulseLane;
  active: boolean;
  onSelect: () => void;
}) {
  const style = LANE_STYLES[lane.id];
  const count = lane.contacts.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-full w-full flex-col rounded-2xl border p-4 text-left transition-shadow",
        active ? "shadow-card ring-1 ring-rose-gold/40" : "hover:shadow-sm",
        style.accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon name={style.icon} className="text-[22px] text-rose-gold-deep" />
        <span className="rounded-full bg-ivory/80 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink">
          {count}
        </span>
      </div>
      <p className="mt-3 font-serif text-[17px] font-semibold text-ink">{lane.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-text">{lane.subtitle}</p>
      {count > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-outline-variant/10 pt-3">
          {lane.contacts.slice(0, 3).map((c) => (
            <li key={c.contactId} className="text-[12px] text-ink">
              <span className="font-medium">{c.name}</span>
              <span className="text-taupe"> · {c.reason}</span>
            </li>
          ))}
          {count > 3 ? (
            <li className="text-[11px] font-medium text-rose-gold-deep">+{count - 3} more</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-taupe">No matches right now.</p>
      )}
    </button>
  );
}

export function RelationshipPulseSection({
  pulse,
  loading,
  activeLane,
  onSelectLane,
  onOpenContact,
  onEnrollSuccess,
}: RelationshipPulseSectionProps) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const activeLaneData =
    activeLane && pulse ? pulse.lanes.find((l) => l.id === activeLane) : null;
  const activeContacts = activeLaneData?.contacts ?? [];
  const displayHint = pulse?.aiConciergeHint?.trim() || pulse?.conciergeHint || "";

  return (
    <LuxuryCard padding="md" className="border border-outline-variant/12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-gold-deep">
            Relationship pulse
          </p>
          <h2 className="mt-1 font-serif text-[20px] font-semibold text-ink">
            Who needs you today
          </h2>
        </div>
        {activeLane ? (
          <button
            type="button"
            onClick={() => onSelectLane(null)}
            className="text-[12px] font-medium text-rose-gold-deep hover:underline"
          >
            Clear lane filter
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-4 text-[13px] text-taupe">Analyzing contacts…</p>
      ) : pulse ? (
        <>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-cream/50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-text">
            <Icon name="auto_awesome" className="mt-0.5 shrink-0 text-[18px] text-rose-gold-deep" />
            {displayHint}
          </p>
          {pulse.aiConciergeHint ? (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-taupe">
              MyARI AI concierge
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pulse.lanes.map((lane) => (
              <LaneCard
                key={lane.id}
                lane={lane}
                active={activeLane === lane.id}
                onSelect={() => onSelectLane(activeLane === lane.id ? null : lane.id)}
              />
            ))}
          </div>
          {activeLane && activeLaneData && activeContacts.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => setEnrollOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold px-4 py-2.5 text-[13px] font-medium text-ivory hover:opacity-90 sm:w-auto"
              >
                Enroll lane in campaign
              </button>
              <Link
                href="/dashboard/campaigns#campaign-builder"
                className="text-[12px] font-medium text-rose-gold-deep hover:underline"
              >
                Open campaign builder
              </Link>
            </div>
          ) : null}
          {activeLane && activeContacts.length > 0 ? (
            <ul className="mt-4 divide-y divide-outline-variant/10 rounded-2xl border border-outline-variant/12 bg-ivory">
              {activeContacts.map((c) => (
                <li key={c.contactId}>
                  <Link
                    href={`/dashboard/contacts/${c.contactId}`}
                    onClick={() => onOpenContact(c.contactId)}
                    className="flex flex-col gap-0.5 px-4 py-3 hover:bg-champagne/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-[12px] text-taupe">{c.reason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-[13px] text-taupe">Pulse unavailable — refresh contacts to retry.</p>
      )}

      {activeLane && activeLaneData ? (
        <PulseEnrollModal
          open={enrollOpen}
          onClose={() => setEnrollOpen(false)}
          laneId={activeLane}
          laneTitle={activeLaneData.title}
          contactCount={activeContacts.length}
          onSuccess={(msg) => onEnrollSuccess?.(msg)}
        />
      ) : null}
    </LuxuryCard>
  );
}
