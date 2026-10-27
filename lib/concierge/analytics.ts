import type { CaseRecord } from "./schema";
import { readiness } from "./readiness";
type Facts = {
  imported: boolean;
  campaignDraft: boolean;
  integrationsVerified: boolean;
};
/** Only actual scoped cases/events are measured. Unknown denominators stay unavailable. */
export function conciergeAnalytics(
  cases: CaseRecord[],
  facts: Map<string, Facts>,
  events: { owner_id: string; action: string; created_at: string }[],
) {
  const progress = cases.map((c) => ({
    c,
    p: readiness(
      c,
      facts.get(c.owner_id) ?? {
        imported: false,
        campaignDraft: false,
        integrationsVerified: false,
      },
    ),
  }));
  const firstDraftMinutes = cases.flatMap((c) => {
    const first = events
      .filter(
        (e) =>
          e.owner_id === c.owner_id && e.action === "CAMPAIGN_DRAFT_PREPARED",
      )
      .map((e) => Date.parse(e.created_at))
      .sort((a, b) => a - b)[0];
    const created = Date.parse(c.created_at);
    return Number.isFinite(first) && first >= created
      ? [(first - created) / 60000]
      : [];
  });
  const count = (key: string) =>
    progress.filter(({ p }) => p.checks.find((s) => s.key === key)?.done)
      .length;
  return {
    denominator: cases.length,
    denominatorLabel:
      "Authorized cases that actually started Concierge; not all registrations",
    discoveryCompleted: count("discovery"),
    importsCompleted: cases.filter((c) => facts.get(c.owner_id)?.imported)
      .length,
    firstDraftPrepared: count("campaign"),
    campaignReviewed: count("review"),
    trainingCompleted: count("training"),
    meanMinutesToFirstDraft: firstDraftMinutes.length
      ? Math.round(
          firstDraftMinutes.reduce((a, b) => a + b, 0) /
            firstDraftMinutes.length,
        )
      : null,
    firstDraftTimingSample: firstDraftMinutes.length,
    registrationToStart: null,
    trialToPaidConversion: null,
    firstAuthorizedLaunch: null,
    supportResolutionTime: null,
    unavailableReason:
      "Registration cohort, billing-transition, campaign-launch and support-ticket event linkage are not instrumented by this release. No historical events were fabricated.",
  };
}
