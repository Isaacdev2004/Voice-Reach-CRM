"use client";

import { MortgageMarketPanel } from "@/components/mortgage/mortgage-market-panel";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { calculateMortgage, formatUsdCents } from "@/lib/mortgage/calculate";
import {
  getMortgagePartnerLabel,
  getMortgagePartnerUrl,
  MORTGAGE_RESOURCE_LINKS,
} from "@/lib/mortgage/config";
import { scrollToMortgageSection } from "@/lib/mortgage/scroll-to-section";
import type {
  MortgageBenchmark,
  MortgageMarketRatesPayload,
} from "@/lib/mortgage/market-rates";
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

const DEFAULT_HOME = 0;
const DEFAULT_DOWN = 0;

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 py-2.5 text-[13px] last:border-0">
      <span className="text-slate-text">{label}</span>
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}

function PaymentDonut({
  principalPct,
  interestPct,
}: {
  principalPct: number;
  interestPct: number;
}) {
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
          <span className="text-[10px] uppercase tracking-wider text-taupe">
            P vs I
          </span>
          <span className="font-serif text-[18px] font-semibold text-ink">
            Month 1
          </span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-[13px]">
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-text">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-gold-deep" />
            Principal
          </span>
          <span className="font-medium text-ink">
            {Math.round(principalPct)}%
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-text">
            <span className="h-2.5 w-2.5 rounded-full bg-champagne" />
            Interest
          </span>
          <span className="font-medium text-ink">
            {Math.round(interestPct)}%
          </span>
        </li>
      </ul>
    </div>
  );
}

