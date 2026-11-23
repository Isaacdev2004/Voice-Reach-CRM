# Campaign editor reliability repair

## Recovery findings — November 23, 2026

Read-only investigation in owner namespace `user_3K3RSKGuUrGj35waMWovWke7S9K` found neither Commercial Campaign (7 steps) nor Commercial Lead Outreach (6 steps) updated after October 6. No other campaign created/updated that day, save/activation audit, new enrollment/run/execution or outbound record for those two campaigns was found. An attachment upload reached the server at 10:49 a.m. Eastern. The original tab was subsequently closed. No missing campaign text has been recovered.

The available Vercel campaign log query returned no matching runtime entries. Absence of logs does not prove the exact error. The inspected Production commit is dffb5203. Successful activation submitted current copy, but validation could reject it before saving. Failed activation had no recovery persistence. Step editing itself changed React state only; no autosave or navigation guard existed. The loader also depended on voice asset metadata and could refetch/overwrite edits when assets changed. Therefore unsaved browser state lost on tab closure is consistent with the evidence, but the precise session failure is unproven.

## Safe browser-local recovery

No browser tool/session is available to inspect the founder's Mac. Do not claim recovery. Do not clear site data, run cleanup, save another legacy template, or activate while investigating. Use the SAME Chrome profile and exact hostname used during editing (`myari.io` and `www.myari.io` have different storage).

1. Reopen the closed tab with Command-Shift-T. If text returns, copy it to a private document immediately.
2. Open DevTools → Application → Local Storage for that hostname. Inspect `voicereach-campaign-templates` without editing it.
3. Alternatively, review then run `scripts/campaign-reliability/browser-recovery.js` in that page's DevTools Console. It reads only that key and downloads a private JSON file. It makes no API requests and does not write/clear storage. Do not enable browser paste protections blindly; review the source first.
4. Inspect the actual descriptions/messages and `savedAt` fields. An attachment or campaign title alone does not establish recovery. The legacy key was not account-scoped, so inspect privately and do not share other users' text.

The new editor never reads, migrates or overwrites that legacy key. It retains an account-scoped pointer so a new draft whose first save fails is discoverable after refresh. It uses account/draft/session-scoped recovery files, retains failed edits, and offers explicit restoration. Separate tab files avoid one tab overwriting another's recovery copy. Confirmed local saves are marked; no local files are automatically deleted. Storage can be unavailable, exhausted, cleared by the user or lost in private browsing; server revisions remain the primary durable source.

## Implementation

- New authenticated `/api/campaigns/drafts` GET/POST; session-derived owner, never a payload owner.
- Server-only tables `campaign_editor_drafts` and append-only `campaign_editor_versions`; RLS enabled, no public/anon/authenticated privileges. Three SECURITY INVOKER RPCs with fixed search_path and revoked public EXECUTE.
- Transactional save preserves the entire canonical draft and projects its current steps/name in the same transaction. Retained step IDs survive. Existing draft baseline captured as version 0 before first edit. Active/history-bearing campaigns require a separate revision; original campaigns, recipients and run history are not rewritten.
- Revision CAS and owner-scoped operation IDs reject stale writes and make retries idempotent. Existing unversioned writers cannot overwrite a managed draft through legacy routes. Snapshot ownership and voice/attachment authorization enforced.
- Debounced autosave after meaningful edits (1.2 seconds), explicit Save Draft, confirmed Saving/Saved/Save Failed states, local recovery, retry, beforeunload and link-navigation prompts. Browsers can suppress native close warnings; no browser can guarantee preservation after OS termination before a local write or autosave.
- Editor URL adopts the confirmed campaign ID so refresh/login loads that same draft. Voice asset refreshes only affect display metadata, never reload the editor. Account changes clear previous account state and scope local recovery separately.
- Timestamped version history (100 metadata rows per page), comparison, explicit restore as a NEW revision. Historical snapshots remain intact.
- Existing activation confirmation retained. Save first, await confirmation, verify snapshot, validate server-stored version, claim activation once, enroll/schedule using retained step IDs, then confirm queued status. Validation failures preserve an editable saved draft. A partial/ambiguous operational failure is blocked for review rather than automatically replayed. No automatic sending authorization is introduced; existing live-outbound/launch/compliance gates remain.

