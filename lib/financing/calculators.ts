import { z } from "zod";
import { calculateMortgage } from "@/lib/mortgage/calculate";

const money = z.number().finite().min(0).max(1e12);
const percent = z.number().finite().min(0).max(100);
export const FeeSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    amount: money,
    source: z.enum(["subscriber", "estimate", "government", "provider"]),
    reference: z.string().trim().max(500).default(""),
    effectiveDate: z.string().max(30).default(""),
  })
  .superRefine((fee, ctx) => {
    if (
      (fee.source === "government" || fee.source === "provider") &&
      (!fee.reference || !fee.effectiveDate)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "A source reference and effective date are required for sourced fees.",
      });
  });
const fees = z.array(FeeSchema).max(40);
const seller = z.object({
  price: money.positive(),
  payoff: money,
  commissionPercent: percent,
  commissionFlat: money,
  credits: money,
  adjustments: z.number().finite().min(-1e12).max(1e12),
  fees,
});
export const CalculationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("mortgage"),
      homePrice: money.positive(),
      downPayment: money,
      interestRate: percent,
      termYears: z.number().int().min(1).max(50),
      annualTax: money,
      annualInsurance: money,
      monthlyHoa: money,
      includePmi: z.boolean(),
      comparisons: z
        .array(
          z.object({
            label: z.string().max(100),
            rate: percent,
            termYears: z.number().int().min(1).max(50),
          }),
        )
        .max(5)
        .default([]),
      fees,
    })
    .refine(
      (x) => x.downPayment <= x.homePrice,
      "Down payment cannot exceed price.",
    ),
  seller.extend({ kind: z.literal("seller") }),
  seller
    .omit({ price: true })
    .extend({ kind: z.literal("seller-to-net"), targetNet: money })
    .refine(
      (x) => x.commissionPercent < 100,
      "Compensation must be below 100% for a reverse calculation.",
    ),
  z
    .object({
      kind: z.literal("buyer"),
      price: money.positive(),
      downPayment: money,
      deposit: money,
      credits: money,
      fees,
    })
    .refine(
      (x) => x.downPayment <= x.price,
      "Down payment cannot exceed price.",
    ),
  z.object({
    kind: z.literal("offers"),
    offers: z
      .array(
        seller.extend({
          label: z.string().trim().min(1).max(100),
          financing: z.string().max(200),
          closingDate: z.string().max(30),
          contingencies: z.string().max(1000),
        }),
      )
      .min(1)
      .max(5),
  }),
  z.object({
    kind: z.literal("refinance"),
    balance: money.positive(),
    currentRate: percent,
    proposedRate: percent,
    remainingMonths: z.number().int().min(1).max(600),
    newMonths: z.number().int().min(1).max(600),
    cashOut: money,
    financeCosts: z.boolean(),
    fees,
  }),
  z.object({ kind: z.literal("fees"), fees: fees.min(1) }),
]);
export type Calculation = z.infer<typeof CalculationSchema>;
export type Fee = z.infer<typeof FeeSchema>;
export type Result = {
  title: string;
  lines: { label: string; amount: number }[];
  totalLabel: string;
  total: number;
  details: { label: string; value: string }[];
  offers?: {
    label: string;
    net: number;
    financing: string;
    closingDate: string;
    contingencies: string;
  }[];
};
export const cents = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const sumFees = (items: Fee[]) =>
  cents(items.reduce((s, f) => s + cents(f.amount), 0));
