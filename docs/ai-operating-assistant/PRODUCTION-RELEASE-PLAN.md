# Assistant 2.0: disabled production release and separate owner activation

Review baseline: Production `9acc1a944454b3138570496fa64c7c0c7bd98211`; tested staging `0d56603c4de821cfb2a7c17c2ef492d4099ba7f2`. This document authorizes no merge, deployment, migration, flag change, subscriber access, communication or billing operation.

## Minimum release scope

The eight runtime files under `lib/assistant/` are byte-for-byte the tested staging versions:

- `provider.ts`: remove only OpenAI-incompatible Unicode-regex schema hints. Server Zod validation remains authoritative. Claude integration is preserved.
- `store.ts`: canonical object-key hashing survives PostgreSQL JSONB persistence; content and array order remain bound to approval.
- `reads.ts`: read owner-authorized base buyer context when optional preference columns are absent; permission and transport errors still fail closed. Allow explicit campaign-step ordering.
- `tools.ts`: check parent campaign ownership, preserve sequence order, disclose truncation and saved-record editing limitations, and use the compatible buyer read.
- `optional-capabilities.ts`, `orchestrator.ts`, `proposals.ts`, `execution.ts`: keep unverified partner, transaction and inbound tools/actions unavailable at every boundary, including forged direct proposals and approval requests.

Also included: relevant mocked regressions, documentation of disabled optional flags, a private opt-in Production connectivity CLI with mocked safety tests, and its test command. No dependency or lockfile update.

Excluded from the 23-file staging diff: nine staging diagnostic/rehearsal scripts, two historical readiness reports, and changes to the optional Financing/Inbound migrations. Those migrations need a separate review before their capabilities are enabled. No migration is part of this PR.

The only Vercel configuration change disables automatic Git deployments for **this review branch only**, `fix/assistant-production-readiness`. Main and other branches retain their existing behavior. This prevents opening/pushing the PR from creating an unapproved deployment. See Vercel `git.deploymentEnabled` branch configuration documentation. Do not remove or bypass that branch rule without deployment approval.

Existing Contacts, Campaigns, Tasks, Calendar, providers/dispatch, pricing, checkout, Stripe webhooks, subscriptions, public pages, authentication and default Assistant access code are unchanged. Hashes of old pending Assistant previews may require regeneration; completed outcomes and CRM records must remain intact. Do not weaken digest comparison or auto-authorize a stale preview.

**Limitation:** the Assistant revises unsaved campaign proposals. Updating an already-saved CRM campaign through an AI action is unsupported; use the existing campaign editor. No activation or enrollment tool is added.

## Read-only Production database compatibility

Verified project: `qlochlyyimulyzzrzyac` (not restored test project `jojgdfpmaxvbhobjrsbm`). Required CRM tables and all seven Assistant infrastructure tables exist. RLS is enabled on the seven infrastructure tables, browser table privileges are denied, and service-role access is available.

Verified migration history:

| Repository migration | Applied version |
|---|---|
| `20261023010000_delivery_evidence.sql` | `20261025020610` |
| `20261030000000_ai_usage_meter.sql` | `20261025020715` |
| `20261031000000_assistant_proposal_roots.sql` | `20261025020738` |

`ai_usage_schema_version()` returns 1. The four expected RPC signatures exist, use fixed `search_path=public`, deny browser EXECUTE and grant service-role EXECUTE. The Assistant logical uniqueness index is valid/unique; both infrastructure foreign keys are validated. All 12 required base contact columns exist. The six expanded preference columns are absent, matching the tested compatibility path.

`financing_partners`, `task_transactions` and `inbound_communications` remain absent. Their Assistant flags must stay false. Do not run `supabase db push`, replay historical migrations, restore a backup or apply optional schema changes for this release.

These checks establish schema compatibility, not permission to mutate Production records. No functional write tests were run against Production.

## Before any approved release

