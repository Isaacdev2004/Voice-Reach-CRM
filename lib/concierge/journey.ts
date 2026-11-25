export const journey = [
  { label: "Your business", title: "Your Business", detail: "Make it yours", key: "discovery", checks: ["discovery"] },
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

/** Display state is derived from authoritative readiness; skipping never implies verification. */
export function journeyStatus(key: string, checks: {key:string;done:boolean}[], state: {importSkipped?:boolean;integrationsNotApplicable?:boolean;connectionReview?:{calendar:boolean;sms:boolean};training?:readonly string[]} = {}, facts: {imported:boolean;integrationsVerified:boolean}, hasDiscovery = false) {
  if(key === "migration" && state.importSkipped && !facts.imported) return "Intentionally skipped";
  if(key === "integrations" && state.integrationsNotApplicable && !facts.integrationsVerified) return "Intentionally skipped";
  if(key === "integrations" && facts.integrationsVerified) return "Verified";
  if(key === "integrations" && state.connectionReview && !facts.integrationsVerified) return "Needs attention";
  const step=journey.find(x=>x.key===key), relevant=checks.filter(c=>(step?.checks as readonly string[]|undefined)?.includes(c.key));
  if(relevant.length && relevant.every(c=>c.done)) return "Reviewed";
  if(relevant.some(c=>c.done)||(key==="discovery"&&hasDiscovery)||(key==="training"&&state.training?.length)) return "In progress";
  return "Not started";
}
