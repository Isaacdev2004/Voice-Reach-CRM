import { writeAuditLog } from "@/lib/audit";
import {
  appBaseUrl,
  exchangeDotloopCode,
  fetchDotloopAccountLabel,
  upsertDotloopConnection,
} from "@/lib/integrations/dotloop";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function errorRedirect(base: string, reason: string) {
  return NextResponse.redirect(
    `${base}/dashboard/settings?tab=workspace&dotloop=error&reason=${encodeURIComponent(reason)}`,
  );
}

export async function GET(request: Request) {
  const base = appBaseUrl();

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) return errorRedirect(base, oauthError);

    const cookieStore = await cookies();
    const stored = cookieStore.get("dotloop_oauth_state")?.value;
    cookieStore.delete("dotloop_oauth_state");

    if (!code || !state || !stored) return errorRedirect(base, "missing_code_or_session");

    const [ownerId, nonce] = stored.split(":");
    if (!ownerId || nonce !== state) return errorRedirect(base, "session_mismatch");

    const tokens = await exchangeDotloopCode(code);
    const accountLabel = await fetchDotloopAccountLabel(tokens.access_token);
    const { error } = await upsertDotloopConnection({
      ownerId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in,
      accountLabel,
    });

    if (error) {
      const reason = error.message.includes("integration_connections")
        ? "database_table_missing"
        : error.message;
      return errorRedirect(base, reason);
    }

    await writeAuditLog({
      ownerId,
      action: "DOTLOOP_CONNECTED",
      entityType: "integration",
      entityId: ownerId,
      metadata: { accountLabel },
    }).catch(() => undefined);

    return NextResponse.redirect(`${base}/dashboard/settings?tab=workspace&dotloop=connected`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return errorRedirect(base, reason);
  }
}
