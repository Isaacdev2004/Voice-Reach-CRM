import { z } from "zod";
import {
  validTimeZone,
  zonedParts,
  addCalendarDays,
  weekDates,
  wallTimeToInstant,
} from "@/lib/calendar/time";
export const TaskMetaSchema = z.object({
  status: z.enum(["todo", "in_progress"]).default("todo"),
  category: z.string().trim().max(50).default(""),
  propertyContactId: z.string().uuid().nullable().default(null),
  assigneeId: z.string().max(200).default(""),
  dependencies: z.array(z.string().uuid()).max(40).default([]),
  transactionId: z.string().uuid().nullable().default(null),
  order: z.number().finite().default(0),
  timezone: z.string().refine(validTimeZone).default("America/New_York"),
  operationKey: z.string().max(200).optional(),
  recurrenceParentId: z.string().uuid().optional(),
  sourceCampaignId: z.string().uuid().nullable().optional(),
  sourceEventId: z.string().max(200).nullable().optional(),
});
export type TaskMeta = z.infer<typeof TaskMetaSchema>;
export type TaskRecord = {
  id: string;
  owner_id: string;
  contact_id: string;
  title: string;
  notes?: string | null;
  due_at: string | null;
  reminder_at?: string | null;
  completed: boolean;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
  priority?: string | null;
  source_note_id?: string | null;
  recurrence?: string | null;
  calendar_event_id?: string | null;
  property_contact_id?: string | null;
  workspace?: unknown;
};
export type TaskContact = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
  property_address?: string | null;
};
export type TaskMember = { id: string; name: string };
export const PreferencesSchema = z.object({
  section: z
    .enum(["my", "templates", "checklists", "contact", "property"])
    .default("my"),
  fromDate: z.string().default(""),
  toDate: z.string().default(""),
  view: z.enum(["list", "board", "focus", "grid"]).default("list"),
  scope: z
    .enum([
      "all",
      "today",
      "upcoming",
      "overdue",
      "high",
      "completed-week",
      "due-week",
    ])
    .default("all"),
  search: z.string().max(300).default(""),
  priority: z
    .enum(["all", "high", "medium", "low", "unspecified"])
    .default("all"),
  status: z
    .enum(["all", "open", "todo", "in_progress", "completed"])
    .default("all"),
  contactId: z.string().max(100).default("all"),
  propertyId: z.string().max(100).default("all"),
  assigneeId: z.string().max(200).default("all"),
  sort: z.enum(["due", "priority", "title", "manual"]).default("due"),
  panelOpen: z.boolean().default(true),
  collapsed: z.array(z.string().max(40)).max(5).default([]),
  focusOrder: z.array(z.string().uuid()).max(100).default([]),
});
export type TaskPreferences = z.infer<typeof PreferencesSchema>;
export function meta(t: TaskRecord): TaskMeta {
  return TaskMetaSchema.parse({
    propertyContactId: t.property_contact_id ?? null,
    ...((t.workspace as Record<string, unknown>) ?? {}),
  });
}
export function priority(t: TaskRecord) {
  return t.priority === "normal"
    ? "medium"
    : ["high", "medium", "low"].includes(t.priority ?? "")
      ? t.priority!
      : "unspecified";
}
export function status(t: TaskRecord) {
  return t.completed ? "completed" : meta(t).status;
}
export function blocked(t: TaskRecord, tasks: TaskRecord[]) {
  return (
    !t.completed &&
    meta(t).dependencies.some(
      (id) => !tasks.some((p) => p.id === id && p.completed),
    )
  );
}
export function dateKey(iso: string | null | undefined, zone: string) {
  return iso && Number.isFinite(Date.parse(iso))
    ? zonedParts(iso, zone).date
    : null;
}
export function bounds(zone: string, now = new Date(), monday = true) {
  const today = zonedParts(now, zone).date;
  const week = weekDates(today, monday);
  return {
    today,
    tomorrow: addCalendarDays(today, 1),
    weekStart: week[0],
    weekEnd: week[6],
  };
}
export function overdue(t: TaskRecord, zone: string, now = new Date()) {
  const date = dateKey(t.due_at, zone);
  return !t.completed && !!date && date < bounds(zone, now).today;
}
export function matchesScope(
  t: TaskRecord,
  scope: TaskPreferences["scope"],
  zone: string,
  now = new Date(),
  monday = true,
) {
  const b = bounds(zone, now, monday),
    due = dateKey(t.due_at, zone),
    completed = dateKey(t.completed_at, zone);
  switch (scope) {
    case "today":
      return due === b.today;
    case "upcoming":
      return !t.completed && !!due && due > b.today;
    case "overdue":
      return overdue(t, zone, now);
    case "high":
      return !t.completed && priority(t) === "high";
    case "completed-week":
      return (
        t.completed &&
        !!completed &&
        completed >= b.weekStart &&
        completed <= b.weekEnd
      );
    case "due-week":
      return !t.completed && !!due && due >= b.weekStart && due <= b.weekEnd;
    default:
      return true;
  }
}
export function filterTasks(
  tasks: TaskRecord[],
  p: TaskPreferences,
  contacts: TaskContact[],
  zone: string,
  now = new Date(),
  monday = true,
  includeScope = true,
) {
  const cMap = new Map(contacts.map((c) => [c.id, c]));
  return tasks.filter((t) => {
    const m = meta(t),
      c = cMap.get(t.contact_id),
      property = cMap.get(m.propertyContactId ?? "");
    return (
      (p.contactId === "all" || t.contact_id === p.contactId) &&
      (p.propertyId === "all" || m.propertyContactId === p.propertyId) &&
      (p.assigneeId === "all" ||
        (m.assigneeId || t.owner_id) === p.assigneeId) &&
      (!p.fromDate ||
        (!!dateKey(t.due_at, zone) &&
          dateKey(t.due_at, zone)! >= p.fromDate)) &&
      (!p.toDate ||
        (!!dateKey(t.due_at, zone) && dateKey(t.due_at, zone)! <= p.toDate)) &&
      (p.priority === "all" || priority(t) === p.priority) &&
      (p.status === "all" ||
        (p.status === "open" ? !t.completed : status(t) === p.status)) &&
      [
        t.title,
        t.notes,
        c?.first_name,
        c?.last_name,
        c?.email,
        c?.phone,
        property?.property_address,
        m.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(p.search.toLowerCase()) &&
      (!includeScope || matchesScope(t, p.scope, zone, now, monday))
    );
  });
}
export function metrics(
  tasks: TaskRecord[],
  zone: string,
  now = new Date(),
  monday = true,
) {
  const open = tasks.filter((t) => !t.completed).length,
    done = tasks.filter((t) =>
      matchesScope(t, "completed-week", zone, now, monday),
    ).length,
    due = tasks.filter((t) =>
      matchesScope(t, "due-week", zone, now, monday),
    ).length,
    late = tasks.filter((t) => overdue(t, zone, now)).length;
  const b = bounds(zone, now, monday),
    weekTasks = tasks.filter((t) => {
      const d = dateKey(t.due_at, zone);
      return d && d >= b.weekStart && d <= b.weekEnd;
    });
  return {
    open,
    completed: done,
    due,
    overdue: late,
    today: tasks.filter(
      (t) => !t.completed && dateKey(t.due_at, zone) === b.today,
    ).length,
    weekTotal: weekTasks.length,
    weekDone: weekTasks.filter((t) => t.completed).length,
  };
}
const ranks: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unspecified: 3,
};
export function sortTasks(
  tasks: TaskRecord[],
  sort: TaskPreferences["sort"],
  order: string[] = [],
) {
  return [...tasks].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "priority"
        ? ranks[priority(a)] - ranks[priority(b)] ||
          String(a.due_at ?? "z").localeCompare(String(b.due_at ?? "z"))
        : sort === "manual"
          ? (order.includes(a.id)
              ? order.indexOf(a.id)
              : 10000 + meta(a).order) -
            (order.includes(b.id) ? order.indexOf(b.id) : 10000 + meta(b).order)
          : String(a.due_at ?? "z").localeCompare(String(b.due_at ?? "z")),
  );
}
export function groupLabel(t: TaskRecord, zone: string, now = new Date()) {
  const b = bounds(zone, now),
    d = dateKey(t.due_at, zone);
  if (t.completed && (!d || d < b.today)) return "Completed";
  if (!d) return "No due date";
  if (d < b.today) return "Overdue";
  if (d === b.today) return "Today";
  if (d === b.tomorrow) return "Tomorrow";
  if (d <= b.weekEnd) return "Later this week";
  return "Upcoming";
}
export function cycleWouldForm(
  tasks: TaskRecord[],
  id: string,
  dependencies: string[],
) {
  const edges = new Map(tasks.map((t) => [t.id, meta(t).dependencies]));
  edges.set(id, dependencies);
  const visiting = new Set<string>(),
    done = new Set<string>();
  function visit(k: string): boolean {
    if (visiting.has(k)) return true;
    if (done.has(k)) return false;
    visiting.add(k);
    if ((edges.get(k) ?? []).some(visit)) return true;
    visiting.delete(k);
    done.add(k);
    return false;
  }
  return [...edges.keys()].some(visit);
}
export const TaskEditSchema = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).default(""),
  contactId: z.string().uuid().nullable().default(null),
  dueAt: z.string().datetime({ offset: true }).nullable().default(null),
  reminderAt: z.string().datetime({ offset: true }).nullable().default(null),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  priority: z
    .enum(["high", "medium", "low", "unspecified"])
    .default("unspecified"),
  completed: z.boolean().default(false),
  sourceNoteId: z.string().uuid().nullable().default(null),
  workspace: TaskMetaSchema.default(() => TaskMetaSchema.parse({})),
  addToCalendar: z.boolean().default(false),
});
export type TaskEdit = z.infer<typeof TaskEditSchema>;
export const TemplateStepSchema = z.object({
  anchor: z.enum(["start", "closing"]).default("start"),
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).default(""),
  days: z.number().int().min(-365).max(730),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  category: z.string().max(40).default("Transaction"),
  dependsOn: z.array(z.number().int().min(0).max(39)).max(20).default([]),
});
export const TemplateSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  kind: z.enum(["buyer", "listing", "checklist"]),
  steps: z.array(TemplateStepSchema).min(1).max(40),
});
export type TaskTemplate = z.infer<typeof TemplateSchema>;
function validDate(d: string) {
  try {
    return new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
  } catch {
    return false;
  }
}
export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  approved: z.literal(true),
  template: TemplateSchema,
  contactId: z.string().uuid(),
  propertyContactId: z.string().uuid().nullable().default(null),
  baseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(validDate),
  closingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(validDate)
    .nullable()
    .default(null),
  timezone: z.string().refine(validTimeZone),
  assigneeId: z.string().max(200).default(""),
});
export function proposedDeadlines(
  template: TaskTemplate,
  base: string,
  zone: string,
  closing: string | null = null,
) {
  wallTimeToInstant(base, "09:00", zone);
  return template.steps.map((s) =>
    s.anchor === "closing" && !closing
      ? null
      : wallTimeToInstant(
          addCalendarDays(s.anchor === "closing" ? closing! : base, s.days),
          "09:00",
          zone,
        ),
  );
}
export type TaskTransaction = {
  id: string;
  owner_id: string;
  contact_id: string;
  payload: {
    name: string;
    kind: string;
    propertyContactId: string | null;
    baseDate: string;
    closingDate: string | null;
    assigneeId: string;
    taskIds: string[];
    template: TaskTemplate;
    stage?: string;
    cancelled?: boolean;
  };
  created_at: string;
};
export function transactionProgress(
  transaction: TaskTransaction,
  tasks: TaskRecord[],
  zone: string,
  now = new Date(),
) {
  const ids = new Set(transaction.payload.taskIds),
    rows = tasks.filter((t) => ids.has(t.id)),
    done = rows.filter((t) => t.completed).length;
  return {
    total: ids.size,
    done,
    remaining: ids.size - done,
    missing: ids.size - rows.length,
    percent: ids.size ? Math.round((done / ids.size) * 100) : 0,
    overdue: rows.filter((t) => overdue(t, zone, now)).length,
    next: sortTasks(
      rows.filter((t) => !t.completed),
      "due",
    )[0],
    stage: transaction.payload.cancelled
      ? "Cancelled"
      : ids.size && done === ids.size
        ? "Completed"
        : (rows.find((t) => !t.completed)?.title ??
          "Review missing milestones"),
  };
}