1. Review the complete PR, confirm main still matches the stated baseline, and rerun checks if it changes. Runtime files must match tested staging exactly.
2. Require successful security/unit/regression checks, TypeScript, lint and Next production build. Browser fixture tests use mocks; the 20 hosted checks belong to the staging revision, not an untested new Production deployment.
3. Through authorized hosting access, verify Production uses the correct Supabase project and the existing Live Clerk instance. Do not use this workspace's Development Clerk credentials for Production. Do not pull credential values into source, logs or chat.
4. Verify Production Assistant flags are false and access/send allowlists empty. Verify new AI billing/pricing/plan-change/entitlement/public-launch flags are false. Keep optional capability flags false or unset. This review does not change any of these settings.
5. Record the current Production deployment ID, aliases and source; verify the latest backup/recovery inventory. No database operation is required. Database backups exclude Storage object contents; never restore automatically.
6. Obtain explicit approval covering merge and release. The existing main-branch Git integration auto-deploys after merge, so merge itself can initiate a Production release. No auto-merge.

## Private OpenAI connectivity preflight (prepared, not executed)

`scripts/assistant-production-connectivity-check.mjs` is a CLI, not a route, public diagnostic endpoint, automatic build hook or subscriber action. It requires a Production host environment, exact project/database identity, explicit opt-in and a matching approved 40-character source commit. It refuses enabled Assistant/new billing flags and nonempty allowlists before making a request.

After release approval, an authorized private host-injected execution may run:

```sh
MYARI_PRIVATE_PRODUCTION_PROBE=approved-connectivity-only \
MYARI_APPROVED_PROBE_COMMIT=<approved-source-sha> \
node scripts/assistant-production-connectivity-check.mjs
```

Do not copy/paste the API key, pull it into a local env file, add it to CLI arguments, or create a public route. Use the existing server-side `OPENAI_API_KEY`. A one-time approved Production build command can run the CLI before the normal `npm run build`; account for the actual merge commit SHA if it differs from the reviewed PR head. Verify the host supplies `VERCEL_PROJECT_ID` and `VERCEL_GIT_COMMIT_SHA`; the CLI refuses missing identity rather than guessing.

The check makes one bounded Responses request, `store:false`, maximum 128 output tokens, a ten-second timeout and no retries, CRM tools or database writes. It returns only sanitized status and validated usage. Provider error bodies are never logged. Actual API usage may consume provider credits; it is an internal diagnostic and must not debit subscriber usage. Missing cost rates are not fabricated.

Success proves that host environment can authenticate and access the model. A build-host check does **not** prove deployed Function injection, Clerk login, CRM tools or browser operation. Verify those separately after the appropriate activation approval. Production credential connectivity has not been claimed as verified by this PR.

## Approved disabled-code deployment

Once explicitly approved and CI passes, merge the reviewed commit according to repository policy. Let the existing main integration build with Production credentials and disabled flags; do not promote a Preview carrying staging credentials. If using a staged Production deployment, verify team/project/environment/source before creation and require promotion approval. Do not create any deployment during preparation.

After the approved release: verify the expected commit at www.myari.io, existing login/dashboard/routes, disabled Assistant config for the signed-in owner, unchanged billing and existing CRM controls, and runtime errors. Do not send messages, enroll contacts or activate campaigns. Stop on an unexpected source, schema, credential, authorization or runtime error.

## Owner identity and workspace verification

The live sign-in page uses a Clerk **Live** publishable key. The workspace-injected Development key differs. No Production Clerk admin credential or authenticated owner browser is available to this preparation workflow. Never use the development key to resolve a Live user.

Existing private owner evidence links the supplied email/user ID to the owner-scoped CRM account. A fresh read-only query confirms 234 contacts and a saved workspace under that private ID. Current Live Clerk primary-email verification, account status and session linkage remain unverified. Private IDs, email and saved workspace details are retained outside the public repository; do not paste them into this PR.

