# Diagnostic Preview environment checklist

Target branch: `test/property-interest-clerk-request-context` only. Do not change Production or shared Preview credentials. No deployment is authorized until the **effective target Preview** passes its safety checker and the verification gates below.

This checklist is derived from `scripts/auth-diagnostics-safety.mjs`, the diagnostic instructions, and current application configuration reads. It does not represent an inspection of Vercel's stored settings: no Vercel connector or credentials are available in this cloud task. Unknown inherited Vercel variables cannot be enumerated without that access.

## Scope and empty-value rules

Apply changes only through exact-branch Preview overrides. Do not delete or rotate shared credentials. Removing a branch override may reveal the inherited shared value; it does **not** neutralize it. Use a genuinely empty branch override only if Vercel supports and preserves it, then verify the effective value is empty. If that cannot be achieved without changing shared values, use an isolated Preview project rather than modifying shared credentials. No alternate project has been created here.

For blocked variables, unset means **absent from the effective environment**, not merely absent from branch settings. Blank means the actual zero-length value, not whitespace. Literal `false`, `null`, `undefined`, `disabled`, `replace_me`, a dummy API key, or any other nonempty placeholder still fails the blocked-variable check. Never paste secret values into logs, chat, command arguments, this checklist, or a committed file.

A branch override is the required change scope. An inherited value that is already independently verified identical to the listed safe value need not be changed, but its effective value must still be verified. System variables must come from Vercel, not manual overrides.

## Required checker inputs and diagnostic controls

