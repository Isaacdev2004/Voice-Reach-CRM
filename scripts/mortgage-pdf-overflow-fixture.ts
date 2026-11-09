import { sampleInput } from "./mortgage-pdf-sample";
/** Synthetic maximum-length business data; no customer records or external URLs. */
export function mortgageOverflowInput() {
  const input = structuredClone(sampleInput);
  input.branding.name = "Alexandra María Example-Cartagena "
    .repeat(6)
    .slice(0, 180);
  input.branding.brokerage = "Coastal Residential & Commercial Advisors "
    .repeat(5)
    .slice(0, 200);
  input.branding.email = "a".repeat(60) + "@" + "example.".repeat(20) + "test";
  input.branding.website =
    "https://example.test/" + "property-advisory/".repeat(20);
  input.branding.license = "LICENSE-" + "0123456789".repeat(25);
  input.context.address =
    "123 West Coastal Boulevard, Building B, Suite 404 — Apopka, FL 32703 "
      .repeat(7)
      .slice(0, 480);
  input.client!.first_name = "Taylor José ".repeat(12);
  input.client!.last_name = "O’Example ".repeat(12);
  input.context.loanType =
    "Conventional residential financing with buyer-selected terms";
  input.context.rateSource = "Illustrative source reference ".repeat(8);
  input.context.feeSource = "Illustrative fee source reference ".repeat(7);
  input.calculation.comparisons = input.calculation.comparisons.map(c => ({...c,label:(c.label + " — illustrative buyer-selected financing scenario ".repeat(3)).slice(0,100)}));
  input.context.assumptions =
    "Synthetic estimate only. Review actual lender terms before making a financing decision.";
  Object.assign(input.partners[0], {
    name: "Example Home Lending & Residential Advisory ".repeat(4),
    contact: "Jordan María O’Example, Licensed Mortgage Specialist ".repeat(5),
    email: "l".repeat(60) + "@" + "example.".repeat(20) + "test",
    phone: "+1 555-010-0456 ext. 12345",
    website: "https://example.test/" + "lender-information/".repeat(20),
    license: "SYNTHETIC-NMLS-" + "0123456789".repeat(35),
  });
  return input;
}
