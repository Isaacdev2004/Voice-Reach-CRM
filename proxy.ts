import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { hasClerkEnv } from "@/lib/clerk-env";

/**
 * Clerk auth runs on every request so handlers can use `auth()`.
 *
 * Web pages → unauthenticated visits redirect to /sign-in.
 * API routes → handlers self-enforce auth via `requireUserId()` and return a
 *               structured JSON envelope `{ success: false, error }`. We never
 *               redirect API requests (clients can't follow 30x for fetch).
 */
export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerkEnv()) {
    return NextResponse.next();
  }

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/checkout(.*)",
    "/sms-consent",
    "/privacy",
  ]);
  const isApiRoute = createRouteMatcher(["/api/(.*)"]);

  const handler = clerkMiddleware(async (auth, request) => {
    if (isApiRoute(request) || isPublicRoute(request)) return;
    await auth.protect();
  });

  return handler(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
