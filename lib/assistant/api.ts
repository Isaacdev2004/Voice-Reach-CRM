import { apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { AssistantFailure } from "./store";
import { requireAssistantEnabled } from "./config";
import { ZodError } from "zod";
export function assistantHandler(
  fn: (request: Request, owner: string) => Promise<Response>,
  requireFeature = true,
) {
  return withApiHandler(async (request) => {
    const owner = await requireUserId();
    if (
      request.headers.get("X-MyARI-Owner") &&
      request.headers.get("X-MyARI-Owner") !== owner
    )
      return apiError("Your account changed. Reload before continuing.", {
        status: 409,
      });
    if (Number(request.headers.get("content-length")) > 25000)
      return apiError("Request is too large", { status: 413 });
    try {
      if (requireFeature) await requireAssistantEnabled(owner);
      return await fn(request, owner);
    } catch (e) {
      if (e instanceof AssistantFailure)
        return apiError(e.message, { status: e.status });
      if (e instanceof ZodError || e instanceof SyntaxError)
        return apiError(
          "Check required fields, stable record IDs, dates and timezone. Nothing was executed.",
          { status: 400 },
        );
      return apiError(
        "Assistant service is unavailable. Your saved work remains intact.",
        { status: 503 },
      );
    }
  });
}

export const billingAiHandler = (
  fn: (request: Request, owner: string) => Promise<Response>,
) => assistantHandler(fn, false);
