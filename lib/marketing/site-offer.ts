import { FOUNDING_100, trialDaysFromEnv } from "./founding";

/** Single source of truth for trial, onboarding, integrations, and qualified marketing claims. */
export const SITE_OFFER = {
  trialDays: trialDaysFromEnv(),
  cardRequired: true,
  cardRequiredNote: "Card required · no charge until trial ends",
  primaryPromise: "Every lead gets a next step.",
  tagline: "Lead Follow-Up on Autopilot.",
  positioning: {
    primary: "real estate follow-up system",
    categoryLabel: "real estate CRM",
  },
  whiteGlove: {
    /** Matches pricing FAQ — included on every plan, not Founding-only. */
    includedOnAllPlans: true,
    shortLine: "White-glove setup included on every plan",
    detail:
      "We help import your leads, configure your pipeline, and build your first follow-up campaign.",
    setupWindow:
      "Most agents are live within 24–48 hours, depending on import size, data quality, and onboarding availability.",
    contactWindow: "We reach out within 24 hours after signup to schedule your setup call.",
  },
  founding: {
    name: FOUNDING_100.name,
    seatsTotal: FOUNDING_100.seatsTotal,
    /** When true, show Founding pricing/perks in banners; body copy should still say onboarding is on all plans. */
    active: true,
    pricingNote: "Founding-member pricing while seats last",
  },
  leadIntake: {
    /** Use instead of "instant" or "real-time" unless a specific integration supports it. */
    qualified:
      "When a lead enters ARI through CSV import, manual entry, or a supported workflow, your follow-up sequence can begin on the schedule you configure.",
    smsTiming:
      "Automated SMS can send within minutes after a contact is added to a campaign — while you are in showings or with clients.",
  },
  integrations: {
    /** Public product integrations — keep Privacy/Terms aligned after counsel review. */
    connected: [
      { label: "Google Calendar", href: "/features/google-calendar" },
      { label: "Dotloop", href: "/features/dotloop-integration" },
    ],
    importSources: [
      "CSV import",
      "Zillow / Realtor.com exports",
      "Manual entry",
      "Onboarding-assisted migration",
    ],
    messaging: ["Twilio (SMS)", "Email delivery", "Slybroadcast (ringless voicemail)"],
  },
  compliance: {
    toolsLabel: "compliance-aware tools",
    featureLabel: "Compliance tools",
    shortNote:
      "Consent tracking, suppression/DNC tools, quiet-hour controls, and activity logs support responsible outreach. Your legal obligations depend on the facts and applicable law.",
    policyLinks: [
      { href: "/tcpa-consent", label: "TCPA & consent policy" },
      { href: "/acceptable-use", label: "Acceptable use policy" },
    ] as const,
  },
  supportEmail: "hello@myari.io",
} as const;

export function trialCtaLabel(prefix = "Start Your") {
  return `${prefix} ${SITE_OFFER.trialDays}-Day Free Trial`;
}

export function trialSupportLine() {
  return `${SITE_OFFER.whiteGlove.shortLine}. ${SITE_OFFER.whiteGlove.detail}`;
}

/** Bullet list for Privacy Policy, Terms, DPA — keep in sync with product. */
export function integrationsLegalBullets(): string[] {
  const { connected, messaging, importSources } = SITE_OFFER.integrations;
  return [
    ...connected.map((i) => `${i.label} (when you connect it from Settings)`),
    ...messaging.map((m) => `${m} (for outbound messaging you configure)`),
    `Lead import: ${importSources.join(", ")}`,
    "Payment processing (Stripe)",
    "Hosting and infrastructure (e.g., Vercel, database providers)",
  ];
}

/** Comparison table for /real-estate-crm (audit Section 8). */
export const CRM_COMPARISON_TABLE = {
  headers: ["Capability", "Spreadsheet / Notes", "Traditional CRM", "ARI"],
  rows: [
    { capability: "Store contacts", spreadsheet: "Yes", traditional: "Yes", ari: "Yes" },
    { capability: "Track pipeline", spreadsheet: "Limited", traditional: "Usually", ari: "Yes" },
    { capability: "Tasks & reminders", spreadsheet: "Limited", traditional: "Usually", ari: "Yes" },
    {
      capability: "Automated SMS/email follow-up",
      spreadsheet: "No",
      traditional: "Varies",
      ari: "Yes",
    },
    { capability: "Ringless voicemail", spreadsheet: "No", traditional: "Varies", ari: "Yes" },
    {
      capability: "Lead reactivation workflows",
      spreadsheet: "Manual",
      traditional: "Varies",
      ari: "Yes",
    },
    {
      capability: "White-glove onboarding",
      spreadsheet: "No",
      traditional: "Varies",
      ari: "Included on every plan",
    },
  ],
} as const;

export const RESOURCE_CITATIONS = {
  speedToLead: {
    label: "Lead response time research (MIT / InsideSales)",
    href: "https://www.insidesales.com/response-time-matters/",
  },
  followUpTouches: {
    label: "Sales follow-up persistence (industry studies)",
    href: "https://www.salesforce.com/blog/sales-follow-up-statistics/",
  },
  fiveMinuteRule: {
    label: "Speed-to-lead best practices",
    href: "https://www.nar.realtor/",
  },
} as const;
