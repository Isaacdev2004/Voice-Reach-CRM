# Concierge controlled-pilot readiness — 28 October 2026

Production has NOT been modified. Changes are isolated to feat/concierge-pilot-readiness, based on deployed/main aabbf1aa25e679e70b251b4c8ed9af9cb6740982. Automatic Git deployments are disabled for this branch. No Assistant, dispatch, billing, subscription or entitlement service is changed.

## Development changes

- Health separates configured providers from the ALLOW_LIVE_OUTBOUND permission gate. Previously liveSending was simply an OR of credential-presence checks. This was misleading, not proof that a message could be sent. The new field is still not per-contact authorization; existing consent/enrollment/provider checks remain mandatory.
- Connection verification stores timestamped SMS ownership/calendar retrieval evidence through the existing versioned Concierge mutation RPC. It never stores credentials. Only checks under 24 hours old can count toward automatic readiness; email/voice are not fabricated as verified. Explicit not-applicable is still a subscriber attestation requiring human review.
- Readiness only counts the campaign specifically linked to this case, rather than an arbitrary existing CRM draft.
- Separate manager signoff requires a different authorized actor, a complete subscriber checklist, current case version, review notes and manual Voice Studio attestation when voicemail is selected. Specialists/sales cannot sign. Any later case mutation invalidates approval. Signoff is evidence for the reviewed case version, not a launch command or a guarantee that external services remain operational. Existing staff stages alone never grant approval. Internal signoff notes/actor IDs are stripped from subscriber responses.
- Campaign preparation persists a pending claim before the builder runs. Complete existing template drafts are inspected read-only and linked after interruptions. Missing/partial/edited/foreign/live campaigns fail closed; nothing is overwritten or deleted. A pending save with no campaign requires manager investigation, not blind retries. This does not make the legacy multi-write builder atomic; manual recovery remains required in ambiguous cases.
- Subscriber screen distinguishes self-attestation from human signoff and shows actual stored connection evidence and manual Voice Studio requirements. Staff review controls have required confirmations and use the existing request/error/loading patterns.
- A bounded POST /api/concierge/retention cleanup operation requires both CONCIERGE_RETENTION_ENABLED=true and the existing CRON_SECRET bearer authorization. It clears at most 100 expired CSV preview payloads per invocation, owner/id/state/expiry scoped. No scheduler was added or activated. Completed imports, CRM contacts and case history remain. Approve a retention policy and schedule before paid rollout; on-access cleanup remains available meanwhile.

## Exact original migration

File: supabase/migrations/20261027121246_concierge_onboarding.sql
SHA-256: d15568198a68831e4732bd02538b85096043d977aedcf1c04a4fa81eb6e7eab6

Unchanged. Adds only:
- concierge_cases: text Clerk owner primary key, discovery/milestones JSON, stage, assignment, follow-up, internal note, version/timestamps.
- concierge_events: UUID event/request primary key, owner FK, actor/action/request hash/time.
- concierge_imports: UUID primary key, owner FK, unique(owner,fingerprint), reviewed rows/errors, state/result/expiry.
- Two explicit indexes: concierge_events_owner(owner_id,created_at desc), concierge_cases_assignee(assignee_id,updated_at); primary/unique constraints also create indexes.
- mutate_concierge_case(text,text,uuid,integer,jsonb,text) and execute_concierge_import(text,uuid,integer).
- RLS enabled on all three tables, with intentionally no browser policies. PUBLIC/anon/authenticated privileges revoked. Service role receives SELECT/INSERT/UPDATE on cases/imports, SELECT/INSERT on events, EXECUTE on the two RPCs. RPCs are SECURITY INVOKER with fixed search_path=public.

No DROP/TRUNCATE/DELETE, no existing CRM ALTER TABLE, no extension, role, trigger, sender, scheduler or billing creation. BEGIN/COMMIT encloses installation. INSERT/UPDATE inside function bodies execute only when invoked later; installation does not import contacts or create cases. The API must resolve Clerk owner_id: service-role RPC callers are trusted backend code, not independently authenticated Clerk users. Browser grants must remain denied.

Dependencies: existing contacts(id,owner_id,first_name,last_name,phone,email,type,source,notes,dnc), consent_records(owner_id,contact_id,status,source,notes), UUID defaults/gen_random_uuid(), pg_advisory_xact_lock/hashtextextended, existing service_role/anon/authenticated roles. Contact/consent IDs and defaults must remain compatible. No Clerk organization ID substitution.