Before activation, use the correct Live instance's authorized backend to resolve the supplied owner email with exactly one match. Verify primary email ownership/status, account status and the exact user ID against the private CRM evidence. Confirm the production publishable/secret pair belongs to that same instance. If zero/multiple/mismatched matches, stop.

Current authorization uses Clerk `userId` as `owner_id`; `requireUserId()` does not read a Clerk organization ID. The saved workspace is scoped by that owner ID. Do not invent an organization/workspace ID or substitute the Clerk dashboard team's ID. If team collaboration is required, verify the existing team/plan permissions separately.

## Supervised signed-in browser acceptance

First, after an approved disabled release, the owner signs in normally at www.myari.io using their own session. Never request a password, API key, cookie or session token in chat. Check desktop/mobile dashboard, original navigation, existing contacts/calendar/campaigns and disabled Assistant status; capture only sanitized evidence.

After a **separate owner-only activation approval**, verify the exact owner session, drawer/Command Center, authorized contact lookup and factual summary, saved conversation across close/reload, campaign/task previews and cancellation/rejection. A saved-campaign edit request must direct to the existing editor. Confirm no send/enrollment/activation/billing side effects. Check denied foreign IDs, usage counters and safe invalid-input recovery without touching another subscriber's data. Verify an unallowlisted account remains denied. Run only specifically authorized low-risk owner modifications; do not automatically save a real task/campaign as a test.

Hosted interactive browser acceptance is pending. Earlier automated browser suites used synthetic APIs; staging hosted acceptance used real Clerk sessions and HTTP endpoints. Do not conflate them.

## Separate owner-only activation proposal (not applied)

| Variable | Proposed value |
|---|---|
| `ASSISTANT_V2_ENABLED` | `true` |
| `ASSISTANT_V2_OWNER_IDS` | exactly the reverified private Production owner user ID |
| `ASSISTANT_REASONING_PROVIDER` | `openai` |
| `OPENAI_ASSISTANT_MODEL` | `gpt-5-mini` |
| `ASSISTANT_DAILY_REQUEST_LIMIT` | `5` |
| `ASSISTANT_DAILY_CALL_LIMIT` | `10` |
| `ASSISTANT_DAILY_TOKEN_THRESHOLD` | `100000` |
| `ASSISTANT_APPROVED_SENDS_ENABLED` | `false` |
| `ASSISTANT_SEND_OWNER_IDS`, `ASSISTANT_SEND_RECIPIENTS` | empty |
| `MYARI_AI_PUBLIC_LAUNCH_VERIFIED`, `MYARI_AI_ENTITLEMENTS_ENABLED` | `false` |
| `MYARI_AI_BILLING_ENABLED`, `MYARI_AI_PRICING_ENABLED`, `MYARI_AI_PLAN_CHANGES_ENABLED` | `false` |
| `ASSISTANT_PARTNERS_VERIFIED`, `ASSISTANT_TRANSACTIONS_VERIFIED`, `ASSISTANT_INBOUND_VERIFIED` | `false` |

Do not alter existing subscriptions, Stripe/provider credentials or the global CRM `ALLOW_LIVE_OUTBOUND` setting. AI sending stays disabled independently. Internal daily controls are separate from paid monthly allowances. The token threshold is observed usage, so an already-started request can exceed the remaining threshold; do not describe it as a strict dollar budget. All CRM modifications still require the separate explicit confirmation endpoint.

## Rollback

Before activation, roll back an approved code release to the recorded known-good Production deployment if necessary; verify aliases/source and disabled access. No schema rollback or data restoration is required for this PR.

After a future activation, disable `ASSISTANT_V2_ENABLED`, empty the owner allowlist and redeploy the approved revision so environment changes take effect. Keep sending and new billing/rollout gates off. These flag/deployment changes require authorization unless covered by an explicit incident rollback approval. A code rollback to an older build can restore its captured environment: verify that snapshot is also disabled. Preserve CRM records, drafts, usage and execution audit evidence. Reconcile uncertain outcomes; never retry a send automatically or restore Production from backup as an access rollback.
