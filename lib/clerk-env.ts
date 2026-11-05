export const AUTH_AFTER_URL = "/dashboard";

/** Validate without trimming, encoding, or repairing credential material. */
export function isClerkKeyValue(value: string | undefined, prefix: "pk_" | "sk_"): value is string {
  return typeof value === "string" && /^[\x21-\x7E]+$/.test(value) &&
    value.startsWith(prefix) && /^(pk|sk)_(test|live)_/.test(value) &&
    !/replace_me|paste_full|placeholder|redacted|\.\.\./i.test(value);
}

export function getClerkPublishableKey(): string | undefined {
  const value = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return isClerkKeyValue(value, "pk_") ? value : undefined;
}

export function getClerkSecretKey(): string | undefined {
  const value = process.env.CLERK_SECRET_KEY;
  return isClerkKeyValue(value, "sk_") ? value : undefined;
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

/** Whether deployment uses Clerk production (`pk_live_`) or development (`pk_test_`) keys. */
export function getClerkKeyMode(): "live" | "test" | "missing" {
  const publishableKey = getClerkPublishableKey();
  if (!publishableKey) return "missing";
  if (publishableKey.startsWith("pk_live_")) return "live";
  if (publishableKey.startsWith("pk_test_")) return "test";
  return "missing";
}
