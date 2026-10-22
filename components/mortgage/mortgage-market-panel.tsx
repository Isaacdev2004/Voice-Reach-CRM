"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type {
  FannieMaeRateOutlook,
  MortgageBenchmark,
  MortgageMarketRatesPayload,
  PmmsHistoryPoint,
} from "@/lib/mortgage/market-rates";
import {
  FANNIE_MAE_FORECAST_URL,
  FREDDIE_MAC_PMMS_URL,
} from "@/lib/mortgage/market-rates";
import { PmmsHistoryChart } from "@/components/mortgage/pmms-history-chart";
import { useMemo, useState } from "react";

type HistoryMonths = 3 | 6 | 12;

type MortgageMarketPanelProps = {
  data: MortgageMarketRatesPayload | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onUseRate: (benchmark: MortgageBenchmark) => void;
  onHistoryMonthsChange: (months: HistoryMonths) => void;
  historyMonths: HistoryMonths;
  historyPoints: PmmsHistoryPoint[];
};

function formatWeeklyChange(change: number | null): string {
  if (change === null) return "—";
  if (change === 0) return "Unchanged vs prior week";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}% vs prior week`;
}

function formatPublicationDate(iso: string | null): string {
  if (!iso) return "Publication date unavailable";
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BenchmarkCard({
  benchmark,
  onUseRate,
}: {
  benchmark: MortgageBenchmark;
  onUseRate: (b: MortgageBenchmark) => void;
}) {
  const available = benchmark.rate !== null && benchmark.freshness !== "unavailable";
  const changeTone =
    benchmark.weeklyChange === null
      ? "text-taupe"
      : benchmark.weeklyChange > 0
        ? "text-error"
        : benchmark.weeklyChange < 0
          ? "text-emerald-muted"
          : "text-taupe";

  return (
    <li className="flex flex-col rounded-2xl border border-outline-variant/15 bg-gradient-to-br from-champagne/40 to-ivory p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-taupe">
        {benchmark.label}
      </p>
      <p className="mt-1 text-[12px] text-slate-text">Latest published national average</p>
      <p className="mt-3 font-serif text-[32px] font-semibold leading-none text-ink tabular-nums">
        {available ? `${benchmark.rate!.toFixed(2)}%` : "—"}
      </p>
      {!available ? (
        <p className="mt-2 text-[12px] text-taupe">Awaiting verified data</p>
      ) : (
        <>
          <p className={cn("mt-2 flex items-center gap-1 text-[12px] font-medium", changeTone)}>
            {benchmark.weeklyChange !== null && benchmark.weeklyChange !== 0 ? (
              <Icon
                name={benchmark.weeklyChange > 0 ? "arrow_upward" : "arrow_downward"}
                className="text-[14px]"
              />
            ) : null}
            {formatWeeklyChange(benchmark.weeklyChange)}
          </p>
          {benchmark.freshness === "stale" ? (
            <p className="mt-1 text-[11px] text-taupe">Last verified observation may be older than one week.</p>
          ) : null}
        </>
      )}
      <button
        type="button"
        disabled={!available}
        onClick={() => onUseRate(benchmark)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-gold/35 bg-ivory py-2.5 text-[13px] font-medium text-rose-gold-deep transition-colors hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-45"
      >
        Use this rate
      </button>
      <p className="mt-2 text-[10px] text-taupe">National benchmark — not your lender&apos;s quote.</p>
    </li>
  );
}

function FannieOutlookCard({ outlook }: { outlook: FannieMaeRateOutlook }) {
  return (
    <LuxuryCard padding="md" className="border border-outline-variant/12 bg-cream/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-taupe">
        Fannie Mae rate outlook
      </p>
      <p className="mt-1 text-[13px] text-slate-text">Monthly mortgage-market projections</p>
      {outlook.available && outlook.rate30Forecast !== null ? (
        <div className="mt-4 space-y-2">
          <p className="font-serif text-[28px] font-semibold text-ink tabular-nums">
            {outlook.rate30Forecast.toFixed(2)}%
            <span className="ml-2 text-[13px] font-normal font-sans text-taupe">30-yr forecast</span>
          </p>
          {outlook.forecastPeriod ? (
            <p className="text-[12px] text-slate-text">Period: {outlook.forecastPeriod}</p>
          ) : null}
          {outlook.publicationDate ? (
            <p className="text-[12px] text-taupe">Published {outlook.publicationDate}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-[13px] leading-relaxed text-taupe">
          Outlook values appear here when connected to verified Fannie Mae forecast data or admin-published
          updates. Forecasts are separate from Freddie Mac&apos;s weekly PMMS averages.
        </p>
      )}
      <a
        href={FANNIE_MAE_FORECAST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-rose-gold-deep hover:underline"
      >
        Official Fannie Mae forecast hub
        <Icon name="open_in_new" className="text-[14px]" />
      </a>
    </LuxuryCard>
  );
}

export function MortgageMarketPanel({
  data,
  loading,
  error,
  onRefresh,
  onUseRate,
  onHistoryMonthsChange,
  historyMonths,
  historyPoints,
}: MortgageMarketPanelProps) {
  const pubDate = data?.benchmarks.rate30.publicationDate ?? data?.benchmarks.rate15.publicationDate ?? null;

  const historyOptions: HistoryMonths[] = useMemo(() => [3, 6, 12], []);

  return (
    <LuxuryCard padding="lg" className="border border-outline-variant/12">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-gold-deep">
            Mortgage insights
          </p>
          <h2 className="mt-1 font-serif text-[22px] font-semibold text-ink">Today&apos;s mortgage market</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-text">
            Explore the latest national mortgage-rate benchmarks and see how different rates could shape your
            monthly payment.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/25 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-champagne disabled:opacity-60"
        >
          <Icon
            name={loading ? "progress_activity" : "refresh"}
            className={cn("text-[16px]", loading && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-champagne/50 px-3 py-1 text-[11px] font-medium text-taupe">
        Latest weekly benchmark
        {pubDate ? (
          <span className="text-slate-text">· As of {formatPublicationDate(pubDate)}</span>
        ) : null}
      </p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-outline-variant/15 bg-cream/40 px-4 py-3 text-[13px] text-slate-text">
          {error}
        </p>
      ) : null}

      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        <BenchmarkCard
          benchmark={
            data?.benchmarks.rate30 ?? {
              product: "30-year-fixed",
              label: "30-Year Fixed",
              rate: null,
              weeklyChange: null,
              publicationDate: null,
              source: "freddie_mac_pmms",
              sourceLabel: "Freddie Mac PMMS",
              sourceUrl: FREDDIE_MAC_PMMS_URL,
              updateFrequency: "weekly",
              freshness: "unavailable",
            }
          }
          onUseRate={onUseRate}
        />
        <BenchmarkCard
          benchmark={
            data?.benchmarks.rate15 ?? {
              product: "15-year-fixed",
              label: "15-Year Fixed",
              rate: null,
              weeklyChange: null,
              publicationDate: null,
              source: "freddie_mac_pmms",
              sourceLabel: "Freddie Mac PMMS",
              sourceUrl: FREDDIE_MAC_PMMS_URL,
              updateFrequency: "weekly",
              freshness: "unavailable",
            }
          }
          onUseRate={onUseRate}
        />
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/10 pt-4">
        <p className="text-[12px] text-taupe">
          Source: Freddie Mac PMMS · Updated weekly
        </p>
        <a
          href={FREDDIE_MAC_PMMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-gold-deep hover:underline"
        >
          Official source
          <Icon name="open_in_new" className="text-[14px]" />
        </a>
      </div>

      <div className="mt-6 border-t border-outline-variant/10 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-[18px] font-semibold text-ink">30-year fixed trend</h3>
            <p className="mt-0.5 text-[12px] text-slate-text">Verified weekly PMMS observations only</p>
          </div>
          <div className="flex gap-1 rounded-full border border-outline-variant/20 bg-ivory p-0.5">
            {historyOptions.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onHistoryMonthsChange(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                  historyMonths === m
                    ? "bg-rose-gold-deep text-ivory"
                    : "text-taupe hover:bg-champagne",
                )}
              >
                {m} mo
              </button>
            ))}
          </div>
        </div>
        <PmmsHistoryChart points={historyPoints} className="mt-4" />
        <p className="mt-2 text-[11px] text-taupe">
          {data?.history30.sourceLabel ?? "Freddie Mac PMMS"} historical file · No interpolated points
        </p>
      </div>

      <div className="mt-6">
        <FannieOutlookCard outlook={data?.fannieMaeOutlook ?? { available: false, rate30Forecast: null, forecastPeriod: null, publicationDate: null, sourceUrl: FANNIE_MAE_FORECAST_URL }} />
        <p className="mt-3 text-[11px] leading-relaxed text-taupe">
          {data?.fannieDisclaimer ??
            "Forecasts are projections and may change. They do not represent current mortgage offers."}
        </p>
      </div>

      <p className="mt-6 rounded-2xl border border-outline-variant/12 bg-cream/30 px-4 py-3 text-[11px] leading-relaxed text-slate-text">
        {data?.disclaimer ??
          "Rates shown are national market averages for informational purposes only. They are not lender offers, guaranteed rates, or personalized loan quotes."}
      </p>
    </LuxuryCard>
  );
}
