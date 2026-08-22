"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { calculateMortgage, formatUsd } from "@/lib/mortgage/calculate";
import { useEffect, useMemo, useState } from "react";

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyInput(value: number): string {
  if (!value) return "";
  return Math.round(value).toLocaleString("en-US");
}

function parseRate(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function MortgageCalculatorPage() {
  const [homePriceText, setHomePriceText] = useState("850,000");
  const [downPaymentText, setDownPaymentText] = useState("170,000");
  const [interestRateText, setInterestRateText] = useState("6.85");
  const [termYearsText, setTermYearsText] = useState("30");
  const [rates, setRates] = useState<{ rate30: number; rate15: number; source: string } | null>(
    null,
  );
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  const homePrice = parseMoney(homePriceText);
  const downPayment = parseMoney(downPaymentText);
  const interestRate = parseRate(interestRateText);
  const termYears = Math.max(1, Math.round(parseMoney(termYearsText)) || 30);

  const loadRates = async () => {
    setLoadingRates(true);
    setRatesError(null);
    try {
      const res = await fetch("/api/mortgage/rates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load rates");
      setRates({ rate30: data.rate30, rate15: data.rate15, source: data.source });
      if (typeof data.rate30 === "number") {
        setInterestRateText(data.rate30.toFixed(2));
      }
    } catch (e) {
      setRatesError(e instanceof Error ? e.message : "Could not load rates");
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    void loadRates();
  }, []);

  const result = useMemo(
    () =>
      calculateMortgage({
        homePrice,
        downPayment,
        interestRate,
        termYears,
        annualTax: 0,
        annualInsurance: 0,
        monthlyHoa: 0,
        includePmi: false,
      }),
    [homePrice, downPayment, interestRate, termYears],
  );

  return (
    <div className="luxury-page mx-auto w-full min-w-0 max-w-[720px] space-y-6 p-4 sm:p-8">
      <LuxuryCard padding="lg" className="w-full min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Planning</p>
        <h1 className="mt-2 font-serif text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
          Mortgage Calculator
        </h1>
        <p className="mt-3 w-full text-[15px] leading-relaxed text-slate-text sm:max-w-2xl">
          Estimate monthly payments with today’s average rates, refreshed daily.
        </p>
        <button
          type="button"
          onClick={() => void loadRates()}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
        >
          <Icon name={loadingRates ? "progress_activity" : "refresh"} className={loadingRates ? "animate-spin text-[18px]" : "text-[18px]"} />
          Refresh rates
        </button>
      </LuxuryCard>

      <LuxuryCard padding="lg" className="w-full min-w-0">
        <div className="mb-6 flex items-center gap-2">
          <Icon name="calculate" className="text-rose-gold-deep" />
          <h2 className="font-serif text-[22px] font-semibold text-ink">Loan Estimate</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-taupe">Home price</span>
            <input
              inputMode="numeric"
              className={modalInputClass}
              value={homePriceText}
              onChange={(e) => setHomePriceText(e.target.value.replace(/[^0-9,]/g, ""))}
              onBlur={() => setHomePriceText(formatMoneyInput(homePrice))}
              placeholder="850,000"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-taupe">Down payment</span>
            <input
              inputMode="numeric"
              className={modalInputClass}
              value={downPaymentText}
              onChange={(e) => setDownPaymentText(e.target.value.replace(/[^0-9,]/g, ""))}
              onBlur={() => setDownPaymentText(formatMoneyInput(downPayment))}
              placeholder="170,000"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-taupe">Interest rate (%)</span>
            <input
              inputMode="decimal"
              className={modalInputClass}
              value={interestRateText}
              onChange={(e) => setInterestRateText(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => {
                if (interestRate > 0) setInterestRateText(interestRate.toFixed(2));
              }}
              placeholder="6.85"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-taupe">Loan term (years)</span>
            <input
              inputMode="numeric"
              className={modalInputClass}
              value={termYearsText}
              onChange={(e) => setTermYearsText(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => setTermYearsText(String(termYears))}
              placeholder="30"
            />
          </label>
        </div>
      </LuxuryCard>

      <div className="rounded-[28px] bg-[#f4e6dc] px-6 py-8 sm:px-10">
        <p className="text-[13px] font-medium text-taupe">Estimated monthly payment</p>
        <p className="mt-1 font-serif text-[48px] font-semibold leading-none text-rose-gold-deep">
          {formatUsd(result.monthlyPrincipalInterest)}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[12px] text-taupe">Loan amount</p>
            <p className="mt-1 font-semibold text-ink">{formatUsd(result.loanAmount)}</p>
          </div>
          <div>
            <p className="text-[12px] text-taupe">Down payment</p>
            <p className="mt-1 font-semibold text-ink">{result.downPaymentPercent.toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[12px] text-taupe">Total interest</p>
            <p className="mt-1 font-semibold text-ink">{formatUsd(result.totalInterest)}</p>
          </div>
          <div>
            <p className="text-[12px] text-taupe">Total paid</p>
            <p className="mt-1 font-semibold text-ink">{formatUsd(result.totalPaid)}</p>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-taupe">
          Principal & interest only. Taxes, insurance, and HOA are not included.
        </p>
      </div>

      <LuxuryCard padding="lg">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-serif text-[22px] font-semibold text-ink">Today’s Average Rates</h2>
          <Icon name="show_chart" className="text-rose-gold-deep" />
        </div>
        {loadingRates && !rates ? (
          <p className="text-[14px] text-slate-text">Fetching live rates…</p>
        ) : ratesError && !rates ? (
          <p className="text-[14px] text-slate-text">{ratesError}</p>
        ) : rates ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setInterestRateText(rates.rate30.toFixed(2))}
              className="rounded-2xl border border-outline-variant/15 bg-cream px-4 py-3 text-left hover:border-rose-gold/30"
            >
              <p className="text-[12px] text-taupe">30-year fixed</p>
              <p className="font-serif text-[28px] text-ink">{rates.rate30.toFixed(2)}%</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setInterestRateText(rates.rate15.toFixed(2));
                setTermYearsText("15");
              }}
              className="rounded-2xl border border-outline-variant/15 bg-cream px-4 py-3 text-left hover:border-rose-gold/30"
            >
              <p className="text-[12px] text-taupe">15-year fixed</p>
              <p className="font-serif text-[28px] text-ink">{rates.rate15.toFixed(2)}%</p>
            </button>
          </div>
        ) : null}
        <p className="mt-3 text-[12px] text-taupe">
          {rates?.source === "fred"
            ? "Freddie Mac PMMS via FRED. Tap a rate to apply it."
            : "Using a published average until live rates load. Tap Refresh."}
        </p>
      </LuxuryCard>
    </div>
  );
}
