/** External profile or booking page for your mortgage originator partner. */
export function getMortgagePartnerUrl(): string | null {
  const raw =
    typeof process.env.NEXT_PUBLIC_MORTGAGE_PARTNER_URL === "string"
      ? process.env.NEXT_PUBLIC_MORTGAGE_PARTNER_URL.trim()
      : "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return null;
}

export function getMortgagePartnerLabel(): string {
  const raw =
    typeof process.env.NEXT_PUBLIC_MORTGAGE_PARTNER_LABEL === "string"
      ? process.env.NEXT_PUBLIC_MORTGAGE_PARTNER_LABEL.trim()
      : "";
  return raw || "Talk to a mortgage expert";
}

export type MortgageResourceLink = {
  title: string;
  description: string;
  href: string;
};

/** Mortgage-specific reading & market updates (opens in new tab). */
export const MORTGAGE_RESOURCE_LINKS: MortgageResourceLink[] = [
  {
    title: "Freddie Mac PMMS (weekly benchmarks)",
    description: "Official Primary Mortgage Market Survey averages and publication calendar.",
    href: "https://www.freddiemac.com/pmms",
  },
  {
    title: "Fannie Mae economic & housing forecast",
    description: "Monthly outlook and research—forecasts, not current lender quotes.",
    href: "https://www.fanniemae.com/data-and-insights/forecast",
  },
  {
    title: "CFPB — Owning a Home",
    description: "Plain-language guides on loan types, closing, and shopping for a mortgage.",
    href: "https://www.consumerfinance.gov/owning-a-home/",
  },
  {
    title: "ARI resource library",
    description: "Follow-up playbooks and agent guides from MyARI.",
    href: "/resources",
  },
];

export type MortgageEscrowInputs = {
  annualTax: number;
  annualInsurance: number;
  monthlyHoa: number;
};