export function MortgageCalculatorPage({
  onEstimateChange,
  initialEstimate,
}: {
  onEstimateChange?: (
    value: import("@/lib/financing/calculators").Calculation,
  ) => void;
  initialEstimate?: import("@/lib/mortgage/calculate").MortgageInputs;
} = {}) {
  const [homePriceText, setHomePriceText] = useState(
    formatMoneyInput(DEFAULT_HOME),
  );
  const [downPaymentText, setDownPaymentText] = useState(
    formatMoneyInput(DEFAULT_DOWN),
  );
  const [interestRateText, setInterestRateText] = useState("7.40");
  const [termYearsText, setTermYearsText] = useState("30");
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioId>("30-fixed");
  const [annualTaxText, setAnnualTaxText] = useState("0");
  const [annualInsuranceText, setAnnualInsuranceText] = useState("0");
  const [monthlyHoaText, setMonthlyHoaText] = useState("0");

  const [marketRates, setMarketRates] =
    useState<MortgageMarketRatesPayload | null>(null);
  const partnerUrl = getMortgagePartnerUrl();
  const partnerLabel = getMortgagePartnerLabel();
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [historyMonths, setHistoryMonths] = useState<3 | 6 | 12>(6);

  const homePrice = parseMoney(homePriceText);
  const downPayment = parseMoney(downPaymentText);
  const interestRate = parseRate(interestRateText);
  const termYears = Math.max(1, Math.round(parseMoney(termYearsText)) || 30);
  const downPct = homePrice > 0 ? (downPayment / homePrice) * 100 : 0;

  const loadMarketRates = async (months: 3 | 6 | 12 = historyMonths) => {
    setLoadingRates(true);
    setRatesError(null);
    try {
      const res = await fetch(
        `/api/mortgage/market-rates?historyMonths=${months}`,
        {
          cache: "no-store",signal:AbortSignal.timeout(15000),
        },
      );
      const data = (await res.json()) as MortgageMarketRatesPayload & {
        error?: string;
        success?: boolean;
      };
      if (
        !res.ok ||
        data.success === false ||
        !data?.benchmarks?.rate30 ||
        !data?.benchmarks?.rate15 ||
        !Array.isArray(data?.history30?.points)
      ) {
        throw new Error(data.error ?? "Could not load market rates");
      }
      setMarketRates(data);
    } catch {
      setRatesError(
        "Verified rates are unavailable. Retry or enter a manually sourced rate.",
      );
      setMarketRates(null);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    void loadMarketRates(historyMonths);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch only
  }, []);

  const handleHistoryMonthsChange = (months: 3 | 6 | 12) => {
    setHistoryMonths(months);
    void loadMarketRates(months);
  };

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.startsWith("mortgage-")) {
      const t = window.setTimeout(() => scrollToMortgageSection(hash), 120);
      return () => window.clearTimeout(t);
    }
  }, []);

  const rateSnapshot = useMemo(() => {
    const userRate = parseRate(interestRateText);
    const pmms30 = marketRates?.benchmarks.rate30.rate;
    const pmms15 = marketRates?.benchmarks.rate15.rate;
    const rate30 = pmms30 ?? (userRate || 7.4);
    const rate15 =
      pmms15 ??
      (selectedScenario === "15-fixed"
        ? userRate || rate30 - 0.69
        : Math.max(0.1, rate30 - 0.69));
    return buildRateSnapshot(rate30, rate15);
  }, [marketRates, interestRateText, selectedScenario]);

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
    [
      homePrice,
      downPayment,
      interestRate,
      termYears,
      annualTax,
      annualInsurance,
      monthlyHoa,
      downPct,
    ],
  );

  useEffect(() => {
    if (!initialEstimate) return;
    setHomePriceText(String(initialEstimate.homePrice));
    setDownPaymentText(String(initialEstimate.downPayment));
    setInterestRateText(String(initialEstimate.interestRate));
    setTermYearsText(String(initialEstimate.termYears));
    setAnnualTaxText(String(initialEstimate.annualTax));
    setAnnualInsuranceText(String(initialEstimate.annualInsurance));
    setMonthlyHoaText(String(initialEstimate.monthlyHoa));
  }, [initialEstimate]);
  useEffect(() => {
    onEstimateChange?.({
      kind: "mortgage",
      homePrice,
      downPayment,
      interestRate,
      termYears,
      annualTax,
      annualInsurance,
      monthlyHoa,
      includePmi: downPct < 20,
      comparisons: (["30-fixed", "15-fixed", "arm-51"] as const).map((id) => {
        const meta = scenarioMeta(id, rateSnapshot);
        return {
          label: meta.label,
          rate: meta.rate,
          termYears: meta.termYears,
        };
      }),
      fees: [],
    });
  }, [
    homePrice,
    downPayment,
    interestRate,
    termYears,
    annualTax,
    annualInsurance,
    monthlyHoa,
    downPct,
    onEstimateChange,
    rateSnapshot,
  ]);

  const monthOne = useMemo(
    () =>
      firstMonthSplit(
        result.loanAmount,
        interestRate,
        result.monthlyPrincipalInterest,
      ),
    [result.loanAmount, interestRate, result.monthlyPrincipalInterest],
  );

  const scenarioIds: ScenarioId[] = ["30-fixed", "15-fixed", "arm-51"];

  const applyScenario = (id: ScenarioId) => {
    setSelectedScenario(id);
    const meta = scenarioMeta(id, rateSnapshot);
    setInterestRateText(meta.rate.toFixed(2));
    setTermYearsText(String(meta.termYears));
  };

  const applyBenchmarkRate = (benchmark: MortgageBenchmark) => {
    if (benchmark.rate === null) return;
    const targetScenario: ScenarioId =
      benchmark.product === "15-year-fixed" ? "15-fixed" : "30-fixed";
    const targetTerm = targetScenario === "15-fixed" ? 15 : 30;
    const termDiffers = Math.round(parseMoney(termYearsText)) !== targetTerm;
    const scenarioDiffers = selectedScenario !== targetScenario;

    if (termDiffers || scenarioDiffers) {
      const ok = window.confirm(
        `Apply the ${benchmark.label} PMMS benchmark (${benchmark.rate.toFixed(2)}%) and switch to a ${targetTerm}-year term? You can still edit the rate manually afterward.`,
      );
      if (ok) {
        setInterestRateText(benchmark.rate.toFixed(2));
        setSelectedScenario(targetScenario);
        setTermYearsText(String(targetTerm));
      }
      return;
    }

    setInterestRateText(benchmark.rate.toFixed(2));
  };

  const resetLoan = () => {
    setHomePriceText(formatMoneyInput(DEFAULT_HOME));
    setDownPaymentText(formatMoneyInput(DEFAULT_DOWN));
    setSelectedScenario("30-fixed");
    setTermYearsText("30");
    setInterestRateText(rateSnapshot.rate30.toFixed(2));
  };

  const pmmsTrend = useMemo(() => {
    const points = marketRates?.history30.points ?? [];
    if (points.length < 2) return null;
    const first = points[0]!.rate;
    const last = points[points.length - 1]!.rate;
    return { delta: last - first, first, last };
  }, [marketRates]);

  const insights = [
    downPct >= 20
      ? {
          icon: "verified",
          title: "You're putting 20% down",
          body: "That typically avoids PMI and strengthens your offer profile.",
          actionLabel: "Review loan inputs",
          targetId: "mortgage-loan-details",
        }
      : {
          icon: "info",
          title: "Below 20% down",
          body: "Consider PMI in your monthly budget until you reach 20% equity.",
          actionLabel: "Adjust down payment",
          targetId: "mortgage-loan-details",
        },
    pmmsTrend && pmmsTrend.delta < -0.05
      ? {
          icon: "trending_down",
          title: "Benchmarks moved lower",
          body: `The 30-year PMMS average is ${Math.abs(pmmsTrend.delta).toFixed(2)} pts lower over the selected period — compare scenarios with your buyer.`,
          actionLabel: "View mortgage market",
          targetId: "mortgage-market",
        }
      : pmmsTrend && pmmsTrend.delta > 0.05
        ? {
            icon: "trending_up",
            title: "Benchmarks moved higher",
            body: `The 30-year PMMS average rose ${pmmsTrend.delta.toFixed(2)} pts over the selected period — stress-test payments at today's rate.`,
            actionLabel: "View mortgage market",
            targetId: "mortgage-market",
          }
        : {
            icon: "insights",
            title: "Use verified benchmarks",
            body: "Apply Freddie Mac PMMS averages to your calculator, then adjust for your buyer's profile.",
            actionLabel: "View mortgage market",
            targetId: "mortgage-market",
          },
    {
      icon: "schedule",
      title: "Consider a 15-year loan",
      body: "If the higher payment fits your budget, you'll pay less interest over the life of the loan.",
      actionLabel: "Apply 15-year scenario",
      targetId: "mortgage-scenarios",
      beforeScroll: () => applyScenario("15-fixed"),
    },
  ];

  const runInsightAction = (item: (typeof insights)[number]) => {
    item.beforeScroll?.();
    window.requestAnimationFrame(() => {
      scrollToMortgageSection(item.targetId);
    });
  };

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <p className="text-[12px] text-slate-text">
        Enter verified property and loan amounts. Initial rates and comparison
        spreads are illustrative until you explicitly apply an available
        benchmark. Taxes and insurance start at zero and must be entered for a
        fuller estimate.
      </p>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <div id="mortgage-loan-details" className="scroll-mt-28">
            <LuxuryCard padding="lg">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-[22px] font-semibold text-ink">
                    Loan details
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-text">
                    Adjust price, down payment, rate, and term.
                  </p>
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
                  <span className="mb-2 block text-[13px] font-medium text-taupe">
                    Home price
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      className={cn(modalInputClass, "pl-7")}
                      aria-label="Home price"
                      value={homePriceText}
                      onChange={(e) =>
                        setHomePriceText(e.target.value.replace(/[^0-9,]/g, ""))
                      }
                      onBlur={() =>
                        setHomePriceText(formatMoneyInput(homePrice))
                      }
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
                      id="mortgage-down-payment-input"
                      inputMode="numeric"
                      className={cn(modalInputClass, "pl-7")}
                      aria-label="Down payment"
                      value={downPaymentText}
                      onChange={(e) =>
                        setDownPaymentText(
                          e.target.value.replace(/[^0-9,]/g, ""),
                        )
                      }
                      onBlur={() =>
                        setDownPaymentText(formatMoneyInput(downPayment))
                      }
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-taupe">
                    Interest rate
                  </span>
                  <div className="relative">
                    <input
                      inputMode="decimal"
                      className={cn(modalInputClass, "pr-8")}
                      aria-label="Interest rate"
                      value={interestRateText}
                      onChange={(e) =>
                        setInterestRateText(
                          e.target.value.replace(/[^0-9.]/g, ""),
                        )
                      }
                      onBlur={() => {
                        if (interestRate > 0)
                          setInterestRateText(interestRate.toFixed(2));
                      }}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                      %
                    </span>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-taupe">
                    Loan term
                  </span>
                  <div className="relative">
                    <input
                      inputMode="numeric"
                      className={cn(modalInputClass, "pr-14")}
                      aria-label="Loan term"
                      value={termYearsText}
                      onChange={(e) =>
                        setTermYearsText(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      onBlur={() => setTermYearsText(String(termYears))}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-taupe">
                      years
                    </span>
                  </div>
                </label>
              </div>
              <div className="mt-6 border-t border-outline-variant/10 pt-5">
                <h3 className="font-serif text-[18px] font-semibold text-ink">
                  Taxes, insurance & HOA
                </h3>
                <p className="mt-1 text-[13px] text-slate-text">
                  Optional — included in your total monthly estimate below.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-taupe">
                      Property tax (annual)
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                        $
                      </span>
                      <input
                        inputMode="numeric"
                        className={cn(modalInputClass, "pl-7")}
                        aria-label="Property tax (annual)"
                        value={annualTaxText}
                        onChange={(e) =>
                          setAnnualTaxText(
                            e.target.value.replace(/[^0-9,]/g, ""),
                          )
                        }
                        onBlur={() =>
                          setAnnualTaxText(formatMoneyInput(annualTax))
                        }
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-taupe">
                      Home insurance (annual)
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                        $
                      </span>
                      <input
                        inputMode="numeric"
                        className={cn(modalInputClass, "pl-7")}
                        aria-label="Home insurance (annual)"
                        value={annualInsuranceText}
                        onChange={(e) =>
                          setAnnualInsuranceText(
                            e.target.value.replace(/[^0-9,]/g, ""),
                          )
                        }
                        onBlur={() =>
                          setAnnualInsuranceText(
                            formatMoneyInput(annualInsurance),
                          )
                        }
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-taupe">
                      HOA (monthly)
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-taupe">
                        $
                      </span>
                      <input
                        inputMode="numeric"
                        className={cn(modalInputClass, "pl-7")}
                        aria-label="HOA (monthly)"
                        value={monthlyHoaText}
                        onChange={(e) =>
                          setMonthlyHoaText(
                            e.target.value.replace(/[^0-9,]/g, ""),
                          )
                        }
                        onBlur={() =>
                          setMonthlyHoaText(formatMoneyInput(monthlyHoa))
                        }
                      />
                    </div>
                  </label>
                </div>
              </div>
            </LuxuryCard>
          </div>

          <div id="mortgage-scenarios" className="scroll-mt-28">
            <LuxuryCard padding="lg">
              <h2 className="font-serif text-[22px] font-semibold text-ink">
                Compare loan scenarios
              </h2>
              <p className="mt-1 mb-4 text-[13px] text-slate-text">
                Tap a scenario to apply its rate and term. Unavailable
                benchmarks and ARM rates use illustrative assumptions; ARM
                totals assume the initial rate remains fixed and do not model
                resets.
              </p>
              <ul className="grid gap-3 lg:grid-cols-3">
                {scenarioIds.map((id) => {
                  const s = scenarioResult(
                    id,
                    rateSnapshot,
                    homePrice,
                    downPayment,
                    escrow,
                  );
                  const active = selectedScenario === id;
                  const hasEscrow =
                    escrow.annualTax > 0 ||
                    escrow.annualInsurance > 0 ||
                    escrow.monthlyHoa > 0;
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
                        <p className="mt-2 text-[12px] text-taupe">
                          Rate {s.rate.toFixed(2)}%
                        </p>
                        <p className="mt-3 font-serif text-[22px] font-semibold text-rose-gold-deep">
                          {formatUsdCents(
                            hasEscrow
                              ? s.monthlyTotal
                              : s.monthlyPrincipalInterest,
                          )}
                          <span className="text-[12px] font-normal text-taupe">
                            {" "}
                            / mo
                          </span>
                        </p>
                        {hasEscrow ? (
                          <p className="text-[11px] text-taupe">
                            P&amp;I {formatUsdCents(s.monthlyPrincipalInterest)}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[11px] text-slate-text">
                          Interest {formatUsdCents(s.totalInterest)}
                        </p>
                        <p className="text-[11px] text-slate-text">
                          Total paid {formatUsdCents(s.totalPaid)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </LuxuryCard>
          </div>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[22px] font-semibold text-ink">
              Mortgage reading & updates
            </h2>
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
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                      >
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
          <LuxuryCard padding="lg" className="fc-mortgage-summary">
            <p className="text-[13px] font-medium text-taupe">
              Estimated monthly payment
            </p>
            <p className="mt-1 font-serif text-[44px] font-semibold leading-none text-rose-gold-deep sm:text-[48px]">
              {formatUsdCents(result.monthlyTotal)}
            </p>
            <p className="mt-2 text-[12px] text-taupe">
              Principal &amp; interest{" "}
              {formatUsdCents(result.monthlyPrincipalInterest)}
              {result.monthlyPmi > 0
                ? ` · PMI ${formatUsdCents(result.monthlyPmi)}`
                : ""}
            </p>
            {pmmsTrend ? (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1 text-[12px] font-medium",
                  pmmsTrend.delta < 0
                    ? "text-emerald-muted"
                    : pmmsTrend.delta > 0
                      ? "text-taupe"
                      : "text-slate-text",
                )}
              >
                <Icon
                  name={
                    pmmsTrend.delta < 0
                      ? "trending_down"
                      : pmmsTrend.delta > 0
                        ? "trending_up"
                        : "horizontal_rule"
                  }
                  className="text-[16px]"
                />
                30-yr PMMS {pmmsTrend.delta >= 0 ? "+" : ""}
                {pmmsTrend.delta.toFixed(2)} pts over {historyMonths} mo
                (benchmark, not a quote)
              </p>
            ) : null}
            <details className="mt-4 rounded-2xl bg-ivory/80 p-3">
              <summary className="cursor-pointer text-[12px] text-taupe">
                Loan totals & assumptions
              </summary>
              <SummaryRow
                label="Loan amount"
                value={formatUsdCents(result.loanAmount)}
              />
              <SummaryRow
                label="Down payment"
                value={`${result.downPaymentPercent.toFixed(0)}%`}
              />
              <SummaryRow
                label="Interest rate"
                value={`${interestRate.toFixed(2)}%`}
              />
              <SummaryRow label="Loan term" value={`${termYears} years`} />
              <SummaryRow
                label="Total interest"
                value={formatUsdCents(result.totalInterest)}
              />
              <SummaryRow
                label="Total paid"
                value={formatUsdCents(result.totalPaid)}
              />
            </details>
          </LuxuryCard>

          <div id="mortgage-market" className="scroll-mt-28">
            <MortgageMarketPanel
              data={marketRates}
              loading={loadingRates}
              error={ratesError}
              onRefresh={() => void loadMarketRates(historyMonths)}
              onUseRate={applyBenchmarkRate}
              historyMonths={historyMonths}
              historyPoints={marketRates?.history30.points ?? []}
              onHistoryMonthsChange={handleHistoryMonthsChange}
            />
          </div>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              Monthly payment breakdown
            </h2>
            <p className="mt-1 mb-4 text-[13px] text-slate-text">
              First-month principal vs interest split. PMI uses an illustrative
              0.6% annual assumption; verify with a lender.
            </p>
            <PaymentDonut
              principalPct={monthOne.principalPct}
              interestPct={monthOne.interestPct}
            />
            <div className="mt-4 space-y-1 border-t border-outline-variant/10 pt-4 text-[13px] text-slate-text">
              <div className="flex justify-between">
                <span>Principal (month 1)</span>
                <span className="font-medium text-ink">
                  {formatUsdCents(monthOne.principal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interest (month 1)</span>
                <span className="font-medium text-ink">
                  {formatUsdCents(monthOne.interest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Property taxes</span>
                <span className="font-medium text-ink">
                  {formatUsdCents(result.monthlyTax)} / mo
                </span>
              </div>
              <div className="flex justify-between">
                <span>Home insurance</span>
                <span className="font-medium text-ink">
                  {formatUsdCents(result.monthlyInsurance)} / mo
                </span>
              </div>
              <div className="flex justify-between">
                <span>HOA</span>
                <span className="font-medium text-ink">
                  {formatUsdCents(result.monthlyHoa)} / mo
                </span>
              </div>
              {result.monthlyPmi > 0 ? (
                <div className="flex justify-between">
                  <span>PMI (est.)</span>
                  <span className="font-medium text-ink">
                    {formatUsdCents(result.monthlyPmi)} / mo
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-outline-variant/10 pt-2 font-medium text-ink">
                <span>Total monthly</span>
                <span>{formatUsdCents(result.monthlyTotal)}</span>
              </div>
            </div>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              Insights
            </h2>
            <p className="mt-1 text-[13px] text-slate-text">
              Tap an insight to jump to the matching calculator section.
            </p>
            <ul className="mt-4 space-y-3">
              {insights.map((item) => (
                <li key={item.title}>
                  <a
                    href={`#${item.targetId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      runInsightAction(item);
                    }}
                    className="group flex w-full items-start gap-3 rounded-2xl border border-outline-variant/12 bg-champagne/20 px-4 py-3 text-left transition-colors hover:border-rose-gold/35 hover:bg-champagne/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-gold-deep"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory text-rose-gold-deep shadow-sm">
                      <Icon name={item.icon} className="text-[18px]" />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink group-hover:text-rose-gold-deep">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-text">
                        {item.body}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-rose-gold-deep">
                        {item.actionLabel}
                        <Icon
                          name="arrow_forward"
                          className="text-[16px] transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              Next steps
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[14px] text-slate-text">
              <li>
                Compare 30-year, 15-year, and ARM scenarios with your buyer.
              </li>
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
                Your mortgage originator profile link will appear here once your
                team adds it in workspace settings.
              </p>
            )}
            <p className="mt-3 text-center text-[11px] text-taupe">
              Estimates only — not a lender quote. Adjust taxes, insurance, and
              HOA above for a fuller monthly picture.
            </p>
          </LuxuryCard>
        </div>
      </div>
    </div>
  );
}