## Testing evidence

Unchanged migration installed and exercised in disposable PGlite PostgreSQL. Existing test covers optimistic conflicts, replay payload binding, cross-owner denial, atomic contacts/Unknown consent import, duplicate skip, plan-limit rollback, cancellation, expiry, cleared payloads and browser-role/RPC denial.

Hosted test project jojgdfpmaxvbhobjrsbm already has this migration. Both installed RPC body hashes exactly match the reviewed file (mutate 58e17b51de1936db6540e4fb1bcf0351; import a9c05998cfe4cc797b0a6df6f97cf015). Non-idempotent CREATE TABLE statements were NOT reapplied to existing staging objects.

hosted-rehearsal.sql ran once as BEGIN / SET LOCAL timeout / DO assertions / SELECT result / ROLLBACK, no intermediate COMMIT. All assertions completed. Independent subsequent query confirmed all synthetic cases, contacts, consents, imports and events absent. Baseline before/after: contacts236, campaigns30, campaign_steps147, calendar_events71, audit_logs17061. These are staging counts, not Production counts.

Read-only Production baseline: contacts236, campaigns29, campaign_steps139, calendar_events71, audit_logs17049; Concierge tables absent. Refresh immediately before any approved migration and explain legitimate concurrent changes. No Production functional test writes are authorized.

## Preview isolation and hosted acceptance blockers

Existing Concierge Preview dpl_AMCrS6wcsr2U7ryBUyQQaJhYBwVY, feat/myari-concierge commit177e5cc49b0226c488485bb34f72f4bdbcf6350b, is older code, not this change. Current branch ALLOW_LIVE_OUTBOUND, approved AI sends, public AI launch and new AI billing flags were privately checked as false. This proves current project branch configuration, not host-injected values in the old immutable deployment. No provider-specific branch overrides were present in its 16-entry branch inventory. Inherited credentials cannot be certified absent or nonproduction from that evidence.

The authorized Vercel fetch of /api/concierge/access returned401 deployment_authentication_required after the connector's protection handling. There is no available signed-in Clerk browser session or Clerk administration connector. Local managed network also does not permit Vercel/Clerk/provider access. Do not export Preview secrets, weaken protection, impersonate users or treat mock browser tests as authenticated hosted acceptance.

Required: isolate all inherited live Stripe/Twilio/Resend/Slybroadcast/voice/Google/provider credentials on the chosen test branch, retain test Supabase and matching Clerk Development pair, verify host-injected scope with a private guarded mechanism, then authorize a protected signed-in Development browser session with two synthetic subscribers and distinct manager/specialist/sales accounts. Verify subscriber creation/discovery/save-resume/import confirmation/duplicates/draft recovery/assignment/role denial/audit/errors and clean fixtures. No communications tests until isolation passes. No fresh Preview was deployed by this change.

## Backup and recovery

The connected Supabase tool inventory provides no scheduled-backup listing. Latest owner-supplied evidence is 27 October2026 11:53:56UTC physical backup with Restore available; it is historical evidence, not a refreshed inventory. A new timestamp/status request is pending. Pro plan alone does not establish PITR availability or tested restore duration.

Before approval: confirm latest completed backup and Restore option for qlochlyyimulyzzrzyac; confirm restore-to-isolated-project availability and a usable restore procedure. Prior isolated restoration is useful rehearsal evidence, not proof of current RTO. Record all legitimate CRM activity after the backup. Restore replaces database state and can lose post-backup changes; export/reconcile those changes before any separately authorized recovery. Supabase Storage object bytes are NOT backed up (metadata only); these require separate coverage. No restore is authorized or will run automatically.

## Exact proposed Production execution (NOT approved/executed)

1. Reconfirm project qlochlyyimulyzzrzyac, backup, live baseline, dependency/default/grant compatibility, absence of conflicting Concierge objects and migration history. Validate the above SHA-256 against repository SQL. Stop if any critical prerequisite differs.
2. Through authorized Supabase apply_migration API, apply ONLY name20261027121246_concierge_onboarding and that exact SQL. No db push or other migrations. The installer contains its own BEGIN/COMMIT. Stop on error and inspect state before considering a retry.
3. Read-only postflight: verify three tables/constraints/indexes/RLS, exact RPC definitions/search paths/SECURITY INVOKER, denied client grants, service-role privileges, migration history, unchanged CRM counts accounting for concurrent activity. No test writes, sending or access activation in Production.
4. Record execution ID/result, SQL checksum, timestamps and baseline comparisons. Code deployment and owner flag activation each require separate approval.

