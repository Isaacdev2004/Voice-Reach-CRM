import { apiOk, withApiHandler } from "@/lib/api-response";
import { generate } from "@/lib/ai/generate";
import { requireUserId } from "@/lib/auth";
import { loadRelationshipPulseForOwner } from "@/lib/contacts/load-relationship-pulse";
import { pulseBriefForAi } from "@/lib/contacts/pulse-ai-summary";

export const GET = withApiHandler(async (request: Request) => {
  const ownerId = await requireUserId();
  const url = new URL(request.url);
  const includeAi = url.searchParams.get("ai") === "1";

  const pulse = await loadRelationshipPulseForOwner(ownerId);

  if (includeAi) {
    try {
      const brief = pulseBriefForAi(pulse);
      const ai = await generate("relationship_pulse", { tone: "luxury" }, brief);
      const summary =
        typeof ai.output.summary === "string" ? ai.output.summary.trim() : "";
      if (summary) pulse.aiConciergeHint = summary;
    } catch {
      pulse.aiConciergeHint = null;
    }
  }

  return apiOk(pulse);
});
