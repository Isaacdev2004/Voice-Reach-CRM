import { apiError, apiOk } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { disconnectDotloop, fetchDotloopAccountLabel, getDotloopStatus, getValidDotloopAccessToken } from "@/lib/integrations/dotloop";
import { DotloopError } from "@/lib/integrations/dotloop-lifecycle";

function safeError(err: unknown) {
  if (err instanceof Error && err.message === "Unauthorized") return apiError("Sign in required", { status: 401 });
  if (err instanceof DotloopError) return apiError("Dotloop authorization needs attention. Retry or reconnect from Settings.", { status: err.status, code: err.code });
  return apiError("Dotloop is temporarily unavailable.", { status: 503, code: "dotloop_unavailable" });
}
function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export async function GET() {
  try { return apiOk(await getDotloopStatus(await requireUserId())); } catch (err) { return safeError(err); }
}
/** Explicit authenticated verification only. GET/status reads never refresh credentials. */
export async function POST(request: Request) {
  try {
    const owner = await requireUserId();
    if (!sameOrigin(request)) return apiError("Same-origin request required", { status: 403 });
    await fetchDotloopAccountLabel(await getValidDotloopAccessToken(owner));
    return apiOk({ ...(await getDotloopStatus(owner)), verified: true });
  } catch (err) { return safeError(err); }
}
export async function DELETE(request: Request) {
  try {
    const owner = await requireUserId();
    if (!sameOrigin(request)) return apiError("Same-origin request required", { status: 403 });
    const outcome = await disconnectDotloop(owner);
    return apiOk({ connected: false, state: outcome.pending ? "revocation_pending" : "disconnected", ...outcome },
      { status: outcome.pending ? 202 : 200 });
  } catch (err) { return safeError(err); }
}