Expected downtime: no planned outage, no existing CRM table rewrite. New-table/FK/index/function catalog work can take short locks; choose a quiet window, monitor lock waits and stop rather than retry indefinitely. Future imports acquire an owner-keyed advisory transaction lock, not a global CRM lock. Existing other contact-creation paths do not share that lock, so global plan-limit concurrency is not claimed.

Failure before migration COMMIT should roll back its transaction; verify absence/history rather than assuming. After successful install, retain additive tables/functions and keep Concierge inaccessible. Do not DROP data, delete imported contacts or restore a backup as rollback. Code rollback returns to the verified pre-change Ready deployment with separately approved settings/redeployment if necessary. Any future bad import needs provenance-based, owner-scoped reconciliation and separate deletion approval; consent/history should be preserved.

## Owner pilot proposal — separate authorization required

CONCIERGE_ENABLED=true; CONCIERGE_OWNER_IDS=one exact verified Live Clerk owner; CONCIERGE_MANAGER_IDS=one distinct verified authorized Live reviewer. Specialist only if operationally needed; admin/sales empty unless separately approved. No global eligibility path exists. Do not use the Development ID in Production. Current Live identity/session and reviewer IDs require private verification; do not guess or copy historical IDs.

Keep existing Assistant flags unchanged. Keep sending, autonomous actions, AI billing/public rollout/plan changes disabled; do not change subscription entitlements. CONCIERGE_RETENTION_ENABLED remains false until cleanup operation/policy approved. Training bookings are manual. Owner pilot uses synthetic contacts only after separate Production test-write approval; otherwise conduct the full test journey in staging, with owner pilot limited to read-only review.

Checklist: verify owner session; save discovery; import preview/counts/duplicate/DNC/Unknown consent review; explicit import approval; approved mock draft/content/sequence review; actual integration evidence or documented N/A; manual Voice Studio recording/script/provider check if selected; subscriber attestations; distinct manager signoff; escalation owner and next follow-up; report current version and remaining exceptions. No checklist or signoff activates campaigns, sending or billing.

## Approval wording to use after prerequisites pass

“Approve SQL only on qlochlyyimulyzzrzyac: apply 20261027121246_concierge_onboarding.sql, SHA-256 d15568198a68831e4732bd02538b85096043d977aedcf1c04a4fa81eb6e7eab6, through the authorized Supabase migration API after final backup/dependency/baseline preflight passes. This excludes code deployment, feature activation, Production test writes, messaging, billing and restoration.”

Current decision: NO-GO for owner activation or paid launch. SQL preparation and rolled-back hosted database rehearsal pass; fresh backup/recovery confirmation, Preview secret isolation and authenticated hosted subscriber/staff acceptance remain required. Do not request execution approval as though those blockers were resolved.

## Subsequent isolation remediation

After the initial inventory, 14 empty Config overrides were added and independently re-listed ONLY for Preview branch feat/myari-concierge: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, GOOGLE_CLIENT_SECRET, GOOGLE_CLIENT_ID, ELEVENLABS_API_KEY, RESEND_FROM_EMAIL, RESEND_API_KEY, SLYBROADCAST_CALLER_ID, SLYBROADCAST_PASSWORD, SLYBROADCAST_USERNAME, TWILIO_FROM_NUMBER, TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, CRON_SECRET. All creations succeeded, without replacing existing branch variables. Staging Clerk/Supabase/OpenAI entries and Production scopes were untouched. These block the identified inherited live provider/scheduler credentials in a FUTURE deployment, not the existing immutable Preview. This is not a complete host-injected credential audit; fresh runtime validation remains blocked.

The readiness code is on a separate branch. Existing write-only staging Secrets cannot be securely cloned with the available API. Before deploying this code to Preview, the owner must securely scope the existing nonproduction credentials to feat/concierge-pilot-readiness (or an approved integration branch) directly in Vercel, with equivalent blank provider masks and disabled gates. No credentials should be pasted in chat, downloaded or exported. Development subscriber and staff IDs must be privately verified before allowlisting.
