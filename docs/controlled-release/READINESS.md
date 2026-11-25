# Controlled managed ISV consolidation — November 25, 2026

PR #64 already includes PR #58 as an ancestor. This reconciliation retains that single managed Registration Center and brings it onto main a79583d, preserving contact override enforcement, campaign reliability, Notes, hosted business/SMS consent pages and Assistant. No competing onboarding was introduced. Subscription checks remain authoritative; subscriber approval self-attestation never enables sending.

Exact migration: supabase/migrations/20261113201305_isv_sms_infrastructure.sql, SHA-256 e07661415fa2fe6c0c057ee4bb33240c0d8ff07c111daf9c685cc9f9768d15a3. Production ISV tables are absent. No Production schema operation was performed. Dedicated assignment, encrypted owner/account credential resolution, consent, STOP, signature/replay/idempotency and final transport gate remain fail-closed.

No live Twilio resource, customer registration, provider approval, delivery or fee was created/claimed. Preserve +17602497947 and the parent ISV identity. The real pilot still requires accurate business website/consent evidence, approved cost/registration/number actions and provider-supported delivery/reply/STOP/HELP checks. No shared rejected campaign resubmission.

Disabled-infrastructure merge assessment: the new SMS transport replaces the legacy global-credential path even with setup UI off. It must remain blocked for unregistered tenants, not silently fall back to the shared sender. Complete current-head CI, verify effective Production sending/webhook/setup flags and compatibility, then obtain exact Production migration approval before any code depending on schema can be enabled. Do not infer disabled runtime settings from defaults or a truncated connector inventory. Repository protection/reviews remain unverified.

Rollback: keep all durable suppressions, webhook receipts, sender assignments, audits and encrypted credentials; do not restore a shared-sender bypass. Disable managed feature/webhook access through verified controls or use a reviewed forward fix. Do not delete numbers, release subaccounts or remove compliance evidence. No outbound or provider changes were made.

Keep #58 open until #64 equivalence is verified and the consolidated release is complete; then document its replacement before closure.