export function transactionSummary(
  t: TaskTransaction,
  tasks: TaskRecord[],
  zone: string,
  now = new Date(),
) {
  const p = transactionProgress(t, tasks, zone, now),
    rows = t.payload.taskIds
      .map((id) => tasks.find((r) => r.id === id))
      .filter((r): r is TaskRecord => !!r);
  const format = (r: TaskRecord) =>
    `• ${r.title}${r.due_at ? ` — ${new Date(r.due_at).toLocaleString("en-US", { timeZone: zone })} (${zone})` : " — No deadline recorded"}`;
  return `${t.payload.name}
${p.done} of ${p.total} recorded milestones complete.${
    t.payload.closingDate
      ? `
Recorded expected closing date: ${t.payload.closingDate}.`
      : "\nExpected closing date has not been recorded."
  }

Completed milestones:
${
  rows
    .filter((r) => r.completed)
    .map(format)
    .join("\n") || "None recorded yet."
}

Outstanding action items:
${
  rows
    .filter((r) => !r.completed)
    .map(format)
    .join("\n") || "No open recorded milestones."
}${p.missing ? `\n${p.missing} missing milestone(s) require review.` : ""}

${p.next ? `Next recorded step: ${p.next.title}.` : "Review the checklist for next steps."}`;
}
