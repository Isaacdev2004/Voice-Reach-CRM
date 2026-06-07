import { apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { buildGoogleAuthUrl, isGoogleCalendarConfigured } from "@/lib/calendar/google";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const GET = withApiHandler(async () => {
  if (!isGoogleCalendarConfigured()) {
    return apiError("Google Calendar OAuth is not configured on the server.", {
      status: 503,
      code: "google_not_configured",
    });
  }

  const ownerId = await requireUserId();
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", `${ownerId}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = buildGoogleAuthUrl(state);
  return NextResponse.redirect(url);
});
