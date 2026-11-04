import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { authenticationCategory, authorizedDeveloper, developmentKeys, diagnosticsEnabled, expectedPreviewHost } from "@/lib/auth-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "Vary": "Cookie, Host", "X-Robots-Tag": "noindex" } });
}

export async function GET(request: NextRequest) {
  const env = process.env;
  if (!diagnosticsEnabled(env) || !expectedPreviewHost(request.nextUrl.hostname, env)) {
    return response({ error: "Not found" }, 404);
  }
  // Authenticate before collecting or returning any diagnostic metadata. No bypass
  // token, query parameter, cookie dump, or alternate developer authentication.
  let userId: string | null;
  try {
    ({ userId } = await auth());
  } catch {
    return response({ error: "Unauthorized" }, 401);
  }
  if (!userId) return response({ error: "Unauthorized" }, 401);
  if (!authorizedDeveloper(userId, env)) return response({ error: "Forbidden" }, 403);

  const metadata = {
    sessionCookieExists: request.cookies.has("__session"),
    authenticatedUser: true,
    expectedPreviewHostname: true,
    ...developmentKeys(env),
  };
  // AuthenticateRequest delegates issuer, signature and time validation to Clerk.
  // Do not decode JWTs or independently weaken the SDK's validation rules.
  try {
    const client = await clerkClient();
    const state = await client.authenticateRequest(request, {
      authorizedParties: [`https://${env.AUTH_DIAGNOSTICS_PREVIEW_HOST}`],
    });
    let category = state.isSignedIn ? "none" : authenticationCategory(state.reason);
    if (state.isSignedIn) {
      // Inspect only verified claims internally; never serialize claims or issuer.
      const expectedIssuerHost = Buffer.from((env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").slice(8), "base64")
        .toString("utf8").replace(/\$$/, "");
      if (state.toAuth().sessionClaims?.iss !== `https://${expectedIssuerHost}`) category = "issuer";
    }
    try {
      await client.users.getUser(userId);
    } catch {
      return response({ ...metadata, authenticationErrorCategory: "clerk_api_request_failed" });
    }
    return response({ ...metadata, authenticationErrorCategory: category });
  } catch {
    return response({ ...metadata, authenticationErrorCategory: "sdk_initialization_or_verification" });
  }
}
