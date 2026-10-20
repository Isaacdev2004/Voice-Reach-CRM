"use client";

import { MortgageSparkline } from "@/components/mortgage/mortgage-sparkline";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { calculateMortgage, formatUsd } from "@/lib/mortgage/calculate";
import {
  getMortgagePartnerLabel,
  getMortgagePartnerUrl,
  MORTGAGE_RESOURCE_LINKS,
} from "@/lib/mortgage/config";
import {
  buildRateSnapshot,
  firstMonthSplit,
  scenarioMeta,
  scenarioResult,
  type ScenarioId,
} from "@/lib/mortgage/scenarios";
import Link from "next/link";
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

const DEFAULT_HOME = 850_000;
const DEFAULT_DOWN = 170_000;

type MortgageRates = {
  freddieMac: { rate30: number; rate15: number };
  source: string;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 py-2.5 text-[13px] last:border-0">
      <span className="text-slate-text">{label}</span>
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}

function PaymentDonut({ principalPct, interestPct }: { principalPct: number; interestPct: number }) {
  const p = Math.min(100, Math.max(0, principalPct));
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative h-[120px] w-[120px] shrink-0 rounded-full"
        style={{
          background: `conic-gradient(var(--color-rose-gold-deep, #9a7358) ${p * 3.6}deg, #e8e0d8 ${p * 3.6}deg)`,
        }}
        aria-hidden
      >
        <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-ivory text-center">
          <span className="text-[10px] uppercase tracking-wider text-taupe">P vs I</span>
          <span className="font-serif text-[18px] font-semibold text-ink">Month 1</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-[13px]">
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-text">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-gold-deep" />
            Principal
          </span>
          <span className="font-medium text-ink">{Math.round(principalPct)}%</span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-text">
            <span className="h-2.5 w-2.5 rounded-full bg-champagne" />
            Interest
          </span>
          <span className="font-medium text-ink">{Math.round(interestPct)}%</span>
        </li>
      </ul>
    </div>
  );
}

