# Account-specific contact allowance

## Scope

This branch adds an independent, durable contact allowance. It does not change Growth pricing, Stripe, plan selection, messaging allowances or existing customer records. The migration contains **no account-specific activation rows**. In particular, `user_3LbCsPoH76YvWJhXwzhHPzltnoR` is not granted 30,000 contacts by code or migration.

The target's previously accepted Production baseline is 5,000 contacts / Growth 5,000. Live Clerk primary-email and workspace/membership verification remain pending. Contacts currently use Clerk `owner_id` as their workspace namespace, not a separate organization ID. Verify that this namespace is the intended test workspace before activation; do not guess a team ID or apply a user-wide override to an ambiguous workspace.

## Implementation

- `contact_allowance_overrides`: owner-keyed maximum, verified identity/workspace reference, environment, reason, approver, configuration revision, and separate enforcement version. RLS enabled; no PUBLIC/anon/authenticated privileges or policies. Existing Contacts client INSERT grants were read-only checked and are absent.
- `set_contact_allowance_override`: server-role-only, compare-and-swap administrative operation; no subscriber HTTP endpoint. Configuration changes are audited separately from contact-insert lock revisions. New/old quota settings persist across deployments and login sessions.
- `enforce_workspace_contact_allowance`: SECURITY INVOKER trigger before INSERT or owner transfer. For an enabled override, it updates/locks that owner's override row, then counts actual Contacts. No materialized contact counter or counting-rule change. READ COMMITTED writers serialize; stale REPEATABLE READ writers fail serialization rather than exceed the allowance. Existing edits with unchanged owner do not allocate capacity. Failed inserts roll back the enforcement version too.
- Owners without an enabled override retain their existing plan allowance and application checks. This is not a global plan-quota redesign. The database backstop applies to all creation paths for overridden workspaces, including manual, CSV, Concierge, future AI/background writers and bulk SQL inserts.
- CSV batching: at most 100 rows per RPC, owner-scoped normalized identity lookup, explicit duplicate reporting, no overwrite/merge and safe retries. No global unique-phone constraint is added. Shared household numbers with different identities remain permitted. Parallel imports for the same owner serialize. A failed quota batch is rolled back; earlier confirmed batches are reported with explicit row errors for all remaining rows. No rows are silently truncated. Consent behavior is preserved; no enrollment/sending is added.
- `effectiveContactAllowance` supplies the same separate limit to usage/settings, creation checks and Concierge imports. Missing/unreadable enabled configuration fails closed. Contact count errors are not interpreted as zero.
- `/api/contacts/page` applies the existing authoritative filtering, lifecycle counting and sorting functions on the server, then returns only the requested page (25 by default, maximum 100). Authenticated owner scope, private/no-store responses, stable sorting, source/type/category options and exact filtered/workspace counts are preserved. Filters reset selection as before; page navigation retains selected IDs across pages. Exports continue using full authorized server data and therefore include selected/filtered records outside the visible page.

## Pagination/performance boundary

The Contacts workspace no longer loads 30,000 contact records into the browser. The current backend deliberately reuses the existing complete server snapshot, fetched in 500-record database pages, to preserve search/consent/filter/count semantics. It still materializes the workspace snapshot on the server for each request; it is not a database LIMIT-only query. Large notes and unstable counts during concurrent imports can increase latency or produce a retryable 503. The existing `owner_id` index supports counts; a new non-unique owner/import-identity index supports duplicate lookup.

The browser audit now covers Contacts, Dashboard, Property Finder, Calendar contact/booking pickers, note/task dialogs, global search, referral selection, Reviews & Referrals status filtering, and campaign preview/recipient/run dialogs. These use bounded pages or searchable directories. Selected/recent IDs are independently owner-checked and hydrated, so records outside the first page remain reachable. Saved property criteria have page navigation. Dashboard summaries still cover the entire authorized dataset. The read-only recipient endpoint supplies exact full-set eligibility/category totals while returning at most 50 records; explicit selection survives page changes, and all/category confirmation retains the existing server-side enrollment workflow. No automatic sending or enrollment is introduced. The legacy GET `/api/contacts` remains for compatibility, with no audited browser consumer still calling it.

On isolated staging, a rollback-only SQL test seeded 29,900 synthetic contacts, imported 100 through the real RPC (2,632ms), rejected contact 30,001, and classified all 100 repeated rows as duplicates (22ms). Search found the last contact in 70ms. All synthetic contacts, overrides, audits and receipts were independently confirmed absent afterward. This does **not** establish authenticated hosted acceptance.

The realistic-note full snapshot serialized to 59,147,394 bytes in 18,063ms inside PostgreSQL. This is a concrete remaining server latency/memory risk, not an HTTP benchmark. Hosted load/search/import/export acceptance remains a release gate; database-side filtering/aggregation may be required if hosted latency is unacceptable. Do not represent the bounded browser response as database LIMIT-only pagination.

