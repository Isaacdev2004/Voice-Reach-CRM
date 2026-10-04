import { FOUNDING_100, trialDaysFromEnv } from "./founding";

/** Single source of truth for trial, onboarding, integrations, and qualified marketing claims. */
export const SITE_OFFER = {
  trialDays: trialDaysFromEnv(),
  cardRequired: true,
  cardRequiredNote: "Card required · no charge until trial ends",
  primaryPromise: "Every lead gets a next step.",
  hero: {
    eyebrow: "Real Estate CRM + Automated Follow-Up",
    headline: "Turn every lead into a real opportunity.",
    body:
      "ARI organizes your pipeline, follows up automatically, and shows you who to contact next — so you spend less time chasing leads and more time closing.",
  },
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
    memberBenefit:
      "Founding 100 members receive founding-member pricing while they remain eligible, plus a direct feedback channel to the ARI team.",
  },
  plans: {
    allPlansInclude:
      "All plans include ARI CRM, pipeline management, tasks, and compliance-aware tools. Multi-step campaign automation and lead reactivation begin on Growth.",
  },
  leadIntake: {
    /** Canonical public statement — Zillow/Realtor.com do not sync automatically today. */
    portalIntake:
      "Zillow, Realtor.com, and other portal leads enter ARI through CSV export import or manual entry — not automatic portal sync. After a contact exists in ARI and is enrolled in a campaign, automated follow-up runs on the schedule you configure.",
    /** Use instead of "instant" or "real-time" unless a specific integration supports it. */
    qualified:
      "When a lead enters ARI through CSV import, manual entry, or a supported workflow, your follow-up sequence can begin on the schedule you configure.",
    smsTiming:
      "Automated SMS can send within minutes after a contact is added to a campaign — while you are in showings or with clients.",
    enrollmentFlow:
      "Lead source → import or create contact in ARI → enroll in campaign → automated follow-up on your schedule → you handle replies.",
  },
  aiDataUse: {
    summary:
      "When you use AI drafting features, content you submit may be sent to configured AI providers (e.g., Anthropic or OpenAI) solely to generate output for your account.",
    noTraining:
      "We do not use Customer Data to train models, sell to third parties, or use it for our own marketing purposes.",
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

/** Primary sitewide trial CTA — Audit 3 standard. */
export function primaryTrialCta() {
  return `Start My ${SITE_OFFER.trialDays}-Day Trial`;
}

export function trialDisclosureLine() {
  return `${SITE_OFFER.trialDays} days free · Card required · No charge until trial ends · ${SITE_OFFER.whiteGlove.shortLine}`;
}

/** @deprecated Prefer primaryTrialCta() for marketing CTAs. */
export function trialCtaLabel(prefix = "Start My") {
  return `${prefix} ${SITE_OFFER.trialDays}-Day Trial`;
}

export function trialSupportLine() {
  return `${SITE_OFFER.whiteGlove.shortLine}. ${SITE_OFFER.whiteGlove.detail}`;
}

/** Subprocessors and vendors — Privacy Policy, Terms, DPA. Keep aligned with production stack. */
export const SUBPROCESSORS = [
  "Clerk (authentication)",
  "Supabase (database and storage)",
  "Stripe (payment processing)",
  "Vercel (hosting and infrastructure)",
  "Twilio (SMS, when you send messages)",
  "Resend (email delivery, when configured)",
  "Slybroadcast (ringless voicemail, when you send drops)",
  "Google Calendar (when you connect OAuth from Settings)",
  "Dotloop (when you connect OAuth from Settings)",
  "Anthropic and/or OpenAI (AI drafting features, when configured)",
  "ElevenLabs (AI voice synthesis, when configured)",
] as const;

/** Bullet list for Privacy Policy, Terms, DPA — keep in sync with product. */
export function integrationsLegalBullets(): string[] {
  return [...SUBPROCESSORS];
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
