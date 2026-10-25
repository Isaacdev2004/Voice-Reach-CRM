# Assistant readiness while hosting access is pending

Inspection date: 2026-10-25 UTC. Branch: `feat/assistant-readiness-followup`.
This report describes source and synthetic tests, not hosted acceptance or activation.

## Capability audit

| Area | Implemented | Remaining acceptance or limitation |
| --- | --- | --- |
| OpenAI | Server-only Responses API, structured read/prepare tools, bounded output, timeout, explicit provider selection, token reporting, incomplete-response rejection | Project credential, API billing/model access and real provider acceptance remain unverified. `OPENAI_API_KEY` belongs in hosting Secret environment settings. |
| Claude | Existing Anthropic adapter and legacy drafts preserved | Explicit provider selection; no silent fallback during execution. |
| Conversations | Authenticated routes, subscriber-owned durable history, deletion, resume, proposal/outcome records | Hosted sign-in/reload/second-account acceptance remains pending. |
| CRM tools | Contact/history, campaigns, notes, tasks, calendar, analytics, saved properties, branding and planning reads; strict schemas and owner filters | Ownership is based on authenticated Clerk user ID, not an assumed Clerk organization. Returned CRM text is untrusted. |
| Campaign builder | Complete SMS/email/voicemail/task steps, audience, duration and timing; preview; confirmed save as separate editable draft | No automatic enrollment/activation. Copy quality and audience suitability still require subscriber review. No provider-guaranteed success or conversion claims. |
| Campaign editing | Natural-language revisions of unsaved proposals using `revisionOf`, digest binding, supersession and explicit confirmation | Saved campaigns use the existing campaign editor. No assistant tool for in-place updates of saved/active sequences. |
| Attachments | Planning resources and financing/flyer proposals; builder supports authorized file selection | No single durable campaign-plus-guide attachment workflow. Generated attachment proposals are not automatically attached to campaigns. |
| Voice | Text-script drafts, separate revisions, existing Voice Studio synthesis/approval/assignment infrastructure | Assistant does not synthesize or deliver audio. Sapphire must be verified by provider; AI-inclusive synthesis is withheld pending reliable provider-duration metering. Do not promise exact 25-second duration from text alone. |
| Approvals | Exact action/content preview, expiry, digest, durable root claims, cancellation, supersession and replay protection | Separate Send endpoint stays gated. Unknown provider outcomes require review, never blind retry. |
| Usage | Daily interaction/provider/token safety checks; monthly atomic reserve/settle, idempotency, failed-result release, owner isolation | Monthly enforcement depends on verified entitlements/configuration. Operational token/cost thresholds are not guaranteed dollar caps. |
| Entitlements | Verified AI-inclusive base subscriptions grant Plus; existing CRM permissions remain authoritative | Pro allowance constants exist but the retired $20 add-on is not sold and does not grant Pro. No subscription changes were made. |
| UI | Persistent drawer, expansion, suggested actions, previews, history and Command Center already exist | Hosted authenticated/mobile acceptance and real-provider conversational quality remain pending. |

## Fixes in this branch

- Campaign context now reads steps by `step_order`, then ID, rather than UUID order. This makes ordinal references meaningful.
- Parent campaign ownership is checked before loading steps; missing or foreign campaigns fail closed.
- `stepsLimited` exposes incomplete sequences, and editing scope explicitly distinguishes proposal revisions from the saved campaign editor.
- Added regression coverage for order, foreign-row exclusion, missing parent rejection and truncation disclosure.

No working provider architecture or UI was replaced. No credentials were added.

## Isolated database verification

Only `myari-ai-migration-test` (`jojgdfpmaxvbhobjrsbm`) was used for this task's database tests.
The previously reviewed functional script passed and rolled back: reservation/settlement idempotency, limit rejection, independent subscriber allowance, failed-result release, proposal revision/claim/cancellation/replay, delivery ownership and event deduplication.

After rollback: contacts 236, campaigns 29, campaign steps 139, calendar events 71, audit records 17,005. These match the restored test baseline, not the newer production audit baseline. Synthetic usage accounts, proposal roots and outbound messages matching the test prefix: zero. No external providers were called.

## Hosting configuration and acceptance plan