## Migration review

`supabase/migrations/20261113214613_contact_allowance_override.sql` was created with Supabase CLI. Checksum and test evidence are in `VERIFICATION.json`.

Dependencies: existing `contacts` UUID key and owner/standard contact columns, service-role ownership boundaries. This adds three tables, two triggers (Contacts enforcement and configuration audit), administrative/import functions and a non-unique Contacts import index. It does not replace existing RLS/policies, change plan records, create a subscription, or rewrite any contact.

Index creation is transactional and briefly locks Contacts writes while building. Review duration against staging size before Production approval. The reviewed migration is installed only on isolated staging project `jojgdfpmaxvbhobjrsbm`, under migration version `20261113214613`. The source filename is aligned with that recorded staging version; its SHA-256 is unchanged. All three new tables remain empty. Do not reapply it to staging. No Production migration has been applied. Use a verified completed backup/PITR point before the separately approved Production migration. Do not blindly reapply an existing or partial migration.

## Safe release order — not executed

1. Complete exact-head CI and inspect the migration hash.
2. Apply the reviewed migration to isolated staging; configure Development authentication and test Supabase; keep sending/billing/schedulers off. Run authenticated owner/other-account acceptance.
3. Verify Live Clerk user ID, primary email `hello@myari.io`, and workspace/membership scope. Resolve multiple organizations before proceeding.
4. Obtain separate Production approval for the exact migration/application commit and activation configuration.
5. Verify backup/current schema, apply the additive Production migration, deploy approved code, and set `CONTACT_ALLOWANCE_OVERRIDES_ENABLED=true` and `CONTACT_IMPORT_BATCH_ENABLED=true` through authorized configuration. With no override rows, existing plan limits remain unchanged.
6. LAST, invoke the reviewed owner-specific administrative function using independently verified workspace evidence and expected revision. See `ACTIVATION.sql` (parameterized review template; never run with invented identity evidence).
7. Read back one changed override row, usage allowance, exact contact count and unchanged billing. Do not insert thousands of Production fixtures.

## Rollback

Keep the pagination code and existing contacts/history. To restore the previous Growth ceiling while retaining atomic protection, CAS-update only the target override to **5,000**, enabled, with the current revision and rollback reason. Existing contacts above 5,000 remain readable/editable; additional creation is blocked. Do not delete contacts to fit the lower ceiling.

Disabling the override instead restores the plan-based application ceiling but removes this workspace's new database backstop; prefer the explicit 5,000 enabled cap. Never drop quota/audit/import-receipt tables or restore a backup merely to undo an allowance. Retain idempotency history. The migration's transaction rollback was tested before installation; post-activation rollback is a non-destructive configuration change, not a destructive down migration.

## Preview and external blockers

No Production changes or target activation were made. A protected Preview requires a verified branch-specific Development Clerk/staging Supabase binding; do not inherit Production credentials. The local managed runner currently has Development Clerk keys but a Production Supabase URL. It was not used for hosted database tests or deployment. Branch-specific Vercel metadata returned no entries. The broader metadata response exposed credential names scoped jointly to Production and Preview (Clerk, database, Stripe, messaging and scheduler); its 100-entry result omitted another 940 entries. Values were not decrypted. Therefore inherited credential isolation is not established. The branch has automatic deployment disabled in vercel.json and no unsafe Preview was created. No keys are requested in chat. Reuse an authorized existing secure staging binding, then deploy only after isolation checks. Screenshots here are the actual implemented workspace against synthetic server data, not authenticated hosted acceptance.

## Minimum external actions still required

1. Have an authorized administrator bind the **existing** Development Clerk and `jojgdfpmaxvbhobjrsbm` staging credentials to `fix/workspace-contact-allowance` through a secure runner/platform binding, excluding all inherited Production credentials and keeping providers, outbound, billing and schedules off. A complete untruncated metadata/runtime isolation check must pass before protected deployment. No credentials or screenshots are needed in chat.
2. In an already authorized **Live Clerk server environment**, run `node scripts/contact-allowance/verify-live-identity.mjs`. It makes GET-only Clerk user/membership requests and prints no keys or customer records. It refuses Development keys, verifies the exact primary email, active status and paginated organization memberships, and performs no activation. Return only its sanitized JSON. More than one organization requires explicit workspace confirmation.

Authenticated Preview create/import/pagination/filter/sort/select/export, logout/login, two-account isolation and realistic 30,000-contact HTTP load testing then remain to be executed. Synthetic identity fixtures and local browser tests are not substitutes. Production stays **NO-GO** until those gates pass, followed by separate approval for the reviewed migration, release commit and single-owner activation.
