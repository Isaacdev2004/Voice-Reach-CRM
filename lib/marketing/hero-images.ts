/** Lifestyle banner art + legacy aliases for the public marketing site. */
export type HeroImageVariant = "banner" | "screenshot";

export type HeroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  variant: HeroImageVariant;
  /** CSS object-position when the frame crops the banner. */
  objectPosition?: string;
};

const BANNER_SIZE = { width: 2172, height: 724 } as const;

function lifestyleBanner(
  file: string,
  alt: string,
  objectPosition?: string,
): HeroImage {
  return {
    src: `/brand/heroes/${file}`,
    alt,
    ...BANNER_SIZE,
    variant: "banner",
    objectPosition,
  };
}

function productScreenshot(src: string, alt: string, width: number, height: number): HeroImage {
  return { src, alt, width, height, variant: "screenshot" };
}

/** Primary lifestyle heroes (MyARI brand art in `/public/brand/heroes/`). */
export const HERO_IMAGES = {
  dashboard: lifestyleBanner(
    "dashboard.jpg",
    "Sunlit luxury interior opening to a bright living space — MyARI home experience",
  ),
  campaigns: lifestyleBanner(
    "campaigns.jpg",
    "Aerial view of a luxury boat on clear water — meaningful outreach and campaigns",
    "22% center",
  ),
  mortgage: lifestyleBanner(
    "mortgage.jpg",
    "Modern home at dusk with warm interior light — mortgage planning",
  ),
  tasks: lifestyleBanner(
    "tasks.jpg",
    "Desk with laptop and city skyline at golden hour — tasks and productivity",
  ),
  calendar: lifestyleBanner(
    "calendar.jpg",
    "Sunlit terrace with ocean view — calendar and scheduling",
  ),
  calendarFaith: lifestyleBanner(
    "calendar-faith.jpg",
    "Golden-hour coastline — inspiration and purpose in every plan",
  ),
  voiceScripts: lifestyleBanner(
    "voice-scripts.jpg",
    "Sunlit room overlooking the city — voice scripts and conversations",
  ),
  notes: lifestyleBanner(
    "notes.jpg",
    "Flowing gold and cream fabric — notes and strategy",
  ),
  contacts: lifestyleBanner(
    "contacts.jpg",
    "Elegant terrace overlooking the sea — relationships and contacts",
  ),
  analytics: lifestyleBanner(
    "analytics.jpg",
    "Abstract analytics waves — insight and performance",
  ),

  /** @deprecated Use `dashboard` — kept for imports migrating to lifestyle art. */
  homeDashboard: lifestyleBanner(
    "dashboard.jpg",
    "Sunlit luxury interior — MyARI CRM for real estate agents",
  ),
  crmDashboard: lifestyleBanner(
    "contacts.jpg",
    "Real estate relationships and contacts in MyARI",
  ),
  followUpWorkflow: lifestyleBanner(
    "campaigns.jpg",
    "Campaign outreach across SMS, email, and voicemail",
    "22% center",
  ),
  leadReactivation: lifestyleBanner(
    "campaigns.jpg",
    "Re-engage dormant leads with structured campaigns",
    "22% center",
  ),
  leadReactivationDetail: lifestyleBanner(
    "campaigns.jpg",
    "Lead reactivation with segmentation and multi-channel touchpoints",
    "22% center",
  ),
  default: lifestyleBanner(
    "dashboard.jpg",
    "MyARI real estate CRM — contacts, campaigns, and follow-up",
  ),

  /** Product UI still used for demo poster / OG where a screenshot is required. */
  productScreenshot: productScreenshot(
    "/brand/ari-dashboard-hero.png",
    "ARI real estate CRM dashboard showing contacts, pipeline, and automated lead follow-up",
    1360,
    860,
  ),
} as const satisfies Record<string, HeroImage>;
