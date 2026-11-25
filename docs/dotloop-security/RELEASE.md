# Dotloop connection security — reviewed release plan

Status: development only. No deployment, Supabase changes, key generation, token reads, rotation or revocation performed. Base: main 258f6a669736369d756979c65a35878d0c0dbcc3. Branch: fix/dotloop-connection-security. Automatic branch deployment disabled in vercel.json.

## Security impact

The audited integration_connections table exposes broad anon/authenticated grants and an all-rows PUBLIC policy. The reviewed SQL revokes those privileges, removes that policy, keeps RLS enabled, and grants only SELECT/INSERT/UPDATE/DELETE to service_role. No public client policies are added. This server-only model requires Clerk authentication and owner/provider scoping for every operation; a service_role credential is not a substitute for tenant authorization.

Existing normal routes never select plaintext token columns. New authorizations use AES-256-GCM (random 96-bit IV, 128-bit tag), AAD binding owner/provider/token purpose/version, and an identified 256-bit key. Browser Settings now imports a separate public URL constant, not the server token service. New RPCs are SECURITY INVOKER and executable by service_role only. Atomic RPC audit events exclude tokens/account contents.

Refresh and revocation use an atomic database lease and credential-version fencing, not a process-local promise. Provider requests time out after 10 seconds; no automatic retry follows uncertain refresh outcomes. Expired/abandoned refreshes require reconnection. Refresh preserves the previous refresh token if the response omits a replacement. Disconnect disables local use before the provider call. A failed/uncertain revoke retains ciphertext in revocation_pending for an explicit retry; it never claims provider access was revoked. Successful revoke deletes only that owner's Dotloop connection. No customer CRM rows are deleted.

GET/status is metadata-only and does not call Dotloop or refresh. A valid saved credential is labelled authorization_saved, never synchronized/fully verified. Explicit same-origin authenticated POST verifies /account and refreshes only when needed. Missing storage, configuration, expiry, pending revocation and reconnect states are distinct. No loop/document operations exist in this PR.

## Other integrations

Repository-wide consumer inspection found only Dotloop uses integration_connections. Its current provider constraint allows Dotloop only. Google Calendar uses calendar_connections and lib/calendar/token-crypto.ts; neither is modified. The SQL precondition stops if a different provider is found. Local DB tests assert Calendar records remain unchanged. Google regression tests run with the full suite. This does not claim a live Google OAuth acceptance test was performed.

## Exact SQL and ordering

The exact approval artifact is production.sql in this directory. It is deliberately outside supabase/migrations to prevent accidental automated application. The installed CLI could not generate a migration file because its configuration directory is on a read-only home filesystem; no timestamp was invented. After review, promote these exact bytes through the authorized migration workflow and verify SHA-256, without rerunning schema-integrations.sql.

1. Recheck main/reviewed commit, table definition, grants, policies, consumers and no active OAuth operations.
2. Independently confirm a fresh completed backup/PITR point for the approved project; record timestamp and recovery procedure. Prior November 9 backup evidence is historical, not a newly verified recovery point.
3. Have a privileged operator securely configure DOTLOOP_TOKEN_KEYRING (JSON key-id to base64 32-byte key) and DOTLOOP_TOKEN_ACTIVE_KEY_ID in the target environment only. Never reuse Calendar keys, expose to NEXT_PUBLIC, put keys in SQL or log them. Keep a recoverable restricted copy in the approved secrets manager. Host-injected encrypted environment values are the initial key-management mechanism, not hardware-backed KMS.
4. Rehearse exact SQL on isolated staging after approval. Local PGlite tests do not replace Supabase-hosted acceptance.
5. Apply reviewed SQL in its single transaction. A 5-second lock timeout fails safely; no blind retries if schema differs. It is intentionally not rerunnable: duplicate columns/functions cause rollback.
6. Verify no client table/function privileges, RLS enabled, no permissive policies, row counts preserved, service-role operations and audit writes work.
7. Deploy reviewed code only after separate deployment approval. Verify real test OAuth, provider scopes, refresh, revocation, same-origin checks and tenant isolation using authorized synthetic accounts.
8. Do not reconnect the previously exposed account before the incident review and any separately approved revocation.

## Statements and preservation

Immediate SQL changes: DROP POLICY removes only the permissive authorization rule; REVOKE removes privileges; ALTER drops access_token NOT NULL and adds encrypted/state/lease fields and a consistency constraint; CREATE FUNCTION adds four narrowly scoped RPCs. No immediate DELETE/TRUNCATE or data UPDATE is executed by applying the file. Existing rows/legacy token values are preserved and default to reconnect_required. UPDATE/DELETE statements inside RPC bodies execute only on explicit later server/operator operations with owner/provider/version/lease predicates. ON CONFLICT authorization replacement clears old plaintext only for the selected owner's connection.

## Legacy credential handling and incident response

Read-only audit found one expired access-token timestamp; refresh-token validity and compromise were not tested. Expiry does not establish revocation or safety. Treat the connection as potentially exposed until evidence establishes otherwise. Review Data API exposure and available access logs privately. Preserve incident evidence; absence of log evidence is not proof of no access. Recommend provider-side revocation and explicit reconnection after separate approval, including any legacy credential surviving in backups/logs. No revocation or rotation is authorized by this PR.

For an approved preservation/backfill path, scripts/dotloop-encrypt-legacy.ts defaults to count-only: `node --import tsx scripts/dotloop-encrypt-legacy.ts --project=jojgdfpmaxvbhobjrsbm`. It requires the separately approved schema and securely injected staging credentials. `--apply` explicitly reads only legacy Dotloop token rows into the private process, verifies encryption round trips, and uses a compare-and-swap audited RPC to clear the matching plaintext. It leaves reconnect_required and makes zero provider calls. It must not run on real credentials during development. Production additionally requires --approved-production-encryption=qlochlyyimulyzzrzyac and separate explicit approval; the flag is an operator acknowledgement, not an authorization mechanism. Never run through public diagnostics or print env/rows. Do not activate a migrated potentially exposed token merely because it is now encrypted.

## Rollback/recovery

- If SQL fails before COMMIT, transaction rollback preserves prior schema/data automatically.
- After successful application, do NOT restore unsafe grants/policy or roll back the whole Production database. Other CRM features and Calendar can remain running.
- If application problems occur, disable the Dotloop connection UI/use in a reviewed code rollback while retaining the restrictive grants and additive schema. Do not redeploy the pre-encryption Dotloop service over ciphertext-only records; it cannot operate on them.
- Preserve all ciphertext and key versions. Revert only the affected application implementation or forward-fix the RPC. Avoid DROP COLUMN/function rollback and never decrypt values back into broadly accessible columns.
- Explicit approved reconnection is the clean recovery for unrecoverable/revoked credentials. Database backup restoration is a last resort, not routine rollback. Restoring an old backup also restores the original permission risk and requires re-hardening before exposure.

## Dependencies and acceptance gates

Secure keys not created/configured. No current Production backup reverified. No real provider call, credential backfill, revoke or new Preview performed. Hosted Clerk, actual registered scopes, real refresh/revoke semantics and staging SQL acceptance remain release gates. Source, unit, route and local SQL tests are evidence of development readiness, not Production activation. Retain current Assistant/Concierge/sending/billing/plan flags unchanged.
