export type ContactSegment = "all" | "cold-lead" | "active-lead" | "past-client";

export const CONTACT_SEGMENT_TABS: { id: ContactSegment; label: string; description: string }[] = [
  { id: "all", label: "All contacts", description: "Everyone in your CRM" },
  {
    id: "cold-lead",
    label: "Cold leads",
    description: "New imports and prospects not yet in an active deal",
  },
  {
    id: "active-lead",
    label: "Active leads",
    description: "Warm prospects you are actively working",
  },
  {
    id: "past-client",
    label: "Past clients",
    description: "Closed transactions — exclude from cold outreach",
  },
];

export const CONTACT_TYPE_OPTIONS = [
  { value: "Cold Lead", label: "Cold lead" },
  { value: "Active Lead", label: "Active lead" },
  { value: "Past Client", label: "Past client (closed)" },
  { value: "Imported Contact", label: "Imported / unclassified" },
] as const;

export function contactSegment(type: string | null | undefined): Exclude<ContactSegment, "all"> {
  const t = (type ?? "").toLowerCase();
  if (
    t.includes("past") ||
    t.includes("closed") ||
    t.includes("previous client") ||
    t.includes("past client")
  ) {
    return "past-client";
  }
  if (
    t.includes("active") ||
    t.includes("warm") ||
    t.includes("hot lead") ||
    t === "active lead"
  ) {
    return "active-lead";
  }
  return "cold-lead";
}

export function filterContactsBySegment<T extends { type?: string | null }>(
  contacts: T[],
  segment: ContactSegment,
): T[] {
  if (segment === "all") return contacts;
  return contacts.filter((c) => contactSegment(c.type) === segment);
}

export function segmentBadgeClass(segment: Exclude<ContactSegment, "all">): string {
  switch (segment) {
    case "past-client":
      return "bg-sage-light text-emerald-muted";
    case "active-lead":
      return "bg-rose-gold/15 text-rose-gold-deep";
    case "cold-lead":
    default:
      return "bg-champagne text-taupe";
  }
}

export function segmentLabel(segment: Exclude<ContactSegment, "all">): string {
  return CONTACT_SEGMENT_TABS.find((t) => t.id === segment)?.label ?? "Contact";
}