function sellerResult(x: z.infer<typeof seller>): Result {
  const compensation = cents(
    cents((x.price * x.commissionPercent) / 100) + x.commissionFlat,
  );
  const lines = [
    { label: "Sale price", amount: cents(x.price) },
    { label: "Loan payoff", amount: -cents(x.payoff) },
    {
      label: `Broker compensation (${x.commissionPercent}% + ${usd(x.commissionFlat)})`,
      amount: -compensation,
    },
    ...x.fees.map((f) => ({ label: f.label, amount: -cents(f.amount) })),
    { label: "Seller credits", amount: -cents(x.credits) },
    { label: "Prorations / net adjustments", amount: cents(x.adjustments) },
  ];
  return {
    title: "Seller Net Sheet",
    lines,
    totalLabel: "Estimated net proceeds",
    total: cents(lines.reduce((s, l) => s + l.amount, 0)),
    details: [
      {
        label: "Closing costs (excluding payoff)",
        value: usd(cents(compensation + sumFees(x.fees) + x.credits)),
      },
    ],
  };
}
export function payment(balance: number, rate: number, months: number) {
  const r = rate / 1200;
  return r === 0
    ? balance / months
    : (balance * r) / -Math.expm1(-months * Math.log1p(r));
}
export function calculate(raw: unknown): Result {
  const x = CalculationSchema.parse(raw);
  if (x.kind === "mortgage") {
    const m = calculateMortgage(x);
    return {
      title: "Mortgage Payment Estimate",
      lines: [
        {
          label: "Principal & interest",
          amount: cents(m.monthlyPrincipalInterest),
        },
        { label: "Property taxes (monthly)", amount: cents(m.monthlyTax) },
        {
          label: "Home insurance (monthly)",
          amount: cents(m.monthlyInsurance),
        },
        { label: "HOA (monthly)", amount: cents(m.monthlyHoa) },
        { label: "PMI estimate (0.6% annually)", amount: cents(m.monthlyPmi) },
      ],
      totalLabel: "Estimated monthly payment",
      total: cents(m.monthlyTotal),
      details: [
        {
          label: "Assumed annual rate",
          value: `${x.interestRate}% (not APR or a rate quote)`,
        },
        { label: "Term", value: `${x.termYears} years` },
        { label: "Loan amount", value: usd(m.loanAmount) },
        { label: "Total interest", value: usd(m.totalInterest) },
        ...x.comparisons.map((c) => {
          const compared = calculateMortgage({
            ...x,
            interestRate: c.rate,
            termYears: c.termYears,
          });
          return {
            label: `Comparison: ${c.label} (${c.rate}%, ${c.termYears} years)`,
            value: `${usd(compared.monthlyTotal)} monthly; ${usd(compared.totalInterest)} interest assuming a fixed initial rate. Illustrative unless benchmark explicitly applied.`,
          };
        }),
        {
          label: "Assumption",
          value:
            "Fixed-rate amortization. ARM comparisons show initial-rate payments only and do not model future resets. PMI is an estimate; verify with lender.",
        },
      ],
    };
  }
  if (x.kind === "seller") return sellerResult(x);
  if (x.kind === "seller-to-net") {
    const needed =
      (x.targetNet +
        x.payoff +
        x.commissionFlat +
        sumFees(x.fees) +
        x.credits -
        x.adjustments) /
      (1 - x.commissionPercent / 100);
    if (needed <= 0)
      throw new Error(
        "These assumptions do not require a positive sale price. Review the adjustments.",
      );
    let price = Math.ceil(needed * 100) / 100;
    // Round up to the first cent that reaches the target after item-level rounding.
    for (
      let tries = 0;
      sellerResult({ ...x, price }).total < x.targetNet && tries < 100;
      tries++
    )
      price = cents(price + 0.01);
    if (
      !Number.isFinite(price) ||
      price > 1e12 ||
      sellerResult({ ...x, price }).total < x.targetNet
    )
      throw new Error("Target exceeds supported calculation limits.");
    const r = sellerResult({ ...x, price });
    return {
      ...r,
      title: "Seller to Net",
      totalLabel: "Required sale price (fixed entered fees)",
      total: price,
      details: [
        { label: "Target net", value: usd(x.targetNet) },
        { label: "Resulting net", value: usd(r.total) },
        {
          label: "Assumption",
          value:
            "Fees are fixed at entered amounts. Recalculate price-dependent taxes/title fees at the resulting price.",
        },
      ],
    };
  }
  if (x.kind === "buyer") {
    const lines = [
      { label: "Down payment", amount: cents(x.downPayment) },
      ...x.fees.map((f) => ({ label: f.label, amount: cents(f.amount) })),
      { label: "Earnest money already paid", amount: -cents(x.deposit) },
      { label: "Lender / seller credits", amount: -cents(x.credits) },
    ];
    return {
      title: "Buyer Closing Cost Estimate",
      lines,
      totalLabel: "Estimated cash to close",
      total: cents(lines.reduce((s, l) => s + l.amount, 0)),
      details: [
        { label: "Loan amount", value: usd(cents(x.price - x.downPayment)) },
        {
          label: "Credits",
          value:
            "Eligibility and excess credits require lender/title review; a negative total is a surplus estimate, not a guaranteed refund.",
        },
      ],
    };
  }
  if (x.kind === "offers") {
    const offers = x.offers.map((o) => ({ ...o, net: sellerResult(o).total }));
    return {
      title: "Multiple-Offer Comparison",
      lines: offers.map((o) => ({ label: o.label, amount: o.net })),
      totalLabel: "Highest estimated net (not an offer recommendation)",
      total: Math.max(...offers.map((o) => o.net)),
      details: [],
      offers,
    };
  }
  if (x.kind === "fees")
    return {
      title: "Closing Fee Estimate",
      lines: x.fees.map((f) => ({ label: f.label, amount: cents(f.amount) })),
      totalLabel: "Total entered fees",
      total: sumFees(x.fees),
      details: [],
    };
  const costs = sumFees(x.fees),
    principal = cents(x.balance + x.cashOut + (x.financeCosts ? costs : 0));
  const current = cents(payment(x.balance, x.currentRate, x.remainingMonths));
  const proposed = cents(payment(principal, x.proposedRate, x.newMonths));
  const savings = cents(current - proposed);
  const breakeven = savings > 0 ? Math.ceil(costs / savings) : null;
  return {
    title: "Refinance Summary",
    lines: [
      { label: "Current monthly principal & interest", amount: current },
      { label: "Proposed monthly principal & interest", amount: proposed },
      { label: "Monthly payment difference", amount: savings },
      { label: "Closing costs", amount: costs },
      { label: "Proposed principal", amount: principal },
    ],
    totalLabel: "Proposed monthly principal & interest",
    total: proposed,
    details: [
      {
        label: "Simple payment break-even",
        value:
          breakeven === null
            ? "No break-even from payment savings"
            : `${breakeven} months${breakeven > x.newMonths ? " (beyond proposed term)" : ""}`,
      },
      {
        label: "Costs paid at closing",
        value: usd(x.financeCosts ? 0 : costs),
      },
      {
        label: "Current remaining interest",
        value: usd(
          cents(
            payment(x.balance, x.currentRate, x.remainingMonths) *
              x.remainingMonths -
              x.balance,
          ),
        ),
      },
      {
        label: "Proposed total interest",
        value: usd(
          cents(
            payment(principal, x.proposedRate, x.newMonths) * x.newMonths -
              principal,
          ),
        ),
      },
      {
        label: "Assumption",
        value:
          "Payment comparison excludes escrow/PMI. Simple break-even is not an economic or APR analysis; cash-out and a longer term can increase total cost.",
      },
    ],
  };
}
export const DISCLOSURE =
  "Estimate only, not a Loan Estimate, Closing Disclosure, rate lock, loan approval, tax advice, or guaranteed quote. Rates and fees may change. Broker compensation is negotiable and transaction-specific. Verify prorations, local taxes, insurance, credit limits, and title charges with your lender/title provider. Partners are optional; no affiliation or endorsement is implied.";
