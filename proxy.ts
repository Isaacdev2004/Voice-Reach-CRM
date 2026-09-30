import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { hasClerkEnv } from "@/lib/clerk-env";
import { PUBLIC_ROUTE_PATTERNS } from "@/lib/seo/site";

/**
 * Clerk auth runs on every request so handlers can use `auth()`.
 *
 * Public marketing pages must stay reachable for anonymous visitors and crawlers.
 * Only /dashboard and other app routes require authentication.
 *
 * API routes → handlers self-enforce auth via `requireUserId()` and return a
 *               structured JSON envelope `{ success: false, error }`. We never
 *               redirect API requests (clients can't follow 30x for fetch).
 */
export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerkEnv()) {
    return NextResponse.next();
  }

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTE_PATTERNS]);
  const isApiRoute = createRouteMatcher(["/api/(.*)"]);

  const handler = clerkMiddleware(async (auth, request) => {
    if (isApiRoute(request) || isPublicRoute(request)) return;
    await auth.protect();
  });

  return handler(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|robots\\.txt|sitemap\\.xml|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov|m4v)).*)",
    "/(api|trpc)(.*)",
  ],
};
