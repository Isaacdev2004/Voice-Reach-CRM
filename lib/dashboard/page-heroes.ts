export type DashboardPageHeroConfig = {
  image: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  quote?: string;
  attribution?: string;
  /** Handwritten accent on the right (mockup taglines). */
  scriptAccent?: string;
  imageAlt: string;
};

const HERO = (file: string) => `/brand/heroes/${file}`;

export const DASHBOARD_PAGE_HEROES: Record<string, DashboardPageHeroConfig> = {
  "/dashboard": {
    image: HERO("dashboard.jpg"),
    eyebrow: "Home dashboard",
    title: "Let's make today exceptional.",
    subtitle: "Your AI-powered real estate operating system.",
    imageAlt: "Luxury home interior at golden hour",
  },
  "/dashboard/calendar": {
    image: HERO("calendar.jpg"),
    eyebrow: "Calendar",
    title: "Purpose in Every Plan",
    quote:
      "God knows the plans He has for you—plans for peace, hope, and a beautiful future.",
    attribution: "Jeremiah 29:11",
    imageAlt: "Ocean terrace at sunset",
  },
  "/dashboard/campaigns": {
    image: HERO("campaigns.jpg"),
    eyebrow: "Campaigns",
    title: "Meaningful Outreach. Real Relationships.",
    subtitle: "Launch campaigns, engage consistently, and open more doors.",
    scriptAccent: "People over numbers. Always.",
    imageAlt: "Yacht on turquoise water",
  },
  "/dashboard/voice-scripts": {
    image: HERO("voice-scripts.jpg"),
    eyebrow: "Voice script studio",
    title: "Speak with Purpose",
    subtitle: "Create, personalize, and deliver messages that open doors.",
    imageAlt: "Professional studio microphone",
  },
  "/dashboard/analytics": {
    image: HERO("analytics.jpg"),
    eyebrow: "Analytics",
    title: "Insight Creates Opportunity",
    subtitle:
      "See the bigger picture. Track progress, refine your strategy, and grow what matters most.",
    imageAlt: "Abstract analytics waves",
  },
  "/dashboard/activity": {
    image: HERO("activity.jpg"),
    eyebrow: "Activity",
    title: "Every Action Moves You Forward",
    subtitle:
      "A real-time view of your outreach, compliance, and engagement — all in one place.",
    imageAlt: "Waterfront at sunset",
  },
  "/dashboard/tasks": {
    image: HERO("tasks.jpg"),
    eyebrow: "Tasks",
    title: "Small Steps. Big Results.",
    subtitle: "Stay focused, follow through, and make progress every day.",
    scriptAccent: "Disciplined today for a brighter tomorrow.",
    imageAlt: "Productive desk with coffee",
  },
  "/dashboard/notes": {
    image: HERO("notes.jpg"),
    eyebrow: "Thinking",
    title: "Ideas Today. Impact Tomorrow.",
    subtitle: "Capture ideas, set strategy, and turn vision into action.",
    scriptAccent: "A clear mind builds a brighter future.",
    imageAlt: "Seaside workspace at dusk",
  },
  "/dashboard/mortgage": {
    image: HERO("mortgage.jpg"),
    eyebrow: "Planning",
    title: "Build the Life You're Meant For",
    subtitle: "Clarity today for the home—and the future—you deserve.",
    imageAlt: "Modern home with pool and ocean view",
  },
  "/dashboard/contacts": {
    image: HERO("dashboard.jpg"),
    eyebrow: "Contacts",
    title: "Relationships that open doors",
    subtitle: "Every contact, conversation, and next step in one place.",
    imageAlt: "Luxury interior",
  },
  "/dashboard/properties": {
    image: HERO("mortgage.jpg"),
    eyebrow: "Property finder",
    title: "Find the right match",
    subtitle: "Search listings and send curated property follow-up tied to each contact.",
    imageAlt: "Coastal luxury property",
  },
};

/** Returns hero config for top-level dashboard routes only (not detail views). */
export function getDashboardHeroForPath(pathname: string): DashboardPageHeroConfig | null {
  if (!pathname.startsWith("/dashboard")) return null;
  if (pathname !== "/dashboard" && /\/dashboard\/[^/]+\/[^/]+/.test(pathname)) {
    return null;
  }
  return DASHBOARD_PAGE_HEROES[pathname] ?? null;
}
