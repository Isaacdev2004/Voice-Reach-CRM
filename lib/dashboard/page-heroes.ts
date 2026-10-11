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

export type DashboardPageHeroConfig = {
  image: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  quote?: string;
  attribution?: string;
  scriptAccent?: string;
  brandQuote?: string;
  imageAlt: string;
  /** How the H1 is resolved at runtime (Clerk user name). */
  titleMode?: "fixed" | "dashboardHome" | "calendarGreeting";
  actions?: DashboardPageHeroAction[];
  features?: DashboardPageHeroFeature[];
  /** Editorial quote overlay on the photo (calendar faith variant). */
  editorialQuote?: boolean;
};

const HERO = (file: string) => `/brand/heroes/${file}`;

export const DASHBOARD_PAGE_HEROES: Record<string, DashboardPageHeroConfig> = {
  "/dashboard": {
    image: HERO("dashboard.jpg"),
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
  /** Calendar uses {@link CALENDAR_HERO_VARIANTS} + toggle on the calendar page. */
  "/dashboard/campaigns": {
    image: HERO("campaigns.jpg"),
    eyebrow: "Campaigns",
    title: "Meaningful outreach. Real relationships.",
    subtitle: "Launch sequences, engage consistently, and open more doors.",
    scriptAccent: "People over numbers. Always.",
    brandQuote: "Every touchpoint builds trust.",
    imageAlt: "Ocean from above",
  },
  "/dashboard/voice-scripts": {
    image: HERO("voice-scripts.jpg"),
    eyebrow: "Voice script studio",
    title: "Voice Scripts Library",
    subtitle:
      "Create, organize, and manage voice scripts. Record, upload, or generate with AI—then assign them to campaigns.",
    scriptAccent: "Your words create opportunity.",
    brandQuote: "Real people. Real connections. Powered by AI.",
    imageAlt: "Studio microphone",
  },
  "/dashboard/analytics": {
    image: HERO("analytics.jpg"),
    eyebrow: "Analytics",
    title: "Insight creates opportunity",
    subtitle:
      "Track delivery, engagement, and campaign performance—then refine what works.",
    brandQuote: "Data with direction.",
    imageAlt: "Analytics waves",
  },
  "/dashboard/activity": {
    image: HERO("activity.jpg"),
    eyebrow: "Activity",
    title: "Every action moves you forward",
    subtitle:
      "A real-time view of outreach, compliance, and engagement—all in one place.",
    brandQuote: "Clarity in every log.",
    imageAlt: "Waterfront at golden hour",
  },
  "/dashboard/tasks": {
    image: HERO("tasks.jpg"),
    eyebrow: "Tasks",
    title: "Small steps. Big results.",
    subtitle: "Stay focused, follow through, and make progress every day.",
    scriptAccent: "Productivity creates space for purpose.",
    brandQuote: "Discipline today. Momentum tomorrow.",
    imageAlt: "Productive office at sunrise",
  },
  "/dashboard/notes": {
    image: HERO("notes.jpg"),
    eyebrow: "Thinking",
    title: "Ideas today. Impact tomorrow.",
    subtitle: "Capture strategy, goals, and notes—linked to the people you serve.",
    scriptAccent: "A clear mind builds a brighter future.",
    brandQuote: "Strategy on paper. Results in the field.",
    imageAlt: "Seaside workspace",
  },
  "/dashboard/mortgage": {
    image: HERO("mortgage.jpg"),
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
    image: HERO("contacts.jpg"),
    eyebrow: "Contacts",
    title: "Relationships that open doors",
    subtitle: "Every contact, conversation, consent record, and next step in one place.",
    brandQuote: "People first. Always.",
    imageAlt: "Contemporary living room",
  },
  "/dashboard/properties": {
    image: HERO("mortgage.jpg"),
    eyebrow: "Property finder",
    title: "Find the right match",
    subtitle: "Search listings and send curated property follow-up tied to each contact.",
    brandQuote: "The right home changes everything.",
    imageAlt: "Luxury property",
  },
};

export const CALENDAR_HERO_STORAGE_KEY = "myari-calendar-hero-variant";

export type CalendarHeroVariant = "schedule" | "faith";

export const CALENDAR_HERO_VARIANTS: Record<
  CalendarHeroVariant,
  DashboardPageHeroConfig
> = {
  schedule: {
    image: HERO("calendar.jpg"),
    eyebrow: "Calendar",
    title: "Your schedule, beautifully organized.",
    titleMode: "calendarGreeting",
    subtitle: "Stay on top of your schedule, client meetings, and follow-ups.",
    brandQuote: "Purpose in every plan.",
    imageAlt: "Sunlit luxury residence",
  },
  faith: {
    image: HERO("calendar-faith.jpg"),
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