## Migration and dependency order — NOT applied to hosted databases

Reviewed migration: `supabase/migrations/20261123170442_campaign_editor_drafts.sql` (created with Supabase CLI migration new). Inspect the accompanying SHA256SUMS for the exact reviewed bytes.

1. Confirm a recent completed backup/PITR point for the intended database; inspect current campaigns, campaign_steps (including voice_asset_id), campaign_step_runs, audit_logs and voice_assets definitions, triggers and permissions. Stop on material differences. This migration intentionally fails if its new objects already exist; reconcile actual state instead of blindly reapplying.
2. Run the migration and acceptance in isolated staging first. No Production or shared staging migration has been performed by this repair.
3. Verify service-role operations, no client table/RPC grants, RLS and rollback behavior. Full function and trigger review required before Production SQL approval.
4. Separately approve and apply Production migration BEFORE deploying the new application. Until schema exists, new editor saves fail visibly; there is no silent unsafe fallback.
5. Deploy only the reviewed commit after hosted acceptance and CI. Existing sending/billing/feature flags remain unchanged.

The migration creates two tables, three operational functions plus a projection guard function, and two guard triggers. It does not backfill, delete or change any existing records during installation. Baseline/version rows are created only when an agent explicitly edits/saves a campaign. No contact, billing, sending or subscription objects change.

## Rollback

Pause editing/activation if necessary; retain all new tables, versions, audit logs, recovery files and restrictive permissions. Prefer a forward fix. An application rollback is non-destructive, but legacy writes to managed drafts deliberately remain blocked by the projection guard; do not disable it to make old non-versioned saves work. Read existing projected campaigns; restore through an authorized fixed versioned writer. Do not drop history, delete campaigns/steps/contacts, restore Production backups unnecessarily or replay ambiguous activations. Review any partially enrolled/scheduled draft before unblocking; no automated destructive cleanup is provided.

## Evidence and remaining gates

Local tests use synthetic auth/database/provider boundaries. Database tests execute actual migration/RPCs in isolated PGlite PostgreSQL; competing CAS operations are tested, but this is not a real multi-backend load/locking benchmark. API tests execute actual route handlers with synthetic sessions/storage. Browser tests render the actual editor with real compiled styles and synthetic HTTP responses. Screenshots are local implemented UI, not a protected hosted Preview or Production acceptance.

No protected Preview has been deployed. The current runner has no authorized browser session; its inherited Development Clerk/Production Supabase mixture must never be used for application testing. A branch-specific secure Development Clerk + isolated staging Supabase binding and the reviewed staging migration are needed before hosted logout/login and two-account acceptance. Do not export Production service keys or copy Secret values into this branch. Automatic Vercel deployment is disabled for this branch to prevent an inherited mixed environment.

Production recommendation: NO-GO until reviewed migration approval, isolated authenticated hosted acceptance, final-head CI and separate release approval. No Production writes, migrations, deployments, activations or messages occurred in this repair.

## Local verification commands

`npm run test:campaign-reliability` executes migration and actual-route tests. `npm run test:campaign-reliability-browser` requires a completed build's `.next/static/css`, Chromium (`CHROMIUM_PATH`, or system Chromium), and optionally `CAMPAIGN_ICON_FONT` pointing to the same Material Symbols font used by the app for screenshot fidelity. It starts only a loopback fixture server and blocks external browser requests; it never uses host credentials. Use an explicitly isolated runner for any hosted test.

Local TypeScript, lint (0 errors, 7 existing warnings), security, regression, full unit suite and credential-stripped webpack build were executed. Exact final-head GitHub CI is recorded in the PR, not implied by these local results. New dependencies are pinned development-only PGlite and Playwright Core; no runtime provider/billing dependency changed.
