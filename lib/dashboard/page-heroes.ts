import { VOICE_SCRIPTS_HERO_IMAGE } from "@/lib/voice-scripts/assets";

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
  /** Full-width quote strip under the hero (deprecated — avoid extra slogans). */
  brandQuoteFooter?: boolean;
  /** Tailwind grid cols override for split hero, e.g. lg:grid-cols-[1.1fr_0.9fr] */
  heroGridClass?: string;
  /** Large faith / editorial quote as the main left column (Calendar inspiration). */
  editorialQuoteOnCopy?: boolean;
  /** Shorter hero panel (`compact` ~15%, `dense` ~25% vs default on desktop). */
  heroDensity?: "default" | "compact" | "dense";
  /** Photo edge fade: `vivid` = minimal overlay for sharper hero art (home). */
  imageBlend?: "default" | "subtle" | "vivid";
};

/** Matches resized client art in `public/brand/heroes/` (Oct 2026). */
const BANNER_2172 = { w: 2172, h: 724 } as const;
const PHOTO_1024 = { w: 1024, h: 576, layout: "photo" as const };

/** One filename per sidebar tab — lifestyle photos only (never full UI mockups). Property Finder hero: `lib/property-finder/assets.ts`. */
const HERO_FILES: Record<
  string,
  { w: number; h: number; layout?: HeroImageLayout }
> = {
  "dashboard.jpg": BANNER_2172,
  "dashboard-interior.jpg": { w: 1536, h: 1024, layout: "photo" },
  "contacts.jpg": BANNER_2172,
  "properties.jpg": BANNER_2172,
  "campaigns.jpg": BANNER_2172,
  "calendar.jpg": BANNER_2172,
  "calendar-faith.jpg": BANNER_2172,
  "mortgage.jpg": BANNER_2172,
  "financing-interior.png": {w:2172,h:724},
  "notes.jpg": BANNER_2172,
  "tasks.jpg": BANNER_2172,
  "voice-scripts.jpg": BANNER_2172,
  "voice-scripts-hero.png": PHOTO_1024,
  "activity.jpg": BANNER_2172,
  "analytics.jpg": BANNER_2172,
  "settings.jpg": BANNER_2172,
};

/** Match Home dashboard: shorter copy column + lighter image fade. */
const DASHBOARD_HERO_COMPACT: Pick<DashboardPageHeroConfig, "heroDensity" | "imageBlend"> = {
  heroDensity: "compact",
  imageBlend: "subtle",
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
    ...hero("dashboard-interior.jpg"),
    eyebrow: "Dashboard",
    title: "Your business. Beautifully in motion.",
    subtitle:
      "Your priorities, progress, and opportunities—all in one clear view.",
    heroDensity: "default",
    heroGridClass: "lg:grid-cols-[1.08fr_0.92fr]",
    imageBlend: "subtle",
    imageAlt: "Sunlit luxury living room with cream furnishings and architectural details",
    imageObjectPosition: "58% 40%",
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
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Your relationships",
    title: "Every connection holds potential.",
    subtitle:
      "Nurture relationships, uncover opportunities, and turn conversations into closings.",
    heroGridClass: "lg:grid-cols-[1.12fr_0.88fr]",
    imageAlt: "Elegant terrace overlooking the sea",
    imageObjectPosition: "58% center",
  },
  "/dashboard/campaigns": {
    ...hero("campaigns.jpg"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Campaigns",
    title: "Stay connected. Stay top of mind.",
    subtitle:
      "Create thoughtful outreach that turns conversations into opportunities.",
    imageAlt: "Ocean from above with luxury boat",
    imageObjectPosition: "38% 42%",
  },
  "/dashboard/mortgage": {
    ...hero("financing-interior.png"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Financing & Closing",
    title: "Clarity behind every number.",
    subtitle:
      "Explore financing scenarios and guide clients with greater confidence.",
    imageAlt: "Sunlit cream living room with warm limestone and garden windows",
    imageObjectPosition: "70% center",
  },
  "/dashboard/notes": {
    ...hero("notes.jpg"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Notes & strategy",
    title: "Great outcomes begin with a plan.",
    subtitle:
      "Capture insights, organize ideas, and turn strategy into action.",
    imageAlt: "Flowing gold and cream fabric texture",
    imageObjectPosition: "50% center",
  },
  "/dashboard/tasks": {
    ...hero("tasks.jpg"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Tasks",
    title: "The details drive the deal.",
    subtitle:
      "Stay focused on what matters and keep every opportunity moving.",
    imageAlt: "Desk with laptop and city view at golden hour",
    imageObjectPosition: "32% center",
    actions: [
      {
        label: "New task",
        href: "/dashboard/tasks?new=task",
        icon: "add",
        primary: true,
      },
      {
        label: "View calendar",
        href: "/dashboard/calendar",
        icon: "calendar_today",
      },
    ],
  },
  "/dashboard/voice-scripts": {
    ...hero("voice-scripts-hero.png"),
    ...DASHBOARD_HERO_COMPACT,
    image: VOICE_SCRIPTS_HERO_IMAGE,
    eyebrow: "Voice scripts",
    title: "Find the words that move people.",
    subtitle:
      "Confident, natural conversations start with the right approach.",
    imageAlt: "Professional microphone on a sunlit desk by the coast",
    imageObjectPosition: "52% center",
  },
  "/dashboard/activity": {
    ...hero("activity.jpg"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Activity logs",
    title: "Every interaction tells a story.",
    subtitle:
      "See the conversations, actions, and milestones shaping your business.",
    imageAlt: "Coastal olive branch at golden hour",
    imageObjectPosition: "55% center",
  },
  "/dashboard/analytics": {
    ...hero("analytics.jpg"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Analytics",
    title: "See the bigger picture.",
    subtitle:
      "Understand your performance, recognize patterns, and make smarter decisions.",
    imageAlt: "Analytics waves and chart motif",
    imageObjectPosition: "50% center",
  },
  "/dashboard/settings": {
    ...hero("settings.jpg"),
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Settings",
    title: "Make MyARI yours.",
    subtitle:
      "Personalize your workspace, preferences, and account experience.",
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
    ...DASHBOARD_HERO_COMPACT,
    eyebrow: "Calendar",
    title: "Make every moment count.",
    titleMode: "calendarGreeting",
    subtitle:
      "Keep appointments, follow-ups, and important moments beautifully organized.",
    imageAlt: "Schedule and planning visual",
    imageObjectPosition: "82% center",
  },
  faith: {
    ...hero("calendar-faith.jpg"),
    ...DASHBOARD_HERO_COMPACT,
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
