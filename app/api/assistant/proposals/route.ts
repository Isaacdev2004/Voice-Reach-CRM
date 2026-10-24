import { assistantBody } from "@/lib/assistant/body";
import { apiOk } from "@/lib/api-response";
import { assistantHandler } from "@/lib/assistant/api";
import { prepareAction, proposalOutcome } from "@/lib/assistant/proposals";
import { getProposal } from "@/lib/assistant/store";
import { z } from "zod";
export const POST = assistantHandler(async (request, owner) => {
  const raw = await assistantBody(request);
  const envelope = z
    .object({ action: z.unknown(), revisionOf: z.string().uuid() })
    .strict()
    .safeParse(raw);
  return apiOk({
    proposal: envelope.success
      ? await prepareAction(owner, envelope.data.action, {
          revisionOf: envelope.data.revisionOf,
        })
      : await prepareAction(owner, raw),
  });
});
export const GET = assistantHandler(async (request, owner) => {
  const id = z
    .string()
    .uuid()
    .parse(new URL(request.url).searchParams.get("id"));
  return apiOk({
    proposal: await getProposal(owner, id),
    outcome: await proposalOutcome(owner, id),
  });
});
