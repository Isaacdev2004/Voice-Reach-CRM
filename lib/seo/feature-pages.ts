import { ADDITIONAL_FEATURE_PAGES } from "@/lib/seo/feature-pages-additions";

export type FeaturePageSlug =
  | "automated-follow-up"
  | "lead-management"
  | "text-automation"
  | "email-automation"
  | "pipeline-management"
  | "lead-reactivation"
  | "notifications"
  | "ringless-voicemail"
  | "voice-studio"
  | "campaign-builder"
  | "notes-and-strategy"
  | "mortgage-calculator"
  | "property-finder"
  | "calendar-and-tasks"
  | "ai-assistant"
  | "analytics"
  | "automation-workflows"
  | "dotloop-integration"
  | "google-calendar"
  | "client-email-updates";

export type FeaturePageConfig = {
  slug: FeaturePageSlug;
  path: `/features/${FeaturePageSlug}`;
  category: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  sections: Array<{
    h2: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
  highlights: Array<{ title: string; body: string }>;
  relatedProductHref: string;
  relatedProductLabel: string;
};

const CORE_FEATURE_PAGES = {
  "automated-follow-up": {
    slug: "automated-follow-up",
    path: "/features/automated-follow-up",
    category: "Follow-up",
    title: "Automated Follow-Up for Real Estate Agents",
    description:
      "ARI automated follow-up runs SMS, email, and ringless voicemail sequences so every real estate lead gets a timely response - even when you're in showings.",
    h1: "Automated Follow-Up That Keeps Leads Warm",
    eyebrow: "Automated follow-up",
    intro:
      "Build automated follow-up sequences across SMS, email, and voicemail - all inside ARI. Set your sequence once; ARI delivers each touch on the schedule you configure.",
    sections: [
      {
        h2: "Why automation beats manual follow-up",
        paragraphs: [
          "Agents lose deals when response time slips. Automated follow-up helps every lead hear from you on schedule - with messages you wrote, not generic templates.",
          "ARI sequences combine timing, channel, and personalization so follow-up feels human while running in the background.",
        ],
      },
      {
        h2: "Multi-step campaigns you control",
        paragraphs: ["Build visual sequences that mix touchpoints over hours, days, or weeks."],
        bullets: [
          "First outreach when a lead enters your pipeline and campaign",
          "Drip nurture for leads not ready to buy or sell yet",
          "Pause or override automation for any contact",
          "Full history on every message sent and received",
        ],
      },
      {
        h2: "Works with your real estate CRM",
        paragraphs: [
          "Automated follow-up is built into ARI's pipeline - not a separate tool. When someone replies, they surface for personal outreach with full context.",
          "Learn more about our dedicated lead follow-up software for Realtors.",
        ],
      },
    ],
    highlights: [
      { title: "Visual sequence builder", body: "Drag-and-drop steps for SMS, email, and RVM." },
      { title: "Smart timing", body: "Quiet hours and consent gates built in." },
      { title: "Reply detection", body: "Responders automatically flagged for personal follow-up." },
      { title: "Editable scripts", body: "Update copy without rebuilding campaigns." },
    ],
    relatedProductHref: "/lead-follow-up",
    relatedProductLabel: "automated real estate lead follow-up",
  },
  "lead-management": {
    slug: "lead-management",
    path: "/features/lead-management",
    category: "CRM",
    title: "Real Estate Lead Management Software",
    description:
      "Organize every real estate lead in one CRM - import from Zillow, CSV, and open houses with notes, tags, and full communication history.",
    h1: "Lead Management Built for Real Estate",
    eyebrow: "Lead management",
    intro:
      "Stop juggling spreadsheets and sticky notes. ARI centralizes contacts, lead sources, and activity history so you always know who to call next.",
    sections: [
      {
        h2: "Every lead in one place",
        paragraphs: [
          "Zillow inquiries, sphere contacts, open-house sign-ins, and referral leads - import and organize them in a single real estate CRM built for agents.",
        ],
        bullets: [
          "CSV import plus white-glove onboarding migration",
          "Tags, notes, and custom fields per contact",
          "Lead source tracking to see what's working",
          "Search and filter across your full database",
        ],
      },
      {
        h2: "History that follows the lead",
        paragraphs: [
          "Every text, email, voicemail, and note lives on the contact record. When a lead resurfaces six months later, you have full context before you dial.",
        ],
      },
      {
        h2: "From storage to action",
        paragraphs: [
          "Lead management in ARI isn't passive - contacts connect directly to pipeline stages, tasks, and automated campaigns so data turns into conversations.",
        ],
      },
    ],
    highlights: [
      { title: "Unified contact records", body: "One profile for every lead source." },
      { title: "Bulk import", body: "CSV upload with onboarding-assisted migration." },
      { title: "Activity timeline", body: "Full communication history per contact." },
      { title: "Smart segmentation", body: "Tag and filter for targeted campaigns." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM for agents",
  },
  "text-automation": {
    slug: "text-automation",
    path: "/features/text-automation",
    category: "Follow-up",
    title: "Automated Text Follow-Up for Realtors",
    description:
      "Send automated SMS follow-up to real estate leads with ARI - timely responses, drip sequences, and compliance-aware tools for TCPA-aware texting.",
    h1: "Text Automation That Reaches Leads Fast",
    eyebrow: "SMS automation",
    intro:
      "Text is the fastest way to reach modern buyers and sellers. ARI automates SMS follow-up so you respond in minutes - not hours - with compliance-aware controls for responsible outreach.",
    sections: [
      {
        h2: "Speed-to-lead by text",
        paragraphs: [
          "Studies consistently show timely response improves connection rates. Automated text follow-up sends after a contact is enrolled in your campaign - even while you're in appointments.",
        ],
      },
      {
        h2: "SMS sequences that nurture",
        paragraphs: ["Beyond the first text, ARI runs drip sequences that check in, share value, and re-engage quiet leads."],
        bullets: [
          "Twilio-powered business SMS line",
          "Merge fields for personalization",
          "Suppression/DNC tools before send",
          "Consent tracking and opt-out handling",
        ],
      },
      {
        h2: "Compliance-aware tools",
        paragraphs: [
          "Real estate texting has rules. ARI includes quiet hours, consent gates, and suppression/DNC tools to support responsible automated text follow-up.",
        ],
      },
    ],
    highlights: [
      { title: "Timely SMS", body: "First text within minutes after a lead enters your campaign." },
      { title: "Drip sequences", body: "Multi-message nurture over days or weeks." },
      { title: "Two-way texting", body: "Replies logged on the contact record." },
      { title: "Usage controls", body: "Trial caps and plan allotments for safe testing." },
    ],
    relatedProductHref: "/realtor-lead-follow-up",
    relatedProductLabel: "Realtor lead follow-up software",
  },
  "email-automation": {
    slug: "email-automation",
    path: "/features/email-automation",
    category: "Follow-up",
    title: "Automated Email Follow-Up for Real Estate",
    description:
      "Automate real estate email follow-up with ARI - nurture sequences, market updates, and re-engagement emails tied to your CRM pipeline.",
    h1: "Email Automation for Longer-Form Nurture",
    eyebrow: "Email automation",
    intro:
      "Some leads need more than a text. ARI email automation delivers thoughtful nurture sequences, market touches, and re-engagement emails on schedule.",
    sections: [
      {
        h2: "Email where it works best",
        paragraphs: [
          "Email excels for longer-form nurture - market reports, neighborhood updates, and check-ins that build trust over weeks. ARI automates these touches so they happen consistently.",
        ],
      },
      {
        h2: "Sequences tied to your pipeline",
        paragraphs: ["Email steps integrate with SMS and RVM in multi-channel campaigns."],
        bullets: [
          "Automated drip sequences on a schedule you set",
          "Personalized templates with contact merge fields",
          "Send and reply logging on contact records",
          "Combine with SMS and voicemail in one workflow",
        ],
      },
      {
        h2: "Re-engage dormant leads by email",
        paragraphs: [
          "Email is ideal for lead reactivation - a thoughtful check-in that restarts conversations with old inquiries. Pair email automation with segmentation for best results.",
        ],
      },
    ],
    highlights: [
      { title: "Drip campaigns", body: "Scheduled email sequences over any timeframe." },
      { title: "Template library", body: "Reusable emails for nurture and reactivation." },
      { title: "CRM integration", body: "Every send logged on the contact timeline." },
      { title: "Multi-channel", body: "Mix email with SMS and RVM in one sequence." },
    ],
    relatedProductHref: "/lead-follow-up",
    relatedProductLabel: "automated lead follow-up",
  },
  "pipeline-management": {
    slug: "pipeline-management",
    path: "/features/pipeline-management",
    category: "CRM",
    title: "Real Estate Sales Pipeline Management",
    description:
      "Track every lead through your real estate sales pipeline with ARI - stages, tasks, and automated follow-up so nothing falls through the cracks.",
    h1: "Pipeline Management That Shows Who Needs You",
    eyebrow: "Pipeline",
    intro:
      "See every lead's stage at a glance. Move contacts through your sales pipeline as they respond, schedule showings, or go under contract - with tasks and automation at every step.",
    sections: [
      {
        h2: "Visual pipeline for real estate",
        paragraphs: [
          "Generic sales pipelines don't fit how agents work. ARI pipeline stages reflect buyer inquiries, listing appointments, active clients, and closed deals - so your board matches your business.",
        ],
        bullets: [
          "Drag-and-drop stage management",
          "Tasks and reminders tied to each lead",
          "Pipeline views filtered by source or tag",
          "History of every stage change",
        ],
      },
      {
        h2: "Automation at every stage",
        paragraphs: [
          "Trigger follow-up campaigns when a lead enters a stage. New inquiry? Start your speed-to-lead sequence. Gone quiet for 30 days? Reactivation campaign. Pipeline and automation work together.",
        ],
      },
      {
        h2: "Know your numbers",
        paragraphs: [
          "Track how many leads sit in each stage, where deals stall, and which sources convert - so you invest time and ad spend where they matter.",
        ],
      },
    ],
    highlights: [
      { title: "Stage-based workflow", body: "Pipeline stages designed for real estate." },
      { title: "Task reminders", body: "Never miss a follow-up call or showing." },
      { title: "Campaign triggers", body: "Automate outreach when stages change." },
      { title: "Source tracking", body: "See which lead sources fill your pipeline." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
  "lead-reactivation": {
    slug: "lead-reactivation",
    path: "/features/lead-reactivation",
    category: "Follow-up",
    title: "Lead Reactivation Feature for Real Estate CRM",
    description:
      "Re-engage dormant real estate leads with ARI's lead reactivation feature - segmented SMS, email, and voicemail campaigns that restart conversations.",
    h1: "Lead Reactivation Built Into Your CRM",
    eyebrow: "Lead reactivation",
    intro:
      "Your old leads aren't dead - they're waiting for the right message. ARI's reactivation tools segment dormant contacts and run structured re-engagement campaigns.",
    sections: [
      {
        h2: "Turn your database into pipeline",
        paragraphs: [
          "Most agents sit on hundreds of contacts who inquired months ago. Lead reactivation turns that dormant database into your lowest-cost source of new business.",
        ],
      },
      {
        h2: "Segmented, not spammy",
        paragraphs: ["Target reactivation by last contact date, source, or pipeline stage."],
        bullets: [
          "Batch campaigns by neighborhood or lead source",
          "Multi-channel re-engagement (SMS, email, RVM)",
          "Auto-tag responders for personal follow-up",
          "Compliance tools for consent-aware outreach",
        ],
      },
      {
        h2: "Prevent leads from going cold again",
        paragraphs: [
          "Pair one-time reactivation with ongoing nurture so leads never fully disappear from your pipeline again.",
        ],
      },
    ],
    highlights: [
      { title: "Database segmentation", body: "Filter dormant leads before you reach out." },
      { title: "Multi-touch sequences", body: "SMS, email, and voicemail in one campaign." },
      { title: "Reply routing", body: "Responders surface for personal calls." },
      { title: "Full history", body: "See every past touch before you re-engage." },
    ],
    relatedProductHref: "/lead-reactivation",
    relatedProductLabel: "lead reactivation software",
  },
  notifications: {
    slug: "notifications",
    path: "/features/notifications",
    category: "CRM",
    title: "Lead Reminders & Task Notifications for Agents",
    description:
      "ARI notifications and task reminders tell real estate agents exactly who to call, text, or follow up with - so hot leads never slip through.",
    h1: "Reminders That Keep You on Top of Every Lead",
    eyebrow: "Tasks & alerts",
    intro:
      "Automation handles the repetitive outreach. Notifications tell you when a lead replies, goes quiet, or needs a personal touch - so you focus on conversations that close.",
    sections: [
      {
        h2: "Never miss a hot lead",
        paragraphs: [
          "When a prospect replies to an automated text or engages with outreach, ARI can create a task and notification so you follow up while intent is high. Alert types depend on your campaign configuration.",
        ],
        bullets: [
          "Task reminders tied to contacts and pipeline stages",
          "Alerts when leads go quiet beyond a threshold",
          "Daily priority list of who to contact next",
          "Calendar integration for showings and follow-ups",
        ],
      },
      {
        h2: "Human touch at the right moment",
        paragraphs: [
          "The best agents combine automation with personal outreach. Notifications bridge the gap - telling you exactly when to pick up the phone.",
        ],
      },
      {
        h2: "Stay organized without spreadsheets",
        paragraphs: [
          "Replace sticky notes and mental reminders with a task system connected to your CRM. Every follow-up has an owner, a due date, and full lead context.",
        ],
      },
    ],
    highlights: [
      { title: "Smart tasks", body: "Auto-created when leads reply or stall." },
      { title: "Priority inbox", body: "See who needs attention today." },
      { title: "Pipeline alerts", body: "Stage-change notifications for your team." },
      { title: "Calendar sync", body: "Google Calendar integration for appointments." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
};

export const FEATURE_PAGES: Record<FeaturePageSlug, FeaturePageConfig> = {
  ...CORE_FEATURE_PAGES,
  ...(ADDITIONAL_FEATURE_PAGES as Record<FeaturePageSlug, FeaturePageConfig>),
};

/** Walkthrough order for the public features index (matches in-app workflow). */
export const FEATURE_DISPLAY_ORDER: FeaturePageSlug[] = [
  "lead-management",
  "pipeline-management",
  "automated-follow-up",
  "campaign-builder",
  "text-automation",
  "email-automation",
  "client-email-updates",
  "ringless-voicemail",
  "voice-studio",
  "lead-reactivation",
  "calendar-and-tasks",
  "notes-and-strategy",
  "property-finder",
  "mortgage-calculator",
  "ai-assistant",
  "analytics",
  "notifications",
  "automation-workflows",
  "google-calendar",
  "dotloop-integration",
];

export const FEATURE_PAGE_SLUGS = FEATURE_DISPLAY_ORDER;
