export const AUTH_AFTER_URL = "/dashboard";

/** Reject example/placeholder values copied from docs or .env.example */
function isPlaceholderKey(value: string | undefined): boolean {
  if (!value) return true;
  const key = value.trim();
  if (!key || key.includes("replace_me")) return true;
  if (key.includes("...") || key.endsWith("_...")) return true;
  return false;
}

export function hasClerkPublishableKey(): boolean {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (isPlaceholderKey(publishableKey)) return false;
  // Real Clerk publishable keys are long encoded strings, not just "pk_test_"
  return publishableKey!.startsWith("pk_") && publishableKey!.length >= 30;
}

export function hasClerkEnv(): boolean {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!hasClerkPublishableKey() || isPlaceholderKey(secretKey)) return false;
  return secretKey!.startsWith("sk_") && secretKey!.length >= 30;
}