import {
  CalculationSchema,
  calculate,
  cents,
  usd,
  type Calculation,
} from "./calculators";
import { ContextSchema, type Partner, type ReportContext } from "./schemas";
import {
  MortgagePdfPreferencesSchema,
  type MortgagePdfPreferences,
} from "./pdf-preferences";
import type { Branding, Client } from "./reports";
import { calculateMortgage } from "@/lib/mortgage/calculate";
export type MortgageCalculation = Extract<Calculation, { kind: "mortgage" }>;
export type MortgagePdfInput = {
  calculation: MortgageCalculation;
  context: ReportContext;
  branding: Branding;
  partners: Partner[];
  client?: Client;
  preferences?: MortgagePdfPreferences;
  illustrative?: boolean;
};
export function mortgagePdfModel(input: MortgagePdfInput) {
  const x = CalculationSchema.parse(input.calculation);
  if (x.kind !== "mortgage") throw Error("Choose a mortgage estimate.");
  const context = ContextSchema.parse(input.context),
    preferences = MortgagePdfPreferencesSchema.parse(
      input.preferences ?? input.branding.pdfPreferences ?? {},
    ),
    r = calculate(x),
    m = calculateMortgage(x);
  if (x.comparisons.length > 3)
    throw Error(
      "The two-page presentation supports up to three comparisons. Select three products before exporting.",
    );
  if (
    [
      context.assumptions,
      context.disclosures,
      input.branding.disclosures ?? "",
    ].join(" ").length > 650
  )
    throw Error(
      "Shorten custom assumptions and disclosures to 650 characters combined for the standard two-page report. Your saved text is unchanged.",
    );
  if (
    ![r.total, m.loanAmount, ...r.lines.map((l) => l.amount)].every(
      Number.isFinite,
    )
  )
    throw Error(
      "The calculator could not produce finite amounts for these inputs. Review the rate and loan assumptions before exporting.",
    );
  const rows = r.lines.map((row, i) => ({
    ...row,
    label: [
      "Principal & interest",
      "Property taxes",
      "Homeowners insurance",
      "HOA dues",
      "Mortgage insurance",
    ][i],
    color: ["bronze", "green", "sand", "clay", "sage"][i],
  }));
  const rounding = cents(r.total - rows.reduce((a, b) => a + b.amount, 0));
  const warnings: string[] = [];
  if (x.annualInsurance === 0)
    warnings.push(
      "Insurance not provided: the total excludes this cost. Verify before relying on this estimate.",
    );
  else if (x.annualInsurance < 300)
    warnings.push(
      "Insurance is below $25/month. Review the entered estimate with your insurer.",
    );
  if (x.annualTax === 0)
    warnings.push(
      "Taxes entered as $0. Verify local property taxes; the displayed total excludes unprovided taxes.",
    );
  const comparisons = x.comparisons.map((c) => {
    const result = calculate({
      ...x,
      interestRate: c.rate,
      termYears: c.termYears,
      comparisons: [],
    });
    const arm = /\barm\b|adjustable/i.test(c.label);
    return {
      ...c,
      arm,
      pi: result.lines[0].amount,
      total: result.total,
      benefit: arm
        ? "Initial-rate payment illustration."
        : c.termYears <= 15
          ? "Shorter payoff; usually less total interest."
          : "Level principal-and-interest schedule.",
      consideration: arm
        ? "Rate and payment may change after year 5. Future resets are not modeled."
        : c.termYears <= 15
          ? "Higher monthly payment than a longer term at the same rate."
          : "Longer repayment can increase total interest.",
    };
  });
  const feeSum = cents(x.fees.reduce((a, f) => a + f.amount, 0)),
    closing = context.closingCosts;
  const cash =
    closing !== null && context.prepaids !== null && context.reserves !== null
      ? cents(x.downPayment + closing + context.prepaids + context.reserves)
      : null;
  const lender = input.partners.find(
    (p) => p.kind === "lender" && p.id === context.lenderId,
  );
  return {
    input: { ...input, context, preferences },
    calculation: x,
    result: r,
    mortgage: m,
    rows,
    rounding,
    warnings,
    comparisons,
    closing,
    itemizedFees: x.fees.length ? feeSum : null,
    feeSource: x.fees.length
      ? x.fees
          .map(
            (f) =>
              `${f.label}: ${f.source}; ${f.reference || "reference Not Provided"}; ${f.effectiveDate || "date Not Provided"}`,
          )
          .join(" | ")
      : context.feeSource ||
        "Subscriber-entered assumptions; not a lender fee quote",
    feeDate: context.feeAsOf || "Not Provided",
    cash,
    lender,
    preferences,
    buyer: input.client
      ? [input.client.first_name, input.client.last_name]
          .filter(Boolean)
          .join(" ")
      : "Not Provided",
    address: context.address || "Property Not Provided",
    loanType: context.loanType || "Not Provided",
    rateSource:
      context.rateSource || "Calculator assumption; lender source Not Provided",
    rateDate: context.rateAsOf || "Not Provided",
    money: (n: number | null) => (n === null ? "Not Provided" : usd(n)),
  };
}
export type MortgagePdfModel = ReturnType<typeof mortgagePdfModel>;
