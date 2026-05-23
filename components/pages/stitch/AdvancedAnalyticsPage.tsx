"use client";

import { CampaignPerformanceTable } from "@/components/analytics/campaign-performance-table";
import { ChannelBreakdown } from "@/components/analytics/channel-breakdown";
import { ConversionFunnel } from "@/components/analytics/conversion-funnel";
import { PerformanceTrendsChart } from "@/components/analytics/performance-trends-chart";
import { ProviderSplitChart } from "@/components/analytics/provider-split-chart";
import { KpiCard } from "@/components/crm/kpi-card";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AnalyticsRange, AnalyticsSnapshot } from "@/lib/analytics/types";
import {
  exportAnalyticsCsv,
  exportAnalyticsPdf,
  fetchAnalytics,
} from "@/lib/analytics/storage";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function AdvancedAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const headerQuery = useDashboardSearch();
  const [campaignQuery, setCampaignQuery] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (r: AnalyticsRange) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAnalytics(r);
      setSnapshot(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  useEffect(() => {
    if (headerQuery) setCampaignQuery(headerQuery);
  }, [headerQuery]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setRangeOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleExportCsv = () => {
    if (!snapshot) return;
    setExporting("csv");
    try {
      exportAnalyticsCsv(snapshot);
      showToast("Analytics CSV downloaded");
    } catch {
      showToast("Export failed", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = () => {
    if (!snapshot) return;
    setExporting("pdf");
    try {
      exportAnalyticsPdf(snapshot);
      showToast("Print dialog opened — save as PDF");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Export failed", "error");
    } finally {
      setExporting(null);
    }
  };

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "Last 30 days";

  return (
    <div className="luxury-page mx-auto w-full max-w-[1400px] space-y-6 p-8">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Analytics
          </p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Performance analytics</h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Real-time insights across outreach, delivery, consent, and campaigns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(range)}
            disabled={loading}
            className="flex h-11 items-center gap-2 rounded-full border border-outline-variant/30 bg-ivory px-4 text-[14px] font-medium text-ink hover:bg-champagne disabled:opacity-50"
          >
            <Icon name="refresh" className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <div className="relative" ref={rangeRef}>
            <button
              type="button"
              onClick={() => setRangeOpen((o) => !o)}
              className="flex h-11 items-center gap-2 rounded-full border border-outline-variant/30 bg-ivory px-4 text-[14px] font-medium text-ink hover:bg-champagne"
              aria-expanded={rangeOpen}
              aria-haspopup="listbox"
            >
              <Icon name="calendar_today" className="text-[18px] text-taupe" />
              {rangeLabel}
              <Icon name="expand_more" className="text-[18px] text-taupe" />
            </button>
            {rangeOpen ? (
              <ul
                className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-outline-variant/20 bg-ivory py-1 shadow-card"
                role="listbox"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={range === opt.value}
                      onClick={() => {
                        setRange(opt.value);
                        setRangeOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-[14px] hover:bg-champagne",
                        range === opt.value && "bg-rose-gold/10 font-medium text-rose-gold-deep",
                      )}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!snapshot || exporting !== null}
            className="flex h-11 items-center gap-2 rounded-full border border-outline-variant/30 bg-ivory px-4 text-[14px] font-medium text-ink hover:bg-champagne disabled:opacity-50"
          >
            <Icon name="table" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!snapshot || exporting !== null}
            className="flex h-11 items-center gap-2 rounded-full bg-rose-gold px-4 text-[14px] font-medium text-ivory shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            <Icon name="picture_as_pdf" />
            {exporting === "pdf" ? "Opening…" : "Export PDF"}
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {loadError}
        </p>
      ) : null}

      {snapshot && !snapshot.fromLiveData ? (
        <LuxuryCard padding="md" className="border-bronze/20 bg-champagne/50">
          <p className="flex items-center gap-2 text-[14px] text-slate-text">
            <Icon name="info" className="text-rose-gold-deep" />
            Showing benchmark data — add contacts and run campaigns to see live metrics.
            <Link href="/dashboard/contacts" className="font-medium text-rose-gold-deep hover:underline">
              Add contacts
            </Link>
          </p>
        </LuxuryCard>
      ) : null}

      {loading && !snapshot ? (
        <p className="py-16 text-center text-taupe">Loading analytics…</p>
      ) : snapshot ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {snapshot.kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                id={kpi.id}
                label={kpi.label}
                value={kpi.value}
                change={kpi.change}
                icon={kpi.icon}
                tone={kpi.tone}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-[13px] text-taupe">
            <span>
              <strong className="text-ink">{snapshot.totals.contacts.toLocaleString()}</strong>{" "}
              contacts
            </span>
            <span>·</span>
            <span>
              <strong className="text-ink">{snapshot.totals.campaigns}</strong> campaigns
            </span>
            <span>·</span>
            <span>
              <strong className="text-ink">{snapshot.totals.outreach.toLocaleString()}</strong>{" "}
              outreach records
            </span>
            <span>·</span>
            <Link href="/dashboard/activity" className="font-medium text-rose-gold-deep hover:underline">
              View activity log →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <LuxuryCard padding="lg" className="lg:col-span-2">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-[22px] font-semibold text-ink">Performance trends</h2>
                <div className="flex items-center gap-4 text-[12px] text-taupe">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-sage" />
                    Delivered
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-error/50" />
                    Failed / blocked
                  </span>
                </div>
              </div>
              <PerformanceTrendsChart trends={snapshot.trends} />
            </LuxuryCard>

            <LuxuryCard padding="lg">
              <h2 className="mb-6 font-serif text-[22px] font-semibold text-ink">Provider split</h2>
              <ProviderSplitChart providers={snapshot.providers} />
            </LuxuryCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LuxuryCard padding="lg">
              <h2 className="mb-6 font-serif text-[22px] font-semibold text-ink">Conversion funnel</h2>
              <ConversionFunnel stages={snapshot.funnel} />
            </LuxuryCard>

            <LuxuryCard padding="lg">
              <h2 className="mb-6 font-serif text-[22px] font-semibold text-ink">Channel breakdown</h2>
              <ChannelBreakdown channels={snapshot.channels} />
              <Link
                href="/dashboard/campaigns"
                className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium text-rose-gold-deep"
              >
                Open campaign builder <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </LuxuryCard>
          </div>

          <LuxuryCard padding="lg">
            <CampaignPerformanceTable
              campaigns={snapshot.campaigns}
              query={campaignQuery}
              onQueryChange={setCampaignQuery}
            />
          </LuxuryCard>
        </>
      ) : null}
    </div>
  );
}
