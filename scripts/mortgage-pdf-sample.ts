import fs from "node:fs/promises";
import {
  generateMortgagePdf,
  type MortgagePdfAssets,
} from "../lib/financing/mortgage-pdf";
import { ContextSchema, PartnerSchema } from "../lib/financing/schemas";
import type { MortgagePdfInput } from "../lib/financing/mortgage-pdf-model";
export const sampleInput: MortgagePdfInput = {
  calculation: {
    kind: "mortgage" as const,
    homePrice: 450000,
    downPayment: 90000,
    interestRate: 6.25,
    termYears: 30,
    annualTax: 4800,
    annualInsurance: 1800,
    monthlyHoa: 0,
    includePmi: false,
    fees: [],
    comparisons: [
      { label: "30-Year Fixed", rate: 6.25, termYears: 30 },
      { label: "15-Year Fixed", rate: 5.75, termYears: 15 },
      { label: "5/1 ARM", rate: 6, termYears: 30 },
    ],
  },
  context: ContextSchema.parse({
    address: "123 Example Lane · Illustrative property",
    preparedDate: "2026-10-30",
    loanType: "Conventional (illustrative)",
    lenderId: "00000000-0000-4000-8000-000000000090",
    closingCosts: 6500,
    prepaids: 1800,
    reserves: 1200,
    rateSource: "Illustrative assumptions only; not lender rates",
    rateAsOf: "2026-10-30",
  }),
  branding: {
    name: "Alex Example",
    brokerage: "Example Coastal Realty",
    jobTitle: "Real estate professional",
    phone: "+1 555-010-0123",
    email: "agent@example.test",
    website: "https://example.test",
    headshot: "",
    license: "Illustrative only",
  },
  partners: [
    {
      ...PartnerSchema.parse({
        id: "00000000-0000-4000-8000-000000000090",
        kind: "lender",
        name: "Example Home Lending",
        contact: "Jordan Example",
        phone: "+1 555-010-0456",
        email: "lender@example.test",
        website: "https://example.test",
        license: "Illustrative — no real NMLS",
        brandingAuthorized: true,
      }),
      id: "00000000-0000-4000-8000-000000000090",
    },
  ],
  client: {
    id: "00000000-0000-4000-8000-000000000001",
    first_name: "Taylor",
    last_name: "Example",
  },
  preferences: { template: "cobranded" as const, imagery: true },
  illustrative: true,
};
export async function pdfAssets() {
  const get = (name: string) => fs.readFile("public/brand/pdf/" + name);
  return {
    serif: await get("serif-400.ttf"),
    serifBold: await get("serif-600.ttf"),
    sans: await get("sans-400.ttf"),
    sansBold: await get("sans-600.ttf"),
    logo: await fs.readFile("public/brand/myari-logo.png"),
    architecture: await get("financing-architecture.jpg"),
  } as MortgagePdfAssets;
}
async function main() {
  await fs.writeFile(
    "docs/mortgage-pdf-2/myari-illustrative-mortgage.pdf",
    await generateMortgagePdf(sampleInput, await pdfAssets()),
  );
  console.log("Generated illustrative two-page mortgage PDF.");
}
if (process.argv.includes("--generate"))
  void main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
