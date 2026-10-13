export type DashboardPageHeroAction = {
  label: string;
  href: string;
  icon: string;
  primary?: boolean;
};

export type DashboardPageHeroFeature = {
  icon: string;
  title: string;
  subtitle: string;
};

/** Client art is mostly ultra-wide strips — show full frame, not tall crops. */
export type HeroImageLayout = "banner" | "photo";

export type DashboardPageHeroConfig = {
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageLayout?: HeroImageLayout;
  eyebrow: string;
  title: string;
  subtitle?: string;
  quote?: string;
  attribution?: string;
  scriptAccent?: string;
  brandQuote?: string;
  imageAlt: string;
  titleMode?: "fixed" | "dashboardHome" | "calendarGreeting";
  actions?: DashboardPageHeroAction[];
  features?: DashboardPageHeroFeature[];
  editorialQuote?: boolean;
  /** CSS object-position when banner is cover-cropped in the frame (e.g. boat on left). */
  imageObjectPosition?: string;
  /** Full-width image strip; copy lives in the page body (Tasks). */
  heroLayout?: "split" | "banner";
  /** Hand script on the photo, not in the copy column. */
  scriptAccentOnImage?: boolean;
  /** MyARI quote card on the photo (Dashboard home). */
  brandQuoteOnImage?: boolean;
  /** Large faith / editorial quote as the main left column (Calendar inspiration). */
  editorialQuoteOnCopy?: boolean;
};

/** Matches resized client art in `public/brand/heroes/` (Oct 2026). */
const BANNER_2172 = { w: 2172, h: 724 } as const;

/** One filename per sidebar tab — lifestyle photos only (never full UI mockups). Property Finder hero: `lib/property-finder/assets.ts`. */
const HERO_FILES: Record<
  string,
  { w: number; h: number; layout?: HeroImageLayout }
> = {
  "dashboard.jpg": BANNER_2172,
  "contacts.jpg": BANNER_2172,
  "properties.jpg": BANNER_2172,
  "campaigns.jpg": BANNER_2172,
  "calendar.jpg": BANNER_2172,
  "calendar-faith.jpg": BANNER_2172,
  "mortgage.jpg": BANNER_2172,
  "notes.jpg": BANNER_2172,
  "tasks.jpg": BANNER_2172,
  "voice-scripts.jpg": BANNER_2172,
  "activity.jpg": BANNER_2172,
  "analytics.jpg": BANNER_2172,
  "settings.jpg": BANNER_2172,
};

function hero(file: string): Pick<
  DashboardPageHeroConfig,
  "image" | "imageWidth" | "imageHeight" | "imageLayout"
> {
  const meta = HERO_FILES[file] ?? BANNER_2172;
  return {
    image: `/brand/heroes/${file}`,
    imageWidth: meta.w,
    imageHeight: meta.h,
    imageLayout: meta.layout ?? "banner",
  };
}

