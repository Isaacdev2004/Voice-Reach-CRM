import { z } from "zod";
import type { NoteRow } from "./types";
export const CATEGORIES = [
  "General",
  "Clients",
  "Properties",
  "Strategy",
  "Goals",
  "Ideas",
  "Tasks",
  "Meeting Notes",
  "Templates",
] as const;
export const MetadataSchema = z.object({
  category: z.enum(CATEGORIES).default("General"),
  tags: z.array(z.string().trim().min(1).max(40)).max(16).default([]),
  contactIds: z.array(z.string().uuid()).max(20).default([]),
  propertyContactIds: z.array(z.string().uuid()).max(20).default([]),
  pinned: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  originalTranscript: z.string().max(30000).default(""),
  transcriptSource: z.enum(["dictation", "upload", "typed", ""]).default(""),
  priorityIds: z.array(z.string().uuid()).max(100).default([]),
});
export type NoteMetadata = z.infer<typeof MetadataSchema>;
export type WorkspaceNote = NoteRow & {
  metadata: NoteMetadata;
  revision: number;
  client_key: string;
};
export type NoteContact = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  property_address?: string | null;
  preferred_area?: string | null;
  budget?: number | null;
};
export const SaveSchema = z
  .object({
    id: z.string().uuid().nullable().default(null),
    clientKey: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative(),
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    title: z.string().trim().max(200),
    body: z.string().max(30000),
    kind: z.enum(["note", "strategy", "goal"]),
    metadata: MetadataSchema,
  })
  .refine((v) => v.title.length > 0 || v.body.trim().length > 0, {
    message: "Write something before saving.",
  });
