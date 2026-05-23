"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CampaignMetric } from "@/lib/analytics/types";
import Link from "next/link";

type CampaignPerformanceTableProps = {
  campaigns: CampaignMetric[];
  query: string;
  onQueryChange: (q: string) => void;
};

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "sent" || s === "sending" || s === "queued")
    return "bg-sage-light text-emerald-muted";
  if (s === "partial" || s === "failed") return "bg-error/10 text-error";
  if (s === "draft") return "bg-champagne text-taupe";
  return "bg-rose-gold/15 text-rose-gold-deep";
}

export function CampaignPerformanceTable({
  campaigns,
  query,
  onQueryChange,
}: CampaignPerformanceTableProps) {
  const filtered = campaigns.filter(
    (c) =>
      !query.trim() ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-serif text-[20px] font-semibold text-ink">Campaign performance</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-taupe"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Filter campaigns…"
              className="h-9 w-full min-w-[180px] rounded-full border border-outline-variant/20 bg-champagne/40 pl-9 pr-3 text-[13px] outline-none sm:w-48"
              aria-label="Filter campaigns"
            />
          </div>
          <Link
            href="/dashboard/campaigns"
            className="shrink-0 text-[13px] font-medium text-rose-gold-deep hover:underline"
          >
            View all
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-taupe">No campaigns match your search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/15 text-[11px] font-semibold uppercase tracking-wider text-taupe">
                <th className="pb-3 pr-4">Campaign</th>
                <th className="pb-3 pr-4">Volume</th>
                <th className="pb-3 pr-4">Delivered</th>
                <th className="pb-3 pr-4">Delivery</th>
                <th className="pb-3 pr-4">ROI</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-champagne/40">
                  <td className="py-4 pr-4">
                    <Link href="/dashboard/campaigns" className="block">
                      <span className="font-medium text-ink group-hover:text-rose-gold-deep">
                        {c.name}
                      </span>
                      <span className="block text-[12px] text-taupe">{c.subtitle}</span>
                    </Link>
                  </td>
                  <td className="py-4 pr-4 text-[14px] text-slate-text">
                    {c.volume.toLocaleString()}
                  </td>
                  <td className="py-4 pr-4 text-[14px] text-slate-text">
                    {c.delivered.toLocaleString()}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-champagne">
                        <div
                          className="h-full rounded-full bg-sage"
                          style={{ width: `${c.deliveryRate}%` }}
                        />
                      </div>
                      <span className="text-[13px] text-taupe">{c.deliveryRate}%</span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "py-4 pr-4 text-[14px] font-semibold",
                      c.roiTone === "good" && "text-emerald-muted",
                      c.roiTone === "warn" && "text-error",
                      c.roiTone === "neutral" && "text-bronze",
                    )}
                  >
                    {c.roi}
                  </td>
                  <td className="py-4">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        statusBadge(c.status),
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
