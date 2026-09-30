export const AUTH_AFTER_URL = "/dashboard";

/** Reject example/placeholder values copied from docs or .env.example */
function isPlaceholderKey(value: string | undefined): boolean {
  if (!value) return true;
  const key = value.trim();
  if (!key || key.includes("replace_me")) return true;
  if (key.includes("paste_full") || key.includes("paste_full_publishable")) return true;
  if (key.includes("...") || key.endsWith("_...")) return true;
  return false;
}

export function getClerkPublishableKey(): string | undefined {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (isPlaceholderKey(publishableKey)) return undefined;
  if (!publishableKey!.startsWith("pk_")) return undefined;
  return publishableKey;
}

export function getClerkSecretKey(): string | undefined {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (isPlaceholderKey(secretKey)) return undefined;
  if (!secretKey!.startsWith("sk_")) return undefined;
  return secretKey;
}

export function hasClerkPublishableKey(): boolean {
  return Boolean(getClerkPublishableKey());
}

export function hasClerkSecretKey(): boolean {
  return Boolean(getClerkSecretKey());
}

export function hasClerkEnv(): boolean {
  return hasClerkPublishableKey() && hasClerkSecretKey();
}
