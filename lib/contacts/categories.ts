export const DEFAULT_CONTACT_CATEGORIES = ["Residential", "Commercial"] as const;

export type ContactCategoryFilter = "all" | string;

export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40);
}

export function categorySlug(name: string): string {
  return normalizeCategoryName(name).toLowerCase();
}

export function mergeCategoryLists(
  saved: string[] | null | undefined,
  fromContacts: string[] = [],
): string[] {
  const map = new Map<string, string>();
  const seed = saved?.length ? saved : [...DEFAULT_CONTACT_CATEGORIES];
  for (const name of [...seed, ...fromContacts]) {
    const normalized = normalizeCategoryName(name);
    if (!normalized) continue;
    const key = categorySlug(normalized);
    if (!map.has(key)) map.set(key, normalized);
  }
  return [...map.values()];
}

export function contactMatchesCategory(
  contact: { category?: string | null; type?: string | null },
  category: string,
): boolean {
  const target = categorySlug(category);
  if (!target) return false;
  const assigned = contact.category?.trim();
  if (assigned && categorySlug(assigned) === target) return true;
  // Back-compat: older Residential/Commercial leads stored only in type
  const type = (contact.type ?? "").toLowerCase();
  if (target === "residential" && type.includes("residential")) return true;
  if (target === "commercial" && type.includes("commercial")) return true;
  return false;
}

export function filterContactsByCategory<
  T extends { category?: string | null; type?: string | null },
>(contacts: T[], category: ContactCategoryFilter): T[] {
  if (category === "all") return contacts;
  return contacts.filter((c) => contactMatchesCategory(c, category));
}

export function categoriesUsedOnContacts(
  contacts: { category?: string | null; type?: string | null }[],
): string[] {
  const found = new Set<string>();
  for (const c of contacts) {
    if (c.category?.trim()) found.add(normalizeCategoryName(c.category));
    const t = (c.type ?? "").toLowerCase();
    if (t.includes("residential")) found.add("Residential");
    if (t.includes("commercial")) found.add("Commercial");
  }
  return [...found];
}
