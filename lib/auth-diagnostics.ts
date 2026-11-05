import { isClerkKeyValue } from "./clerk-env";

/** Temporary diagnostics: never pass exception messages or credential material here. */
export function diagnosticsEnabled(env: Record<string, string | undefined>) {
  return env.VERCEL_ENV === "preview" &&
    env.VERCEL_GIT_COMMIT_REF === "test/property-interest-clerk-request-context" &&
    env.AUTH_DIAGNOSTICS_ENABLED === "true";
}

export function expectedPreviewHost(host: string, env: Record<string, string | undefined>) {
  const approved = "myari-clerk-auth-isolate-git-00383f-magnificent-soless-projects.vercel.app";
  const expected = env.AUTH_DIAGNOSTICS_PREVIEW_HOST;
  // Pin the approved hostname to Vercel's stable alias for this exact branch.
  // Deployment URLs rotate; never accept suffix matches or forwarded-host input.
  return expected === approved && env.VERCEL_BRANCH_URL === approved && host === approved;
}

export function authorizedDeveloper(userId: string | null, env: Record<string, string | undefined>) {
  return Boolean(userId && (env.AUTH_DIAGNOSTICS_DEVELOPER_IDS ?? "")
    .split(",").map(id => id.trim()).filter(Boolean).includes(userId));
}

export function authenticationCategory(reason: unknown) {
  // Explicit SDK reason allowlist. Unknown strings, including messages, never escape.
  switch (reason) {
    case "token-invalid-issuer": return "issuer";
    case "token-invalid-signature":
    case "jwk-failed-to-resolve":
    case "jwk-remote-failed-to-load":
    case "jwk-local-missing": return "signature";
    case "token-expired":
    case "token-not-active-yet":
    case "token-iat-in-the-future": return "clock";
    case "session-token-missing": return "session_missing";
    default: return "unknown";
  }
}

export function developmentKeys(env: Record<string, string | undefined>) {
  const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = env.CLERK_SECRET_KEY;
  return {
    publishableKeyIsDevelopment: isClerkKeyValue(publishableKey, "pk_") && publishableKey.startsWith("pk_test_"),
    secretKeyIsDevelopment: isClerkKeyValue(secretKey, "sk_") && secretKey.startsWith("sk_test_"),
  };
}
