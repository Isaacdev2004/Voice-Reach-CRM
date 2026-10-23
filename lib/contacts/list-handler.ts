import { apiError, apiOk } from "@/lib/api-response";
import { CONTACT_SNAPSHOT_ERROR, type OwnedContact } from "./read-snapshot";
import { contactMetricCounts } from "./metrics";
import { evaluateEligibility } from "@/lib/compliance";
import { filterContactsByQuery } from "./schemas";
import { categoriesUsedOnContacts, contactMatchesCategory, filterContactsByCategory, mergeCategoryLists } from "./categories";
import { CONTACT_SEGMENT_TABS, contactMarket, contactSegment, filterContactsBySegment, type ContactSegment } from "./lifecycle";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";

type Dependencies = {
  requireOwnerId: () => Promise<string>;
  readContacts: (ownerId: string) => Promise<OwnedContact[]>;
  loadCategories: (ownerId: string) => Promise<string[] | undefined>;
};

export function createContactListHandler(dependencies: Dependencies) {
  return async (request: Request) => {
    const ownerId = await dependencies.requireOwnerId();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const segment = (searchParams.get("segment") ?? "all") as ContactSegment;
    if (!CONTACT_SEGMENT_TABS.some(tab => tab.id === segment)) return apiError("Choose a valid contact stage.", { status: 400 });
    const category = searchParams.get("category")?.trim() || "all";
    // Back-compat with older ?market=residential|commercial links
    const marketParam = searchParams.get("market")?.trim();
    const categoryFilter =
      category !== "all"
        ? category
        : marketParam && marketParam !== "all"
          ? marketParam
          : "all";

    let data;
    try {
      data = await dependencies.readContacts(ownerId);
    } catch {
      return apiError(CONTACT_SNAPSHOT_ERROR, { status: 503, code: "contacts_incomplete" });
    }

    const savedCategories = await dependencies.loadCategories(ownerId);
    const raw = q ? filterContactsByQuery(data ?? [], q) : (data ?? []);
    const byCategory = filterContactsByCategory(raw, categoryFilter);
    const segmented = filterContactsBySegment(byCategory, segment);
    const contacts = segmented.map((contact) => ({
      ...contact,
      eligibility: evaluateEligibility(contact),
      lifecycleSegment: contactSegment(contact.type),
      market: contactMarket(contact.type),
    }));
    const eligibleCount = contacts.filter((c) => c.eligibility.eligible).length;
    const allRows = data ?? [];
    const categories = mergeCategoryLists(
      savedCategories ?? DEFAULT_SETTINGS.contactCategories,
      categoriesUsedOnContacts(allRows),
    );
    const categoryCounts: Record<string, number> = { all: allRows.length };
    for (const name of categories) {
      categoryCounts[name] = allRows.filter((c) => contactMatchesCategory(c, name)).length;
    }

    return apiOk({
      complete: true,
      contacts,
      total: allRows.length,
      filtered: contacts.length,
      eligibleCount,
      q,
      segment,
      category: categoryFilter,
      categories,
      counts: {
        ...contactMetricCounts(allRows),
        residential: allRows.filter((c) => contactMatchesCategory(c, "Residential")).length,
        commercial: allRows.filter((c) => contactMatchesCategory(c, "Commercial")).length,
        byCategory: categoryCounts,
      },
    });
   };
  };

