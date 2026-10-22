import { withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generate } from "@/lib/ai/generate";
import { loadAiContext } from "@/lib/ai/load-context";
import { createAiHandler } from "@/lib/ai/handle-request";

export const POST = withApiHandler(createAiHandler({
  requireOwnerId: requireUserId,
  loadContext: loadAiContext,
  generateDraft: generate,
  audit: (ownerId, task, provider) => writeAuditLog({
    ownerId, action: "AI_GENERATED", entityType: "ai_task", entityId: null,
    metadata: { task, provider },
  }),
}));
