import { apiError, withApiHandler } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
/** Auth stays in each handler; database/configuration details never reach subscribers. */
export function financingHandler(
  handler: (request: Request) => Promise<Response>,
) {
  return withApiHandler(async (request) => {
    try {
      return await handler(request);
    } catch (e) {
      if (e instanceof Error && e.message === "Unauthorized")
        return apiError("Sign in required", { status: 401 });
      if (e instanceof ZodError)
        return apiError(
          "Check the required fields, amounts, and source information.",
          { status: 400 },
        );
      console.error(
        "[financing] request failed",
        e instanceof Error ? e.name : "error",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Financing information is unavailable. Please retry or ask your administrator to check the workspace setup.",
        },
        { status: 503 },
      );
    }
  });
}
