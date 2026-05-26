"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

type CampaignRow = {
  id: string;
  name: string;
  status: "draft" | "queued" | "sending" | "sent" | "partial" | "failed";
  provider: string;
  script_id: string;
  created_at: string;
  updated_at: string;
};

const STATUS_STYLES: Record<CampaignRow["status"], string> = {
  draft: "bg-champagne text-taupe",
  queued: "bg-bronze-light text-bronze",
  sending: "bg-rose-gold/15 text-rose-gold-deep animate-pulse-soft",
  sent: "bg-sage-light text-emerald-muted",
  partial: "bg-bronze-light text-bronze",
  failed: "bg-error/10 text-error",
};

export function CampaignListPanel() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const envelope = await safeFetch<{ campaigns: CampaignRow[] }>("/api/campaigns");
      setLoading(false);
      if (envelope.success) setCampaigns(envelope.data.campaigns);
      else setError(envelope.error);
    })();
  }, []);

  return (
    <LuxuryCard padding="lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Campaign library
          </p>
          <h2 className="mt-1 font-serif text-[22px] font-semibold text-ink">All campaigns</h2>
        </div>
        <Link
          href="#campaign-builder"
          className="text-[13px] font-medium text-rose-gold-deep hover:underline"
        >
          + Build new
        </Link>
      </div>

      {loading ? (
        <p className="py-6 text-center text-[13px] text-taupe">Loading campaigns…</p>
      ) : error ? (
        <p className="rounded-xl border border-error/30 bg-error/5 p-3 text-[13px] text-error">
          {error}
        </p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/40 p-6 text-center">
          <Icon name="campaign" className="text-[32px] text-rose-gold-deep" />
          <p className="mt-2 text-[14px] font-medium text-ink">No campaigns yet</p>
          <p className="mt-1 text-[13px] text-slate-text">
            Build your first sequence below and activate it once you&rsquo;ve added contacts.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/campaigns/${c.id}`}
                className="luxury-hover flex items-center justify-between rounded-2xl border border-outline-variant/15 bg-ivory px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  <p className="text-[12px] text-taupe">
                    Provider: {c.provider} ·{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      STATUS_STYLES[c.status],
                    )}
                  >
                    {c.status}
                  </span>
                  <Icon name="chevron_right" className="text-taupe" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </LuxuryCard>
  );
}
