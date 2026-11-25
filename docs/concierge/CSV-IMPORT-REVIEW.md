# Concierge CSV templates and guided review

Focused enhancement on PR #52, based on e6bae21233243b7bf421570fafe6affc7d37d2e0. No SQL or schema changes.

The Contacts modal and Concierge download the same six-column UTF-8/BOM template: firstName,lastName,phone,email,consent,source. firstName and phone are required. The sample contains two fictional example.test contacts with reserved 202-555-01xx phone numbers. Concierge ignores CSV consent and its existing RPC forces Unknown and dnc=true.

Review is calculated on the server from the existing parser and a complete paginated owner-scoped CRM snapshot. Shared phone/email identifiers and within-file duplicates are possible duplicates, not confirmed human identities. They are skipped, never merged or overwritten. Total rows partition into valid new contacts, possible duplicates, and invalid rows. Physical CSV line references survive blank and quoted multiline rows. All-invalid files remain reviewable. Each valid preview row is visible in a scrollable table; row issues can be downloaded without raw contact values. Confirmation still invokes the existing owner-scoped atomic import RPC, with duplicate and capacity checks repeated at execution. Cancel only clears the preview, not contacts.

Validation:
- TypeScript passed; repository lint passed (seven pre-existing warnings, no errors).
- Full test:unit passed after granting the test runner network/process permissions; initial sandbox-only run failed child-process guard tests with EPERM.
- 21 focused Concierge tests passed, including shared template round-trip, actual summary counts, all-invalid review and physical row references.
- Existing PostgreSQL acceptance passed using a disposable in-memory PGlite database: atomic import, replay, tenant denial, duplicate prevention, cancellation, expiry, plan limits, Unknown consent and suppressed sending. No Supabase migration was applied.
- Chromium responsive browser acceptance passed at 1440, 768 and 390 pixels: actual parser/review logic behind synthetic HTTP fixtures; downloads, explicit approval, cancellation, correction/re-preview, error report and no-send checks. These are local component tests, not authenticated hosted acceptance.
- Security audit passed; optimized Next build passed.
- Safari/device-specific downloads and authenticated hosted acceptance remain to be checked on the protected Preview. No real customer data used.

Screenshots: local docs/concierge/previews/import-review-{1440,768,390}.png. The existing exact-e6 manager-acceptance deployment is preserved. Temporary test access cleanup remains due after the owner's outstanding signoff results; do not claim those tests passed.
