# Property Interest implementation — 2 November 2026

Resumed PR #55 at 9b08888111a44d09b1f720f923d65db8f3409989. That revision contains the existing audit/specification only. No developer implementation was present on the remote branch; no completed implementation was overwritten.

## Implemented in this branch

- Owner-allowlisted, Preview-only sharing workspace at /dashboard/property-interest, linked from Property Finder when authorized. Owned-contact selector, canonical individual-property Zillow URLs, rolling window 1–30 days, private fragment capability shown once, link revocation, owner-scoped activity and editable campaign-draft links.
- Public introduction at /property-interest, with an explicit tracking choice, always-available untracked viewing and stop-tracking preference. No Zillow scraping or Zillow activity claims. The recipient link is not verified buyer identity.
- Public route bypasses Clerk only on its exact narrow boundary; omits marketing scripts/providers/fonts, strips a forged private-layout header on other routes, and uses no-store/no-referrer/noindex/CSP. Capabilities stay in fragments and POST bodies, not HTTP URL paths/query strings.
- Server-created hashed sessions after opt-in. Qualifying POST requires explicit user interaction, visible-page client dwell and at least 15 seconds server dwell. GPC/crawler/prefetch checks; one event per session and minimum 30-minute tuple separation across reissued links. These are bounded heuristics, not proof of human identity.
- An additive service-only transaction inserts the event, unique trigger ledger, ordinary mock-provider draft/two editable steps and one Activity alert atomically. It never invokes automation evaluation, enrollment, scheduling, sending, AI, or billing. Suppression checked before link/session creation and qualification.
- Database events/ledger retain attribution recipient_link_only. Campaign draft deletion does not rearm the trigger.
- Private Preview preflight validates host-injected Development key format and public/private JWKS matching, test service credential authentication, canonical origin, empty provider/scheduler overrides and disabled gates. It never prints credentials, API bodies or contact data.

## Tests actually executed

- 17 model/URL/privacy/gate assertions.
- 34 disposable PGlite PostgreSQL assertions: third-visit draft/alert, replay/new-session/minimum-gap exclusion, reissued-link idempotence, expired/revoked/suppressed sessions, rolling-window exclusion, foreign owner denial, service/browser grants, atomic draft fault rollback and safe retry.
- 35 Chrome browser assertions at 1440×900, 820×1180 and 390×844 against the actual local Next introduction page with synthetic API responses. Privacy headers, no third-party requests, disclosure, no-tracking choice, dwell/stop and overflow pass. Screenshots are synthetic LOCAL UI checks, not hosted authenticated acceptance.
- TypeScript, affected lint (zero errors; existing root font warnings), security script, optimized Next build and existing test:unit regression suite pass. Model tests are now included in test:unit.
- No hosted SQL/migration, Production write, enrollment, sending or billing test executed.

Run model checks with npm run test:property-interest. Disposable SQL runner follows the existing Concierge pattern: install @electric-sql/pglite@0.3.14 outside the repository and set PGLITE_MODULE to its ESM entry, or provide that exact package locally. Browser runner similarly accepts PLAYWRIGHT_MODULE; tested playwright@1.56.1 with installed Chrome. No credentials are needed for these synthetic/local tests.

## Exact proposed staging SQL — separate approval required

supabase/migrations/20261102191458_property_interest_draft_only.sql
SHA-256 a803560fdd54f21e78a9dd99c317a34fa16aebae7a76041d7218daaccc26f5b9

Generated with Supabase CLI migration new. Adds four tables, two explicit indexes, constraints and three SECURITY INVOKER RPCs with fixed search_path. RLS enabled, browser table/RPC access denied and service-role grants explicitly narrowed. No DROP, DELETE, TRUNCATE, existing-table ALTER, existing-row UPDATE or backfill in the installer. The RPC bodies perform new-table writes and insert draft campaigns/steps/audit rows only when later invoked. Existing contacts/consent records are read, never changed by these RPCs.

Target for requested rehearsal approval: jojgdfpmaxvbhobjrsbm ONLY. Production is not authorized. The migration has not been applied to hosted staging. Inspect staging for conflicts/history immediately before approved execution. Installation is transactional. On an ambiguous API outcome inspect state before retrying. After success, disable access/retain additive objects as recovery; never automatically delete generated drafts or restore a database. Destructive synthetic cleanup needs exact fixture provenance and scoped review.

## Remaining acceptance and rollout gates

- Hosted staging migration approval, installation/postflight and rollback/fixture-preservation evidence.
- Fresh protected Preview effective preflight and Ready state; no runnable hosted MVP claim until schema and owner-only access are approved/verified.
- Authorized synthetic Development sessions: owner A and distinct owner B for tenant isolation. No password/token export, impersonation or real recipient communication.
- Hosted three visits must preserve the 30-minute gap; do not shorten deployed safeguards. Use real separated synthetic visits, with persisted timestamps and duplicate/race checks.
- Full concurrent-session race/fault testing on hosted PostgreSQL remains required; PGlite is not proof of multi-connection concurrency.
- Review short-lived anonymous session retention/cleanup and public endpoint rate controls before paid/public release.
- Production release requires separate schema/code/activation approvals, current backup and recovery readiness. Global public rollout remains off.

Screenshots (synthetic local UI, not hosted authentication): [Desktop](screenshots/property-introduction-desktop.jpg), [Tablet](screenshots/property-introduction-tablet.jpg), [Mobile](screenshots/property-introduction-mobile.jpg).

The isolated Property Interest Preview also rejects both existing scheduler paths at middleware, even for signed-in callers. Vercel scheduled jobs are Production-only; no cron was added or activated. This Preview-only branch check leaves Production behavior unchanged.
