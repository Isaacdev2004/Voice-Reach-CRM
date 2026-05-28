/** Thrown when required production credentials are missing from the environment. */
export class ServiceConfigError extends Error {
  readonly code = "service_unconfigured" as const;

  constructor(message: string) {
    super(message);
    this.name = "ServiceConfigError";
  }
}

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "voice-assets",
  };
}

export function isSupabaseConfigured() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return Boolean(url && serviceRoleKey);
}

export function assertSupabaseConfigured() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url) {
    throw new ServiceConfigError(
      "Database not connected. Set NEXT_PUBLIC_SUPABASE_URL in your Vercel project settings.",
    );
  }
  if (!serviceRoleKey) {
    throw new ServiceConfigError(
      "Database not connected. Set SUPABASE_SERVICE_ROLE_KEY in your Vercel project settings.",
    );
  }
}

export function isConfigError(err: unknown): err is ServiceConfigError {
  return err instanceof ServiceConfigError;
}
