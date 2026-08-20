export type MortgageInputs = {
  homePrice: number;
  downPayment: number;
  interestRate: number;
  termYears: number;
  annualTax: number;
  annualInsurance: number;
  monthlyHoa: number;
  includePmi: boolean;
};

export type MortgageResult = {
  loanAmount: number;
  downPaymentPercent: number;
  monthlyPrincipalInterest: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyPmi: number;
  monthlyTotal: number;
  totalInterest: number;
  totalPaid: number;
};

function monthlyPayment(principal: number, annualRate: number, termYears: number) {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export function calculateMortgage(input: MortgageInputs): MortgageResult {
  const loanAmount = Math.max(0, input.homePrice - input.downPayment);
  const downPaymentPercent = input.homePrice > 0 ? (input.downPayment / input.homePrice) * 100 : 0;
  const monthlyPrincipalInterest = monthlyPayment(loanAmount, input.interestRate, input.termYears);
  const monthlyTax = input.annualTax / 12;
  const monthlyInsurance = input.annualInsurance / 12;
  const monthlyHoa = Math.max(0, input.monthlyHoa);
  const monthlyPmi =
    input.includePmi && downPaymentPercent < 20 && loanAmount > 0 ? (loanAmount * 0.006) / 12 : 0;
  const monthlyTotal =
    monthlyPrincipalInterest + monthlyTax + monthlyInsurance + monthlyHoa + monthlyPmi;
  const n = input.termYears * 12;
  const totalPaid = monthlyPrincipalInterest * n;
  const totalInterest = Math.max(0, totalPaid - loanAmount);

  return {
    loanAmount,
    downPaymentPercent,
    monthlyPrincipalInterest,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyPmi,
    monthlyTotal,
    totalInterest,
    totalPaid,
  };
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatUsdCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
