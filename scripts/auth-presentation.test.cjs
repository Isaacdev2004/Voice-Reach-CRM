/* Presentation/navigation regression. No live identity, accounts, billing or CRM writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { fixture } = require("./campaign-audit/harness.cjs");
const f = fixture();
const { authEntryLocalization, authModeHref } = f.load(
  "lib/auth-presentation.ts",
);
assert.equal(authEntryLocalization("/sign-in").formButtonPrimary, "Sign In");
assert.equal(
  authEntryLocalization("/sign-up").formButtonPrimary,
  "Start My Free Trial",
);
for (const route of [
  "/dashboard",
  "/sign-in/factor-one",
  "/sign-in/reset-password",
  "/sign-up/verify-email-address",
  "/sign-in/sso-callback",
  null,
])
  assert.equal(
    authEntryLocalization(route),
    undefined,
    "never relabel verification/recovery/other pages as starting a trial",
  );
assert.equal(
  authModeHref(
    "/sign-up",
    "plan=growth&billing=yearly&utm_source=referral&session_id=private&redirect_url=https://evil.test&email=private@example.test",
  ),
  "/sign-up?plan=growth&billing=yearly&utm_source=referral",
);
assert.equal(
  authModeHref("/sign-in", "ref=friend-one&plan=%3Cscript%3E&billing="),
  "/sign-in?ref=friend-one",
);
for (const file of [
  "components/auth/clerk-sign-in.tsx",
  "components/auth/clerk-sign-up.tsx",
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /fallbackRedirectUrl=\{AUTH_AFTER_URL\}/);
  assert.match(source, /forceRedirectUrl=\{AUTH_AFTER_URL\}/);
  assert.doesNotMatch(source, /strategy=|oauth_apple|oauth_google|rememberMe/);
}
console.log(
  "Auth presentation: entry-only CTA labels, recovery/verification labels preserved, safe client-navigation context, existing Clerk wrapper redirects and provider-controlled methods passed. No live authentication claimed.",
);
