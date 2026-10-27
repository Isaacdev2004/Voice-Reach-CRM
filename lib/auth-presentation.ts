/** Presentation only. Do not change Clerk strategies, session policy or trial eligibility here. */
export function authEntryLocalization(pathname: string | null) {
  if (/^\/sign-in\/?$/.test(pathname ?? ""))
    return { formButtonPrimary: "Sign In" };
  if (/^\/sign-up\/?$/.test(pathname ?? ""))
    return { formButtonPrimary: "Start My Free Trial" };
  // Preserve Clerk's context-specific Continue/Verify/Reset labels on subsequent steps.
  return undefined;
}

/** Preserve only non-sensitive plan/referral context when switching auth modes. */
export function authModeHref(path: "/sign-in" | "/sign-up", search: string) {
  const input = new URLSearchParams(search),
    result = new URLSearchParams();
  const keys = [
    "plan",
    "billing",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "ref",
  ];
  for (const key of keys) {
    const value = input.get(key);
    if (value && value.length <= 100 && /^[a-zA-Z0-9 _.-]+$/.test(value))
      result.set(key, value);
  }
  const suffix = result.toString();
  return path + (suffix ? `?${suffix}` : "");
}
