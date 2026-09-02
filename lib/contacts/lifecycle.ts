export type ContactSegment = "all" | "cold-lead" | "active-lead" | "past-client";

export type ContactMarket = "all" | "residential" | "commercial";

export const CONTACT_SEGMENT_TABS: { id: ContactSegment; label: string; description: string }[] = [
  { id: "all", label: "All stages", description: "Every lifecycle stage" },
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

export const CONTACT_MARKET_TABS: { id: ContactMarket; label: string; description: string }[] = [
  { id: "all", label: "All markets", description: "Residential and commercial together" },
  {
    id: "residential",
    label: "Residential",
    description: "Home buyers, sellers, and residential past clients",
  },
  {
    id: "commercial",
    label: "Commercial",
    description: "Investors, businesses, and commercial property leads",
  },
];

export const CONTACT_TYPE_OPTIONS = [
  { value: "Residential Lead", label: "Residential lead" },
  { value: "Commercial Lead", label: "Commercial lead" },
  { value: "Cold Lead", label: "Cold lead (unspecified market)" },
  { value: "Active Lead", label: "Active lead (unspecified market)" },
  { value: "Past Client", label: "Past client (closed)" },
  { value: "Residential Past Client", label: "Residential past client" },
  { value: "Commercial Past Client", label: "Commercial past client" },
  { value: "Imported Contact", label: "Imported / unclassified" },
] as const;

export function contactMarket(type: string | null | undefined): Exclude<ContactMarket, "all"> | null {
  const t = (type ?? "").toLowerCase();
  if (t.includes("commercial")) return "commercial";
  if (t.includes("residential") || t.includes("home buyer") || t.includes("home seller")) {
    return "residential";
  }
  return null;
}

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

export function filterContactsByMarket<T extends { type?: string | null }>(
  contacts: T[],
  market: ContactMarket,
): T[] {
  if (market === "all") return contacts;
  return contacts.filter((c) => contactMarket(c.type) === market);
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

export function marketBadgeClass(market: Exclude<ContactMarket, "all">): string {
  return market === "commercial"
    ? "bg-ink/10 text-ink"
    : "bg-sage-light/80 text-emerald-muted";
}

export function segmentLabel(segment: Exclude<ContactSegment, "all">): string {
  return CONTACT_SEGMENT_TABS.find((t) => t.id === segment)?.label ?? "Contact";
}

/** Single-line label for table badges */
export function segmentBadgeLabel(segment: Exclude<ContactSegment, "all">): string {
  switch (segment) {
    case "past-client":
      return "Past client";
    case "active-lead":
      return "Active";
    case "cold-lead":
    default:
      return "Cold";
  }
}

export function marketBadgeLabel(market: Exclude<ContactMarket, "all">): string {
  return market === "commercial" ? "Commercial" : "Residential";
}
