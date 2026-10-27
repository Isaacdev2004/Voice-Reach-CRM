# Approved luxury authentication redesign

Status: implemented on `feat/luxury-auth-approved`; Production unchanged. Supersedes the visual proposal in draft PR #48. Base revision: `aabbf1aa25e679e70b251b4c8ed9af9cb6740982`.

## Architecture and preservation

Routes remain `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` under the existing auth layout. Existing Clerk SignIn/SignUp components own credential validation, loading, errors, verification, recovery, OAuth and session handling. ClerkProvider remains in place; entry-page button localization does not overwrite verification/reset substep labels. Client Link navigation switches modes; safe plan/billing/attribution context survives while checkout tokens, emails and arbitrary redirects are not forwarded.

No new authentication methods are introduced. Google is shown in the visual fixture based on the supplied screenshot; live instance configuration is not independently verified. Apple is not forced. Password/recovery UI and session duration remain SDK-controlled; no cosmetic remember-me switch promises a different session policy. Identifier-first login can remain two-step, unlike the illustrative reference. Recovery and verification headers remain visible on continuation routes.

Proxy middleware, requireUserId/owner checks, billing claim/start-trial handlers and signup trial/claim/attribution effects are unchanged against the base. See `auth-preservation.json` for independent comparison evidence. Dashboard redirects, existing plan storage, trial eligibility, subscription selection, account/workspace provisioning and entitlements are preserved. No database migrations or account/data writes were performed.

## Design and asset

58/42 desktop composition, warm ivory, bronze, existing MyARI logos, responsive architectural image, exact approved brand copy and compact optional discovery footer. Mobile uses a 235px hero and 16px inputs; tablet adapts the split. Initial sign-in action fits the tested desktop viewports. Subsequent Clerk steps keep their own contextual heading. Motion respects reduced-motion; focus styling and controls have accessible contrast.

The hero is an original generated architectural visualization, not stock photography, a customer property or a licensed third-party photograph. Native 1122×1402 source was converted without enlargement to an approximately 261KB WebP. Next Image provides responsive sizing/optimization. This provenance is explicit rather than claiming a stock license. Maximum overall layout width is 1920px. No third-party imagery is newly licensed by this change.

The quote has a restrained dark translucent backdrop to pass contrast over the image. No fake testimonial or social proof is used.

## Optional discovery and email retention

The default view contains a closed native disclosure in the footer, separate from Clerk. Explore, on-demand walkthrough and email overview are optional. No autoplay or automatic account/trial creation. Form availability is checked before collection; unavailable delivery presents a truthful alternative.

`AUTH_OVERVIEW_EMAIL_ENABLED` defaults to false; Preview refuses real delivery regardless of the flag. No environment values were changed. The support-inbox capture and visitor email reuse existing Resend configuration only after separate owner authorization. Consent is optional/unchecked and versioned, with privacy links, validation, same-origin checks, honeypot, bounded body, provider receipts, sanitized errors and provider-window idempotency. No automatic newsletter enrollment or CRM campaign delivery. Before enabling public email delivery, verify sender/inbox and add appropriate distributed abuse/rate controls. No real emails were sent in testing.

## Validation evidence

- TypeScript passed; full lint: zero errors, seven pre-existing warnings.
- Full unit/regression command passed (399 Node tests across existing suites, plus standalone assertions in public marketing/overview/presentation scripts). Security regression script passed.
- Production build passed; local build does not deploy.
- Browser fixture renders both integrated page wrappers at 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×800. Screenshots in `previews/`.
- No horizontal overflow; initial desktop sign-in CTA above fold. Keyboard mode navigation and native disclosure controls tested. Four axe WCAG A/AA reports have zero detected violations; these assess the fixture, not the externally hosted Clerk widget.
- Mocked overview success/error/retry/unavailable flows, consent, plan-context retention, no autoplay and Clerk remaining mounted verified.

### Authentication acceptance boundaries

| Requested check | Current evidence |
| --- | --- |
| Existing subscriber sign-in / registration / Google / Apple | SDK preserved; real development-account acceptance pending; Apple only if configured |
| Email verification / recovery | Continuation headers/localization preserved; live acceptance pending |
| Session persistence / logout / reauthentication | Existing provider/policies unchanged; live acceptance pending |
| Protected-route / trial redirects | Middleware and trial effects unchanged; static regression passed; signed-in acceptance pending |
| Account/workspace ownership | Authorization code unchanged; no real records changed; live test-account check pending |
| Desktop/tablet/mobile / keyboard / error UI | Local integrated wrappers with explicit mocked Clerk/provider fixtures passed |

Do not interpret visual fixtures or unchanged code as proof of successful real authentication. This environment cannot complete hosted Clerk browser acceptance without isolated credentials, protected Preview access and authorized development test sessions.

## Protected Preview blocker and release plan

Read-only Vercel branch-env lookup returned zero entries for `feat/luxury-auth-approved`. Do not deploy with inherited Production credentials. Git automatic deployment is disabled for this branch in vercel.json.

Configure branch-specific Preview variables in the secure Vercel interface: a matching Clerk Development publishable/secret pair; test Supabase URL/public/service credentials for `jojgdfpmaxvbhobjrsbm`; applicable test-only integration credentials; disabled outbound, Assistant and new AI billing. Keep overview email disabled and Production secrets unavailable. Verify effective runtime isolation, deployment protection and correct Git ref before hosted testing. Never publish secrets in PRs/logs. No safe protected Preview URL is available yet.

After isolated configuration is confirmed, create a protected Preview from this PR commit, run two development-account sign-in/signup/verification/recovery/logout/session/redirect checks and record results. Check existing-account behavior, trial onboarding and owner isolation using synthetic accounts only. Do not introduce Apple if absent. Obtain approval before merge/Production deployment.

## Production deployment and rollback

This change requires code deployment only, no database migration or Clerk configuration change. Before approval refresh current Production identity and branch/CI status; do not assume the baseline is still live. Merging main may automatically deploy on Vercel. Keep overview delivery disabled and all existing Assistant/outbound/billing flags unchanged. After approved deployment verify www.myari.io aliases the exact Ready revision, auth pages and signed-in redirects using authorized sessions without creating permanent test records.

Recorded baseline rollback candidate: commit `aabbf1aa25e679e70b251b4c8ed9af9cb6740982`, deployment `dpl_7oyVsu1sXk1raF9pgCAcfmwuAGZf`. Reconfirm it before release. If auth regresses, request/obtain authorized rollback to the last healthy deployment, then revert the PR via a reviewed change. No database restore, user deletion, billing reset or credential change is needed. Existing sessions remain under unchanged Clerk policy.

Decision: ready for isolated Preview review; NO-GO for Production until hosted authentication acceptance and explicit release approval.
