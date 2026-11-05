# Temporary Clerk diagnostics: protected Preview runtime logs

Branch: `test/property-interest-clerk-request-context`.
Deployment under investigation: `dpl_HGb3M3mwQBTB3KQzqZubmkDroKd4`.

## Access review

The authenticated endpoint cannot diagnose a developer session that server-side Clerk rejects. It returns 401 before collecting diagnostic metadata. Keep that gate intact. Its existing authenticated, allowlisted access is useful only once server authentication works.

The primary diagnostic now wraps Clerk middleware in `proxy.ts`. For `/dashboard` and its child paths, it writes only `MYARI_AUTH_DIAGNOSTIC:<category>` to server runtime logs. It does not require a successful session to observe Clerk's rejection. The logs must be accessed through the Vercel project's developer access controls; there is no log-reading endpoint. Enable Vercel Deployment Protection for the diagnostic Preview and restrict project/log access to authorized developers before use. This code does not configure or establish those platform permissions.

Logging requires **all** of:

- `VERCEL_ENV=preview`
- `VERCEL_GIT_COMMIT_REF=test/property-interest-clerk-request-context`
- `AUTH_DIAGNOSTICS_ENABLED=true` (unset by default)
- `AUTH_DIAGNOSTICS_PREVIEW_HOST` equals both the request hostname and Vercel's `VERCEL_BRANCH_URL` (the approved stable branch alias)
- A dashboard request

No request values, cookies, JWTs, credentials, user IDs, paths, arbitrary SDK reasons, or exception messages are logged. Only fixed categories reach the log writer. Logging failures do not change authentication responses or exceptions. `auth.protect()` remains in place. Clerk debug logging is explicitly off.

The complete variable-by-variable checklist is [Diagnostic Preview environment checklist](CLERK-AUTH-DIAGNOSTICS-ENV-CHECKLIST.md). It separates checker requirements from additional isolation review.

## Exact diagnostic procedure

1. In Vercel, select the diagnostic branch's **Preview-only** settings. Confirm the intended deployment and exact approved stable branch-alias hostname, developer-only log access, and Deployment Protection. Do not edit Production settings or publish to Production.
2. Verify the isolated staging project is still `jojgdfpmaxvbhobjrsbm` (the reference already used by the Property Interest preflight). Set its staging Supabase URL and service credential securely. Confirm the credential belongs to staging through authorized tooling; presence alone is not proof.
3. Use a matching, valid Clerk Development key pair, never live keys. Keep `ALLOW_LIVE_OUTBOUND=false`, `VOICE_PROVIDER=mock`, and Concierge off with empty owner/admin allowlists. Remove inherited provider, Stripe/billing, cron/scheduler, and unrelated integration credentials for this branch. Do not expose or export their values.
4. Run `node scripts/auth-diagnostics-safety.mjs` in the **effective target Preview environment**. Require all booleans true. The script only checks configuration and credential presence/absence, not key validity, network access, or project permissions. Validate the Development Clerk key pair and staging service credential with access-controlled provider tools, retaining only pass/fail evidence. A local synthetic test is not hosted verification.
5. Both existing scheduler paths (`/api/campaigns/runner`, `/api/dashboard/briefing/runner`) now return 403 on this diagnostic Preview branch, independently of the diagnostic flag or sign-in state. Confirm those 403 responses after Preview deployment. No scheduler or outbound activity should be triggered to test credentials.
6. Set `AUTH_DIAGNOSTICS_PREVIEW_HOST` to the isolated QA project's approved stable branch-alias hostname, exactly equal to its Vercel-provided `VERCEL_BRANCH_URL` (without scheme/path/port), and `AUTH_DIAGNOSTICS_ENABLED=true` on this Preview branch only. No diagnostic developer allowlist is required for runtime logging. Leave `AUTH_DIAGNOSTICS_DEVELOPER_IDS` empty unless a working server-authenticated developer needs the separate protected endpoint.
7. After the deployment prerequisites have passed and an authorized developer deploys the isolated Preview, sign in with a synthetic staging account and request `/dashboard` once on that exact hostname. In access-controlled Vercel runtime logs for that deployment and time, filter for `MYARI_AUTH_DIAGNOSTIC:`. Retain only the emitted category. Do not export HARs, headers, cookies, or raw provider errors.
8. Confirm the dashboard's normal denial or redirect still occurs when Clerk rejects the session. Confirm an anonymous request to `/api/internal/auth-diagnostics` exposes no diagnostic metadata. The endpoint returns 401 on the enabled exact Preview; disabled, wrong-host, wrong-branch and Production requests return 404.
9. Set `AUTH_DIAGNOSTICS_ENABLED=false` or remove it, remove temporary allowlists, and refresh the Preview. Verify a dashboard request produces no diagnostic log and the endpoint returns 404. Remove this temporary instrumentation after investigation.

