import type { ApiContact, ContactCounts } from "@/lib/hooks/use-contacts";
import { contactMetricCounts } from "./metrics";

export type ContactSnapshot = {
  contacts: ApiContact[];
  total: number;
  filtered: number;
  counts: ContactCounts;
  categories: string[];
  contactsLimit?: number | null;
  paginated?: boolean;
  page?: number;
  pageSize?: number;
  pages?: number;
  viewCounts?: ContactCounts;
  typeOptions?: string[];
  sourceOptions?: string[];
};

export function validateContactSnapshot(
  value: unknown,
  options: { requireAll?: boolean; ownerId?: string } = {},
): ContactSnapshot {
  const fail = () => {
    throw new Error("Unable to load accurate contact totals. Please retry.");
  };
  if (!value || typeof value !== "object") return fail();
  const data = value as Record<string, unknown>;
  if (
    data.success !== true ||
    data.complete !== true ||
    !Array.isArray(data.contacts) ||
    !data.counts ||
    typeof data.counts !== "object"
  )
    return fail();
  const counts = data.counts as ContactCounts;
  const numbers = [
    data.total,
    data.filtered,
    counts.all,
    counts.coldLead,
    counts.activeLead,
    counts.pastClient,
  ];
  if (
    numbers.some(
      (n) => typeof n !== "number" || !Number.isSafeInteger(n) || n < 0,
    )
  )
    return fail();
  if (
    data.total !== counts.all ||
    counts.coldLead + counts.activeLead + counts.pastClient !== counts.all
  )
    return fail();
  const paginated = data.paginated === true;
  if (paginated) {
    if (
      ![data.page, data.pageSize, data.pages].every(
        (n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 1,
      ) ||
      Number(data.pageSize) > 100 ||
      Number(data.page) > Number(data.pages) ||
      data.contacts.length > Number(data.pageSize) ||
      Number(data.filtered) < data.contacts.length
    )
      return fail();
  } else if (data.filtered !== data.contacts.length) return fail();
  if (Number(data.filtered) > Number(data.total)) return fail();
  if (paginated) {
    const view = data.viewCounts as ContactCounts;
    if (
      !view ||
      [view.all, view.coldLead, view.activeLead, view.pastClient].some(
        (n) => !Number.isSafeInteger(n) || n < 0,
      ) ||
      view.coldLead + view.activeLead + view.pastClient !== view.all ||
      view.all > Number(data.total) ||
      view.all < Number(data.filtered)
    )
      return fail();
    if (
      Number(data.pages) !==
        Math.max(1, Math.ceil(Number(data.filtered) / Number(data.pageSize))) ||
      data.contacts.length !==
        Math.min(
          Number(data.pageSize),
          Math.max(
            0,
            Number(data.filtered) -
              (Number(data.page) - 1) * Number(data.pageSize),
          ),
        )
    )
      return fail();
  }
  if (!paginated && options.requireAll && data.filtered !== data.total)
    return fail();
  const contacts = data.contacts as ApiContact[];
  if (
    contacts.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        !c.id ||
        typeof c.first_name !== "string",
    )
  )
    return fail();
  if (
    options.ownerId &&
    contacts.some(
      (c) =>
        (c as ApiContact & { owner_id?: string }).owner_id !== options.ownerId,
    )
  )
    return fail();
  if (new Set(contacts.map((c) => c.id)).size !== contacts.length)
    return fail();
  if (data.contacts.length === data.total) {
    const actual = contactMetricCounts(contacts);
    if (
      Object.entries(actual).some(
        ([key, number]) => counts[key as keyof typeof actual] !== number,
      )
    )
      return fail();
  }
  return {
    contacts,
    ...(data.contactsLimit === null ||
    (Number.isSafeInteger(data.contactsLimit) && Number(data.contactsLimit) > 0)
      ? { contactsLimit: data.contactsLimit as number | null }
      : {}),
    total: Number(data.total),
    filtered: Number(data.filtered),
    counts,
    ...(paginated
      ? {
          paginated: true,
          page: Number(data.page),
          pageSize: Number(data.pageSize),
          pages: Number(data.pages),
          viewCounts: data.viewCounts as ContactCounts,
          typeOptions: data.typeOptions as string[],
          sourceOptions: data.sourceOptions as string[],
        }
      : {}),
    categories: Array.isArray(data.categories)
      ? data.categories.filter((c): c is string => typeof c === "string")
      : [],
  };
}
