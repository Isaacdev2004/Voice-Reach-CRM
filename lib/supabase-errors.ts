import { apiError } from "@/lib/api-response";

export function humanizeDatabaseError(message: string): string {
  return message
    .replace(/^ServiceConfigError:\s*/i, "")
    .replace(/^PostgrestError:\s*/i, "")
    .trim();
}

export function isDatabaseUnreachableMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("cannot reach supabase") ||
    normalized.includes("database not connected") ||
    normalized.includes("fetch failed") ||
    normalized.includes("enotfound") ||
    normalized.includes("getaddrinfo")
  );
}

export function apiErrorFromSupabase(error: { message: string } | null) {
  if (!error) return null;
  const message = humanizeDatabaseError(error.message);
  if (isDatabaseUnreachableMessage(message)) {
    return apiError(message, { status: 503, code: "database_unreachable" });
  }
  return apiError(message, { status: 500 });
}

export const DATABASE_SETUP_HINT =
  "Create or restore a Supabase project, run supabase/schema.sql in the SQL editor, then set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy.";
