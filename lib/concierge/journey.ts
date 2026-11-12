export const journey = [
  { label: "Your business", title: "Business profile", detail: "Make it yours", key: "discovery", checks: ["discovery"] },
  { label: "Contact migration", title: "Your relationships", detail: "Bring them with you", key: "migration", checks: ["migration"] },
  { label: "Campaign concierge", title: "First follow-up", detail: "Thoughtfully prepared", key: "campaigns", checks: ["campaign", "review"] },
  { label: "Connections", title: "Connected workspace", detail: "Securely, at your pace", key: "integrations", checks: ["integrations"] },
  { label: "Walkthroughs", title: "A personal orientation", detail: "Find your rhythm", key: "training", checks: ["training"] },
  { label: "Launch review", title: "Your next chapter", detail: "Review with confidence", key: "review", checks: ["stages", "launch"] },
] as const;
export function nextJourneyStep(key?: string | null) {
  return journey.find(step => (step.checks as readonly string[]).includes(key ?? "")) ?? journey[0];
}
export function journeyHref(key?: string | null) {
  return `/dashboard/concierge?step=${nextJourneyStep(key).key}`;
}
