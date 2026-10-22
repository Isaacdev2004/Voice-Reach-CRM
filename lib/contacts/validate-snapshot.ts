import type { ApiContact, ContactCounts } from "@/lib/hooks/use-contacts";
import { contactMetricCounts } from "./metrics";

export type ContactSnapshot = {
  contacts: ApiContact[];
  total: number;
  filtered: number;
  counts: ContactCounts;
  categories: string[];
};

export function validateContactSnapshot(value: unknown, options: { requireAll?: boolean; ownerId?: string } = {}): ContactSnapshot {
  const fail = () => { throw new Error("Unable to load accurate contact totals. Please retry."); };
  if (!value || typeof value !== "object") return fail();
  const data = value as Record<string, unknown>;
  if (data.success !== true || data.complete !== true || !Array.isArray(data.contacts) || !data.counts || typeof data.counts !== "object") return fail();
  const counts = data.counts as ContactCounts;
  const numbers = [data.total, data.filtered, counts.all, counts.coldLead, counts.activeLead, counts.pastClient];
  if (numbers.some(n => typeof n !== "number" || !Number.isSafeInteger(n) || n < 0)) return fail();
  if (data.total !== counts.all || counts.coldLead + counts.activeLead + counts.pastClient !== counts.all) return fail();
  if (data.filtered !== data.contacts.length || Number(data.filtered) > Number(data.total)) return fail();
  if (options.requireAll && data.filtered !== data.total) return fail();
  const contacts = data.contacts as ApiContact[];
  if (contacts.some(c => !c || typeof c.id !== "string" || !c.id || typeof c.first_name !== "string")) return fail();
  if (options.ownerId && contacts.some(c => (c as ApiContact & { owner_id?: string }).owner_id !== options.ownerId)) return fail();
  if (new Set(contacts.map(c => c.id)).size !== contacts.length) return fail();
  if (data.filtered === data.total) {
    const actual = contactMetricCounts(contacts);
    if (Object.entries(actual).some(([key, number]) => counts[key as keyof typeof actual] !== number)) return fail();
  }
  return { contacts, total: Number(data.total), filtered: Number(data.filtered), counts,
    categories: Array.isArray(data.categories) ? data.categories.filter((c): c is string => typeof c === "string") : [] };
}
