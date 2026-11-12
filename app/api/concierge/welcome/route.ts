import { z } from "zod";
import { apiOk } from "@/lib/api-response";
import { conciergeHandler, jsonBody } from "@/lib/concierge/access";
import { loadCase } from "@/lib/concierge/store";
import { caseFacts } from "@/lib/concierge/status";
import { readiness, staffSignoff } from "@/lib/concierge/readiness";
import { journeyHref } from "@/lib/concierge/journey";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";
const actions = {
  begin: "CONCIERGE_WELCOME_ACKNOWLEDGED",
  explore: "CONCIERGE_WELCOME_ACKNOWLEDGED",
  dismissCard: "CONCIERGE_CARD_DISMISSED",
  acknowledgeCompletion: "CONCIERGE_COMPLETION_ACKNOWLEDGED",
} as const;
export const GET = conciergeHandler(async (_request, owner) => {
  const [record, status, preferences] = await Promise.all([
    loadCase(owner), caseFacts(owner),
    supabaseAdmin.from("audit_logs").select("action").eq("owner_id", owner)
      .eq("entity_type", "concierge_preferences")
      .in("action", [...new Set(Object.values(actions))]).order("created_at", {ascending: false}).limit(100),
  ]);
  if (preferences.error) throw preferences.error;
  const seen = new Set(preferences.data.map(p => p.action));
  const progress = readiness(record, status.facts);
  const complete = progress.ready && staffSignoff(record).approved;
  return apiOk({
    showWelcome: !record && !seen.has(actions.begin),
    showCard: complete ? !seen.has(actions.acknowledgeCompletion) : !seen.has(actions.dismissCard),
    complete, checklistReady: progress.ready,
    progress: {completed: progress.completed, total: progress.total},
    next: progress.next?.label ?? (complete ? "Your setup review is complete" : "Awaiting independent manager review"),
    href: journeyHref(progress.next?.key),
  });
});
export const POST = conciergeHandler(async (request, owner) => {
  const input = z.object({action: z.enum(["begin", "explore", "dismissCard", "acknowledgeCompletion"])}).strict().parse(await jsonBody(request));
  // Append-only UI preferences never mutate cases or invalidate version-bound signoff.
  const existing = await supabaseAdmin.from("audit_logs").select("id").eq("owner_id", owner)
    .eq("entity_type", "concierge_preferences").eq("action", actions[input.action]).limit(1);
  if (existing.error) throw existing.error;
  if (!existing.data.length) await writeAuditLog({ownerId: owner, action: actions[input.action], entityType: "concierge_preferences", metadata: {intent: input.action}});
  return apiOk({saved: true});
});
