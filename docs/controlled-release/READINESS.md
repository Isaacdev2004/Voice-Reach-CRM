# Controlled Concierge integration — November 25, 2026

This branch consolidates PR #61 (6659b13) and PR #52 (3ef35c0) on Production main a79583d. It preserves the approved imagery/White-Glove UX and the newer Contacts quota, campaign durable drafts, Notes, hosted consent pages and Assistant code. Import conflict resolution retains effectiveContactAllowance plus the smart CSV review. All existing branch deployment exclusions are retained; this release branch is also excluded.

No new database migration is introduced. Production Concierge cases/events/imports and both existing RPCs are present, RLS-enabled and client reads denied. Do not rerun the original migration. The 30,000 contact override for hello remains enabled revision 1; no data/configuration changes were performed.

Required hosted acceptance remains unverified: separate Development manager signoff, self-review HTTP 403, unrelated/subscriber isolation, and actor/version-bound STAFF_READINESS_SIGNED. A read-only staging query found no signoff event for the designated Development cohort. Local route mocks do not substitute for those tests. No authenticated browser/session binding is available to this runner. Reuse the protected staging environment and separately authorized identities; do not use Production users with Development credentials.

Production candidate access must preserve existing lists and add only founder user_3K3RSKGuUrGj35waMWovWke7S9K and pilot user_3LbCsPoH76YvWJhXwzhHPzltnoR through supported subscriber allowlists after gates pass. No new manager/staff/admin access. Retention, sending, billing and public rollout stay off. Assistant pilot was already activated and accepted by the owner; do not overwrite its allowlist or reset its usage.

The GitHub connector shows no submitted PR reviews. Authenticated GitHub CLI requests for branch protection/rulesets returned Forbidden, so required protection/review rules cannot be independently certified. Do not bypass them or equate mergeability with approval.

Rollback after a later approved release: restore the prior verified app deployment, remove only newly added pilot access if needed, preserve founder lists, all cases/events/imports and restrictive grants. No destructive down migration or backup restoration.

This reconciliation is not a Production activation. Updated-head CI and hosted authorization acceptance are required before ready/merge/deploy. Do not close #61/#52 until the preserved replacement has been verified/released.
