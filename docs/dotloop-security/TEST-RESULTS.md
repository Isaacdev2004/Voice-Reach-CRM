# Development verification

Base main: 258f6a669736369d756979c65a35878d0c0dbcc3. Synthetic fixtures only. No environment files loaded, provider calls or Production mutations performed.

- PASS: TypeScript --noEmit.
- PASS: full repository unit/regression command, including Calendar, Assistant, Concierge, Contacts, Campaigns, Settings and mortgage PDF checks.
- PASS: existing security audit script (verify-audit-fixes).
- PASS: focused 8 token/lifecycle unit tests: AEAD/AAD/random IV/key availability/retained-key decryption; concurrent refresh; owner denial; uncertain refresh/no retry; stale result; failed revoke; successful/idempotent disconnect; truthful states.
- PASS: executable HTTP route tests with auth/service boundaries mocked: anonymous 401, cross-origin/missing-origin 403, owner-header spoof ignored, GET no provider work, POST scoped to signed-in actor, pending-revoke 202, Calendar consumer separation.
- PASS: exact production.sql in fresh disposable PGlite 0.3.14 (Postgres engine), reproducing original vulnerable grants/policy before applying repair. Tests real SQL client SELECT/UPDATE/DELETE/INSERT/TRUNCATE/RPC denial, preserved legacy/calendar rows, approved synthetic legacy encryption without activation, encrypted save, duplicate lease denial, stale/wrong-owner completion denial, replay denial, pending revoke/retry, owner-only deletion and atomic audit.
- PASS: production webpack build using synthetic CI Clerk placeholders and outbound/billing false. No deployment.
- PASS: lint (0 errors; 7 pre-existing warnings in unrelated layout/auth/campaign files).

Limits: local SQL is not a hosted Supabase/RLS/API acceptance result. No actual Dotloop authentication, refresh, scope verification or revocation performed. No authenticated browser, key provisioning, hosted Preview, Production backup verification or credential migration performed. Those require separately approved isolated deployment/provider access and later Production release approval. The PR must remain draft until GitHub CI and remaining acceptance are reviewed.
