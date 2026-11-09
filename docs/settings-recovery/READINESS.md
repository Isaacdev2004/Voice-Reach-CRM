# Settings, Brand Kit and mortgage PDF recovery

Reviewed November 9, 2026. Production source independently resolved from www.myari.io to main commit 5ef2717567b2abd2c37e7283e8b1b87980f76078. No Production changes or deployments performed.

## Independently observed Production failures

- Settings saves use POST /api/settings -> authenticated requireUserId -> public.save_subscriber_settings(p_owner,p_expected,p_settings).
- Production qlochlyyimulyzzrzyac has no save_subscriber_settings(text,text,jsonb) function. Supabase edge logs show POST /rest/v1/rpc/save_subscriber_settings returning 404. The UI converts the RPC failure to HTTP 503 and the migration message.
- The required default private brand-assets bucket is absent. The only current bucket is private voice-assets. Upload uses POST /api/settings/brand-kit/assets -> decoded-image validation -> owner/branding/UUID path -> private upload -> signed preview URL. Voice storage is not repurposed.
- audit_logs has all required columns and RLS enabled. anon/authenticated have no SELECT grant; service_role can INSERT. No RLS relaxation is required.
- The Settings migration is absent from recorded migration history. Both function and bucket are missing, rather than partially installed.
- The verified owner's latest saved settings (November 6, Eastern time) have no Brand Kit and subscriptionStatus=canceled. Seven Settings snapshots are marked source=stripe. A Stripe customer mapping exists. No customer identifiers, personal fields or provider credentials were exported.
- Current Stripe authentication/state was NOT independently read: no authorized Stripe connection or authenticated owner browser session is available. The application maps all non-active/non-trialing states to canceled; this label does not prove literal cancellation rather than pause/past-due. No billing or entitlement bypass was added.
- Settings, brand upload and PDF generation require authentication, not an active paid subscription. Sending remains independently subscription-gated. Therefore canceled/no-plan does not cause the Settings RPC or missing-bucket failure.

## Code corrections

- BrandKitPanel previously parsed BrandKitSchema on every render. Its trim transforms removed a newly typed trailing space; partial emails/URLs could invalidate the entire kit and reset the form. Keep raw editable values; retain authoritative normalization/validation at the server save boundary.
- Merge asynchronous image results into the latest draft, preserving edits typed while upload is in flight. Surface safe API storage errors without exposing database/provider details.
- Missing settings RPC and missing storage bucket receive distinct safe error codes. Do not fall back to an unversioned write, create buckets at runtime or change authorization.
- PDF fixed-width text rejected oversized comparison totals; long addresses, names, company names, emails, URLs and source fields exhausted fixed row limits. Fit measured embedded-font text in existing boxes, with an 8pt body/contact minimum. Only extreme display fields are abbreviated, with an explicit notice and original text in PDF annotations. Email/website link targets remain complete. Financial amounts and disclosures are never truncated; dates and itemized totals are retained when source text is abbreviated.
- Standard report visuals remain unchanged; a page-two raster comparison was pixel-identical. Two 612x792 Letter pages, imagery permissions, calculators and branding review requirements remain unchanged.
- Long client names retain the dated -estimate.pdf filename suffix.

## Exact database change requiring separate Production approval

Use existing supabase/migrations/20261027000000_settings_versioned_saves.sql, unchanged.
SHA-256: 2b2dcc23cfc02770fd787a0f8bf6f614c4c7e14b539a87e98c35ed650603d0dc

Effects:
1. Create the version-checked save_subscriber_settings(text,text,jsonb) RPC; serialize writes per owner; reject stale versions; preserve idempotent replay; append new settings snapshots to audit_logs.
2. Revoke function execution from PUBLIC, anon and authenticated; grant only service_role. The application binds the owner from Clerk rather than request data.
3. Create private brand-assets if absent, maximum 4 MiB and PNG/JPEG/WebP only. Browser clients receive no direct bucket grants.

No DROP, DELETE, TRUNCATE, UPDATE, existing-record rewrite, contact/campaign/task/calendar migration, sending, billing or subscription operation is present. CREATE OR REPLACE targets an independently confirmed absent function. ON CONFLICT DO NOTHING preserves an existing bucket if configuration changes before approval; recheck before application.

## Rehearsal and tests

The exact migration was installed only inside a transaction on test project jojgdfpmaxvbhobjrsbm, exercised and ROLLED BACK. Save/read, valid revision, stale conflict, replay, independent owners, denied browser execution and private bucket configuration passed. A separate subsequent query confirmed function absent, bucket absent and zero synthetic audit rows: rollback independently verified. No durable staging migration or fixtures were left behind.

Local tests:
- Full existing test:unit suite passed.
- 12 Settings/security service-boundary tests, including missing RPC/bucket, forged owner paths, unauthorized requests, paid-entitlement forgery denial, owner-specific private signing and approved branding flowing to financing context.
- 12 mortgage tests: existing calculations and cent reconciliation, missing fields, permitted special characters, large values, maximum-length fields, all branding/imagery combinations, full link targets, preserved review restrictions and download names.
- Actual Settings UI with synthetic authentication/API/storage at 1440 and 390: real space-key typing, partial-email typing, upload failure/retry, edits during upload, save failure/retry, explicit image review, refresh and synthetic account switching.
- Actual mortgage UI with synthetic service boundaries at 1440, 768 and 390, standard and long-field cases: preview, branding selection, download and exactly two pages. No real provider/database requests or billing writes.
- TypeScript, build, security checks passed. Lint: zero errors, seven pre-existing warnings.

These are NOT authenticated hosted acceptance or actual Supabase upload tests. A protected Preview has not been deployed because the owner explicitly withheld deployment approval. Automatic deployment is disabled for the recovery branch.

## Backup, rollout and rollback

Before any Production SQL approval/application:
1. Confirm a recent completed Supabase backup/PITR recovery point in Production and record its timestamp. Backup freshness was not exposed by the available tools and is UNVERIFIED; project health is not backup evidence.
2. Retain the unchanged migration/hash, current audit_logs schema/grants/RLS evidence and the current deployment ID. Existing settings history must not be deleted.
3. Recheck that the function/bucket remain absent and verify the service-role/Clerk target before applying the approved file in a transaction. Refresh the PostgREST schema cache if required.
4. Validate permissions, private storage, owner-scoped save/reload, explicit Brand Kit review and signed image use before releasing broadly.

Rollback is non-destructive: stop deployment/revert code to the prior approved build if necessary; disable function execution if writes must stop. Keep settings snapshots and uploaded images. Do not drop audit_logs, delete brand-assets or restore a whole Production backup for an isolated code problem. A migration transaction failure rolls back its DDL/bucket insert. Do not remove a bucket after users have uploaded assets.

Separate approvals still required: protected Preview deployment/isolated setup; Production migration after backup confirmation; reviewed Production code release. No Stripe subscription creation/reactivation, sending permission or owner entitlement expansion is part of this fix.
