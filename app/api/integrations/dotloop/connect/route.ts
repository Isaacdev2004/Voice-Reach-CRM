import { apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { buildDotloopAuthUrl, isDotloopConfigured } from "@/lib/integrations/dotloop";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Starts Dotloop OAuth. Requires DOTLOOP_CLIENT_ID / DOTLOOP_CLIENT_SECRET.
 * Register redirect: {APP_BASE_URL}/api/integrations/dotloop/callback
 */
export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  if (!isDotloopConfigured()) {
    return apiError(
      "Dotloop authorization and encrypted storage are not ready. Contact your workspace administrator.",
      { status: 503, code: "dotloop_not_configured" },
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("dotloop_oauth_state", `${ownerId}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  await writeAuditLog({
    ownerId,
    action: "DOTLOOP_OAUTH_STARTED",
    entityType: "integration",
    entityId: null,
    metadata: {},
  }).catch(() => undefined);

  return NextResponse.redirect(buildDotloopAuthUrl(state));
});