## Categories and limits

- `unexpected_error`: Clerk returned its broad `unexpected-error` reason.
- `signature`, `clock`, `issuer`, `session_missing`: allowlisted reason categories. The protected endpoint additionally compares verified issuer claims internally.
- `clerk_configuration`: the configured keys do not pass the Development-key metadata check.
- `middleware_initialization`: importing or constructing the middleware threw.
- `middleware_execution`: the middleware invocation threw. The original exception is rethrown unchanged; this can include framework control flow and is not alone proof of an authentication defect.
- `none`: Clerk explicitly reported signed-in.
- `unknown`: no recognized reason was available. This does not imply successful authentication.

Runtime observation reads only Clerk's returned status/reason headers; it never reads client-supplied diagnostic headers or enables SDK debug output. It makes no additional Clerk/network verification request. The existing protected endpoint remains available for authenticated developers to run Clerk's normal signature/clock verification, verified-issuer comparison, and API connectivity probe; it cannot diagnose a rejected developer session. Its separate `clerk_api_request_failed` category does not distinguish network, authorization, and service failures.

The installed Clerk SDK maps non-`TokenVerificationError` exceptions in its session-token path to `unexpected-error`, discarding a narrower cause. Runtime logs can establish middleware phase versus Clerk's reported category, but cannot reconstruct a discarded exception or prove the root cause. Do not weaken authentication or add raw exception logging to obtain more detail.

## Verification and deployment status

