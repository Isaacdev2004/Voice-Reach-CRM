import { apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { ZodError } from "zod";
export class ConciergeError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const ids = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export function eligible(owner: string) {
  return (
    process.env.CONCIERGE_ENABLED === "true" &&
    ids(process.env.CONCIERGE_OWNER_IDS).includes(owner)
  );
}
export type StaffRole = "admin" | "manager" | "specialist" | "sales";
export function staffRole(actor: string): StaffRole | null {
  if (process.env.CONCIERGE_ENABLED !== "true") return null;
  for (const role of ["admin", "manager", "specialist", "sales"] as const)
    if (ids(process.env[`CONCIERGE_${role.toUpperCase()}_IDS`]).includes(actor))
      return role;
  return null;
}
export function conciergeHandler(
  fn: (request: Request, actor: string) => Promise<Response>,
  staff = false,
) {
  return withApiHandler(async (request) => {
    try {
      const actor = await requireUserId();
      if (staff ? !staffRole(actor) : !eligible(actor))
        throw new ConciergeError(
          "Concierge is not enabled for this account.",
          404,
        );
      if (request.method !== "GET") {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          throw new ConciergeError("Request origin is not authorized.", 403);
      }
      return await fn(request, actor);
    } catch (e) {
      if (e instanceof ConciergeError)
        return apiError(e.message, { status: e.status });
      if (e instanceof ZodError || e instanceof SyntaxError)
        return apiError(
          "Check the highlighted fields and required confirmations.",
          { status: 400, code: "validation_error" },
        );
      if (e instanceof Error && e.message === "Unauthorized")
        return apiError("Sign in required", { status: 401 });
      console.error("[concierge] operation unavailable");
      return apiError(
        "Concierge could not complete this request. Your saved work is preserved; retry or contact support.",
        { status: 503 },
      );
    }
  });
}
export async function jsonBody(request: Request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 30000)
    throw new ConciergeError("Request is too large.", 413);
  return JSON.parse(text);
}
