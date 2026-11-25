import { apiOk } from "@/lib/api-response";
import { conciergeHandler, jsonBody } from "@/lib/concierge/access";
import { CaseChange } from "@/lib/concierge/schema";
import { loadCase, mutate, events } from "@/lib/concierge/store";
import { caseFacts } from "@/lib/concierge/status";
import { readiness, staffSignoff } from "@/lib/concierge/readiness";
import { PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";
import { PREMIUM_CAMPAIGN_DRAFTS } from "@/lib/campaigns/premium-drafts";
export const GET = conciergeHandler(async (_request, owner) => {
  const [record, status, history] = await Promise.all([
    loadCase(owner),
    caseFacts(owner),
    events(owner),
  ]);
  const specialty = record?.discovery.specialty;
  const category =
    specialty === "buyer" || specialty === "seller" ? specialty : null;
  return apiOk({
    record: record ? subscriberRecord(record) : null,
    ...status,
    readiness: readiness(record, status.facts),
    staffSignoff: staffSignoff(record),
    history,
    templates: PREMIUM_CAMPAIGN_DRAFTS.filter((t) => {
      const source = PRODUCT_CAMPAIGN_TEMPLATES.find(
        (base) => base.id === t.sourceId,
      );
      return (
        !category ||
        !source?.category ||
        source.category === category ||
        source.category === "general"
      );
    }).map((t) => ({
      key: t.revisionKey,
      name: t.name,
      description: t.description,
      steps: t.steps,
    })),
  });
});
export const POST = conciergeHandler(async (request, owner) => {
  const b = CaseChange.parse(await jsonBody(request));
  const patch = {
    ...(b.discovery ? { discovery: b.discovery } : {}),
    ...(b.milestones ? { milestones: b.milestones } : {}),
  };
  const record = await mutate(
    owner,
    owner,
    b.requestId,
    b.version,
    patch,
    b.discovery ? "DISCOVERY_SAVED" : "MILESTONES_REVIEWED",
  );
  return apiOk({ record: subscriberRecord(record) });
});
function subscriberRecord(record: import("@/lib/concierge/schema").CaseRecord) {
  const { internal_note: _note, assignee_id: _assignee, ...subscriber } = record;
  const { staffReview: _review, ...visibleMilestones } = subscriber.milestones;
  return { ...subscriber, milestones: visibleMilestones };
}
