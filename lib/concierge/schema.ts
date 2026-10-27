import { z } from "zod";
const text = (max = 300) => z.string().trim().max(max).default("");
export const Discovery = z
  .object({
    agentName: text(200),
    brokerage: text(200),
    market: text(300),
    serviceAreas: text(600),
    business: z.enum(["individual", "team"]).default("individual"),
    specialty: z
      .enum(["buyer", "seller", "investor", "commercial", "mixed"])
      .default("mixed"),
    currentCrm: text(100),
    databaseSize: z.number().int().min(0).max(10000000).optional(),
    channels: z
      .array(z.enum(["email", "sms", "voicemail"]))
      .max(3)
      .default([]),
    leadSources: text(600),
    website: z
      .union([z.literal(""), z.string().url().startsWith("https://")])
      .default(""),
    social: text(600),
    tone: z.enum(["warm", "professional", "luxury", "concise"]).default("warm"),
    challenges: text(1500),
    goals: text(1500),
    timeline: text(200),
    contactDetails: text(600),
    brandNotes: text(1000),
    communicationsConsent: z.boolean().default(false),
  })
  .strict();
export const TrainingKeys = [
  "dashboard",
  "contacts",
  "campaigns",
  "calendar",
  "tasks",
  "notes",
  "reporting",
] as const;
export const Milestones = z
  .object({
    importSkipped: z.boolean().optional(),
    stagesReviewed: z.boolean().optional(),
    campaignReviewed: z.boolean().optional(),
    integrationsNotApplicable: z.boolean().optional(),
    training: z.array(z.enum(TrainingKeys)).max(7).optional(),
    launchReview: z.boolean().optional(),
  })
  .strict();
export const CaseChange = z
  .object({
    requestId: z.string().uuid(),
    version: z.number().int().min(0),
    discovery: Discovery.optional(),
    milestones: Milestones.optional(),
  })
  .strict()
  .refine((x) => x.discovery !== undefined || x.milestones !== undefined);
export const Fields = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "type",
  "source",
  "category",
  "notes",
  "tags",
  "followUpDate",
] as const;
export const Mapping = z
  .partialRecord(z.enum(Fields), z.string().max(150))
  .refine((m) => !!m.firstName && !!m.phone, "Map first name and phone");
export type CaseRecord = {
  owner_id: string;
  version: number;
  discovery: z.infer<typeof Discovery>;
  milestones: z.infer<typeof Milestones>;
  stage: string;
  assignee_id: string | null;
  next_followup: string | null;
  internal_note: string;
  created_at: string;
  updated_at: string;
};
export const training = [
  {
    key: "dashboard",
    name: "Your daily priorities",
    href: "/dashboard",
    hint: "Review verified priorities and choose one follow-up.",
  },
  {
    key: "contacts",
    name: "Your relationships",
    href: "/dashboard/contacts",
    hint: "Review a contact, stage, notes and communication permissions.",
  },
  {
    key: "campaigns",
    name: "Your first campaign",
    href: "/dashboard/campaigns",
    hint: "Review timing, personalization and draft copy. Approval here never activates a campaign.",
  },
  {
    key: "calendar",
    name: "Your calendar",
    href: "/dashboard/calendar",
    hint: "Review your timezone and appointments. Verify external synchronization separately.",
  },
  {
    key: "tasks",
    name: "Your next steps",
    href: "/dashboard/tasks",
    hint: "Review a task and its due date before saving.",
  },
  {
    key: "notes",
    name: "Your working notes",
    href: "/dashboard/notes",
    hint: "Keep factual consultation notes and review any suggested follow-ups.",
  },
  {
    key: "reporting",
    name: "Your performance",
    href: "/dashboard/analytics",
    hint: "Use verified delivery evidence; unavailable metrics are not zero.",
  },
] as const;
export const communicationMilestones = [
  {
    day: 0,
    key: "welcome",
    subject: "Welcome to MyARI",
    copy: "Welcome to MyARI. Your business is unique. Let’s prepare your workspace together.",
  },
  {
    day: 1,
    key: "discovery",
    subject: "Your business, your workspace",
    copy: "Tell us about your market and priorities. You can save your answers and return anytime.",
  },
  {
    day: 2,
    key: "migration",
    subject: "Bring your relationships with you",
    copy: "Preview your CSV mapping and duplicates before approving an import. Existing contacts will stay intact.",
  },
  {
    day: 3,
    key: "campaign",
    subject: "A thoughtful first follow-up",
    copy: "Your recommended draft is ready for your review. Nothing will be enrolled or sent automatically.",
  },
  {
    day: 5,
    key: "workspace",
    subject: "Make the workspace yours",
    copy: "Review your stages, integrations and outstanding setup steps with your Concierge.",
  },
  {
    day: 7,
    key: "training",
    subject: "A little guidance, at your pace",
    copy: "Explore the short walkthroughs in Concierge. Ask your specialist about a personal session.",
  },
  {
    day: 10,
    key: "progress",
    subject: "What would make setup easier?",
    copy: "Your saved progress shows what remains. Let us know where you would like help.",
  },
  {
    day: 13,
    key: "trial",
    subject: "Review your next chapter",
    copy: "Review your setup and current billing terms in Settings. Your subscription will not change through Concierge.",
  },
];
