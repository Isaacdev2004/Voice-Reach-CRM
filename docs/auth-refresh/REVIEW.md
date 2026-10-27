# Immersive authentication and an optional Explore first path

Branch: feat/immersive-auth-explore. Based on approved Production main aabbf1aa25e679e70b251b4c8ed9af9cb6740982. Not deployed. Automatic Git deployment is disabled for this branch to prevent credential inheritance.

The two-panel layout is replaced by a continuous, full-page architectural hero with a floating ivory Clerk card, warm bronze controls and the original MyARI motivational line: “Your next chapter starts with the relationships you build today.” Desktop inspiration sits in open photograph space; smaller screens keep the form dominant and the quote below it. Subtle entrance motion respects reduced-motion preferences. Existing local imagery is reused; no image/provider dependency added.

## Visitors who are not ready

Explore MyARI first is a closed-by-default disclosure below the Clerk card. It never unmounts the authentication form or opens an exit popup. Visitors can watch the existing DemoVideo without registering or autoplay, request a one-time overview email, or open the existing contact page to request a personal introduction. No live scheduling capability is claimed. Legacy video/transcript disclosures remain intact.

The overview asks only for email. Product-update consent is a separate unchecked checkbox. The new route uses the same Resend API/from configuration and support inbox as the existing public contact/playbook capture flows; it does not use campaign transport, insert subscriber contacts, register Clerk users, start trials, activate plans or enroll marketing lists.

Before showing the email field, the UI checks a no-store product-availability response. When delivery is disabled or unavailable, it collects no email and directs the visitor to the walkthrough or existing contact flow instead. This avoids presenting a dead email form when the release flag is off. The response contains only availability, not credential values.

Explicit requested-email workflow:

1. Validate strict schema, same-origin header, bounded body and honeypot.
2. Require AUTH_OVERVIEW_EMAIL_ENABLED=true and configured Resend. Vercel Preview deployments always refuse real overview delivery, even if the flag is accidentally enabled.
3. Send a lead-capture message to MyARI's support inbox, recording the email, explicit consent selection/version, and sanitized plan/referral context. Its provider record retains the acceptance timestamp.
4. Only after capture acceptance, request overview delivery to the visitor. Show success only after a nonempty provider receipt. Acceptance is not proof of final inbox delivery.
5. On failure, preserve the form; distinguish accepted lead capture from unconfirmed delivery and allow retry. Stable content-based provider keys deduplicate identical email/consent/context submissions, even across client UUIDs, within Resend's idempotency retention window. This is not indefinite deduplication or a new durable CRM prospect table.

Lead retention currently means the accepted capture email and MyARI support inbox, matching the existing public capture architecture. It does not promise CRM lead ingestion, a newsletter subscription, or automated nurture. Manual preference follow-up must honor the recorded opt-in; unrequested marketing remains unauthorized.

The return link retains allowlisted plan/billing/UTM/referral fields. Checkout session IDs, arbitrary redirects, email fields and other query parameters are excluded. No visitor email is persisted in browser storage or sent by the new analytics event. Existing pending-plan and attribution infrastructure is preserved.

## Verification

- 399 existing unit tests passed; new overview assertions run within test:public-marketing/test:unit.
- Overview route tests use mocked Resend: validation, origin/size/honeypot, default-off/missing configuration/Preview denial, capture-before-delivery, empty receipt, timeout, provider failures, accurate optional consent, repeat deduplication and private error messages.
- Responsive browser checks use actual auth shell/form wrappers and visual Clerk fixtures at 1440/768/390 for sign-in and signup. Tested disclosure, unchecked consent, email failure/retry/success, safe plan context, no autoplay, preserved mounted Clerk form and no billing/account/campaign mutations. All email responses are synthetic.
- TypeScript, build, security and lint checks pass; seven existing lint warnings remain unrelated. Screenshots are local component previews, not live Clerk authentication evidence.
- Production, subscriber records, credentials, flags and billing have not been modified. No real emails sent.

## Review and release

Review screenshots under previews/, including explore-email-1440.jpg. The visual fixture demonstrates a mocked successful email path; a real protected Preview deliberately refuses outbound overview emails.

Merge/deployment requires separate owner approval. Deploying with AUTH_OVERVIEW_EMAIL_ENABLED absent/false keeps real overview emails disabled. Enabling that flag is a separate live-email action requiring explicit approval, verified Resend sender/delivery configuration and suitable platform abuse/rate controls. Origin/honeypot/idempotency checks are not a distributed rate limiter or CAPTCHA. No production setting or firewall rule was changed here.

Before release, use a protected Preview with branch-specific Clerk Development credentials to inspect actual Clerk sign-in, reset, verification, errors and redirects. Do not copy Production secrets. Email-provider acceptance has only been tested with mocks; it is not claimed operational.

Rollback: disable overview email delivery with authorization if it was enabled, then revert/redeploy the prior approved code as needed. Preserve accepted capture emails/consent evidence; do not delete CRM records, restore databases or rotate credentials as a UI rollback. No database migration is required.
