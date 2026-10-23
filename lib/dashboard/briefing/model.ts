import { z } from "zod";
import { validTimeZone, zonedParts } from "@/lib/calendar/time";
export const categories = [
  "tasks",
  "appointments",
  "replies",
  "calls",
  "transactions",
  "delivery",
  "activity",
] as const;
export type Category = (typeof categories)[number];
export const Preferences = z
  .object({
    show: z.boolean().default(true),
    enabled: z.boolean().default(false),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("08:30"),
    timezone: z.string().refine(validTimeZone).default("America/New_York"),
    weekdaysOnly: z.boolean().default(true),
    delivery: z.enum(["dashboard", "in_app"]).default("dashboard"),
    categories: z
      .array(z.enum(categories))
      .max(7)
      .default([...categories]),
    limit: z.number().int().min(1).max(10).default(2),
    collapsed: z.boolean().default(false),
    layout: z.enum(["compact", "comfortable"]).default("compact"),
    dismissed: z.array(z.string().max(120)).max(100).default([]),
    order: z.array(z.string().max(120)).max(100).default([]),
  })
  .strict();
export type BriefingPreferences = z.infer<typeof Preferences>;
export type Priority = {
  id: string;
  category: Category;
  title: string;
  reason: string;
  at: string;
  href: string;
  rank: number;
  observedAt?: string;
  contactId?: string;
  contactName?: string;
  campaignId?: string;
  actions?: { label: string; href: string }[];
};
export type Snapshot = {
  items: Priority[];
  total: number;
  counts: Record<string, number>;
  limitations: string[];
  updatedAt: string;
  since: string | null;
};
export function orderedPriorities(
  items: Priority[],
  prefs: BriefingPreferences,
) {
  const positions = new Map(prefs.order.map((id, i) => [id, i]));
  return items
    .filter(
      (i) =>
        prefs.categories.includes(i.category) &&
        !prefs.dismissed.includes(i.id),
    )
    .sort(
      (a, b) =>
        (positions.get(a.id) ?? 1000) - (positions.get(b.id) ?? 1000) ||
        a.rank - b.rank ||
        a.at.localeCompare(b.at) ||
        a.id.localeCompare(b.id),
    );
}
export function briefingDue(
  p: BriefingPreferences,
  now: Date,
  quietStart = "20:00",
  quietEnd = "08:00",
) {
  if (
    !p.enabled ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietStart) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietEnd)
  )
    return false;
  const local = zonedParts(now, p.timezone);
  if (
    p.weekdaysOnly &&
    [0, 6].includes(new Date(local.date + "T12:00Z").getUTCDay())
  )
    return false;
  const quiet =
    quietStart === quietEnd
      ? false
      : quietStart < quietEnd
        ? local.time >= quietStart && local.time < quietEnd
        : local.time >= quietStart || local.time < quietEnd;
  return !quiet && local.time >= p.time;
}
export const categoryLabels: Record<Category, string> = {
  tasks: "Tasks",
  appointments: "Appointments",
  replies: "Lead replies",
  calls: "Missed calls",
  transactions: "Transactions",
  delivery: "Delivery issues",
  activity: "Contact activity",
};
