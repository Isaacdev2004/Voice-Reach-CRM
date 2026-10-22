import type { ApiContact } from "@/lib/hooks/use-contacts";
import { filterContactsByCategory } from "./categories";
import { filterContactsByQuery } from "./schemas";
import { CONTACT_SEGMENT_TABS, filterContactsBySegment, type ContactSegment } from "./lifecycle";

export type ContactSort = "name-asc" | "name-desc" | "recent";
export function readWorkspaceState(params: Pick<URLSearchParams, "get">) {
  const segment = params.get("segment") as ContactSegment;
  const sort = params.get("sort") as ContactSort;
  const page = Number(params.get("page") || 1);
  return {
    segment: CONTACT_SEGMENT_TABS.some(tab => tab.id === segment) ? segment : "all" as ContactSegment,
    category: params.get("category") || params.get("market") || "all",
    type: params.get("type") || "all", source: params.get("source") || "all",
    compliance: ["valid", "pending", "blocked"].includes(params.get("compliance") || "") ? params.get("compliance")! : "all",
    activity: ["7", "30", "none"].includes(params.get("activity") || "") ? params.get("activity")! : "all",
    search: params.get("search") || "", q: params.get("q") || "",
    sort: ["name-asc", "name-desc", "recent"].includes(sort) ? sort : "name-asc" as ContactSort,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

/** Consent status is a record label, never a substitute for sending eligibility. */
export function contactConsentStatus(contact: ApiContact): "valid" | "pending" | "blocked" {
  if (contact.dnc || contact.opt_out_requested) return "blocked";
  const latest = [...(contact.consent_records ?? [])].sort((a,b) =>
    (Date.parse(b.created_at ?? "") || 0) - (Date.parse(a.created_at ?? "") || 0))[0];
  return latest?.status === "Yes" ? "valid" : latest?.status === "No" ? "blocked" : "pending";
}

/** Latest existing recorded outreach or engagement date; never creation time. */
export function contactLastActivity(contact: ApiContact): string | null {
  return [contact.last_contacted, contact.last_engagement_at].filter((value): value is string => Boolean(value) && Number.isFinite(Date.parse(value!)))
    .sort((a,b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

export function filterWorkspaceContacts(rows: ApiContact[], state: ReturnType<typeof readWorkspaceState>, now = Date.now()) {
  return filterContactsByQuery(filterContactsByCategory(filterContactsByQuery(rows, state.q), state.category), state.search)
    .filter(contact => {
      const date = Date.parse(contactLastActivity(contact) ?? "");
      const recorded = Number.isFinite(date);
      return (state.type === "all" || contact.type === state.type) &&
        (state.source === "all" || contact.source === state.source) &&
        (state.compliance === "all" || contactConsentStatus(contact) === state.compliance) &&
        (state.activity === "all" || (state.activity === "none" ? !recorded : recorded && date <= now && date >= now - Number(state.activity) * 86400000));
    });
}

export function sortWorkspaceContacts(rows: ApiContact[], segment: ContactSegment, sort: ContactSort) {
  return [...filterContactsBySegment(rows, segment)].sort((a,b) => {
    const name = (c: ApiContact) => `${c.first_name} ${c.last_name ?? ""}`.trim();
    const result = sort === "recent" ? (Date.parse(b.created_at ?? "") || 0) - (Date.parse(a.created_at ?? "") || 0)
      : name(a).localeCompare(name(b)) * (sort === "name-desc" ? -1 : 1);
    return result || a.id.localeCompare(b.id);
  });
}
