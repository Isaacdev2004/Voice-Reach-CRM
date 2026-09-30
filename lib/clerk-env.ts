export const AUTH_AFTER_URL = "/dashboard";

/** Reject example/placeholder values copied from docs or .env.example */
function isPlaceholderKey(value: string | undefined): boolean {
  if (!value) return true;
  const key = value.trim();
  if (!key || key.includes("replace_me")) return true;
  if (key.includes("...") || key.endsWith("_...")) return true;
  return false;
}

export function getClerkPublishableKey(): string | undefined {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (isPlaceholderKey(publishableKey)) return undefined;
  if (!publishableKey!.startsWith("pk_") || publishableKey!.length < 30) return undefined;
  return publishableKey;
}

export function hasClerkPublishableKey(): boolean {
  return Boolean(getClerkPublishableKey());
}

export function hasClerkEnv(): boolean {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!hasClerkPublishableKey() || isPlaceholderKey(secretKey)) return false;
  return secretKey!.startsWith("sk_") && secretKey!.length >= 30;
}