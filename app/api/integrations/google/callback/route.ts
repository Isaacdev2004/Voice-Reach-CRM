import {
  encryptCalendarToken,
  decryptCalendarToken,
} from "@/lib/calendar/token-crypto";
import { getGoogleConnection } from "@/lib/calendar/google";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  exchangeGoogleCode,
  fetchGoogleAccountEmail,
} from "@/lib/calendar/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
function errorRedirect(base: string, reason: string) {
  return NextResponse.redirect(
    `${base}/dashboard/settings?tab=workspace&calendar=error&reason=${encodeURIComponent(reason)}`,
  );
}
export async function GET(request: Request) {
  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const settingsUrl = `${base}/dashboard/settings?tab=workspace&calendar=connected`;
  try {
    const authedOwnerId = await requireUserId();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      return errorRedirect(base, "authorization_declined");
    }
    const cookieStore = await cookies();
    const stored = cookieStore.get("google_oauth_state")?.value;
    cookieStore.delete("google_oauth_state");
    if (!code || !state || !stored) {
      return errorRedirect(base, "missing_code_or_session");
    }
    const [ownerId, nonce] = stored.split(":");
    if (!ownerId || nonce !== state) {
      return errorRedirect(base, "session_mismatch");
    }
    if (ownerId !== authedOwnerId) {
      return errorRedirect(base, "account_mismatch");
    }
    const tokens = await exchangeGoogleCode(code);
    if (
      !tokens.access_token ||
      !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in <= 0
    )
      return errorRedirect(base, "invalid_authorization_response");
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();
    const email = await fetchGoogleAccountEmail(tokens.access_token);
    const previous = await getGoogleConnection(ownerId);
    const { error } = await supabaseAdmin.from("calendar_connections").upsert(
      {
        owner_id: ownerId,
        provider: "google",
        access_token: encryptCalendarToken(tokens.access_token),
        refresh_token: tokens.refresh_token
          ? encryptCalendarToken(tokens.refresh_token)
          : previous?.refresh_token
            ? encryptCalendarToken(decryptCalendarToken(previous.refresh_token))
            : null,
        expires_at: expiresAt,
        calendar_id: "primary",
        account_email: email,
        scopes: tokens.scope?.split(" ").filter(Boolean) ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,provider" },
    );
    if (error) {
      const reason = error.message.includes("calendar_connections")
        ? "database_table_missing"
        : "connection_save_failed";
      return errorRedirect(base, reason);
    }
    await writeAuditLog({
      ownerId,
      action: "GOOGLE_CALENDAR_CONNECTED",
      entityType: "calendar_connection",
      entityId: null,
      metadata: { email },
    }).catch(() => undefined);
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    const reason =
      err instanceof Error && err.message === "GOOGLE_RECONNECT_REQUIRED"
        ? "reauthorization_required"
        : "authorization_failed";
    return errorRedirect(base, reason);
  }
}