1. Obtain access to the existing Vercel team/project; verify repository, production branch, current deployment commit and domain assignment. Do not create a replacement project or redirect domains.
2. Inspect environment metadata without printing/decrypting credentials. Add the project-scoped OpenAI key only via the host's secure Secret interface after authorized access; never use `NEXT_PUBLIC_` or commit a key.
3. Use an isolated preview with the test database, appropriate Clerk test identity and mocked communication providers. The restored database contains real data: use synthetic owner IDs and avoid unnecessary copies or disclosure.
4. Check `OPENAI_ASSISTANT_MODEL`, `ASSISTANT_REASONING_PROVIDER`, Clerk bindings, Supabase service role, callback base URLs and approved provider rates. Preserve `ANTHROPIC_API_KEY` and Claude configuration.
5. Enable only the synthetic staging owner allowlist, with explicit daily limits, in an approved staging deployment. Verify conversation persistence after reload, contact ambiguity, foreign IDs, tool calls, campaign creation/revision, task/calendar proposals and confirmation/cancellation/replay.
6. Verify monthly caps under synthetic entitled accounts, daily limits separately, failed provider calls, outage handling and usage/audit records. No live Stripe subscription or messaging tests.
7. Present exact production current-to-proposed settings and obtain approval before owner-only activation or deployment. Keep public launch and approved sends disabled; preserve existing campaigns and billing.

Configuration names and safe disabled defaults are in `ENVIRONMENT.example`. Suggested initial owner beta policy for review: 5 interactions/day, 10 provider rounds/day, 20,000 observed tokens/day, existing 5 requests/minute. UTC reset boundaries apply. These are separate from AI Plus monthly entitlements and have not been applied.

## Recovery

Preserve Claude and the prior deployment. If a later approved beta fails, disable the owner beta flag/allowlist using an approved configuration change; roll back only to a known compatible deployment when authorized. Retain conversation, claims and delivery evidence to avoid replay. Do not restore/reset/drop production database tables as an application rollback. No additional migration is required by this branch.

## Validation results

- `npm run test:unit`: passed, including 375 Node test cases with zero failures and the existing TypeScript assertion suites. The assistant suite includes 31 cases after adding two regression cases.
- `npx tsc --noEmit`: passed.
- `npm run lint`: zero errors, seven existing warnings. Targeted lint of changed implementation/test files: passed without warnings.
- `npm run build`: passed; this is a local production build, not a deployment.
- Local assistant browser fixtures: passed at 1440, 1280, 768 and 390px, covering unsaved-work preservation, explicit dictation/editable transcript, approval and record links, drawer expansion and Command Center. Authentication/APIs are mocked.
- Local messaging browser fixtures: all eight SMS/email/viewport combinations passed. Each exercised command, draft, separate confirmation and one mocked provider submission, then delivery-failure projection. Provider submission was not claimed as confirmed delivery. These tests do not authorize or establish readiness for real sends.
- Hosted Supabase test-project functional transaction: passed and rolled back, with baseline and synthetic-row checks above.
- Hosted authenticated Vercel and real OpenAI/ElevenLabs acceptance: blocked by hosting/credential access; not reported as passed.
- Initial browser attempt could not bind localhost under the filesystem sandbox (`EPERM`). The local fixture was retried with authorized execution permissions; no production access was used.

Changed files: `lib/assistant/reads.ts`, `lib/assistant/tools.ts`, `scripts/assistant-operating.test.cjs`, and this report. Existing UI screenshots generated by fixture runs are verification artifacts, not intentional product changes.
Fresh logs and changed screenshots were preserved outside the repository at `/workspace/myari-autonomous-verification`; tracked baseline screenshots were restored byte-for-byte. No push was performed, to avoid triggering automatic preview deployments while deployment is prohibited.

## Release blockers

- Existing Vercel project access, current domain mapping and environment values.
- Secure OpenAI credential provisioning, funded API access and successful real Responses acceptance.
- Signed-in hosted acceptance with two isolated test identities.
- Saved-campaign in-place AI editing, automatic attachment association, and metered Sapphire generation remain incomplete and must not be advertised as operational.
- Production rollout, communications and billing changes are not authorized by this development task.