export function metadataOf(note: NoteRow & { metadata?: unknown }) {
  return MetadataSchema.parse({
    category:
      note.kind === "goal"
        ? "Goals"
        : note.kind === "strategy"
          ? "Strategy"
          : "General",
    ...((note.metadata as object) ?? {}),
  });
}
export function relatedContactIds(note: NoteRow & { metadata?: unknown }) {
  return [
    ...new Set(
      [note.contact_id, ...metadataOf(note).contactIds].filter(Boolean),
    ),
  ] as string[];
}
export function filterNotes(
  notes: WorkspaceNote[],
  q: string,
  category: string,
  tag: string,
  contactId: string,
  sort: string,
  contacts: NoteContact[],
) {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean),
    byId = new Map(contacts.map((c) => [c.id, c]));
  return notes
    .filter((n) => {
      const m = metadataOf(n),
        ids = relatedContactIds(n);
      const linked = [...ids, ...m.propertyContactIds]
        .map((id) => byId.get(id))
        .filter(Boolean);
      const hay = [
        n.title,
        n.body,
        ...m.tags,
        ...linked.map(
          (c) =>
            `${c!.first_name} ${c!.last_name ?? ""} ${c!.email ?? ""} ${c!.property_address ?? ""}`,
        ),
      ]
        .join(" ")
        .toLowerCase();
      return (
        terms.every((t) => hay.includes(t)) &&
        (!tag || m.tags.includes(tag)) &&
        (!contactId || ids.includes(contactId)) &&
        (category === "All Notes" ||
          (category === "Pinned" && m.pinned) ||
          (category === "Clients" && ids.length > 0) ||
          (category === "Properties" && m.propertyContactIds.length > 0) ||
          (category === "Templates" && m.isTemplate) ||
          m.category === category)
      );
    })
    .sort(
      (a, b) =>
        Number(b.metadata.pinned) - Number(a.metadata.pinned) ||
        (sort === "title"
          ? a.title.localeCompare(b.title)
          : sort === "oldest"
            ? Date.parse(a.updated_at ?? a.created_at) -
              Date.parse(b.updated_at ?? b.created_at)
            : Date.parse(b.updated_at ?? b.created_at) -
              Date.parse(a.updated_at ?? a.created_at)),
    );
}
export const TEMPLATES = [
  [
    "Daily Agent Planner",
    "Goals",
    "## Today’s focus\nDate: [date]\nBusiness outcome: [one meaningful result]\n\n## Top three priorities\n- [ ] [Priority, next action and target time]\n- [ ] [Priority, next action and target time]\n- [ ] [Priority, next action and target time]\n\n## Appointments\n[Time, client, preparation needed — confirm in Calendar]\n\n## Follow-ups\n- [ ] [Contact, reason, channel and agreed next step]\n\n## Notes & reflections\nWhat moved forward? [result]\nCarry forward: [next action]",
  ],
  [
    "Weekly Business Planner",
    "Strategy",
    "## This week’s priorities\nWeek of: [date]\nOutcome to achieve: [measurable result]\n- [ ] [Priority, owner and due date]\n\n## Client follow-ups\n[Client, commitment, next action and due date]\n\n## Marketing focus\n[Audience, useful message, channel and review date]\n\n## Pipeline review\n[Verified opportunity, current stage and next step]\n\n## Weekly reflection\nWins: [results]\nAdjustments: [what to change next week]",
  ],
  [
    "Monthly Goals",
    "Goals",
    "## Business goals\nMonth: [month and year]\nGoal: [specific outcome]\nMeasure: [source and target]\n\n## Milestones & deadlines\n- [ ] [Milestone, owner and date]\n\n## Relationship priorities\n[Clients to support and commitments to honor]\n\n## Progress review\nActual result: [verified result]\nWhat worked: [learning]\nNext adjustment: [action]",
  ],
  [
    "Buyer Consultation",
    "Clients",
    "## Client goals\nConsultation date: [date]\nReason for moving and desired timeline: [client-stated details]\n\n## Location & budget\nPreferred areas: [client preferences]\nBudget and financing status: [client-confirmed details; verify with lender]\n\n## Property preferences\nMust-haves: [requirements]\nFlexible preferences: [options]\n\n## Questions to clarify\n[Unknowns and who will confirm them]\n\n## Agreed next steps\n- [ ] [Action, responsible person and agreed date]",
  ],
  [
    "Seller Consultation",
    "Clients",
    "## Seller goals & timeline\nConsultation date: [date]\nDesired outcome and timing: [seller-stated details]\n\n## Property details\nAddress: [verified address]\nCondition, improvements and documents to obtain: [details]\n\n## Pricing discussion\nVerified comparable sources and dates: [sources]\nQuestions requiring further analysis: [questions]\n\n## Questions to clarify\n[Preparation, showing availability and decision process]\n\n## Agreed next steps\n- [ ] [Action, owner and agreed date]",
  ],
  [
    "Listing Presentation Preparation",
    "Properties",
    "## Talking points\nSeller goals: [confirmed priorities]\nProperty highlights: [verified facts]\n\n## Verified comparables\n[Address, source, date and relevance — do not invent values]\n\n## Marketing strategy\n[Audience, channels, assets required and approval owner]\n\n## Presentation preparation\n- [ ] Verify property facts and supporting documents\n- [ ] Review pricing analysis and open questions\n- [ ] Prepare a proposed timeline for seller review\n\n## Next steps\n[Decision needed, responsible person and date]",
  ],
  [
    "Open House Planning",
    "Properties",
    "## Property & schedule\nProperty: [verified address]\nDate and time: [confirmed schedule]\n\n## Preparation\n- [ ] Confirm seller permission, access and showing instructions\n- [ ] Verify listing facts and prepare approved materials\n- [ ] Prepare sign-in consent and follow-up preferences\n- [ ] Confirm staffing, signage and property security\n\n## Visitor notes\n[Visitor-stated interests and permission to follow up]\n\n## Follow-up plan\n[Contact, agreed next step and date — no automatic sending]",
  ],
  [
    "Client Follow-Up",
    "Clients",
    "## Context\nContact: [client]\nLast conversation and date: [verified details]\nReason for follow-up: [client need or commitment]\n\n## Questions\n[Open questions to clarify]\n\n## Commitments\n[What was agreed, by whom and by when]\n\n## Follow-up checklist\n- [ ] Review authorized CRM history\n- [ ] Prepare a relevant response for review\n- [ ] Record the agreed next action and date",
  ],
  [
    "Marketing Strategy",
    "Strategy",
    "## Objective\n[Specific business outcome and how to measure it]\n\n## Audience\n[Relevant client needs and consent status]\n\n## Channels\n[Channel, useful content and available approved assets]\n\n## Action plan\n- [ ] [Deliverable, owner, review step and due date]\n\n## Review date\n[Date, verified results to review and next adjustment]",
  ],
  [
    "Transaction Checklist",
    "Tasks",
    "## Transaction details\nProperty and parties: [verified details]\nCurrent stage: [confirmed status]\n\n## Confirmed deadlines\n[Date, source document and responsible professional — verify contract requirements]\n\n## Action items\n- [ ] Confirm key dates with the responsible professional\n- [ ] Identify outstanding documents and their owners\n- [ ] Record agreed next steps and follow-up dates\n\n## Open questions\n[Question, person responsible and response needed by]\n\nThis checklist is a planning aid, not a substitute for the contract or professional advice.",
  ],
  [
    "Team Meeting Notes",
    "Meeting Notes",
    "## Agenda\nDate and attendees: [details]\nPurpose: [desired outcome]\n\n## Discussion\n[Verified updates, blockers and options]\n\n## Decisions\n[Decision, decision maker and rationale]\n\n## Owners & next steps\n- [ ] [Action, owner and agreed due date]\n\n## Next check-in\n[Date and what needs to be ready]",
  ],
] as const;
export function plannerRange(day: string, view: "day" | "week" | "month") {
  const d = new Date(day + "T12:00:00");
  const start = new Date(d),
    end = new Date(d);
  if (view === "week") {
    start.setDate(d.getDate() - d.getDay());
    end.setDate(start.getDate() + 7);
  } else if (view === "month") {
    start.setDate(1);
    end.setMonth(d.getMonth() + 1, 1);
  } else end.setDate(d.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  "Daily Agent Planner": "Prioritize three outcomes, appointments and promised follow-ups.",
  "Weekly Business Planner": "Plan client commitments, marketing work and pipeline next steps.",
  "Monthly Goals": "Set measurable goals and review progress against verified results.",
  "Buyer Consultation": "Capture client-stated needs, financing questions and agreed next steps.",
  "Seller Consultation": "Clarify timing, property preparation and pricing questions.",
  "Listing Presentation Preparation": "Prepare verified comparables, talking points and a reviewable plan.",
  "Open House Planning": "Organize permissions, preparation, visitor notes and consent-aware follow-up.",
  "Client Follow-Up": "Honor commitments with a clear reason, useful questions and next action.",
  "Marketing Strategy": "Connect audience needs to deliverables, owners and review dates.",
  "Transaction Checklist": "Track confirmed deadlines, documents, responsibilities and open questions.",
  "Team Meeting Notes": "Turn discussion into explicit decisions, owners and due dates.",
};

/** Create compatible template content without inheriting any client associations. */
export function templateNote(template: readonly [string, string, string], advanced: boolean) {
  const kind: "note" | "strategy" | "goal" = template[1] === "Goals" ? "goal" : template[1] === "Strategy" ? "strategy" : "note";
  return {
    title: template[0], body: template[2], kind,
    metadata: MetadataSchema.parse({ category: advanced ? template[1] : kind === "goal" ? "Goals" : kind === "strategy" ? "Strategy" : "General" }),
  };
}
