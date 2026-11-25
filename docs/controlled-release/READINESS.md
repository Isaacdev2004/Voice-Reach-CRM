# Controlled managed ISV consolidation — November 25, 2026

PR #64 already includes PR #58 as an ancestor. This reconciliation retains that single managed Registration Center and brings it onto main a79583d, preserving contact override enforcement, campaign reliability, Notes, hosted business/SMS consent pages and Assistant. No competing onboarding was introduced. Subscription checks remain authoritative; subscriber approval self-attestation never enables sending.

Exact migration: supabase/migrations/20261113201305_isv_sms_infrastructure.sql, SHA-256 e07661415fa2fe6c0c057ee4bb33240c0d8ff07c111daf9c685cc9f9768d15a3. Production ISV tables are absent. No Production schema operation was performed. Dedicated assignment, encrypted owner/account credential resolution, consent, STOP, signature/replay/idempotency and final transport gate remain fail-closed.

No live Twilio resource, customer registration, provider approval, delivery or fee was created/claimed. Preserve +17602497947 and the parent ISV identity. The real pilot still requires accurate business website/consent evidence, approved cost/registration/number actions and provider-supported delivery/reply/STOP/HELP checks. No shared rejected campaign resubmission.

Disabled-infrastructure merge assessment: the new SMS transport replaces the legacy global-credential path even with setup UI off. It must remain blocked for unregistered tenants, not silently fall back to the shared sender. Complete current-head CI, verify effective Production sending/webhook/setup flags and compatibility, then obtain exact Production migration approval before any code depending on schema can be enabled. Do not infer disabled runtime settings from defaults or a truncated connector inventory. Repository protection/reviews remain unverified.

Rollback: keep all durable suppressions, webhook receipts, sender assignments, audits and encrypted credentials; do not restore a shared-sender bypass. Disable managed feature/webhook access through verified controls or use a reviewed forward fix. Do not delete numbers, release subaccounts or remove compliance evidence. No outbound or provider changes were made.

Keep #58 open until #64 equivalence is verified and the consolidated release is complete; then document its replacement before closure.

## Disabled release compatibility — November 25 follow-up

17 new actual-route/service checks PASS with both absent and false managed flags. The ISV database adapter deliberately throws on every query; disabled Setup GET/POST returns 404, managed inbound/delivery returns 503, prepareSms rejects, outbound authorization is paused, and the existing legacy webhook route is preserved. Zero database/provider calls occurred. This proves absent ISV tables do not themselves prevent an infrastructure-only release when all entry gates are verified off. It does not verify effective Production values or live legacy messaging.

Required disabled runtime configuration: MANAGED_MESSAGING_SETUP_ENABLED=false, MANAGED_SMS_REGISTRATION_ENABLED=false, MANAGED_SMS_PILOT_ENABLED=false, MANAGED_SMS_WEBHOOKS_ENABLED=false and ALLOW_LIVE_OUTBOUND=false. Do not clear existing owner lists/credentials. Independent runtime inventory and repository approval verification remain necessary before merge. Provider A2P approval is required for activation, not for code that remains verifiably disabled.

Read-only hosted preflight found inbound_communications and communication_suppressions absent in both staging and Production. The existing reviewed prerequisite is supabase/migrations/20261026020000_inbound_communications.sql; its grant/function scope requires explicit Production review rather than blind replay. This must precede the ISV schema before activation. A hosted rollback-only rehearsal was interrupted without an execution result; it is NOT PASS. The available read-only post-check showed no persistent ISV or prerequisite objects. No Production SQL was attempted.
