/**
 * Public subscriber brand profiles for hosted business + SMS consent pages.
 * Used as the A2P brand website URL when the agent has no personal site.
 * Do not put EIN or street address on these public pages.
 */

export type SubscriberBrand = {
  slug: string;
  legalName: string;
  displayName: string;
  agentName: string;
  cityState: string;
  phoneDisplay: string;
  phoneTel: string;
  email: string;
  summary: string;
  sampleMessages: string[];
  lastUpdated: string;
};

export const SUBSCRIBER_BRANDS: Record<string, SubscriberBrand> = {
  "the-real-agent-jenn": {
    slug: "the-real-agent-jenn",
    legalName: "THE REAL AGENT JENN CONSULTING INC",
    displayName: "The Real Agent Jenn Consulting",
    agentName: "Jennifer Adams",
    cityState: "Longwood, FL",
    phoneDisplay: "(407) 791-3149",
    phoneTel: "+14077913149",
    email: "realagentjenn@gmail.com",
    summary:
      "Florida real estate consulting and relationship follow-up for buyers and sellers. SMS is used only for appointment reminders, listing or home-search updates, and service follow-ups after prior express consent.",
    sampleMessages: [
      "Hi FirstName, this is Jennifer with The Real Agent Jenn Consulting. Quick update on your home search. Reply STOP to opt out. Reply HELP for help.",
      "Hi FirstName, Jennifer here from The Real Agent Jenn Consulting — confirming your appointment. Reply STOP to opt out. Reply HELP for help.",
      "Hi FirstName, Jennifer with The Real Agent Jenn Consulting. Following up on the listings we discussed. Reply STOP to opt out. Reply HELP for help.",
    ],
    lastUpdated: "November 24, 2026",
  },
};

export const SUBSCRIBER_BRAND_SLUGS = Object.keys(SUBSCRIBER_BRANDS) as Array<
  keyof typeof SUBSCRIBER_BRANDS
>;

export function getSubscriberBrand(slug: string): SubscriberBrand | undefined {
  return SUBSCRIBER_BRANDS[slug];
}

export function subscriberBrandPath(slug: string): string {
  return `/b/${slug}`;
}

/** Public paths for sitemap / indexability (extend when adding brands). */
export const SUBSCRIBER_BRAND_PATHS = ["/b/the-real-agent-jenn"] as const;
