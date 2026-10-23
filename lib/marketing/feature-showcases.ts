import type { FeaturePageSlug } from "@/lib/seo/feature-pages";
export type Pillar =
  "Relationships" | "Outreach" | "Intelligence" | "Productivity";
type CaptureKey =
  | "contacts"
  | "campaigns"
  | "sequence"
  | "voice"
  | "calendar"
  | "assistant"
  | "analytics"
  | "tasks"
  | "notes"
  | "properties"
  | "financing";
type Showcase = {
  pillar: Pillar;
  capture: CaptureKey;
  photo: string;
  caption: string;
  steps: [string, string, string];
  note?: string;
};
const photo = {
  contacts: "/brand/heroes/property-dining-room.png",
  outreach: "/brand/heroes/campaign-library-interior.png",
  voice: "/brand/heroes/voice-scripts-hero.png",
  ai: "/brand/heroes/settings-office.png",
  calendar: "/brand/heroes/calendar-home-office.png",
  notes: "/brand/heroes/notes-botanical-office.png",
  properties: "/brand/heroes/properties-hero.png",
  finance: "/brand/marketing/financing-desk.webp",
  analytics: "/brand/heroes/activity-workspace.png",
};
const relationships: Showcase = {
  pillar: "Relationships",
  capture: "contacts",
  photo: photo.contacts,
  caption:
    "Contacts, lifecycle filters and the selected contact's actual details.",
  steps: [
    "Import your contacts or add them individually.",
    "Organize stages, types and preferences around each relationship.",
    "Review the contact's history before choosing the next step.",
  ],
};
const outreach: Showcase = {
  pillar: "Outreach",
  capture: "sequence",
  photo: photo.outreach,
  caption:
    "An actual campaign sequence preview with supported communication steps.",
  steps: [
    "Choose or build a sequence for your audience.",
    "Review each message, delay and recipient's eligibility.",
    "Activate only when ready, then review actual recorded results.",
  ],
  note: "Sending depends on plan access, configured providers, usage limits and appropriate consent. A saved sequence does not mean messages have been sent.",
};
const productivity: Showcase = {
  pillar: "Productivity",
  capture: "calendar",
  photo: photo.calendar,
  caption: "MyARI's internal Calendar showing synthetic appointments.",
  steps: [
    "Choose a day and review existing commitments.",
    "Create an appointment or follow-up task with the right contact.",
    "Return to the same record when it is time to act.",
  ],
};
export const FEATURE_SHOWCASES: Record<FeaturePageSlug, Showcase> = {
  "lead-management": relationships,
  "pipeline-management": {
    ...relationships,
    caption: "Lifecycle stages and contact details in the Contacts workspace.",
  },
  "automated-follow-up": outreach,
  "campaign-builder": outreach,
  "text-automation": {
    ...outreach,
    caption: "SMS and other supported steps within a campaign sequence.",
  },
  "email-automation": {
    ...outreach,
    caption: "Email alongside other steps in an actual campaign sequence.",
  },
  "lead-reactivation": {
    ...outreach,
    capture: "campaigns",
    caption:
      "Existing reactivation and nurture sequences in the campaign library.",
  },
  "client-email-updates": {
    ...outreach,
    capture: "assistant",
    caption: "An email draft in Ask MyARI, prepared for agent review.",
  },
  "ringless-voicemail": {
    ...outreach,
    capture: "voice",
    photo: photo.voice,
    caption:
      "Voice Studio's script and sample audio controls. Playback is not evidence of voicemail delivery.",
  },
  "voice-studio": {
    ...outreach,
    capture: "voice",
    photo: photo.voice,
    caption:
      "A saved synthetic script with sample recording playback and editing controls.",
    steps: [
      "Write a script and review the details.",
      "Record, upload or generate audio where a provider is configured.",
      "Review the recording and explicitly approve any campaign assignment.",
    ],
    note: "AI writing, transcription and generated voices depend on configured providers. Script edits do not replace approved campaign audio. Live cloud storage and provider availability are not established by this demo.",
  },
  "calendar-and-tasks": productivity,
  notifications: {
    ...productivity,
    capture: "tasks",
    caption: "Due tasks and follow-ups in MyARI's Tasks workspace.",
    note: "Notification delivery depends on supported channels and saved subscriber preferences. Personal cellphone calls are not tracked automatically.",
  },
  "notes-and-strategy": {
    ...productivity,
    capture: "notes",
    photo: photo.notes,
    caption: "A synthetic note linked to its planning workspace.",
    steps: [
      "Capture a note or choose an existing template.",
      "Link relevant contacts and supported property context.",
      "Review the note when preparing a conversation or next step.",
    ],
  },
  "property-finder": {
    ...productivity,
    capture: "properties",
    photo: photo.properties,
    caption:
      "Saved client criteria and the external Zillow search workflow, not live listings.",
    steps: [
      "Select a contact and load saved buyer preferences.",
      "Review location, budget and available criteria.",
      "Open an external Zillow search or choose a follow-up action.",
    ],
    note: "No active IDX/MLS feed. MyARI does not scrape listings; external sites determine available search filters and listing details.",
  },
  "mortgage-calculator": {
    ...productivity,
    capture: "financing",
    photo: photo.finance,
    caption:
      "Actual financing tools populated with synthetic, editable assumptions.",
    steps: [
      "Enter or review property and loan assumptions.",
      "Compare supported financing scenarios.",
      "Review estimates before sharing a client report.",
    ],
    note: "Estimates are not lender quotes, approvals or guaranteed rates. Market feeds and property data are available only where configured.",
  },
  "ai-assistant": {
    ...productivity,
    pillar: "Intelligence",
    capture: "assistant",
    photo: photo.ai,
    caption:
      "Ask MyARI's actual email-drafting interface with a synthetic response.",
    steps: [
      "Choose a supported task and provide the relevant context.",
      "Generate a draft using a configured provider.",
      "Review and personalize the draft before using it.",
    ],
    note: "AI suggests; the agent reviews. This demo uses a mocked provider. Live provider availability and unrestricted CRM actions are not implied.",
  },
  analytics: {
    ...productivity,
    pillar: "Intelligence",
    capture: "analytics",
    photo: photo.analytics,
    caption:
      "The actual Analytics interface, calculated from synthetic delivery records.",
    steps: [
      "Select a reporting period.",
      "Review available delivery events and campaign activity.",
      "Use the supporting records to decide what needs attention.",
    ],
    note: "Metrics reflect available provider events. A submission, send or acceptance is not proof of delivery, an open is not proof of interest, and missing metrics remain unavailable.",
  },
  "automation-workflows": {
    ...outreach,
    caption: "Supported timed steps within an actual campaign sequence.",
    note: "Automation is limited to implemented rules and supported steps. Campaigns require explicit setup and activation.",
  },
  "google-calendar": {
    ...productivity,
    caption:
      "MyARI's internal Calendar; this is not proof of a connected Google account.",
    note: "Google Calendar requires OAuth setup and subscriber authorization. Live production connection and synchronization must be verified separately.",
  },
  "dotloop-integration": {
    ...productivity,
    capture: "financing",
    photo: photo.finance,
    caption:
      "Related MyARI transaction and financing tools, not a verified Dotloop connection.",
    note: "Dotloop connection depends on configured OAuth credentials and subscriber authorization. A connected production account has not been verified by this audit.",
  },
};
export const PILLAR_RELATED: Record<Pillar, FeaturePageSlug[]> = {
  Relationships: [
    "lead-management",
    "pipeline-management",
    "notes-and-strategy",
  ],
  Outreach: ["campaign-builder", "voice-studio", "lead-reactivation"],
  Intelligence: ["ai-assistant", "analytics", "notifications"],
  Productivity: [
    "calendar-and-tasks",
    "property-finder",
    "mortgage-calculator",
  ],
};
