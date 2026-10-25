# Owner-only launch blocker resolution

Status: NO-GO for production activation. Production was not changed. All code/migration changes below are local, unpushed and undeployed.

## Completed isolated rehearsal

Target verified through Supabase: `myari-ai-migration-test`, `jojgdfpmaxvbhobjrsbm`. Production `qlochlyyimulyzzrzyac` was not a rehearsal target.

Executed exactly the approved script SHA256 `7bd686b7041fa5fc131fdbb974ab22ee69a86af14304262da64f493d429dcef6`. Its transaction starts with BEGIN, has no intermediate commits and ends with ROLLBACK; the previously reviewed read-only status SELECT follows outside the transaction. The tool returned PASS. The script applied the proposed financing/task/inbound schema inside this transaction, then ran synthetic tests and rolled everything back.

| Baseline | Before | After |
| --- | ---: | ---: |
| Contacts | 236 | 236 |
| Campaigns | 29 | 29 |
| Campaign steps | 139 | 139 |
| Calendar events | 71 | 71 |
| Audit records | 17,005 | 17,005 |
| Contact tasks | 8 | 8 |
| Engagement events | 409 | 409 |

Post-rollback verification: zero synthetic contacts/tasks/audit/engagement rows; zero new optional tables, new task columns or rehearsal task triggers remain. The original test database structure and data were preserved.

Passed assertions: financing partner ownership and foreign-owner rejection; financing-report contact ownership; checklist assignment idempotency and foreign-owner rejection; inbound number attribution and duplicate rejection; six optional tables with RLS and browser-role table access denied. Creation of both task triggers succeeded. This script does not claim exhaustive recurrence, dependency-cycle or task-completion trigger behavior: its checklist uses an empty task list. Additional task scenarios remain acceptance coverage, not an inferred pass from trigger creation.

## Bugs repaired in proposed, unapplied migrations

- `20261024000000_financing_studio.sql`: validate the explicit p_contact argument against p_owner even when payload.context omits contactId. The HTTP route already checks ownership, but the service RPC should independently enforce it. The synthetic foreign-contact test passed with this repair.
- `20261026020000_inbound_communications.sql`: revoke PUBLIC table grants as well as anon/authenticated, so future inherited grants cannot undermine service-only access.
- The original three applied Assistant infrastructure migrations were not edited or reapplied.

These additional migrations are optional for a narrowed basic read/draft beta and are not approved for production. Exact revised file checksums and the tested script are recorded under `/workspace/myari-blocker-resolution`.

## Optional dependencies and safe scope

| Dependency | Affected capabilities | Restricted beta treatment |
| --- | --- | --- |
| financing_partners | Preferred partners; partner branding on flyers | `ASSISTANT_PARTNERS_VERIFIED=false` by default |
| financing_reports | Financing Studio persisted reports | Existing Financing Studio remains unavailable; basic assistant calculator/document generation does not require report persistence |
| task_transactions and task-workspace functions | Transaction milestones, checklist assignment | `ASSISTANT_TRANSACTIONS_VERIFIED=false` by default; basic contact task proposals remain available |
| inbound_communications and attribution/suppression schema | Verified unanswered-reply insights | `ASSISTANT_INBOUND_VERIFIED=false` by default |

New guards remove unavailable tools from provider discovery and reject direct invocations. Proposal preparation and execution recheck optional capabilities, including flyer partner IDs, so neither fabricated tool calls nor old previews bypass the gate. Transaction page context fails explicitly before querying a missing table. No placeholder tables were created permanently.

## Staging configuration prepared through Vercel

Existing project/team retained. Created and read back 31 environment overrides scoped exclusively to Preview branch `feat/ai-operating-assistant`. Vercel rejected a first attempt for the nonexistent assistant-internal-staging branch; it made no branch configuration. The successful configuration uses the existing feature branch.

Future builds on that branch target `https://jojgdfpmaxvbhobjrsbm.supabase.co`. Live outbound, Assistant access, sends, new AI billing/pricing/plan changes and optional capabilities are disabled. Daily settings are 5 interactions, 10 provider calls and 20,000 observed tokens. Voice provider is mock. Explicit blank overrides block inherited Production OpenAI/Anthropic, Supabase service, Clerk, Stripe, Twilio, email, voicemail and synthesis credentials until test credentials are provisioned.

