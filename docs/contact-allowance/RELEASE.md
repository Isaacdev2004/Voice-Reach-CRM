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

Other existing features using the legacy full-contact feed are unchanged; this branch does not silently truncate their pickers or miscalculate Dashboard totals. Their browser/server memory behavior is a separate scale concern to review before a broad 30,000-contact rollout. Hosted load testing with realistic staging field sizes is still required; local timings are not Production latency guarantees.

## Migration review

`supabase/migrations/20261113210902_contact_allowance_override.sql` was created with Supabase CLI. Checksum and test evidence are in `VERIFICATION.json`.

Dependencies: existing `contacts` UUID key and owner/standard contact columns, service-role ownership boundaries. This adds three tables, two triggers (Contacts enforcement and configuration audit), administrative/import functions and a non-unique Contacts import index. It does not replace existing RLS/policies, change plan records, create a subscription, or rewrite any contact.

Index creation is transactional and briefly locks Contacts writes while building. Review duration against staging size before Production approval. No hosted migration has been applied. Use a verified completed backup/PITR point before the separately approved Production migration. Do not blindly reapply an existing or partial migration.

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

No Production changes or target activation were made. A protected Preview requires a verified branch-specific Development Clerk/staging Supabase binding; do not inherit Production credentials. The local managed runner currently has Development Clerk keys but a Production Supabase URL. It was not used for hosted database tests or deployment. Branch-specific Vercel metadata returned no entries, so a safe effective Preview binding has not been established. No keys are requested in chat. Reuse an authorized existing secure staging binding, then deploy only after isolation checks. Screenshots here are the actual implemented workspace against synthetic server data, not authenticated hosted acceptance.