export const DASHBOARD_PAGE_HEROES: Record<string, DashboardPageHeroConfig> = {
  "/dashboard": {
    ...hero("dashboard.jpg"),
    eyebrow: "Home",
    title: "Let's make today exceptional.",
    titleMode: "dashboardHome",
    subtitle:
      "Nurture your leads, stay top of mind, and create more opportunities with AI-driven outreach.",
    brandQuote: "More conversations. More opportunities.",
    brandQuoteOnImage: true,
    imageAlt: "Sunlit interior with arched doorway",
    imageObjectPosition: "50% center",
    actions: [
      {
        label: "Create a campaign",
        href: "/dashboard/campaigns#campaign-builder",
        icon: "rocket_launch",
        primary: true,
      },
      { label: "View agenda", href: "/dashboard/calendar", icon: "calendar_today" },
    ],
  },
  "/dashboard/contacts": {
    ...hero("contacts.jpg"),
    eyebrow: "Contacts",
    title: "Relationships that open doors",
    subtitle: "Every contact, conversation, consent record, and next step in one place.",
    brandQuote: "People first. Always.",
    imageAlt: "Elegant terrace overlooking the sea",
    imageObjectPosition: "68% center",
  },
  "/dashboard/campaigns": {
    ...hero("campaigns.jpg"),
    eyebrow: "Campaigns",
    title: "Meaningful outreach. Real relationships.",
    subtitle: "Launch sequences, engage consistently, and open more doors.",
    scriptAccent: "People over numbers. Always.",
    scriptAccentOnImage: true,
    brandQuote: "Every touchpoint builds trust.",
    imageAlt: "Ocean from above with luxury boat",
    imageObjectPosition: "22% center",
  },
  "/dashboard/mortgage": {
    ...hero("mortgage.jpg"),
    eyebrow: "Planning",
    title: "Mortgage Calculator",
    subtitle: "Estimate monthly payments with today's average rates, refreshed daily.",
    scriptAccent: "Home Opens More",
    scriptAccentOnImage: true,
    imageAlt: "Insightful planning and rates motif",
    imageObjectPosition: "18% center",
    features: [
      { icon: "percent", title: "Live rate data", subtitle: "Updated daily" },
      { icon: "bar_chart", title: "Compare scenarios", subtitle: "See your options" },
      { icon: "home", title: "Plan with confidence", subtitle: "Informed decisions" },
    ],
  },
  "/dashboard/notes": {
    ...hero("notes.jpg"),
    eyebrow: "Thinking",
    title: "Notes & Strategy",
    subtitle:
      "Capture ideas, plan strategy, and keep client context — all in one place.",
    scriptAccent: "Ideas Create Opportunities",
    scriptAccentOnImage: true,
    imageAlt: "Flowing gold and cream fabric texture",
    imageObjectPosition: "50% center",
  },
  "/dashboard/tasks": {
    ...hero("tasks.jpg"),
    eyebrow: "Tasks",
    title: "Follow-ups & to-dos",
    scriptAccent: "Productivity creates space for purpose.",
    scriptAccentOnImage: true,
    heroLayout: "banner",
    imageAlt: "Desk with laptop and city view at golden hour",
    imageObjectPosition: "32% center",
  },
  "/dashboard/voice-scripts": {
    ...hero("voice-scripts.jpg"),
    eyebrow: "Voice script studio",
    title: "Voice Scripts Library",
    subtitle:
      "Create, manage, and organize your voice scripts. Turn conversations into opportunities.",
    scriptAccent: "Every conversation can open a door.",
    scriptAccentOnImage: true,
    imageAlt: "Open water and horizon for voice outreach",
    imageObjectPosition: "78% center",
  },
  "/dashboard/activity": {
    ...hero("activity.jpg"),
    eyebrow: "Activity",
    title: "Every action moves you forward",
    subtitle:
      "A real-time view of outreach, compliance, and engagement—all in one place.",
    brandQuote: "Clarity in every log.",
    imageAlt: "Coastal olive branch at golden hour",
    imageObjectPosition: "55% center",
  },
  "/dashboard/analytics": {
    ...hero("analytics.jpg"),
    eyebrow: "Analytics",
    title: "Insight creates opportunity",
    subtitle:
      "Track delivery, engagement, and campaign performance—then refine what works.",
    brandQuote: "Data with direction.",
    imageAlt: "Analytics waves and chart motif",
    imageObjectPosition: "50% center",
  },
  "/dashboard/settings": {
    ...hero("settings.jpg"),
    eyebrow: "Settings",
    title: "Your workspace, your way",
    subtitle: "Profile, billing, integrations, and team access in one place.",
    brandQuote: "Built for how you work.",
    imageAlt: "Calm workspace configuration mood",
    imageObjectPosition: "28% center",
  },
};

export const CALENDAR_HERO_STORAGE_KEY = "myari-calendar-hero-variant";

export type CalendarHeroVariant = "schedule" | "faith";

export const CALENDAR_HERO_VARIANTS: Record<
  CalendarHeroVariant,
  DashboardPageHeroConfig
> = {
  schedule: {
    ...hero("calendar.jpg"),
    eyebrow: "Calendar",
    title: "Your schedule, beautifully organized.",
    titleMode: "calendarGreeting",
    subtitle: "Stay on top of your schedule, client meetings, and follow-ups.",
    brandQuote: "Purpose in every plan.",
    imageAlt: "Schedule and planning visual",
    imageObjectPosition: "82% center",
  },
  faith: {
    ...hero("calendar-faith.jpg"),
    eyebrow: "Calendar",
    title: "Purpose in Every Plan",
    quote:
      "God knows the plans He has for you—plans for peace, hope, and a beautiful future.",
    attribution: "Jeremiah 29:11",
    editorialQuoteOnCopy: true,
    imageAlt: "Warm inspirational texture",
    imageObjectPosition: "62% center",
  },
};

export function normalizeDashboardPath(pathname: string): string {
  if (!pathname) return "/dashboard";
  const trimmed = pathname.replace(/\/+$/, "") || "/dashboard";
  return trimmed;
}

export function isPropertyFinderDashboardPath(pathname: string): boolean {
  const p = normalizeDashboardPath(pathname).toLowerCase();
  return p === "/dashboard/properties";
}

export function getDashboardHeroForPath(pathname: string): DashboardPageHeroConfig | null {
  if (!pathname.startsWith("/dashboard")) return null;
  if (pathname === "/dashboard/calendar") return null;
  if (isPropertyFinderDashboardPath(pathname)) return null;
  if (pathname !== "/dashboard" && /\/dashboard\/[^/]+\/[^/]+/.test(pathname)) {
    return null;
  }
  return DASHBOARD_PAGE_HEROES[normalizeDashboardPath(pathname)] ?? null;
}
