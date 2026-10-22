"use client";

import Image from "next/image";
import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  provider: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-champagne text-taupe" },
  queued: { label: "Queued", className: "bg-bronze-light text-bronze" },
  sending: { label: "Active", className: "bg-sage-light text-emerald-muted" },
  sent: { label: "Active", className: "bg-sage-light text-emerald-muted" },
  partial: { label: "Testing", className: "bg-bronze-light/80 text-bronze" },
  failed: { label: "Paused", className: "bg-error/10 text-error" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type CampaignMetricRow = {
  id: string;
  volume: number;
  deliveryRate: number;
};

function metricsForCampaign(
  campaignId: string,
  status: string,
  byId: Map<string, CampaignMetricRow>,
) {
  const row = byId.get(campaignId);
  if (!row || status === "draft") {
    return { steps: "—", contacts: "—", open: "—", reply: "—" };
  }
  return {
    steps: "—",
    contacts: row.volume > 0 ? String(row.volume) : "—",
    open: row.volume > 0 ? `${row.deliveryRate}%` : "—",
    reply: "—",
  };
}

const THUMBS = [
  "/brand/heroes/campaigns.jpg",
  "/brand/heroes/contacts.jpg",
  "/brand/heroes/properties.jpg",
  "/brand/heroes/tasks.jpg",
];

export function DashboardRecentCampaignsTable() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [metricById, setMetricById] = useState<Map<string, CampaignMetricRow>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [campRes, analyticsRes] = await Promise.all([
          fetch("/api/campaigns"),
          fetch("/api/analytics?range=30d"),
        ]);
        const data = await campRes.json().catch(() => ({}));
        setCampaigns((data.campaigns ?? []).slice(0, 6));

        const analytics = (await analyticsRes.json().catch(() => ({}))) as {
          campaignMetrics?: CampaignMetricRow[];
        };
        const map = new Map<string, CampaignMetricRow>();
        for (const m of analytics.campaignMetrics ?? []) {
          map.set(m.id, m);
        }
        setMetricById(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <LuxuryCard padding="lg">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-[22px] font-semibold text-ink sm:text-[26px]">Recent Campaigns</h2>
          <p className="mt-1 text-[14px] text-slate-text">
            Delivery, opens, and replies across your latest sequences
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="text-[14px] font-medium text-rose-gold-deep hover:underline"
          >
            View all campaigns
          </Link>
          <Link
            href="/dashboard/campaigns?new=1#campaign-builder"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-gold px-5 py-2.5 text-[13px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            <Icon name="add" className="text-[18px]" />
            New campaign
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[14px] text-taupe">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/40 px-6 py-10 text-center">
          <p className="text-[14px] text-slate-text">No campaigns yet.</p>
          <Link
            href="/dashboard/campaigns"
            className="mt-2 inline-block text-[14px] font-medium text-rose-gold-deep hover:underline"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-outline-variant/10 md:hidden">
            {campaigns.map((c, idx) => {
              const status = STATUS_LABEL[c.status] ?? {
                label: c.status,
                className: "bg-champagne text-taupe",
              };
              const metrics = metricsForCampaign(c.id, c.status, metricById);
              const thumb = THUMBS[idx % THUMBS.length];
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="flex items-center gap-3 px-1 py-3.5"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-champagne">
                      <Image src={thumb} alt="" fill className="object-cover" sizes="44px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <p className="mt-0.5 text-[12px] text-taupe">
                        {status.label}
                        {metrics.contacts !== "—" ? ` · ${metrics.contacts} contacts` : ""}
                        {metrics.open !== "—" ? ` · ${metrics.open} delivery` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-taupe">{formatDate(c.created_at)}</p>
                    </div>
                    <Icon name="chevron_right" className="shrink-0 text-[22px] text-taupe" />
                  </Link>
                </li>
              );
            })}
          </ul>
        <div className="hidden overflow-x-auto -mx-2 px-2 md:block">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-outline-variant/15 text-[11px] font-semibold uppercase tracking-wider text-taupe">
                <th className="pb-3 pr-4 font-semibold">Campaign</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Steps</th>
                <th className="pb-3 pr-4 font-semibold">Contacts</th>
                <th className="pb-3 pr-4 font-semibold">Delivery rate</th>
                <th className="pb-3 pr-4 font-semibold">Reply rate</th>
                <th className="pb-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, idx) => {
                const status = STATUS_LABEL[c.status] ?? {
                  label: c.status,
                  className: "bg-champagne text-taupe",
                };
                const metrics = metricsForCampaign(c.id, c.status, metricById);
                const thumb = THUMBS[idx % THUMBS.length];
                return (
                  <tr
                    key={c.id}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="py-4 pr-4">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="flex items-center gap-3 font-medium text-ink hover:text-rose-gold-deep"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-champagne">
                          <Image src={thumb} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                        <span className="max-w-[200px] truncate">{c.name}</span>
                      </Link>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-slate-text">{metrics.steps}</td>
                    <td className="py-4 pr-4 text-slate-text">{metrics.contacts}</td>
                    <td className="py-4 pr-4 text-slate-text">{metrics.open}</td>
                    <td className="py-4 pr-4 text-slate-text">{metrics.reply}</td>
                    <td className="py-4 text-taupe">{formatDate(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </LuxuryCard>
  );
}