| Exact variable | Expected safe value/type | Branch scope | Inherited Preview value | Unset / blank / placeholder rule |
| --- | --- | --- | --- | --- |
| `VERCEL_ENV` | `preview` | No: Vercel system variable | Wrong environment/branch/hostname is unsafe; do not spoof | Required; no placeholder |
| `VERCEL_GIT_COMMIT_REF` | `test/property-interest-clerk-request-context` | No: Vercel system variable | Wrong environment/branch/hostname is unsafe; do not spoof | Required; no placeholder |
| `VERCEL_URL` | Vercel-generated immutable deployment hostname, no scheme/path | No: Vercel system variable | Wrong environment/branch/hostname is unsafe; do not spoof | Required; no placeholder |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jojgdfpmaxvbhobjrsbm.supabase.co` | Yes: exact diagnostic branch, Preview only | Only an independently verified identical safe value is acceptable; Production/live/unknown is unsafe | Required nonempty; never use a placeholder |
| `SUPABASE_SERVICE_ROLE_KEY` | Real server-only service credential belonging to staging project `jojgdfpmaxvbhobjrsbm` | Yes: exact diagnostic branch, Preview only | Only an independently verified identical safe value is acceptable; Production/live/unknown is unsafe | Required nonempty; never use a placeholder |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Real matching Development publishable key, prefix `pk_test_` | Yes: exact diagnostic branch, Preview only | Only an independently verified identical safe value is acceptable; Production/live/unknown is unsafe | Required nonempty; never use a placeholder |
| `CLERK_SECRET_KEY` | Real matching Development secret key, prefix `sk_test_` | Yes: exact diagnostic branch, Preview only | Only an independently verified identical safe value is acceptable; Production/live/unknown is unsafe | Required nonempty; never use a placeholder |
| `ALLOW_LIVE_OUTBOUND` | Literal `false` | Yes: exact diagnostic branch, Preview only | Only an independently verified identical safe value is acceptable; Production/live/unknown is unsafe | Required nonempty; never use a placeholder |
| `VOICE_PROVIDER` | Literal `mock` | Yes: exact diagnostic branch, Preview only | Only an independently verified identical safe value is acceptable; Production/live/unknown is unsafe | Required nonempty; never use a placeholder |
| `ASSISTANT_APPROVED_SENDS_ENABLED` | Literal `false` recommended; checker also accepts unset/empty | Yes: exact diagnostic branch, Preview only | `true` is unsafe | Prefer explicit `false`; no placeholder |
| `MYARI_AI_BILLING_ENABLED` | Literal `false` recommended; checker also accepts unset/empty | Yes: exact diagnostic branch, Preview only | `true` is unsafe | Prefer explicit `false`; no placeholder |
| `MYARI_AI_PUBLIC_LAUNCH_VERIFIED` | Literal `false` recommended; checker also accepts unset/empty | Yes: exact diagnostic branch, Preview only | `true` is unsafe | Prefer explicit `false`; no placeholder |
| `MYARI_AI_ENTITLEMENTS_ENABLED` | Literal `false` recommended; checker also accepts unset/empty | Yes: exact diagnostic branch, Preview only | `true` is unsafe | Prefer explicit `false`; no placeholder |
| `CONCIERGE_ENABLED` | Literal `false` recommended; checker also accepts unset/empty | Yes: exact diagnostic branch, Preview only | `true` is unsafe | Prefer explicit `false`; no placeholder |
| `CONCIERGE_OWNER_IDS` | Absent or empty | Yes: exact diagnostic branch, Preview only | Any nonempty inherited value fails | Unset effectively, or genuine empty override; no placeholder |
| `CONCIERGE_ADMIN_IDS` | Absent or empty | Yes: exact diagnostic branch, Preview only | Any nonempty inherited value fails | Unset effectively, or genuine empty override; no placeholder |
| `AUTH_DIAGNOSTICS_ENABLED` | Unset/`false` normally; literal `true` only during the approved diagnostic window | Yes: exact diagnostic branch, Preview only | Inherited `true` is unsafe; configure only this branch | Default unset/`false`; no placeholder |
| `AUTH_DIAGNOSTICS_PREVIEW_HOST` | Exact same hostname as target `VERCEL_URL`, without scheme, port, or path | Yes: exact diagnostic branch, Preview only | Any other deployment hostname disables diagnostics; do not inherit blindly | Real hostname required for logs; no placeholder |
| `AUTH_DIAGNOSTICS_DEVELOPER_IDS` | Unset/empty for runtime-log-only procedure; optional approved Clerk developer user IDs for protected endpoint | Yes: exact diagnostic branch, Preview only | Unreviewed/nondeveloper IDs are unsafe | Prefer unset/empty; no placeholder |

`VERCEL_URL` and the three `AUTH_DIAGNOSTICS_*` controls are diagnostic-operation requirements; the current safety checker does not validate them. `AUTH_DIAGNOSTICS_DEVELOPER_IDS` is optional. The remaining rows above are checked, except that service credential validity/project membership and Clerk key validity/pairing are **not** established by presence/prefix checks.

## Variables required to be neutralized by the checker

For **every row below**: use an exact-branch Preview override if inherited; any nonempty inherited value is unsafe for this checker; the effective value must be **absent or zero-length**; **no placeholder** is accepted. All rows are branch-scoped changes only. The checker blocks metadata/defaults under these prefixes too, not just credentials.

| Exact variable | Expected safe value | Branch scope | Inherited Preview value | Unset / blank / placeholder rule |
| --- | --- | --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `TWILIO_AUTH_TOKEN` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `TWILIO_FROM_NUMBER` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `SLYBROADCAST_USERNAME` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `SLYBROADCAST_PASSWORD` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `SLYBROADCAST_CALLER_ID` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `SLYBROADCAST_DISPO_URL` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `RESEND_API_KEY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `RESEND_FROM_EMAIL` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `RESEND_WEBHOOK_SECRET` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_SECRET_KEY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_WEBHOOK_SECRET` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_TRIAL_DAYS` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_STARTER` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_GROWTH` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_PRO` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_TEAM` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_STARTER_YEARLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_GROWTH_YEARLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_PRO_YEARLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_TEAM_YEARLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_STARTER_AI_MONTHLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_GROWTH_AI_MONTHLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_PRO_AI_MONTHLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_TEAM_AI_MONTHLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `STRIPE_PRICE_AI_PRO_MONTHLY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `VOICE_WEBHOOK_SECRET` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `VOICE_PROVIDER_FROM_NUMBER` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `CRON_SECRET` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `CAMPAIGN_RUNNER_SECRET` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `GOOGLE_CLIENT_ID` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `GOOGLE_CLIENT_SECRET` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `ELEVENLABS_API_KEY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `ELEVENLABS_MODEL_ID` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `ELEVENLABS_VOICE_ID` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `ELEVENLABS_VOICE_LABEL` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `OPENAI_API_KEY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |
| `ANTHROPIC_API_KEY` | Absent or empty | Yes, Preview branch only | Any nonempty value fails | Unset effectively or genuinely blank; no placeholder |

The exact names above cover current known reads/defaults and generated plan-price names. The checker additionally rejects **every other effective variable** beginning with `TWILIO_`, `SLYBROADCAST_`, `RESEND_`, `STRIPE_`, `NEXT_PUBLIC_STRIPE_`, `GOOGLE_CLIENT_`, or `ELEVENLABS_`. An unfamiliar name under these prefixes must also be absent/empty. This prefix rule is necessary for completeness when the actual Vercel inventory is unavailable.

## Additional isolation requirements from the diagnostic instructions

These rows prevent unrelated integrations or features being inherited. They are **not enforced by the current safety checker**. Do not interpret a green checker as proof that these settings, platform ACLs, or credentials have been verified.

| Exact variable | Expected safe value/type | Branch scope | Inherited Preview value | Unset / blank / placeholder rule |
| --- | --- | --- | --- | --- |
| `SUPABASE_STORAGE_BUCKET` | `voice-assets` in staging, or leave absent for that default | Yes, Preview branch only | Unknown or Production-specific bucket selection must be reviewed | May be unset; no placeholder |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional real staging public/anon key only; not required by this diagnostic | Yes, Preview branch only | Production/unknown project key is unsafe | Prefer unset if unused; never a placeholder |
| `APP_BASE_URL` | Exact `https://` origin of the diagnostic Preview | Yes, Preview branch only | Production/other Preview origin is unsafe | Real Preview origin; no placeholder |
| `NEXT_PUBLIC_APP_URL` | Same exact diagnostic Preview origin | Yes, Preview branch only | Production/other Preview origin is unsafe | Real Preview origin; no placeholder |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Yes, Preview branch only | Different origin/path must be reviewed | Set the real path; no placeholder |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Yes, Preview branch only | Different origin/path must be reviewed | Set the real path; no placeholder |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` | Yes, Preview branch only | Production/other-origin redirects are unsafe | Set the real path; no placeholder |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` | Yes, Preview branch only | Production/other-origin redirects are unsafe | Set the real path; no placeholder |
| `DOTLOOP_CLIENT_ID` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `DOTLOOP_CLIENT_SECRET` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `VOICE_PROVIDER_API_KEY` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `VOICE_PROVIDER_BASE_URL` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `INTEGRATIONS_PROBE_SECRET` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `GOOGLE_OAUTH_REDIRECT_URI` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `CONCIERGE_MANAGER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `CONCIERGE_SPECIALIST_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `CONCIERGE_SALES_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `ASSISTANT_SEND_OWNER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `ASSISTANT_SEND_RECIPIENTS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `ASSISTANT_V2_OWNER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `MYARI_AI_ADMIN_OWNER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `MYARI_AI_ADMIN_REPORT_OWNER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `AI_BETA_PLUS_OWNER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `PROPERTY_INTEREST_OWNER_IDS` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `MYARI_AI_LAUNCH_CONFIG` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `NEXT_PUBLIC_META_PIXEL_ID` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Absent or empty for this authentication-only rehearsal | Yes, Preview branch only | Any unreviewed nonempty value must be neutralized | Unset effectively or genuinely blank; no placeholder |
| `MYARI_AI_BILLING_LIVE_APPROVED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `MYARI_AI_METER_DATABASE_VERIFIED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `MYARI_AI_PLAN_CHANGES_ENABLED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `MYARI_AI_PRICING_ENABLED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `ASSISTANT_V2_ENABLED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `ASSISTANT_HARD_COST_POLICY_APPROVED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `ASSISTANT_INBOUND_VERIFIED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `CALENDAR_LINKS_ENABLED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `PROPERTY_INTEREST_ENABLED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `ALLOW_DELIVERY_RECONCILIATION` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `DELIVERY_EVIDENCE_ENABLED` | Literal `false` | Yes, Preview branch only | Inherited `true` is unsafe for this rehearsal | Use explicit `false`; no placeholder |
| `MYARI_AI_STRIPE_MODE` | `test` with all Stripe credentials still absent/empty | Yes, Preview branch only | `live` is unsafe | Use `test`; no placeholder |

