import { z } from "zod";
import { PropertyPreferencesSchema } from "@/lib/property-finder/preferences";
import { validTimeZone } from "@/lib/calendar/time";
import { CalculationSchema } from "@/lib/financing/calculators";
const id = z.string().uuid(),
  text = (n = 2000) => z.string().trim().min(1).max(n);
export const TaskAction = z
  .object({
    kind: z.literal("task"),
    contactId: id,
    title: text(200),
    dueAt: z.string().datetime({ offset: true }),
    notes: z.string().max(2000).default(""),
  })
  .strict();
export const NoteAction = z
  .object({
    kind: z.literal("note"),
    contactId: id,
    title: text(200),
    body: text(8000),
  })
  .strict();
export const MessageAction = z
  .object({
    kind: z.enum(["sms", "email"]),
    contactId: id,
    body: text(8000),
    subject: z.string().max(200).default(""),
    campaignId: id.optional(),
    recipientId: id.optional(),
  })
  .strict()
  .refine(
    (x) => !!x.campaignId === !!x.recipientId,
    "Campaign and recipient enrollment IDs must be provided together",
  );
export const CalendarAction = z
  .object({
    kind: z.literal("calendar"),
    contactId: id,
    title: text(200),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    timeZone: text(100).refine(validTimeZone),
    description: z.string().max(2000).default(""),
  })
  .strict()
  .refine(
    (x) =>
      Date.parse(x.endsAt) > Date.parse(x.startsAt) &&
      Date.parse(x.endsAt) - Date.parse(x.startsAt) <= 86400000,
    "Choose a positive duration of at most one day",
  );
export const CampaignAction = z
  .object({
    kind: z.literal("campaign"),
    name: text(150),
    audience: text(1000),
    description: text(2000),
    durationDays: z.number().int().min(1).max(365),
    steps: z
      .array(
        z
          .object({
            type: z.enum(["sms", "email", "voicemail", "task"]),
            day: z.number().int().min(1).max(365),
            title: text(150),
            description: text(8000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .refine(
    (x) => x.steps.every((s) => s.day <= x.durationDays),
    "Step days must fit the campaign duration",
  );
export const VoiceAction = z
  .object({
    kind: z.literal("voice_script"),
    title: text(120),
    script: text(5000),
  })
  .strict();
export const FlyerAction = z
  .object({
    kind: z.literal("flyer"),
    propertyContactId: id,
    layout: z.enum(["editorial", "minimal"]).default("editorial"),
    accentColor: z
      .string()
      .regex(/^#[a-fA-F0-9]{6}$/)
      .optional(),
    includeHeadshot: z.boolean().default(true),
    headline: text(100),
    description: text(420),
    price: z.number().finite().positive().max(1e10).optional(),
    priceSource: z.literal("subscriber-entered").optional(),
    partnerIds: z.array(id).max(2).default([]),
  })
  .strict()
  .refine(
    (x) => !x.price || x.priceSource === "subscriber-entered",
    "Price requires explicit subscriber provenance",
  );
export const FinancingAction = z
  .object({ kind: z.literal("financing"), calculation: CalculationSchema })
  .strict();
export const FollowUpAction = z
  .object({
    kind: z.literal("follow_up"),
    contactId: id,
    recommendation: text(1200),
    reason: text(1200),
  })
  .strict();
export const ChecklistAction = z
  .object({
    kind: z.literal("checklist"),
    contactId: id,
    propertyContactId: id.optional(),
    templateId: text(120),
    baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    closingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    timeZone: text(100).refine(validTimeZone),
  })
  .strict();
export const PreferencesAction = z
  .object({
    kind: z.literal("property_preferences"),
    contactId: id,
    preferredArea: z.string().max(200).optional(),
    budget: z.number().finite().nonnegative().optional(),
    propertyPreferences: PropertyPreferencesSchema,
  })
  .strict();
export const ActionSchema = z.union([
  TaskAction,
  NoteAction,
  MessageAction,
  CalendarAction,
  CampaignAction,
  VoiceAction,
  FlyerAction,
  FinancingAction,
  FollowUpAction,
  ChecklistAction,
  PreferencesAction,
]);
export type AssistantAction = z.infer<typeof ActionSchema>;
export const PageContextSchema = z
  .object({
    path: z
      .string()
      .regex(/^\/dashboard(?:\/[a-z0-9-]+)*$/i)
      .max(160),
    contactId: id.optional(),
    campaignId: id.optional(),
    noteId: id.optional(),
    propertyContactId: id.optional(),
    taskId: id.optional(),
    transactionId: id.optional(),
    voiceAssetId: id.optional(),
    voiceDraftId: id.optional(),
    eventId: id.optional(),
  })
  .strict();
export const ChatSchema = z
  .object({
    conversationId: id,
    requestId: id,
    message: text(6000),
    context: PageContextSchema.optional(),
  })
  .strict();
export const ApprovalSchema = z
  .object({
    proposalId: id,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    confirmation: z.enum(["CONFIRM_SAVE", "CONFIRM_SEND"]),
  })
  .strict();
export type Proposal = {
  rootId?: string;
  id: string;
  digest: string;
  action: AssistantAction;
  preview: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
  executable: boolean;
  limitation?: string;
};
export type ToolResult = {
  name: string;
  data: unknown;
  source?: string;
  error?: string;
};
