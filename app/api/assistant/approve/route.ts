import { assistantBody } from "@/lib/assistant/body";
import { apiOk } from "@/lib/api-response";
import { assistantHandler } from "@/lib/assistant/api";
import { ApprovalSchema } from "@/lib/assistant/schema";
import { executeApproved, cancelProposal } from "@/lib/assistant/execution";
import { z } from "zod";
export const POST = assistantHandler(async (request, owner) => {
  const body = ApprovalSchema.parse(await assistantBody(request));
  return apiOk({
    outcome: await executeApproved(
      owner,
      body.proposalId,
      body.digest,
      body.confirmation,
    ),
  });
});
export const DELETE = assistantHandler(async (request, owner) => {
  const body = z
    .object({ proposalId: z.string().uuid() })
    .strict()
    .parse(await assistantBody(request));
  return apiOk({ outcome: await cancelProposal(owner, body.proposalId) });
});