For the standard single-instance Clerk Development setup, also review the following optional SDK overrides. None is required to run this diagnostic. These are not checked by the current safety checker; an intentional existing override needs separate review rather than an assumption that it is valid.

| Exact variable | Expected safe value/type | Branch scope | Inherited Preview value | Unset / blank / placeholder rule |
| --- | --- | --- | --- | --- |
| `SHIPPO_API_TOKEN` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `CLERK_MACHINE_SECRET_KEY` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `CLERK_JWT_KEY` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `CLERK_ENCRYPTION_KEY` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `CLERK_API_URL` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `CLERK_API_VERSION` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_DOMAIN` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_IS_SATELLITE` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_JS_URL` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_JS_VERSION` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_UI_URL` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_UI_VERSION` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | Absent for this simple rehearsal unless separately reviewed as necessary and compatible with staging/Development | Yes, Preview branch only | Unreviewed credentials, key/issuer overrides, proxies or redirects are unsafe | Prefer effective unset; no placeholder |
| `NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG` | Unset or literal `false` | Yes, Preview branch only | Enabled debug must be removed for this rehearsal | Unset/`false`; no placeholder |

No provider/billing/scheduler placeholder credentials are needed. Do not copy `.env.example` wholesale: it contains nonempty provider defaults and credential placeholders that fail the checker. Tool-only authentication tokens such as a Vercel management credential are not application configuration requirements; do not add them to the deployed app.