Run `npm run test:auth-diagnostics`, `npm run test:security`, `npm run test:regressions`, `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. The diagnostic suite tests actual proxy invocation with mocked Clerk, redirect preservation, original request identity, forged layout-marker removal, branch/host/path isolation, sanitized output, and scheduler blocking. Property Interest's disposable database and browser tests provide additional isolation checks; they do not validate hosted credentials or authentication.

The current cloud instance has no configured Clerk, Supabase, or Vercel credentials. Its safety preflight fails. Deployment readiness therefore remains **blocked pending effective Preview configuration and access verification**. No hosted authentication fix is claimed. No Production deployment, merge, migration modification, or Concierge activation is part of this change.

Local review results: 9 diagnostic/access/proxy tests passed; complete `test:unit`, security and regression checks passed; 34 disposable PostgreSQL isolation assertions and 35 Chromium browser isolation assertions passed. TypeScript and production build passed. Lint completed with zero errors and seven existing warnings. Database tests used PGlite under `/tmp`; browser tests used installed Chromium with synthetic API responses. Generated test files were removed and original screenshots restored. No hosted credentials or authentication were validated. The local environment safety check exited 1 because required target configuration was absent.

## Deploying the stable branch-alias fix

The hostname check now compares the configured approved host with `VERCEL_BRANCH_URL` and the actual request hostname. It no longer compares against the rotating deployment-specific `VERCEL_URL`. There is no deployment-host fallback, wildcard, suffix match, or forwarded-host override. Missing or mismatched branch metadata disables diagnostics. The hard-coded approved allowlist entry is `myari-clerk-auth-isolate-git-00383f-magnificent-soless-projects.vercel.app`. Both `AUTH_DIAGNOSTICS_PREVIEW_HOST` and Vercel's `VERCEL_BRANCH_URL` must equal it. The configured host must be set only on `myari-clerk-auth-isolated-qa`; never copy it into shared or Production settings.

1. In the isolated project's Preview settings for `test/property-interest-clerk-request-context`, use the approved alias `myari-clerk-auth-isolate-git-00383f-magnificent-soless-projects.vercel.app` from the supplied Vercel branch domain details. Verify it equals `VERCEL_BRANCH_URL`, then set `AUTH_DIAGNOSTICS_PREVIEW_HOST` to that exact hostname. Do not guess the alias from the project or branch name. Ensure Vercel's system environment variables are available.
2. Keep diagnostics disabled while preparing the deployment and rerun all existing isolated Preview safety gates. Review the approved host separately: the nine-check safety script does not validate it.
3. Before any push, verify connected Git automation cannot target Production; the supplied deployment details show that risk. Keep automatic builds suppressed or use an authorized explicit Preview deployment without a push. After the safety gates pass, deploy the reviewed diagnostic branch to the isolated project as Preview only, without promoting or deploying Production. Confirm deployment source branch/commit and that both scheduler paths remain blocked.
4. Verify the approved stable alias resolves to the new Preview deployment. During the authorized diagnostic window only, enable diagnostics for that branch and visit `/dashboard` through that alias. Inspect only sanitized categories in access-controlled runtime logs. Deployment-specific URLs, another project's alias, Production, and other branches must not enable logging.
5. Confirm `auth.protect()` still redirects rejected sessions and the diagnostic endpoint still denies anonymous/non-allowlisted users. Disable diagnostics after the check. Hosted verification remains required; this change does not establish a fix for the original Clerk failure.

The deployment details supplied during this hostname review label the existing deployment **Production**, despite its diagnostic source branch. Diagnostics intentionally remain off in that environment. A branch name does not prove Preview targeting: the replacement deployment must identify `VERCEL_ENV=preview`; do not bypass this gate or promote the fix to Production.

## ByteString investigation and controlled verification

For deployment `dpl_FVC8dXdMxomW2S5te1m5vWG58RxH`, the reported exception identifies U+2026 (Unicode ellipsis) as incompatible with a Web Headers ByteString. Repository inspection found no ellipsis inserted by `proxy.ts`: it passes the original NextRequest to Clerk, clones headers only to remove the private introduction marker, and adds fixed ASCII marker/security headers. It does not decode, truncate, redact, or rewrite Clerk cookies or handshake payloads.

A reproducible configuration defect exists: the old key helper rejected ASCII three-dot placeholders but accepted Unicode ellipses; it also validated trimmed values while Clerk read the raw environment. The diagnostic preflight checked Development prefixes without rejecting Unicode/control characters. The installed Clerk backend SDK 3.4.9's `clients.getHandshakePayload` calls `buildRequest`, which sets an Authorization header from the configured secret. A synthetic malformed secret reproduces the exact index-16/8230 TypeError there, before fetch. That is a demonstrated failure source, not proof of the effective hosted binding. A browser redirect capture alone cannot distinguish it from a malformed directive passed to `resolveHandshake`'s Set-Cookie append. No hosted credential or supplied session/handshake token has been copied, decoded, replayed, or printed by this investigation.

The correction rejects non-printable/non-ASCII or known redacted/placeholder Clerk keys without trimming, encoding, or repairing them. Runtime key metadata and the nine-check safety preflight now reject these values too. Middleware receives explicitly validated keys. Missing/invalid credentials stop protected requests with a generic, no-store 503 instead of falling through to a protected handler or initiating another Clerk refresh loop. Public marketing routes and the narrowly defined public Property Interest boundary remain public. Valid configurations still run `auth.protect()` and all existing handler/tenant checks; no signature or clock validation is weakened. No SDK cookie directives are edited or dropped.

Proposed operator procedure (isolated Preview only):

1. Revoke the QA browser session whose handshake/session tokens were shared, then use a fresh synthetic staging session. Do not share full request URLs, HARs, headers, or tokens.
2. Through authorized Vercel access, inspect only status/category metadata for the effective branch keys. If a key fails printable-ASCII/placeholder validation, replace that branch-scoped value securely with the complete original from the same Clerk Development instance. Do not fix it by deleting an ellipsis, guessing omitted characters, URL/base64-encoding it, or copying a masked dashboard display. Never modify shared/Production keys. Prefix/character validation does not prove completeness, validity, or instance pairing; confirm the full pair with authorized Clerk tooling.
3. Require all nine effective Preview safety checks to pass, including staging project `jojgdfpmaxvbhobjrsbm`, outbound false, mock provider, neutralized provider/billing/scheduler values, and Concierge disabled. Confirm source branch `test/property-interest-clerk-request-context` and environment Preview, plus the pinned approved branch alias. Do not enable live services, schedulers, or migrations for validation.
4. Review and deploy the correction explicitly to `myari-clerk-auth-isolated-qa` as Preview only once those gates pass. Preserve build suppression until the controlled deployment is authorized. Do not promote to Production or push if connected automation could target Production.
5. During the approved diagnostic window, inspect only fixed sanitized categories. With invalid configuration, protected requests must stop with generic 503 and no refresh redirect; with valid Development credentials, sign in using the fresh synthetic account and verify `/dashboard` remains authenticated across refreshes without the ByteString error or session-refresh loop. Confirm anonymous/nondeveloper diagnostic access stays denied and both scheduler endpoints remain blocked.
6. If the error persists with independently validated raw keys, obtain only sanitized server stack function/file names. A failure in `resolveHandshake` cookie handling is a different source and must not be treated as permission to strip/alter signed cookies. Disable temporary diagnostics after verification.

Hosted root-cause attribution and successful authentication remain pending authorized effective-environment inspection and the controlled hosted test. No hosted fix is claimed by a passing synthetic regression.

Local ByteString review validation: all 11 diagnostic/authentication tests, `test:security`, `test:regressions`, full `test:unit`, TypeScript and production build passed. Lint had zero errors and seven existing warnings. All 34 disposable-database isolation assertions and 35 local Chromium isolation assertions passed. Actual local built-server requests confirmed generic no-store 503 with no redirect for protected dashboard/API requests when credentials are missing, while public root remains 200. Test-generated PDFs were removed and original screenshots restored. These checks used synthetic fixtures only and are not hosted authentication verification.

### Acceptance gate for the two Development subscribers

Do not push this repair until authorized inspection confirms the isolated branch's effective raw Development keys are complete, belong to the same instance, pass character/placeholder validation, and all nine effective Preview safety checks pass. Character checks alone cannot establish completeness or validity. If either key is malformed or truncated, require secure replacement with the complete original value from Clerk Development; never infer, reconstruct, trim, or encode a credential. Reconfirm the intended Vercel project and Preview target before any push that can trigger a build. No changes to Production or shared credentials are authorized.

Hosted authentication PASS requires **both** approved Development subscribers, each in a separate fresh browser session, to sign in successfully and remain on `/dashboard` across refreshes. For each subscriber, make an authenticated read-only **GET** to `/api/assistant/verify` and confirm the success envelope, session/owner match, Development mode, reachable Clerk backend, and owner-scoped staging workspace. A 200 response alone is insufficient: that route can return a success envelope with unavailable backend-probe fields. Record only sanitized booleans; do not publish the response's user identifier or contact counts. Do not use POST, enable Assistant capabilities, send outbound traffic, charge billing, run schedulers, or activate Concierge as part of this authentication check. Until both subscribers pass, record hosted authentication as unverified.
