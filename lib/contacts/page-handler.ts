import { apiOk, apiError } from "@/lib/api-response";
import type { OwnedContact } from "./read-snapshot";
import {
  filterWorkspaceContacts,
  sortWorkspaceContacts,
  readWorkspaceState,
} from "./workspace";
import { contactMetricCounts } from "./metrics";
import { categoriesUsedOnContacts, mergeCategoryLists } from "./categories";
import { z } from "zod";
const requestSchema = z
  .object({
    q: z.string().max(512).optional(),
    search: z.string().max(512).optional(),
    segment: z
      .enum(["all", "cold-lead", "active-lead", "past-client"])
      .optional(),
    category: z.string().max(40).optional(),
    market: z.string().max(40).optional(),
    type: z.string().max(200).optional(),
    source: z.string().max(300).optional(),
    compliance: z.enum(["all", "valid", "pending", "blocked"]).optional(),
    activity: z.enum(["all", "7", "30", "none"]).optional(),
    sort: z.enum(["name-asc", "name-desc", "recent"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    viewIds: z.string().max(40000).optional(),
  })
  .strict();
export function createContactPageHandler(deps: {
  requireOwnerId: () => Promise<string>;
  readContacts: (owner: string) => Promise<OwnedContact[]>;
  loadCategories: (owner: string) => Promise<string[] | undefined>;
  loadAllowance?: (owner: string) => Promise<number | null>;
}) {
  return async (request: Request) => {
    const owner = await deps.requireOwnerId();
    if (!owner) throw Error("Unauthorized");
    const params = new URL(request.url).searchParams,
      parsed = requestSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success)
      return apiError(
        "Choose valid contact filters and a page size between 1 and 100.",
        { status: 400 },
      );
    const state = readWorkspaceState(params),
      size = parsed.data.pageSize || 25;
    let ids: Set<string> | null = null;
    if (parsed.data.viewIds) {
      const list = parsed.data.viewIds.split(",");
      if (
        list.length > 1000 ||
        list.some((id) => !z.string().uuid().safeParse(id).success)
      )
        return apiError("Invalid relationship view.", { status: 400 });
      ids = new Set(list);
    }
    try {
      const [rows, saved, allowance] = await Promise.all([
        deps.readContacts(owner),
        deps.loadCategories(owner),
        deps.loadAllowance?.(owner),
      ]);
      if (rows.some((row) => row.owner_id !== owner))
        throw Error("Ownership mismatch");
      const view = filterWorkspaceContacts(rows, state).filter(
        (row) => !ids || ids.has(row.id),
      );
      const filtered = sortWorkspaceContacts(view, state.segment, state.sort);
      const pages = Math.max(1, Math.ceil(filtered.length / size)),
        page = Math.min(state.page, pages);
      return apiOk({
        complete: true,
        paginated: true,
        ...(allowance !== undefined ? { contactsLimit: allowance } : {}),
        contacts: filtered.slice((page - 1) * size, page * size),
        total: rows.length,
        filtered: filtered.length,
        page,
        pageSize: size,
        pages,
        counts: contactMetricCounts(rows),
        viewCounts: contactMetricCounts(view),
        categories: mergeCategoryLists(saved, categoriesUsedOnContacts(rows)),
        typeOptions: [
          ...new Set(rows.flatMap((row) => (row.type ? [row.type] : []))),
        ],
        sourceOptions: [
          ...new Set(rows.flatMap((row) => (row.source ? [row.source] : []))),
        ].sort(),
      });
    } catch {
      return apiError(
        "Unable to load an accurate contact page. Please retry.",
        { status: 503, code: "contacts_incomplete" },
      );
    }
  };
}
