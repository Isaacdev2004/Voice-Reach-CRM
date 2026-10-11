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
};

/** Pixel size of files in `public/brand/heroes/` (update when art is replaced). */
const HERO_FILES: Record<
  string,
  { w: number; h: number; layout?: HeroImageLayout }
> = {
  "dashboard.jpg": { w: 1024, h: 240 },
  "campaigns.jpg": { w: 1024, h: 287 },
  "voice-scripts.jpg": { w: 1024, h: 129 },
  "analytics.jpg": { w: 1024, h: 279 },
  "activity.jpg": { w: 1024, h: 279 },
  "activity-hero.jpg": { w: 1280, h: 720, layout: "photo" },
  "tasks.jpg": { w: 1024, h: 224 },
  "notes.jpg": { w: 1024, h: 287 },
  "mortgage.jpg": { w: 1024, h: 191 },
  "contacts.jpg": { w: 1024, h: 119 },
  "calendar.jpg": { w: 1024, h: 203 },
  "calendar-faith.jpg": { w: 1024, h: 188 },
};

function hero(file: string): Pick<
  DashboardPageHeroConfig,
  "image" | "imageWidth" | "imageHeight" | "imageLayout"
> {
  const meta = HERO_FILES[file] ?? { w: 1024, h: 280 };
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
    imageAlt: "Coastal living room with ocean view",
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
  "/dashboard/campaigns": {
    ...hero("campaigns.jpg"),
    eyebrow: "Campaigns",
    title: "Meaningful outreach. Real relationships.",
    subtitle: "Launch sequences, engage consistently, and open more doors.",
    scriptAccent: "People over numbers. Always.",
    brandQuote: "Every touchpoint builds trust.",
    imageAlt: "Ocean from above",
  },
  "/dashboard/voice-scripts": {
    ...hero("voice-scripts.jpg"),
    eyebrow: "Voice script studio",
    title: "Voice Scripts Library",
    subtitle:
      "Create, organize, and manage voice scripts. Record, upload, or generate with AI—then assign them to campaigns.",
    scriptAccent: "Your words create opportunity.",
    brandQuote: "Real people. Real connections. Powered by AI.",
    imageAlt: "Studio microphone",
  },
  "/dashboard/analytics": {
    ...hero("analytics.jpg"),
    eyebrow: "Analytics",
    title: "Insight creates opportunity",
    subtitle:
      "Track delivery, engagement, and campaign performance—then refine what works.",
    brandQuote: "Data with direction.",
    imageAlt: "Analytics waves",
  },
  "/dashboard/activity": {
    ...hero("activity-hero.jpg"),
    eyebrow: "Activity",
    title: "Every action moves you forward",
    subtitle:
      "A real-time view of outreach, compliance, and engagement—all in one place.",
    brandQuote: "Clarity in every log.",
    imageAlt: "Waterfront at golden hour",
  },
  "/dashboard/tasks": {
    ...hero("tasks.jpg"),
    eyebrow: "Tasks",
    title: "Small steps. Big results.",
    subtitle: "Stay focused, follow through, and make progress every day.",
    scriptAccent: "Productivity creates space for purpose.",
    brandQuote: "Discipline today. Momentum tomorrow.",
    imageAlt: "Productive office at sunrise",
  },
  "/dashboard/notes": {
    ...hero("notes.jpg"),
    eyebrow: "Thinking",
    title: "Ideas today. Impact tomorrow.",
    subtitle: "Capture strategy, goals, and notes—linked to the people you serve.",
    scriptAccent: "A clear mind builds a brighter future.",
    brandQuote: "Strategy on paper. Results in the field.",
    imageAlt: "Seaside workspace",
  },
  "/dashboard/mortgage": {
    ...hero("mortgage.jpg"),
    eyebrow: "Planning",
    title: "Mortgage Calculator",
    subtitle: "Estimate monthly payments with today's average rates, refreshed daily.",
    scriptAccent: "Home opens more doors.",
    imageAlt: "Luxury modern home",
    features: [
      { icon: "percent", title: "Live rate data", subtitle: "Updated daily" },
      { icon: "bar_chart", title: "Compare scenarios", subtitle: "See your options" },
      { icon: "home", title: "Plan with confidence", subtitle: "Informed decisions" },
    ],
  },
  "/dashboard/contacts": {
    ...hero("contacts.jpg"),
    eyebrow: "Contacts",
    title: "Relationships that open doors",
    subtitle: "Every contact, conversation, consent record, and next step in one place.",
    brandQuote: "People first. Always.",
    imageAlt: "Contemporary living room",
  },
  "/dashboard/properties": {
    ...hero("mortgage.jpg"),
    eyebrow: "Property finder",
    title: "Find the right match",
    subtitle: "Search listings and send curated property follow-up tied to each contact.",
    brandQuote: "The right home changes everything.",
    imageAlt: "Luxury property",
  },
  "/dashboard/settings": {
    ...hero("dashboard.jpg"),
    eyebrow: "Settings",
    title: "Your workspace, your way",
    subtitle: "Profile, billing, integrations, and team access in one place.",
    brandQuote: "Built for how you work.",
    imageAlt: "Coastal living room with ocean view",
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
    imageAlt: "Sunlit luxury residence",
  },
  faith: {
    ...hero("calendar-faith.jpg"),
    eyebrow: "Calendar",
    title: "Purpose in Every Plan",
    subtitle: "Plans for peace, hope, and a beautiful future.",
    quote:
      "God knows the plans He has for you—plans for peace, hope, and a beautiful future.",
    attribution: "Jeremiah 29:11",
    editorialQuote: true,
    brandQuote: "Trust the timing.",
    imageAlt: "Golden hour penthouse view",
  },
};

export function getDashboardHeroForPath(pathname: string): DashboardPageHeroConfig | null {
  if (!pathname.startsWith("/dashboard")) return null;
  if (pathname === "/dashboard/calendar") return null;
  if (pathname !== "/dashboard" && /\/dashboard\/[^/]+\/[^/]+/.test(pathname)) {
    return null;
  }
  return DASHBOARD_PAGE_HEROES[pathname] ?? null;
}
