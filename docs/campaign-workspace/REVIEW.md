# Premium full-screen Campaign Workspace

Branch: `feat/full-campaign-workspace`, isolated from unmerged Assistant PR #50. Base: Production `aabbf1aa25e679e70b251b4c8ed9af9cb6740982`.

## Behavior

Saved campaign cards open `/dashboard/campaigns/[campaignId]/workspace` by default. Quick Preview is a separate explicit action and retains its existing overview/sequence/contacts/performance, pin, duplicate and task controls. Edit and Expand open the full workspace with the selected campaign/tab/step in the URL. Returning to Campaigns does not automatically reopen the drawer. Legacy `?edit=` links redirect to the full editor. New Campaign opens the full editor; specialized legacy templates retain their existing install/builder workflow.

The full workspace provides a sequence navigator, large message editor and optional contextual preview/overview/AI panel. No extra CRM sidebar or empty contextual panel. Focus mode covers existing navigation without changing global settings. Sequence creation, duplication/removal, channel selection, accessible move up/down and desktop drag/drop are local draft edits. Reordering moves content into chronological timeline slots, preserving message/media metadata. Timing includes enrollment-relative days, within-day offsets and existing time labels; no new scheduler or timezone behavior is invented. Existing quiet hours/consent/opt-out and execution remain authoritative.

Email has separate subject/body fields and plain-text merge fields. Rich-text formatting is unsupported by the existing delivery format. SMS shows pre-merge character count without inventing segment precision. Voicemail shows estimated script duration and uses the existing authorized recording preview; changing text does not regenerate audio. Existing recording references and providers are preserved. New voice selection remains in Voice Studio.

Ask MyARI opens existing tools with campaign context and explicitly discloses that saved-campaign AI editing is not implemented. No AI suggestions are automatically applied or saved. Secure before/after AI saved-record approval is a separate pending capability.

## Save strategy and data integrity

Existing builder in-place saves replace steps through multiple writes with no version check. This workspace does not use that path to overwrite campaigns. **Save Draft explicitly creates a separate draft revision**, even when the source is already draft. A confirmation explains that the source, recipients, schedules and performance remain unchanged. No campaign is activated, enrolled or sent.

The authenticated workspace API reuses authorized library reads, import validation, attachment ownership checks, step persistence and audit logging. It compares a canonical source snapshot hash before saving. Every database read is owner-scoped and all inserts use the authenticated owner. A client-generated UUID identifies the new draft; retries inspect signature and complete step content before returning an existing result. Different content, incomplete saves and concurrent collisions fail closed instead of overwriting. Missing audit evidence is repaired only for the same verified completed draft. Linked recordings must be owned. Unknown custom source conditions prevent saving rather than silently dropping rules.

No transaction/RPC migration is introduced. Campaign creation, step insertion and audit are separate existing operations. An interrupted save can leave an incomplete **new** draft; it returns `inspect_save`, disables blind UI retry, and requires inspection. The original campaign remains untouched. This limitation must be accepted/verified in hosted staging before any release; the UI does not claim atomic in-place saving. No cleanup deletes existing records automatically.

## Tests and evidence

- 415 reported Node tests plus standalone assertions passed in the complete unit suite. Build, types and security checks pass; lint reports zero errors and seven existing warnings. New helper and actual-route tests use mocked database/auth boundaries.
- New route tests cover authentication/foreign-owner denial, stale source, draft-only writes, retry idempotency, custom-rule preservation, missing audit recovery, invalid content, attachment/audio ownership and rejection of activation/enrollment/owner payloads.
- 48 browser checks across 1440/1280/768/390px use actual components, synthetic data and fully mocked APIs. Quick Preview/default full workspace, edits, sequence operations, preview preservation, AI limitation, confirmation, stale save recovery and keyboard modal focus checked. Axe reports are in this directory.
- Screenshots under `previews/` are local synthetic evidence, not hosted acceptance.

## Staging and release gates

Automatic Git deployment is disabled for this feature branch until its isolated configuration exists. Do not inherit generic Preview credentials. Match Clerk Development, test Supabase `jojgdfpmaxvbhobjrsbm` and staging OpenAI; mask live Stripe/Twilio/email/voicemail and database connection aliases. Keep all sending, billing, entitlements and global Assistant access off. The available environment API cannot securely duplicate existing write-only Secret values between branches without retrieving plaintext. Credentials must be entered directly through Vercel or a supported secure platform binding; never paste keys in chat.

No protected Preview or authenticated save acceptance is claimed until branch isolation is verified. Hosted acceptance must use authorized Development accounts and synthetic records; verify actual RLS, source preservation, draft persistence after refresh, replay/partial-save recovery and tenant isolation. Mocked route/browser results do not prove hosted RLS enforcement.

The owner conditionally authorized deployment only after hosted acceptance, normal branch/review checks and rollback readiness pass. Do not merge/deploy with these blockers unresolved. No database migration, credential/provider change, sending capability, billing or material active-execution change is authorized by this UI release.

## Rollback

Production baseline/rollback candidate: `dpl_7oyVsu1sXk1raF9pgCAcfmwuAGZf` at `aabbf1aa25e679e70b251b4c8ed9af9cb6740982`; refresh before any release. Merge to main can trigger automatic Vercel Production deployment. After authorized release, verify exact Ready revision/domain, route entry and authorized behavior without synthetic Production writes. Revert/promote the verified prior deployment for a UI regression; no database restoration is needed. Any drafts deliberately saved remain compatible existing campaign/step records; never delete them as a UI rollback.
