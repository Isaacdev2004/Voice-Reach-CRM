import { redactCredentials } from "./privacy";
import { z } from "zod";
export const ContextSchema = z.object({
  page: z
    .string()
    .max(180)
    .regex(/^\/dashboard(?:\/[a-zA-Z0-9_/-]*)?$/)
    .default("/dashboard"),
  contactId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  noteId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  scriptId: z.string().uuid().optional(),
});
export const ActionSchema = z
  .object({
    kind: z.enum([
      "task",
      "reminder",
      "campaign_draft",
      "sms_draft",
      "email_draft",
      "voice_script",
      "contact_note",
      "appointment_proposal",
      "mortgage_comparison",
      "flyer_request",
    ]),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(5000),
    contactId: z.string().uuid().nullable().default(null),
    dueAt: z.string().datetime({ offset: true }).nullable().default(null),
    subject: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "sms_draft" && v.body.length > 320)
      ctx.addIssue({
        code: "custom",
        message: "SMS drafts must be at most 320 characters",
      });
    if (["task", "reminder"].includes(v.kind) && v.body.length > 2000)
      ctx.addIssue({ code: "custom", message: "Task notes are too long" });
    if (v.kind === "email_draft" && !v.subject?.trim())
      ctx.addIssue({ code: "custom", message: "Email subject required" });
    if (["task", "reminder", "contact_note"].includes(v.kind) && !v.contactId)
      ctx.addIssue({
        code: "custom",
        message: "Select a contact before proposing this action",
      });
    if (v.kind === "reminder" && !v.dueAt)
      ctx.addIssue({ code: "custom", message: "Reminder date required" });
  });
export const ReplySchema = z
  .object({
    answer: z.string().trim().min(1).max(8000),
    sourceIds: z.array(z.string().uuid()).max(30).default([]),
    actions: z.array(ActionSchema).max(5).default([]),
  })
  .strict();
export type Action = z.infer<typeof ActionSchema>;
export type PageContext = z.infer<typeof ContextSchema>;
export type Reference = { id: string; label: string; href: string };
export const HANDOFFS: Record<Action["kind"], string> = {
  task: "/dashboard/tasks",
  reminder: "/dashboard/tasks",
  contact_note: "/dashboard/notes",
  campaign_draft: "/dashboard/campaigns",
  sms_draft: "/dashboard/contacts",
  email_draft: "/dashboard/contacts",
  voice_script: "/dashboard/voice-scripts",
  appointment_proposal: "/dashboard/calendar",
  mortgage_comparison: "/dashboard/mortgage",
  flyer_request: "/dashboard/mortgage",
};
export function validateReply(raw: unknown, references: Reference[]) {
  const reply = ReplySchema.parse(raw);
  if (redactCredentials(JSON.stringify(reply)) !== JSON.stringify(reply))
    throw Error("SENSITIVE_OUTPUT");
  const known = new Set(references.map((r) => r.id));
  if (
    reply.sourceIds.some((id) => !known.has(id)) ||
    reply.actions.some((a) => a.contactId && !known.has(a.contactId))
  )
    throw Error("UNVERIFIED_REFERENCE");
  if (/```|^\s*[{[]/.test(reply.answer)) throw Error("TECHNICAL_OUTPUT");
  return {
    ...reply,
    sources: references.filter((r) => reply.sourceIds.includes(r.id)),
  };
}
