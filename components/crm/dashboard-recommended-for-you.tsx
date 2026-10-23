"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import {
  DASHBOARD_SECTION_CARD,
  DASHBOARD_SECTION_HEADER,
  DASHBOARD_SECTION_SUBTITLE,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard/layout";
import { PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";
import { useState } from "react";

const DASHBOARD_RECOMMENDED_KEYS = [
  "cold-lead-reengage",
  "long-term-buyer-nurture",
  "listing-alert-drip",
  "past-client-anniversary",
] as const;

const TAG_BY_KEY: Record<
  (typeof DASHBOARD_RECOMMENDED_KEYS)[number],
  { label: string; className: string }
> = {
  "cold-lead-reengage": {
    label: "High impact",
    className: "bg-rose-gold/12 text-rose-gold-deep",
  },
  "long-term-buyer-nurture": {
    label: "Build pipeline",
    className: "bg-champagne text-taupe",
  },
  "listing-alert-drip": {
    label: "Drive activity",
    className: "bg-sage-light text-emerald-muted",
  },
  "past-client-anniversary": {
    label: "Nurture trust",
    className: "bg-bronze-light text-bronze",
  },
};

const THUMB_BY_KEY: Record<
  (typeof DASHBOARD_RECOMMENDED_KEYS)[number],
  string
> = {
  "cold-lead-reengage": "/brand/heroes/contacts.jpg",
  "long-term-buyer-nurture": "/brand/heroes/dashboard-interior.jpg",
  "listing-alert-drip": "/brand/heroes/properties.jpg",
  "past-client-anniversary": "/brand/heroes/properties.jpg",
};

export function DashboardRecommendedForYou() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  const items = DASHBOARD_RECOMMENDED_KEYS.map((key) => {
    const tpl = PRODUCT_CAMPAIGN_TEMPLATES.find((t) => t.templateKey === key);
    if (!tpl) return null;
    return { tpl, tag: TAG_BY_KEY[key], thumb: THUMB_BY_KEY[key] };
  }).filter(Boolean) as {
    tpl: (typeof PRODUCT_CAMPAIGN_TEMPLATES)[number];
    tag: (typeof TAG_BY_KEY)[keyof typeof TAG_BY_KEY];
    thumb: string;
  }[];

  const createFromTemplate = async (templateKey: string) => {
    if (creatingKey) return;
    setError(false);
    setCreatingKey(templateKey);
    const envelope = await safeFetch<{ campaignId: string }>(
      "/api/campaigns/from-template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, createAutomation: true }),
      },
    );
    setCreatingKey(null);
    if (!envelope.success || !envelope.data?.campaignId) {
      setError(true);
      return;
    }
    if (envelope.success) {
      router.push(`/dashboard/campaigns/${envelope.data.campaignId}`);
    }
  };

  return (
    <LuxuryCard
      padding="md"
      className={cn("flex h-full flex-col", DASHBOARD_SECTION_CARD)}
    >
      <div className={DASHBOARD_SECTION_HEADER}>
        <div>
          <h2
            className={cn(DASHBOARD_SECTION_TITLE, "dashboard-section-heading")}
          >
            <Icon name="auto_awesome" />
            Recommended for You
          </h2>
          <p className={DASHBOARD_SECTION_SUBTITLE}>
            Playbooks tuned to your pipeline
          </p>
        </div>
        <Link
          href="/dashboard/campaigns"
          className="shrink-0 rounded-full px-2 py-1 text-[12px] font-medium text-rose-gold-deep transition-colors hover:bg-rose-gold/10"
        >
          View all
        </Link>
      </div>

      {error ? (
        <p role="alert" className="dashboard-recommendation-error">
          This playbook could not be opened. Please try again.
        </p>
      ) : null}
      <ul className="flex flex-1 flex-col divide-y divide-outline-variant/10">
        {items.map(({ tpl, tag, thumb }) => (
          <li key={tpl.templateKey} className="first:pt-0 last:pb-0 py-1.5">
            <button
              type="button"
              disabled={creatingKey !== null}
              onClick={() => void createFromTemplate(tpl.templateKey)}
              className="dashboard-recommendation group flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-cream/70 disabled:opacity-60"
            >
              <div className="dashboard-recommendation-photo relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-outline-variant/10 bg-champagne">
                <Image
                  src={thumb}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
                  sizes="64px"
                />
              </div>
              <div className="dashboard-recommendation-copy min-w-0 flex-1">
                <p className="line-clamp-2 text-[14px] font-medium leading-snug text-ink group-hover:text-rose-gold-deep">
                  {tpl.name}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-taupe">
                  {tpl.durationDays} days · {tpl.steps.length} steps
                </p>
              </div>
              <span
                className={cn(
                  "dashboard-recommendation-badge hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline-flex",
                  tag.className,
                )}
              >
                {tag.label}
              </span>
              <Icon
                name="chevron_right"
                className="shrink-0 text-[18px] text-taupe"
              />
            </button>
          </li>
        ))}
      </ul>
    </LuxuryCard>
  );
}