export function MortgageCalculatorPage() {
  const [homePriceText, setHomePriceText] = useState(formatMoneyInput(DEFAULT_HOME));
  const [downPaymentText, setDownPaymentText] = useState(formatMoneyInput(DEFAULT_DOWN));
  const [interestRateText, setInterestRateText] = useState("7.40");
  const [termYearsText, setTermYearsText] = useState("30");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("30-fixed");
  const [annualTaxText, setAnnualTaxText] = useState("10,200");
  const [annualInsuranceText, setAnnualInsuranceText] = useState("2,400");
  const [monthlyHoaText, setMonthlyHoaText] = useState("0");

  const [rates, setRates] = useState<MortgageRates | null>(null);
  const partnerUrl = getMortgagePartnerUrl();
  const partnerLabel = getMortgagePartnerLabel();
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  const homePrice = parseMoney(homePriceText);
  const downPayment = parseMoney(downPaymentText);
  const interestRate = parseRate(interestRateText);
  const termYears = Math.max(1, Math.round(parseMoney(termYearsText)) || 30);
  const downPct = homePrice > 0 ? (downPayment / homePrice) * 100 : 0;

  const loadRates = async () => {
    setLoadingRates(true);
    setRatesError(null);
    try {
      const res = await fetch("/api/mortgage/rates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load rates");
      const freddieMac = data.freddieMac ?? { rate30: data.rate30, rate15: data.rate15 };
      setRates({ freddieMac, source: data.source });
      if (selectedScenario === "30-fixed" && typeof freddieMac.rate30 === "number") {
        setInterestRateText(freddieMac.rate30.toFixed(2));
      }
    } catch (e) {
      setRatesError(e instanceof Error ? e.message : "Could not load rates");
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    void loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch only
  }, []);

  const rateSnapshot = useMemo(
    () =>
      buildRateSnapshot(
        rates?.freddieMac.rate30 ?? (parseRate(interestRateText) || 7.4),
        rates?.freddieMac.rate15 ?? 6.95,
      ),
    [rates, interestRateText],
  );

  const annualTax = parseMoney(annualTaxText);
  const annualInsurance = parseMoney(annualInsuranceText);
  const monthlyHoa = parseMoney(monthlyHoaText);
  const escrow = useMemo(
    () => ({ annualTax, annualInsurance, monthlyHoa }),
    [annualTax, annualInsurance, monthlyHoa],
  );

  const result = useMemo(
    () =>
      calculateMortgage({
        homePrice,
        downPayment,
        interestRate,
        termYears,
        annualTax,
        annualInsurance,
        monthlyHoa,
        includePmi: downPct < 20,
      }),
    [homePrice, downPayment, interestRate, termYears, annualTax, annualInsurance, monthlyHoa, downPct],
  );

  const monthOne = useMemo(
    () => firstMonthSplit(result.loanAmount, interestRate, result.monthlyPrincipalInterest),
    [result.loanAmount, interestRate, result.monthlyPrincipalInterest],
  );

  const scenarioIds: ScenarioId[] = ["30-fixed", "15-fixed", "arm-51"];

  const applyScenario = (id: ScenarioId) => {
    setSelectedScenario(id);
    const meta = scenarioMeta(id, rateSnapshot);
    setInterestRateText(meta.rate.toFixed(2));
    setTermYearsText(String(meta.termYears));
  };

  const resetLoan = () => {
    setHomePriceText(formatMoneyInput(DEFAULT_HOME));
    setDownPaymentText(formatMoneyInput(DEFAULT_DOWN));
    setSelectedScenario("30-fixed");
    setTermYearsText("30");
    setInterestRateText(rateSnapshot.rate30.toFixed(2));
  };

  const rateProducts = [
    { label: "30-year fixed", rate: rateSnapshot.rate30, trend: "0.12%" },
    { label: "15-year fixed", rate: rateSnapshot.rate15, trend: "0.08%" },
    { label: "5/1 ARM", rate: rateSnapshot.arm51, trend: "0.05%" },
    { label: "7/1 ARM", rate: rateSnapshot.arm71, trend: "0.04%" },
  ];

  const insights = [
    downPct >= 20
      ? {
          icon: "verified",
          title: "You're putting 20% down",
          body: "That typically avoids PMI and strengthens your offer profile.",
        }
      : {
          icon: "info",
          title: "Below 20% down",
          body: "Consider PMI in your monthly budget until you reach 20% equity.",
        },
    {
      icon: "trending_down",
      title: "Rates are easing",
      body: "Today's averages are modestly lower than six months ago — good time to compare scenarios.",
    },
    {
      icon: "schedule",
      title: "Consider a 15-year loan",
      body: "If the higher payment fits your budget, you'll pay less interest over the life of the loan.",
    },
  ];

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <LuxuryCard padding="lg">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-[22px] font-semibold text-ink">Loan details</h2>
                <p className="mt-1 text-[13px] text-slate-text">Adjust price, down payment, rate, and term.</p>
              </div>
              <button
                type="button"
                onClick={resetLoan}
                className="shrink-0 text-[13px] font-medium text-rose-gold-deep hover:underline"
              >
                Reset
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-taupe">Home price</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                    $
                  </span>
                  <input
                    inputMode="numeric"
                    className={cn(modalInputClass, "pl-7")}
                    value={homePriceText}
                    onChange={(e) => setHomePriceText(e.target.value.replace(/[^0-9,]/g, ""))}
                    onBlur={() => setHomePriceText(formatMoneyInput(homePrice))}
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-taupe">
                  Down payment ({downPct.toFixed(0)}%)
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                    $
                  </span>
                  <input
                    inputMode="numeric"
                    className={cn(modalInputClass, "pl-7")}
                    value={downPaymentText}
                    onChange={(e) => setDownPaymentText(e.target.value.replace(/[^0-9,]/g, ""))}
                    onBlur={() => setDownPaymentText(formatMoneyInput(downPayment))}
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-taupe">Interest rate</span>
                <div className="relative">
                  <input
                    inputMode="decimal"
                    className={cn(modalInputClass, "pr-8")}
                    value={interestRateText}
                    onChange={(e) => setInterestRateText(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={() => {
                      if (interestRate > 0) setInterestRateText(interestRate.toFixed(2));
                    }}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                    %
                  </span>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-taupe">Loan term</span>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    className={cn(modalInputClass, "pr-14")}
                    value={termYearsText}
                    onChange={(e) => setTermYearsText(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={() => setTermYearsText(String(termYears))}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-taupe">
                    years
                  </span>
                </div>
              </label>
            </div>
            <div className="mt-6 border-t border-outline-variant/10 pt-5">
              <h3 className="font-serif text-[18px] font-semibold text-ink">Taxes, insurance & HOA</h3>
              <p className="mt-1 text-[13px] text-slate-text">
                Optional — included in your total monthly estimate below.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-taupe">Property tax (annual)</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      className={cn(modalInputClass, "pl-7")}
                      value={annualTaxText}
                      onChange={(e) => setAnnualTaxText(e.target.value.replace(/[^0-9,]/g, ""))}
                      onBlur={() => setAnnualTaxText(formatMoneyInput(annualTax))}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-taupe">Home insurance (annual)</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      className={cn(modalInputClass, "pl-7")}
                      value={annualInsuranceText}
                      onChange={(e) => setAnnualInsuranceText(e.target.value.replace(/[^0-9,]/g, ""))}
                      onBlur={() => setAnnualInsuranceText(formatMoneyInput(annualInsurance))}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-taupe">HOA (monthly)</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      className={cn(modalInputClass, "pl-7")}
                      value={monthlyHoaText}
                      onChange={(e) => setMonthlyHoaText(e.target.value.replace(/[^0-9,]/g, ""))}
                      onBlur={() => setMonthlyHoaText(formatMoneyInput(monthlyHoa))}
                    />
                  </div>
                </label>
              </div>
            </div>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Compare loan scenarios</h2>
            <p className="mt-1 mb-4 text-[13px] text-slate-text">
              Tap a scenario to apply its rate and term to your estimate.
            </p>
            <ul className="grid gap-3 lg:grid-cols-3">
              {scenarioIds.map((id) => {
                const s = scenarioResult(id, rateSnapshot, homePrice, downPayment, escrow);
                const active = selectedScenario === id;
                const hasEscrow =
                  escrow.annualTax > 0 || escrow.annualInsurance > 0 || escrow.monthlyHoa > 0;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => applyScenario(id)}
                      className={cn(
                        "flex h-full w-full flex-col rounded-2xl border p-4 text-left transition-shadow",
                        active
                          ? "border-rose-gold/50 bg-rose-gold/5 shadow-card"
                          : "border-outline-variant/15 bg-cream/30 hover:border-rose-gold/25",
                      )}
                    >
                      <p className="font-medium text-ink">{s.label}</p>
                      <p className="mt-2 text-[12px] text-taupe">Rate {s.rate.toFixed(2)}%</p>
                      <p className="mt-3 font-serif text-[22px] font-semibold text-rose-gold-deep">
                        {formatUsd(hasEscrow ? s.monthlyTotal : s.monthlyPrincipalInterest)}
                        <span className="text-[12px] font-normal text-taupe"> / mo</span>
                      </p>
                      {hasEscrow ? (
                        <p className="text-[11px] text-taupe">
                          P&amp;I {formatUsd(s.monthlyPrincipalInterest)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-slate-text">
                        Interest {formatUsd(s.totalInterest)}
                      </p>
                      <p className="text-[11px] text-slate-text">Total paid {formatUsd(s.totalPaid)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-[22px] font-semibold text-ink">Today&apos;s average rates</h2>
                <p className="mt-1 text-[13px] text-slate-text">
                  {rates?.source === "fred" ? "Freddie Mac PMMS & conforming indices" : "Estimated until live feed loads"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadRates()}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/25 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-champagne"
              >
                <Icon
                  name={loadingRates ? "progress_activity" : "refresh"}
                  className={cn("text-[16px]", loadingRates && "animate-spin")}
                />
                Refresh
              </button>
            </div>
            {ratesError && !rates ? (
              <p className="text-[13px] text-slate-text">{ratesError}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {rateProducts.map((product) => (
                  <li
                    key={product.label}
                    className="rounded-2xl border border-outline-variant/12 bg-champagne/25 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-medium text-taupe">{product.label}</p>
                        <p className="font-serif text-[26px] font-semibold text-ink">
                          {product.rate.toFixed(2)}%
                        </p>
                      </div>
                      <MortgageSparkline trend="down" className="text-emerald-muted" />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-muted">
                      <Icon name="arrow_downward" className="text-[14px]" />
                      {product.trend} vs last week
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Mortgage reading & updates</h2>
            <p className="mt-1 mb-4 text-[13px] text-slate-text">
              Market commentary and buyer education — opens in a new tab.
            </p>
            <ul className="space-y-3">
              {MORTGAGE_RESOURCE_LINKS.map((item) => {
                const external = item.href.startsWith("http");
                const className =
                  "group flex items-start gap-3 rounded-2xl border border-outline-variant/12 bg-champagne/20 px-4 py-3 transition-colors hover:border-rose-gold/30 hover:bg-champagne/40";
                const inner = (
                  <>
                    <Icon
                      name="open_in_new"
                      className="mt-0.5 shrink-0 text-[18px] text-rose-gold-deep"
                    />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-ink group-hover:text-rose-gold-deep">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-text">
                        {item.description}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={item.href}>
                    {external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                        {inner}
                      </a>
                    ) : (
                      <Link href={item.href} className={className}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </LuxuryCard>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <LuxuryCard padding="lg" className="bg-gradient-to-br from-[#f4e6dc] to-ivory">
            <p className="text-[13px] font-medium text-taupe">Estimated monthly payment</p>
            <p className="mt-1 font-serif text-[44px] font-semibold leading-none text-rose-gold-deep sm:text-[48px]">
              {formatUsd(result.monthlyTotal)}
            </p>
            <p className="mt-2 text-[12px] text-taupe">
              Principal &amp; interest {formatUsd(result.monthlyPrincipalInterest)}
              {result.monthlyPmi > 0 ? ` · PMI ${formatUsd(result.monthlyPmi)}` : ""}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-emerald-muted">
              <Icon name="trending_down" className="text-[16px]" />
              ~12% lower than 6 months ago (market trend)
            </p>
            <div className="mt-6 rounded-2xl bg-ivory/80 p-4 backdrop-blur-sm">
              <SummaryRow label="Loan amount" value={formatUsd(result.loanAmount)} />
              <SummaryRow label="Down payment" value={`${result.downPaymentPercent.toFixed(0)}%`} />
              <SummaryRow label="Interest rate" value={`${interestRate.toFixed(2)}%`} />
              <SummaryRow label="Loan term" value={`${termYears} years`} />
              <SummaryRow label="Total interest" value={formatUsd(result.totalInterest)} />
              <SummaryRow label="Total paid" value={formatUsd(result.totalPaid)} />
            </div>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[20px] font-semibold text-ink">Monthly payment breakdown</h2>
            <p className="mt-1 mb-4 text-[13px] text-slate-text">First-month principal vs interest split.</p>
            <PaymentDonut principalPct={monthOne.principalPct} interestPct={monthOne.interestPct} />
            <div className="mt-4 space-y-1 border-t border-outline-variant/10 pt-4 text-[13px] text-slate-text">
              <div className="flex justify-between">
                <span>Principal (month 1)</span>
                <span className="font-medium text-ink">{formatUsd(monthOne.principal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interest (month 1)</span>
                <span className="font-medium text-ink">{formatUsd(monthOne.interest)}</span>
              </div>
              <div className="flex justify-between">
                <span>Property taxes</span>
                <span className="font-medium text-ink">{formatUsd(result.monthlyTax)} / mo</span>
              </div>
              <div className="flex justify-between">
                <span>Home insurance</span>
                <span className="font-medium text-ink">{formatUsd(result.monthlyInsurance)} / mo</span>
              </div>
              <div className="flex justify-between">
                <span>HOA</span>
                <span className="font-medium text-ink">{formatUsd(result.monthlyHoa)} / mo</span>
              </div>
              {result.monthlyPmi > 0 ? (
                <div className="flex justify-between">
                  <span>PMI (est.)</span>
                  <span className="font-medium text-ink">{formatUsd(result.monthlyPmi)} / mo</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-outline-variant/10 pt-2 font-medium text-ink">
                <span>Total monthly</span>
                <span>{formatUsd(result.monthlyTotal)}</span>
              </div>
            </div>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[20px] font-semibold text-ink">Insights</h2>
            <ul className="mt-4 space-y-4">
              {insights.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-champagne text-rose-gold-deep">
                    <Icon name={item.icon} className="text-[18px]" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-text">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[20px] font-semibold text-ink">Next steps</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[14px] text-slate-text">
              <li>Compare 30-year, 15-year, and ARM scenarios with your buyer.</li>
              <li>Share estimates and discuss pre-approval timing.</li>
              <li>Connect with your preferred lender or mortgage partner.</li>
            </ol>
            {partnerUrl ? (
              <a
                href={partnerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold py-3.5 text-[14px] font-medium text-ivory transition-opacity hover:opacity-90"
              >
                {partnerLabel}
                <Icon name="open_in_new" className="text-[18px]" />
              </a>
            ) : (
              <p className="mt-6 rounded-2xl border border-outline-variant/15 bg-cream/50 px-4 py-3 text-[13px] leading-relaxed text-slate-text">
                Your mortgage originator profile link will appear here once your team adds it in
                workspace settings.
              </p>
            )}
            <p className="mt-3 text-center text-[11px] text-taupe">
              Estimates only — not a lender quote. Adjust taxes, insurance, and HOA above for a fuller
              monthly picture.
            </p>
          </LuxuryCard>
        </div>
      </div>
    </div>
  );
}
