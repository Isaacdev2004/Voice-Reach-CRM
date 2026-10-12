import { calculateMortgage, type MortgageResult } from "./calculate";

export type ScenarioId = "30-fixed" | "15-fixed" | "arm-51";

export type RateSnapshot = {
  rate30: number;
  rate15: number;
  arm51: number;
  arm71: number;
};

export function buildRateSnapshot(freddie30: number, freddie15: number): RateSnapshot {
  return {
    rate30: freddie30,
    rate15: freddie15,
    arm51: Math.max(0.1, freddie30 - 0.45),
    arm71: Math.max(0.1, freddie30 - 0.55),
  };
}

export function scenarioMeta(id: ScenarioId, rates: RateSnapshot) {
  switch (id) {
    case "15-fixed":
      return { label: "15-year fixed", termYears: 15, rate: rates.rate15, popular: false };
    case "arm-51":
      return { label: "5/1 ARM", termYears: 30, rate: rates.arm51, popular: false };
    default:
      return { label: "30-year fixed", termYears: 30, rate: rates.rate30, popular: true };
  }
}

export function scenarioResult(
  id: ScenarioId,
  rates: RateSnapshot,
  homePrice: number,
  downPayment: number,
): MortgageResult & { rate: number; termYears: number; label: string } {
  const meta = scenarioMeta(id, rates);
  const result = calculateMortgage({
    homePrice,
    downPayment,
    interestRate: meta.rate,
    termYears: meta.termYears,
    annualTax: 0,
    annualInsurance: 0,
    monthlyHoa: 0,
    includePmi: false,
  });
  return { ...result, rate: meta.rate, termYears: meta.termYears, label: meta.label };
}

export function firstMonthSplit(loanAmount: number, annualRate: number, monthlyPi: number) {
  const interest = loanAmount * (annualRate / 100 / 12);
  const principal = Math.max(0, monthlyPi - interest);
  const total = principal + interest || 1;
  return {
    principal,
    interest,
    principalPct: (principal / total) * 100,
    interestPct: (interest / total) * 100,
  };
}
