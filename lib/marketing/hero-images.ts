/**
 * Public product imagery — real application captures with synthetic demonstration records.
 * Dashboard tab art: `/brand/heroes/*.jpg` in `lib/dashboard/page-heroes.ts`.
 */
export type HeroImageVariant = "capture";

export type HeroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  variant: HeroImageVariant;
  objectPosition?: string;
};

const CAPTURE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "/brand/product-captures/dashboard.webp": {
    width: 1440,
    height: 1580,
  },
  "/brand/product-captures/contacts.webp": {
    width: 1440,
    height: 1086,
  },
  "/brand/product-captures/campaigns.webp": {
    width: 1440,
    height: 1086,
  },
  "/brand/product-captures/sequence.webp": {
    width: 1440,
    height: 1086,
  },
  "/brand/product-captures/voice.webp": {
    width: 1440,
    height: 1947,
  },
  "/brand/product-captures/calendar.webp": {
    width: 1440,
    height: 1050,
  },
};

function capture(
  src: string,
  alt: string,
  width = 1440,
  height = 1100,
  objectPosition?: string,
): HeroImage {
  return {
    src,
    alt,
    ...(CAPTURE_DIMENSIONS[src] ?? { width, height }),
    variant: "capture",
    objectPosition,
  };
}

const MKT = "/brand/product-captures";
const BRAND = MKT;

export const HERO_IMAGES = {
  homeDashboard: capture(
    `${MKT}/dashboard.webp`,
    "MyARI dashboard home with contacts, campaigns, and marketing pulse",
  ),
  campaignLibrary: capture(
    `${MKT}/campaigns.webp`,
    "MyARI campaign library with pinned folders and outreach cards",
  ),
  campaignBuilder: capture(
    `${MKT}/sequence.webp`,
    "MyARI campaign builder with automation sequence and audience tools",
  ),
  voiceScripts: capture(
    `${MKT}/voice.webp`,
    "MyARI Voice Scripts Library with transcript and campaign linking",
  ),
  crmDashboard: capture(
    `${BRAND}/contacts.webp`,
    "MyARI real estate CRM Contacts with synthetic demo records",
    1200,
    900,
  ),
  followUpWorkflow: capture(
    `${BRAND}/sequence.webp`,
    "Automated follow-up workflow across SMS, email, and voicemail",
    1200,
    900,
  ),
  leadReactivation: capture(
    `${BRAND}/campaigns.webp`,
    "Campaign library captured with synthetic demonstration records",
    1200,
    900,
  ),
  leadReactivationDetail: capture(
    `${BRAND}/contacts.webp`,
    "Contact workspace captured with synthetic demonstration records",
    1200,
    900,
  ),
  workspaceOverview: capture(
    `${BRAND}/dashboard.webp`,
    "MyARI workspace with pipeline, tasks, and AI assistant",
    1360,
    860,
  ),
  default: capture(
    `${MKT}/dashboard.webp`,
    "MyARI real estate CRM — contacts, campaigns, and follow-up",
  ),
  productScreenshot: capture(
    `${BRAND}/dashboard.webp`,
    "Actual MyARI Dashboard with synthetic demo records",
    1360,
    860,
  ),
} as const satisfies Record<string, HeroImage>;
