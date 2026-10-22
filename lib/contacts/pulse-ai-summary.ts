import type { RelationshipPulseResult } from "@/lib/contacts/relationship-pulse";

/** Compact facts for the relationship_pulse AI task (no PII beyond first names). */
export function pulseBriefForAi(pulse: RelationshipPulseResult): string {
  const lines = pulse.lanes.map((lane) => {
    const samples = lane.contacts
      .slice(0, 5)
      .map((c) => `${c.name}: ${c.reason}`)
      .join("; ");
    return `${lane.title} (${lane.contacts.length}): ${samples || "none"}`;
  });
  return [
    "Summarize priority for a luxury real estate agent.",
    lines.join("\n"),
    `Rule-based hint: ${pulse.conciergeHint}`,
  ].join("\n");
}
