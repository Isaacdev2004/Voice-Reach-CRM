# Contacts CSV Export — focused release readiness

Branch: feat/contacts-csv-export. Based on approved main 5af978cbc61c99ce0283be6c76a43454034c719c. No Assistant, Concierge, Property Interest or public-site implementation was merged into this change.

## Product behavior

Export CSV appears beside Import CSV in the Contacts hero actions. The modal offers all contacts, selected contacts across the current selection, or every matching filtered result across all pages. Filters reuse the existing Contacts search, stage, category, type, source, compliance, activity and sorting functions. An active Relationship Pulse lane supplies a bounded ID restriction; server ownership is still independently enforced.

The authenticated POST endpoint /api/contacts/export first returns a count and an opaque SHA-256 data fingerprint. Download rereads the complete owner-scoped snapshot and checks both count and exported-content fingerprint. Changes require a refreshed count; empty exports return an explanation. The fingerprint is not an authentication token.

CSV uses UTF-8 BOM, CRLF rows and quoted/escaped fields. Formula-leading cells are neutralized with an apostrophe; phone and ZIP fields use that text marker to preserve stored leading zeros. Missing fields stay blank. Notes, message history, IDs, credentials and system metadata are never CSV columns. Lead Stage uses stored lead_status; property/address/ZIP fields are included only when present. Consent Review Status is the existing interface review label, not independent legal consent evidence.

No public URLs contain export criteria or contact data. No server CSV file or Storage object is created. The response is a private, no-store attachment named myari-contacts-YYYY-MM-DD.csv. The browser holds a temporary object URL and revokes it. No contact/consent/campaign record is modified.

## Security and scale

The route derives owner from requireUserId, never request IDs or workspace/organization headers. All database pages reuse readContactSnapshot: eq(owner_id, authenticatedOwner), stable ID ordering, exact counts and bounded ranges, with owner validation and owner-scoped consent filtering. No unrestricted service-role query is added. RLS/grants/schema are unchanged.

Strict request schemas reject caller-supplied owners, unsupported filters and duplicate IDs. Foreign/deleted selected IDs fail without disclosing records. JSON POST and origin checks protect the download action. Errors do not log rows, search values, CSV data or database error details.

Pagination is verified beyond the API's 1,000-row default. Generation streams 100 CSV rows per chunk, while the existing verified snapshot stays in memory for consistent filtering/count confirmation. This is not a database transaction snapshot: concurrent changes can require retry. Extremely large snapshots remain subject to server duration/memory limits and fail rather than intentionally truncating.

## Actual validation

- 15 server/model/security tests: all, selected, filtered, empty, pulse restriction, international names, quotes/newlines, formula injection, leading zeros, missing values, malicious owners/IDs, unauthenticated and cross-origin denial, owner validation, stale confirmations, database failure and 1,253-row pagination.
- 30 Chrome browser assertions across desktop/tablet/mobile: actual export components and server handler with a local synthetic owner/contact dependency. All/selected/filtered files downloaded, filename and BOM verified, Unicode/phone values verified, overflow and Escape close checked.
- TypeScript, affected lint, full lint (zero errors; seven existing warnings), security regression, full test:unit and optimized build passed for the initial focused change.
- PR CI and the public visual regression workflow passed on the initial commit. Final artifact/test-only updates require the refreshed CI checks.
- Sample CSV and screenshots are synthetic acceptance fixtures. They do not claim authenticated hosted Clerk acceptance or contain customer data.

See [sample CSV](sample-synthetic.csv) and [screenshots](screenshots/).

## Preview gate and minimum manual input

Automatic Git Preview deployment is disabled for this branch. Public Clerk Development configuration and the staging Supabase URL are configured. Identified inherited provider, billing and scheduler credentials are blocked through branch-specific empty Config overrides. Existing Production and other branch entries were not edited.

The connected API cannot securely clone write-only Secrets. Required only on Preview → feat/contacts-csv-export, type Secret:
- CLERK_SECRET_KEY: complete matching Clerk Development key from the existing verified staging instance.
- SUPABASE_SERVICE_ROLE_KEY: service-role/secret credential for jojgdfpmaxvbhobjrsbm.

No Secret placeholders were created and no AI key is required. Never paste either key into chat or copy a masked display value. After secure entry, run the committed status-only private preflight before installation/build. It validates scope, matching Development Clerk backend/frontend, test Supabase service authentication, empty provider/scheduler credentials and disabled gates. Do not deploy when this fails.

Remaining hosted acceptance: regular authorized Development sign-in; real owner contact count vs preview/download; selected/filter matching; second authenticated account denial; real desktop/mobile download. Use synthetic staging contacts only, record fixture IDs privately and clean only newly created fixtures after verification. No real outbound communication tests.

## Production release and rollback

No SQL migration is needed. No feature flag, plan, billing or entitlement change is needed for CSV export: it becomes available to authenticated subscribers through reviewed code deployment.

Production is NOT approved. After protected Preview acceptance and final CI pass, request approval to merge this focused PR at the exact reviewed SHA and deploy the resulting main build. Exclude SQL, sending, billing and unrelated feature activation.

Rollback is a code deployment rollback to the previously Ready Production revision. The export path is read-only; there is no database rollback or data cleanup. No restore is warranted.
