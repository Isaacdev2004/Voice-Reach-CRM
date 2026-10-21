"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
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
    className: "bg-rose-gold/15 text-rose-gold-deep",
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

const THUMB_BY_KEY: Record<(typeof DASHBOARD_RECOMMENDED_KEYS)[number], string> = {
  "cold-lead-reengage": "/brand/heroes/contacts.jpg",
  "long-term-buyer-nurture": "/brand/heroes/dashboard.jpg",
  "listing-alert-drip": "/brand/heroes/properties.jpg",
  "past-client-anniversary": "/brand/heroes/campaigns.jpg",
};

export function DashboardRecommendedForYou() {
  const router = useRouter();
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
    setCreatingKey(templateKey);
    const envelope = await safeFetch<{ campaignId: string }>("/api/campaigns/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey, createAutomation: true }),
    });
    setCreatingKey(null);
    if (envelope.success) {
      router.push(`/dashboard/campaigns/${envelope.data.campaignId}`);
    }
  };

  return (
    <LuxuryCard padding="md" className="flex h-full flex-col">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-[22px] font-semibold text-ink">Recommended for You</h2>
          <p className="mt-1 text-[13px] text-slate-text">Playbooks tuned to your pipeline</p>
        </div>
        <Link
          href="/dashboard/campaigns"
          className="shrink-0 text-[13px] font-medium text-rose-gold-deep hover:underline"
        >
          View all
        </Link>
      </div>

      <ul className="flex flex-1 flex-col gap-4">
        {items.map(({ tpl, tag, thumb }) => (
          <li key={tpl.templateKey}>
            <button
              type="button"
              disabled={creatingKey === tpl.templateKey}
              onClick={() => void createFromTemplate(tpl.templateKey)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-1 text-left transition-colors hover:border-outline-variant/20 hover:bg-cream/50 disabled:opacity-60"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-champagne">
                <Image
                  src={thumb}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink group-hover:text-rose-gold-deep">
                  {tpl.name}
                </p>
                <p className="mt-0.5 text-[12px] text-taupe">
                  {tpl.durationDays} days · {tpl.steps.length} steps
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  tag.className,
                )}
              >
                {tag.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </LuxuryCard>
  );
}
