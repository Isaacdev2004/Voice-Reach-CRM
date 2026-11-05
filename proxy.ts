import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { observeClerkMiddleware } from "@/lib/auth-runtime-diagnostics";
import { getClerkPublishableKey, getClerkSecretKey } from "@/lib/clerk-env";
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
  if (process.env.VERCEL_ENV === "preview" && ["feat/property-interest-mvp", "test/property-interest-clerk-request-context"].includes(process.env.VERCEL_GIT_COMMIT_REF ?? "") &&
      ["/api/campaigns/runner","/api/dashboard/briefing/runner"].includes(req.nextUrl.pathname)) {
    return NextResponse.json({success:false,error:"Schedulers are disabled in the isolated Property Interest Preview."},{status:403});
  }
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-myari-property-introduction");
  const introduction = req.nextUrl.pathname === "/property-interest" || req.nextUrl.pathname === "/api/property-interest/public";
  if (introduction) {
    requestHeaders.set("x-myari-property-introduction","1");
    const res = NextResponse.next({request:{headers:requestHeaders}});
    res.headers.set("Cache-Control","no-store");
    res.headers.set("Referrer-Policy","no-referrer");
    res.headers.set("X-Robots-Tag","noindex, nofollow");
    res.headers.set("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    return res;
  }
  // Strip the private layout marker on every other path; clients cannot opt out of auth/providers.
  return observeClerkMiddleware(
    process.env,
    req.nextUrl.hostname,
    req.nextUrl.pathname,
    async () => {
      const publishableKey = getClerkPublishableKey();
      const secretKey = getClerkSecretKey();
      const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
      const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTE_PATTERNS, "/book/(.*)"]);
      const isApiRoute = createRouteMatcher(["/api/(.*)"]);
      if (!publishableKey || !secretKey) {
        // A malformed/missing credential must never become an authentication bypass.
        return async () => isPublicRoute(req)
          ? NextResponse.next({request:{headers:requestHeaders}})
          : NextResponse.json(
            { success: false, error: "Authentication is unavailable.", code: "service_unconfigured" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
      }

      const handler = clerkMiddleware(async (auth, request) => {
        if (!isApiRoute(request) && !isPublicRoute(request)) await auth.protect();
        return NextResponse.next({request:{headers:requestHeaders}});
      }, { debug: false, publishableKey, secretKey });
      return async () => handler(req, event);
    },
    // Never log a request, header, exception, or arbitrary SDK string.
    category => console.info(`MYARI_AUTH_DIAGNOSTIC:${category}`),
  );
}

export const config = {
  matcher: [
    "/((?!_next|robots\\.txt|sitemap\\.xml|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov|m4v)).*)",
    "/(api|trpc)(.*)",
  ],
};
