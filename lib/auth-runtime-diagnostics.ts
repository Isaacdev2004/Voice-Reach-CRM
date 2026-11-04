import { authenticationCategory, developmentKeys, diagnosticsEnabled, expectedPreviewHost } from "./auth-diagnostics";

type Environment = Record<string, string | undefined>;
type MiddlewareResponse = { headers: { get(name: string): string | null } } | void | null;

/** Only fixed categories reach the writer. Never pass request/error objects to it. */
export async function observeClerkMiddleware<T extends MiddlewareResponse>(
  env: Environment,
  hostname: string,
  pathname: string,
  initialize: () => Promise<() => Promise<T>>,
  writeCategory: (category: string) => void,
): Promise<T> {
  const enabled = diagnosticsEnabled(env) && expectedPreviewHost(hostname, env) &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"));
  const record = (category: string) => {
    // Logging failures must never affect Clerk's response or exception.
    try { writeCategory(category); } catch { /* Preserve authentication behavior. */ }
  };
  let initialized = false;
  try {
    const run = await initialize();
    initialized = true;
    const response = await run();
    if (enabled) {
      // These are Clerk's returned response headers, never client request headers.
      const status = response?.headers.get("x-clerk-auth-status");
      const reason = response?.headers.get("x-clerk-auth-reason");
      const keys = developmentKeys(env);
      const category = !keys.publishableKeyIsDevelopment || !keys.secretKeyIsDevelopment ? "clerk_configuration" :
        status === "signed-in" ? "none" :
        reason === "unexpected-error" ? "unexpected_error" : authenticationCategory(reason);
      record(category);
    }
    return response;
  } catch (error) {
    if (enabled) record(initialized ? "middleware_execution" : "middleware_initialization");
    // Preserve redirects, authorization failures, and exceptions exactly as before.
    throw error;
  }
}
