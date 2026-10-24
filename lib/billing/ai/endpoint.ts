import { requireUserId } from "@/lib/auth";
import { apiError, withApiHandler } from "@/lib/api-response";
import { legacyAi } from "./legacy";
import { AssistantFailure } from "@/lib/assistant/store";
class FailedResponse extends Error {
  constructor(public response: Response) {
    super("AI operation failed");
  }
}
export function meterExisting(
  handler: (request: Request, context: unknown) => Promise<Response>,
) {
  return withApiHandler(async (request, context) => {
    const owner = await requireUserId();
    try {
      return await legacyAi(
        owner,
        "requests",
        `existing-ai:${crypto.randomUUID()}`,
        async () => {
          const response = await handler(request, context);
          if (!response.ok) throw new FailedResponse(response);
          return response;
        },
      );
    } catch (e) {
      if (e instanceof FailedResponse) return e.response;
      if (e instanceof AssistantFailure)
        return apiError(e.message, { status: e.status });
      return apiError(
        "AI operation could not be confirmed. Saved work is unchanged.",
        { status: 503 },
      );
    }
  });
}
