import { apiOk } from "@/lib/api-response";
import { assistantHandler } from "@/lib/assistant/api";
import { entries } from "@/lib/assistant/store";
export const GET = assistantHandler(async (_request, owner) => {
  const [proposals, outcomes, claims] = await Promise.all([
    entries(owner, "proposal", undefined, 100),
    entries(owner, "outcome", undefined, 100),
    entries(owner, "claim", undefined, 100),
  ]);
  return apiOk({
    limited: proposals.length === 100,
    work: proposals.map((row) => {
      const p = row.metadata,
        outcome = outcomes.find((e) => e.entity_id === row.entity_id)?.metadata,
        claim = claims.find((e) => e.entity_id === row.entity_id);
      const status =
        outcome?.state === "completed"
          ? "Completed"
          : outcome?.state === "cancelled"
            ? "Cancelled"
            : outcome?.state === "needs_review"
              ? "Needs Attention"
              : claim
                ? Date.now() - Date.parse(claim.created_at) > 120000
                  ? "Needs Attention"
                  : "In Progress"
                : Date.parse(String(p.expiresAt)) < Date.now()
                  ? "Needs Attention"
                  : "Awaiting Approval";
      return {
        proposal: p,
        outcome: outcome ?? null,
        status,
        at: row.created_at,
      };
    }),
  });
});
