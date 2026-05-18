"use client";

/**
 * Required for Clerk custom sign-up when bot protection is enabled.
 * @see https://clerk.com/docs/guides/development/custom-flows/authentication/bot-sign-up-protection
 */
export function ClerkCaptcha() {
  return <div id="clerk-captcha" className="clerk-captcha min-h-px w-full" />;
}
