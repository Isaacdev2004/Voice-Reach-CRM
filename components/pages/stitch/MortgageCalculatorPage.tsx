"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { calculateMortgage, formatUsd } from "@/lib/mortgage/calculate";
import { useEffect, useMemo, useState } from "react";

export function MortgageCalculatorPage() {
  const [homePrice, setHomePrice] = useState(850000);
  const [downPayment, setDownPayment] = useState(170000);
  const [interestRate, setInterestRate] = useState(6.85);
  const [termYears, setTermYears] = useState(30);
  const [rates, setRates] = useState<{ rate30: number; rate15: number; source: string } | null>(
    null,
  );
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  const loadRates = async () => {
    setLoadingRates(true);
    setRatesError(null);
    try {
      const res = await fetch("/api/mortgage/rates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load rates");
      setRates({ rate30: data.rate30, rate15: data.rate15, source: data.source });
      if (typeof data.rate30 === "number") setInterestRate(Number(data.rate30.toFixed(2)));
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

  const field = (label: string, value: number, onChange: (n: number) => void, step = 1) => (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-taupe">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        className={modalInputClass}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );

  return (
    <div className="luxury-page mx-auto w-full max-w-[720px] space-y-8 p-4 sm:p-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Planning</p>
        <h1 className="mt-1 font-serif text-[36px] font-semibold text-ink">Mortgage Calculator</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Estimate monthly payments with today’s average rates, refreshed daily.
        </p>
        <button
          type="button"
          onClick={() => void loadRates()}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
        >
          <Icon name="refresh" className={loadingRates ? "animate-spin text-[18px]" : "text-[18px]"} />
          Refresh rates
        </button>
      </header>

      <LuxuryCard padding="lg">
        <div className="mb-6 flex items-center gap-2">
          <Icon name="calculate" className="text-rose-gold-deep" />
          <h2 className="font-serif text-[22px] font-semibold text-ink">Loan Estimate</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("Home price", homePrice, setHomePrice, 1000)}
          {field("Down payment", downPayment, setDownPayment, 1000)}
          {field("Interest rate (%)", interestRate, setInterestRate, 0.01)}
          {field("Loan term (years)", termYears, setTermYears, 1)}
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
              onClick={() => setInterestRate(Number(rates.rate30.toFixed(2)))}
              className="rounded-2xl border border-outline-variant/15 bg-cream px-4 py-3 text-left hover:border-rose-gold/30"
            >
              <p className="text-[12px] text-taupe">30-year fixed</p>
              <p className="font-serif text-[28px] text-ink">{rates.rate30.toFixed(2)}%</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setInterestRate(Number(rates.rate15.toFixed(2)));
                setTermYears(15);
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
