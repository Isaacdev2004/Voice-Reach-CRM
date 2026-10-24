import { assistantBody } from "@/lib/assistant/body";
import { apiOk } from "@/lib/api-response";
import { assistantHandler } from "@/lib/assistant/api";
import { runAssistant } from "@/lib/assistant/orchestrator";
export const maxDuration = 120;
export const POST = assistantHandler(async (request, owner) =>
  apiOk(await runAssistant(owner, await assistantBody(request))),
);