This is a safe configuration skeleton, not a runnable staging deployment. No Preview deployment was created. Existing immutable previews retain their old environment and are not certified isolated. Existing candidate URL `https://voice-reach-l1a9rysde-magnificent-soless-projects.vercel.app` must not be used for synthetic writes on the assumption that the new overrides retroactively apply.

Missing secure configuration for the branch: test-project SUPABASE_SERVICE_ROLE_KEY; separate Clerk development publishable/secret keys and two synthetic users; a non-production OpenAI credential. Available tools cannot create/retrieve these private credentials. No production keys were copied, decrypted or used for a probe. Blank values deliberately fail closed until replaced through the secure hosting interface. No actual authenticated staging login or two-workspace test is reported as passed.

## Private OpenAI probe

Added CLI-only `scripts/assistant-openai-private-probe.mjs`. It requires MYARI_PRIVATE_PROBE_ENV=isolated-staging, refuses NODE_ENV=production and requires dedicated OPENAI_STAGING_API_KEY; it does not fall back to OPENAI_API_KEY. It submits one minimal Responses request, store:false, with a timeout and no retries, checks completed output and numeric usage, and emits only model/token totals or a sanitized error. It creates no HTTP endpoint and does not record connectivity probes as subscriber CRM usage. Capture successful output privately for provider-cost verification.

Mocked probe tests passed. The live invocation stopped before a provider call because this workspace is not configured as a credentialed isolated-staging runtime. Real OpenAI authentication/model access and live usage remain UNVERIFIED.

## Authentication and usage

Production auth is Clerk requireUserId with owner_id isolation, not an assumed Clerk dashboard organization. Existing owner ID evidence is kept privately; refresh via an authenticated session before activation. The production CLERK_SECRET_KEY readable-Config warning is real credential visibility metadata; no production type/key change was authorized or performed. Staging overrides prevent reusing that key. Clerk test users and sessions cannot be created without a securely provisioned development instance.

The actual store functions passed synthetic concurrency tests for exactly 5 interaction slots and 10 provider-call slots, rejected observed token totals at 20,000, and kept another owner independent. These are source-level tests using mocked database transport, not hosted authenticated acceptance. Daily slots live in private audit records; monthly usage uses the separate reservation/settlement RPCs. Do not claim the monthly meter alone enforces daily policy. Prior hosted monthly/idempotency/replay rollback verification remains retained.

Full test:unit passed with 377 Node cases, zero failures, plus existing assertion suites. Production build passed. Type checks and lint passed (seven existing full-repository warnings, no errors); targeted final checks and probe tests are recorded in `/workspace/myari-blocker-resolution`. The first new token test failed because fixture-created timestamps were historical; the test now sets the synthetic record to today, and the corrected tests pass. No production behavior was changed to satisfy that test.

Build warnings previously reviewed remain npm cache-dir configuration, deprecated uuid dependency and install-script allowlisting. No blanket package-script approval or production dependency upgrade was performed.

## Activation gates and recovery

Still required: secure non-production credentials; a new isolated Preview build; successful minimal OpenAI request; two signed-in synthetic owners; chat/history/contact/campaign/proposal/approval/cancel/usage/isolation acceptance; explicit review of narrowed optional-tool scope. Existing saved campaign editing uses the campaign editor; unsaved assistant proposal revisions are supported. No in-place active-campaign editing or communications are enabled.

Only after those pass, present the exact owner allowlist and Production changes for approval. Proposed daily limits remain 5/10/20,000; global rollout/sending/new billing stay off. Monthly paid subscriptions remain unchanged. All three optional verification flags stay false until their individual dependencies pass acceptance. Previous private owner flag proposal is review-only and must include these optional flags.

Rollback: keep current Production disabled. Future approved beta rollback removes its owner allowlist/disables V2 through a separately approved configuration deployment; retain all usage, proposal claims and delivery evidence. Do not reset/restore/drop production data. Preview-safety overrides can be removed individually later if authorized; do not remove them merely to get a build to pass.
