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
- `AUTH_DIAGNOSTICS_PREVIEW_HOST` equals both the request hostname and `VERCEL_URL`
- A dashboard request

No request values, cookies, JWTs, credentials, user IDs, paths, arbitrary SDK reasons, or exception messages are logged. Only fixed categories reach the log writer. Logging failures do not change authentication responses or exceptions. `auth.protect()` remains in place. Clerk debug logging is explicitly off.

The complete variable-by-variable checklist is [Diagnostic Preview environment checklist](CLERK-AUTH-DIAGNOSTICS-ENV-CHECKLIST.md). It separates checker requirements from additional isolation review.

## Exact diagnostic procedure

1. In Vercel, select the diagnostic branch's **Preview-only** settings. Confirm the intended deployment and exact immutable hostname, developer-only log access, and Deployment Protection. Do not edit Production settings or publish to Production.
2. Verify the isolated staging project is still `jojgdfpmaxvbhobjrsbm` (the reference already used by the Property Interest preflight). Set its staging Supabase URL and service credential securely. Confirm the credential belongs to staging through authorized tooling; presence alone is not proof.
3. Use a matching, valid Clerk Development key pair, never live keys. Keep `ALLOW_LIVE_OUTBOUND=false`, `VOICE_PROVIDER=mock`, and Concierge off with empty owner/admin allowlists. Remove inherited provider, Stripe/billing, cron/scheduler, and unrelated integration credentials for this branch. Do not expose or export their values.
4. Run `node scripts/auth-diagnostics-safety.mjs` in the **effective target Preview environment**. Require all booleans true. The script only checks configuration and credential presence/absence, not key validity, network access, or project permissions. Validate the Development Clerk key pair and staging service credential with access-controlled provider tools, retaining only pass/fail evidence. A local synthetic test is not hosted verification.
5. Both existing scheduler paths (`/api/campaigns/runner`, `/api/dashboard/briefing/runner`) now return 403 on this diagnostic Preview branch, independently of the diagnostic flag or sign-in state. Confirm those 403 responses after Preview deployment. No scheduler or outbound activity should be triggered to test credentials.
6. Set `AUTH_DIAGNOSTICS_PREVIEW_HOST` to the exact `VERCEL_URL` hostname, without scheme/path, and `AUTH_DIAGNOSTICS_ENABLED=true` on this Preview branch only. No diagnostic developer allowlist is required for runtime logging. Leave `AUTH_DIAGNOSTICS_DEVELOPER_IDS` empty unless a working server-authenticated developer needs the separate protected endpoint.
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
