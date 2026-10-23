/**
 * Public marketing site heroes — UI mockup PNGs only.
 * Dashboard tab art: `/brand/heroes/*.jpg` in `lib/dashboard/page-heroes.ts`.
 */
export type HeroImageVariant = "mockup";

export type HeroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  variant: HeroImageVariant;
  objectPosition?: string;
};

function mockup(
  src: string,
  alt: string,
  width = 1024,
  height = 768,
  objectPosition?: string,
): HeroImage {
  return { src, alt, width, height, variant: "mockup", objectPosition };
}

const MKT = "/brand/marketing";
const BRAND = "/brand";

export const HERO_IMAGES = {
  homeDashboard: mockup(
    `${MKT}/public-home-dashboard.png`,
    "MyARI dashboard home with contacts, campaigns, and marketing pulse",
  ),
  campaignLibrary: mockup(
    `${MKT}/public-campaign-library.png`,
    "MyARI campaign library with pinned folders and outreach cards",
  ),
  campaignBuilder: mockup(
    `${MKT}/public-campaign-builder.png`,
    "MyARI campaign builder with automation sequence and audience tools",
  ),
  voiceScripts: mockup(
    `${MKT}/public-voice-scripts.png`,
    "MyARI Voice Scripts Library with transcript and campaign linking",
  ),
  crmDashboard: mockup(
    `${BRAND}/hero-crm-dashboard.png`,
    "MyARI real estate CRM with portal leads and automated follow-up",
    1200,
    900,
  ),
  followUpWorkflow: mockup(
    `${BRAND}/hero-follow-up-workflow.png`,
    "Automated follow-up workflow across SMS, email, and voicemail",
    1200,
    900,
  ),
  leadReactivation: mockup(
    `${BRAND}/hero-lead-reactivation.png`,
    "Lead reactivation dashboard turning dormant leads into conversations",
    1200,
    900,
  ),
  leadReactivationDetail: mockup(
    `${BRAND}/hero-lead-reactivation-detail.png`,
    "Segmented lead reactivation with campaigns and booked appointments",
    1200,
    900,
  ),
  workspaceOverview: mockup(
    `${BRAND}/ari-dashboard-hero.png`,
    "MyARI workspace with pipeline, tasks, and AI assistant",
    1360,
    860,
  ),
  default: mockup(
    `${MKT}/public-home-dashboard.png`,
    "MyARI real estate CRM — contacts, campaigns, and follow-up",
  ),
  productScreenshot: mockup(
    `${BRAND}/ari-dashboard-hero.png`,
    "MyARI CRM product screenshot",
    1360,
    860,
  ),
} as const satisfies Record<string, HeroImage>;