## Effective-environment verification checklist

- [ ] Select only the exact branch's Preview configuration. Inspect inherited variable **names and set/empty status**, without displaying values. Verify matching prefix rules above against the full effective inventory, including names absent from the repository.
- [ ] Confirm Vercel system metadata identifies Preview and the exact branch. Do not manually set system variables to make a local run appear hosted.
- [ ] Confirm the Supabase URL is exactly `https://jojgdfpmaxvbhobjrsbm.supabase.co`. Through authorized provider tooling, verify the service credential belongs to that project and can perform an approved read-only operation. Presence alone is insufficient. Do not modify migrations or data.
- [ ] Confirm the Clerk pair belongs to one Development instance and is valid using authorized provider tooling. Prefixes alone do not validate credentials. Keep only pass/fail evidence, never key/JWKS/session contents or raw API errors.
- [ ] Confirm outbound is explicitly `false`, provider is `mock`, all blocked variables are effectively absent/empty, billing/sending flags are off, and Concierge plus all its allowlists are off/empty.
- [ ] Confirm both scheduler routes are blocked by the Preview branch middleware. Local proxy tests verify this behavior; after any subsequently authorized diagnostic deployment, confirm each responds 403. Do not run a scheduler as a preflight probe.
- [ ] Verify developer-only Vercel project/runtime-log access and Deployment Protection. Environment variables cannot establish these ACLs.
- [ ] From an authorized environment runner that supplies the **actual effective target branch environment**, run `node scripts/auth-diagnostics-safety.mjs`; retain only its boolean output and exit status. Require all nine booleans true and exit status 0. Do not echo the environment or pass secrets as command arguments. A synthetic local fixture or manually spoofed system metadata is not evidence.
- [ ] Check diagnostic flag/hostname and origin settings separately; the checker does not validate them. The immutable hostname must be known before enabling runtime observation. If unavailable before a new deployment, keep the flag off; do not substitute a hostname that will not match. This task does not authorize deployment to discover it.
- [ ] Revalidate branch-specific settings after any relevant configuration change. A checker result from an older deployment is not proof of the next deployment's configuration; public build-time settings must correspond to the reviewed configuration.
- [ ] Only report diagnostic deployment readiness after every gate above passes. Do not deploy as part of this checklist task.

## Current evidence and blocker

The current cloud machine has no Vercel management binding, Clerk keys, Supabase binding, or explicit outbound setting. It is not the effective Vercel Preview environment. The checker exits 1 here: branch scope, staging URL, Development keys, staging service credential presence, outbound disabled, and mock provider checks fail. Absence of local provider credentials does not prove Vercel's inherited credentials are neutralized.

**Not ready for diagnostic deployment.** Completion requires authorized access to the effective Vercel branch configuration (or status-only verification from its authorized runner), valid staging/Development bindings, and a passing current safety result. Enter secret values only in secure branch-scoped environment settings, never chat. Production and shared Vercel credentials have not been modified. No deployment has been performed.
