# Assistant 2.0 — remaining-gap repairs

Local branch: `feat/ai-operating-assistant`, continued from `cf65ee2` so the completed assistant **and approved pricing correction** are preserved. This is a repair pass, not a replacement implementation. No production records, enrollments, credentials, subscriptions or provider settings were changed. Nothing was pushed or deployed; release flags remain disabled.

## Repairs

- **Revision-safe execution:** added a service-role-only atomic root state. Only the current proposal version can claim execution or cancel; concurrent edits have one winner. Claimed/cancelled roots cannot be revived through another version. Root state is validated, and incomplete/stale execution appears as Needs Attention. Existing conversation messages, proposals and completed CRM records are retained. Pre-migration unexecuted previews need a fresh proposal, rather than an unsafe automatic authorization backfill.
- **Exact message binding:** preview body/subject are canonicalized once. Last-mile validation treats approved content literally, so nested `Subject:` lines cannot change what is sent. Recipient is resolved with the same existing service used by transport. Preview/digest now include actual platform From and a non-secret sender-account identity fingerprint. Sender/content changes fail closed; no arbitrary client From is accepted.
- **Enrollment/campaign checks:** block removed/blocked/noneligible enrollments and simulation campaigns with stale launch markers. Existing tenant ownership, consent, opt-out, suppression, shared-number hold, quiet-hour and quota checks remain. Authorization is rechecked after evidence preflight, immediately before transport; an opt-out arriving during preflight prevents submission.
- **Timeout and evidence handling:** Twilio/Resend POSTs have a 15-second abort timeout and no automatic submission retry. Missing provider receipts and post-acceptance audit failures remain uncertain, never Completed. Required evidence preflight fails before transport if audit writes fail. Unresolved earlier assistant submissions block a fresh intent for that recipient/channel pending reconciliation. Root claims plus a unique owner/logical-key index prevent repeated transport for the same lineage.
- **Private live status projection:** owner-scoped proposal/work reads use existing delivery-evidence metrics. Submission and delivery remain separate. Only authenticated callback/reconciliation evidence can confirm delivery. Later failures appear in the drawer and Command Center. Refreshes are read-only, bounded, paused while hidden, and never regenerate AI or resend. Manual status refresh remains available.
- **Internal beta isolation:** the send flag alone is insufficient. Explicit account and recipient allowlists are now required, with delivery evidence enabled. All lists default empty. Existing public AI access cannot implicitly enroll all subscribers into messaging.
- **Voice context:** wired the previously unused publisher to actual saved cloud draft/asset IDs. The existing Voice Studio browser suite verifies publication after a real mocked save. Unsaved script text is not falsely treated as authoritative backend data; approved audio is unchanged.
- **OpenAI reasoning continuation:** preserve the provider's reasoning/function output items during the tool loop and request encrypted reasoning state with `store:false`. Opaque continuation stays ephemeral server-side; it is not conversation storage or a model execution permission. Claude and explicit provider selection remain intact.

## Required reviewed database update

`supabase/migrations/20261031000000_assistant_proposal_roots.sql` adds `assistant_proposal_roots`, the `advance_assistant_proposal` compare-and-swap RPC, RLS/client privilege revocation and a partial unique index on assistant outbound logical attempts. No existing subscriber/campaign data is migrated or deleted. Audit historical duplicate `assistant-%` logical keys before applying the index. Apply only after review/backup and staging validation; no production migration was performed.

The existing AI usage and delivery/inbound migrations remain prerequisites. Root storage failure disables execution safely. Old completed outcomes/history remain readable; old unexecuted previews cannot bypass the new state checks and must be prepared again. Rollback must first disable V2/sends and preserve all claims/evidence; do not run older send code against unresolved intents.

## Disabled rollout configuration

`ASSISTANT_V2_ENABLED=false` and `ASSISTANT_APPROVED_SENDS_ENABLED=false` remain the documented defaults. New `ASSISTANT_SEND_OWNER_IDS=` and `ASSISTANT_SEND_RECIPIENTS=` are empty by default and fail closed. `ALLOW_LIVE_OUTBOUND`, public AI pricing/entitlement flags and provider credentials were not enabled/changed. Test processes temporarily simulate enabled values only against synthetic stores and intercepted HTTP.

Before any internal canary, verify an isolated staging target, apply the reviewed migration, verify actual platform sender ownership/domain and callback authentication, explicitly choose internal account/recipient allowlists and obtain approval. No-reference timeouts remain operator-reconciled holds; no self-service blind retry is introduced. Any real test communication requires separate authorization. Actual Vercel Production/Preview values are not certified from source defaults.

## Validation

See [QA results](QA.md). Existing passing suites are preserved; the 14 previously failing messaging safety probes are now maintained regressions and pass. Tests use synthetic subscribers, contacts, enrollments and provider responses only. The atomic root migration was applied to an isolated local PostgreSQL container; 12 concurrent claims produced one winner. Screenshot and UI-result artifacts show both channels at four widths, including actual From identity and subsequent failure updates.

## Remaining rollout blockers

Real OpenAI account/model/API acceptance, real Stripe test-mode and signed provider/Google integrations remain unverified where credentials/network access are unavailable. The new production migration needs review/approval. Actual platform sender ownership and delivery behavior need authorized staging acceptance before any send flag enable. Previously documented media, financial reconciliation and retention-policy limitations remain; this repair does not advertise them as completed or reactivate the retired $20 AI add-on.
