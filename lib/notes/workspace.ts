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
    "## Top priorities\n- [ ] \n\n## Appointments\n\n## Follow-ups\n- [ ] \n\n## Notes & reflections",
  ],
  [
    "Weekly Business Planner",
    "Strategy",
    "## This week’s priorities\n- [ ] \n\n## Client follow-ups\n\n## Marketing focus\n\n## Weekly reflection",
  ],
  [
    "Monthly Goals",
    "Goals",
    "## Business goals\n\n## Milestones & deadlines\n\n## Progress review",
  ],
  [
    "Buyer Consultation",
    "Clients",
    "## Client goals\n\n## Location & budget\n\n## Property preferences\n\n## Questions to clarify\n\n## Agreed next steps\n- [ ] ",
  ],
  [
    "Seller Consultation",
    "Clients",
    "## Seller goals & timeline\n\n## Property details\n\n## Pricing discussion\n\n## Questions to clarify\n\n## Agreed next steps",
  ],
  [
    "Listing Presentation Preparation",
    "Properties",
    "## Talking points\n\n## Verified comparables\n\n## Marketing strategy\n\n## Next steps\n- [ ] ",
  ],
  [
    "Open House Planning",
    "Properties",
    "## Property & schedule\n\n## Preparation\n- [ ] \n\n## Visitor notes\n\n## Follow-up plan",
  ],
  [
    "Client Follow-Up",
    "Clients",
    "## Context\n\n## Questions\n\n## Commitments\n\n## Follow-up checklist\n- [ ] ",
  ],
  [
    "Marketing Strategy",
    "Strategy",
    "## Objective\n\n## Audience\n\n## Channels\n\n## Action plan\n\n## Review date",
  ],
  [
    "Transaction Checklist",
    "Tasks",
    "## Transaction details\n\n## Confirmed deadlines\n\n## Action items\n- [ ] \n\n## Open questions",
  ],
  [
    "Team Meeting Notes",
    "Meeting Notes",
    "## Agenda\n\n## Discussion\n\n## Decisions\n\n## Owners & next steps\n- [ ] ",
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
