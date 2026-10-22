import { contactSegment } from "./lifecycle";

/** Existing type-based lifecycle partition, once per primary key. */
export function contactMetricCounts(rows: readonly { id: string; type?: string | null }[]) {
  const counts = { all: 0, coldLead: 0, activeLead: 0, pastClient: 0 };
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    counts.all += 1;
    const stage = contactSegment(row.type);
    if (stage === "cold-lead") counts.coldLead += 1;
    else if (stage === "active-lead") counts.activeLead += 1;
    else counts.pastClient += 1;
  }
  return counts;
}
