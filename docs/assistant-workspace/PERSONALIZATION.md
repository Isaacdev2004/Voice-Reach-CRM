# Assistant sender personalization — release evidence

Implemented on the existing PR #50 branch. Production is unchanged. No SQL, Brand Kit redesign, enrollment, delivery, billing, Concierge or permission change is included.

## Root cause and repair

Campaign proposals previously copied model-generated steps verbatim. Only direct SMS/email previews used some saved sender fields. Campaign and standalone voice placeholders consequently survived into the review/save flow.

Preparation now retrieves the authenticated owner's saved settings through the existing owner-filtered `savedSettings` service and checks the same account through Clerk's server SDK. Account IDs must match, the primary email must be verified, and banned/unavailable accounts fail closed. No client/model-supplied owner identity is accepted. No cross-request identity cache is used.

Sender precedence matches existing MyARI previews: Brand Kit agent name, saved workspace sender, saved profile, then verified account profile; Brand Kit phone before saved profile phone; Brand Kit business name before a non-default saved workspace name. Differences are disclosed for review. Business email, website, address, license and job title use supported saved business fields; a login email, team member, platform messaging number or default workspace label is never invented as business branding. Saved business facts are subscriber-provided, not independently certified by this change.

Campaign SMS, email and voicemail copy, standalone voice scripts, and direct message drafts share agent-specific substitution. Recipient fields such as `{{contact.firstName}}`, `{{first_name}}` and `[FirstName]` remain unchanged in reusable campaigns. Unknown/manual tokens remain unchanged. This does not add new recipient-token support to the delivery engine.

Missing sender tokens become explicit `[Complete: business phone]`-style markers with a completion notice and Brand Kit link. An incomplete campaign/voice draft may be reviewed/saved as a draft; direct delivery validation remains stricter and unchanged. Available saved sender fields do not make a message sendable.

The personalized action and source/missing-field report are included in the existing approval digest. Sender settings are reread before approval. A change invalidates the preview rather than silently changing approved content. Revisions and explicit draft saves use the existing proposal roots and save service. User-edited literal copy is preserved; the system does not blindly replace names or numbers in prose.

## Automated acceptance (synthetic only)

- 14 focused service/security/component tests pass.
- A three-step Apopka buyer campaign (SMS, email, voicemail) is prepared under two distinct synthetic owners, with separate names, brokerage, phones, emails and websites. Each proposal contains only that owner's data.
- Missing fields, precedence conflicts, malformed/placeholder values, unavailable/banned/unverified accounts, owner injection, foreign proposal denial and settings-change invalidation pass.
- Revision retains recipient merge fields, supersedes the original approval and remains reviewable. Explicit save creates one mock-provider draft with three personalized steps; replay creates no duplicate. Existing recipients are unchanged, with zero delivery payloads.
- Real PreviewDetails rendering escapes business text and displays completion guidance.
- Focused actual-component Chromium checks pass at 1440×900, 820×1180 and 390×844: account switching, expanded step copy, recipient fields, missing-field guidance, Brand Kit link and no horizontal overflow. These use synthetic Clerk/database boundaries and are not authenticated hosted tests.
- Full unit regression command, TypeScript, security verifier and optimized build pass. Lint has zero errors and seven existing warnings. The focused tests are added to the existing Assistant CI command.

Run `npm run test:assistant-personalization`. Browser reproduction: install reviewed Playwright/esbuild tooling outside the repository, install compatible Chromium/dependencies, then run `npm run test:assistant-personalization-browser` with that tooling on NODE_PATH. No runtime secrets are needed.

Review evidence: [desktop](personalization/preview-1440.webp), [mobile](personalization/preview-390.webp), [browser results](personalization/browser-results.json), and actual synthetic service outputs for [account A](personalization/apopka-a.json) and [account B](personalization/apopka-b.json). Screenshots show the real proposal component in an explicitly labeled synthetic fixture; they are not hosted or live subscriber screenshots.

## Hosted acceptance still required

The protected Preview cannot be treated as accepted from these fixtures. Two distinct authorized Development sessions are required. The single previously supplied Development ID must not be relabeled as two accounts or reused as a Live owner ID.

For each account, verify `/api/assistant/verify` reports test mode and `jojgdfpmaxvbhobjrsbm`; `/api/assistant/config` must show externalActionsEnabled false. Request the owner's exact three-step Apopka buyer campaign, inspect actual business details, revise a step, explicitly save the draft, reopen it and verify the other account cannot read its proposal/history/records. Confirm no recipients, activation or outbound events were created. Use synthetic contacts only. Do not alter allowlists to obtain this evidence without the applicable authorization and verified identity.

Do not merge PR #50 wholesale: unrelated Calendar, Notes, Voice and homepage changes plus main conflicts still require Assistant-only release reconciliation. The prior Production OpenAI authentication/model-access and Live owner verification blockers remain. The existing Preview application URLs also use `myari-staging.invalid`; they are not canonical-host verification evidence and were not changed by this fix.

Owner-only Production activation: NO-GO until the clean release and hosted prerequisites pass. Subscriber-wide rollout: NO-GO. No Production approval is requested by this implementation.

Rollback is a code revert/return to the pre-release deployment with Assistant owner access disabled through a separately approved configuration change. Retain all existing CRM, conversation, proposal and audit records; no database restoration or deletion is necessary.
