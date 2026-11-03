# Assistant-only release closure

This file supersedes historical readiness statements elsewhere in this folder. No feature expansion is included.

Baseline main: `5ef2717567b2abd2c37e7283e8b1b87980f76078`.
Preserved Assistant/personalization source: `b17a60296af60a8311347d06360aabd24a77994b`.

## Exact scope

PR #50 is reconciled onto current main by a feature-branch merge commit whose tree retains current main everywhere outside the Assistant scope. Main and Production are not merged, deployed or activated by this reconciliation.

Included: full-screen Assistant workspace, coastal styling and compact welcome, history/navigation/confirmations, structured editable proposals, owner-scoped sender personalization, one Assistant CSS import and navigation entry, related test helpers and evidence.

Excluded from the release diff: Notes/Planner changes, Calendar presentation, Voice Studio/category/readiness changes, saved campaign editor and campaign library changes, homepage/public-site changes. Their original work remains available in the pre-closure commit above; nothing is removed from current main.

Current main's mortgage PDF, public website and Contacts CSV export releases, package dependencies/lockfile, deployment configuration, auth, proposal approval/execution roots, usage store, sending authorization, billing and Concierge code remain intact. A source comparison found zero unexpected changes across 1,540 baseline files outside the allowlist. Personalization intentionally changes only Assistant preparation/orchestration/tool discovery and proposal presentation.

No SQL migration, dependency upgrade, new auth method, messaging provider, enrollment, billing operation, entitlement/plan change or Concierge activation is required.

## Acceptance gates

Code checks and synthetic tests are evidence for code integrity, not authenticated hosted acceptance. Final-head GitHub CI must pass after reconciliation. Existing personalization evidence is under PERSONALIZATION.md; hosted tests must use the final reviewed Preview commit.

Integrated candidate checks passed: TypeScript, lint (zero errors; seven existing warnings), security verifier, 436 unit test cases reported across suites, and optimized build. Actual-component synthetic browser checks passed 435 workspace assertions over nine viewports plus 27 sender-personalization assertions over desktop/tablet/mobile. No authenticated hosted session or real Production model authentication is inferred from these results.

Two distinct authorized Development accounts are required. Only the previously verified Development owner is currently established. A response of `unauthorized` from `/api/assistant/verify` is not identity verification and must not be used to add an allowlist entry. Vercel access and Clerk sign-in are separate sessions. Use the stable Assistant branch Preview hostname, sign in there, then open `/api/assistant/verify` in the same browser profile. Never export/paste cookies, login tokens or keys.

After both identities and owner-scoped staging sessions are confirmed, allow only the authorized test cohort in Preview, keep all delivery/billing/public-rollout gates off, then verify: real saved Brand Kit/profile sender details in the three-step Apopka SMS/email/voicemail campaign; missing fields and explicit source-conflict notices; recipient tokens unchanged; conversational/direct revision; explicit save of one draft with zero recipients; refresh/re-login history; foreign conversation/proposal/contact denial; replay/stale approval rejection; existing request/provider limits. Restore any explicitly authorized synthetic fixture changes and temporary test access. Do not claim these tests passed from mocked fixtures or public health.

## Production checks that require authorized access

Live identity: owner signs into `https://www.myari.io` and opens `/api/assistant/verify`; evidence must show live mode, matching session/owner, reachable Clerk, verified email and no ban. Never reuse the Development ID. Read `/api/assistant/config` in that same session to verify actual provider/model, limits and externalActionsEnabled=false. These GETs do not activate Assistant.

OpenAI: the existing Production POST `/api/assistant/verify` is protected by INTEGRATIONS_PROBE_SECRET plus Clerk sign-in. An unauthenticated/no-secret request was correctly refused with 403/probe_forbidden. Do not weaken or remove this guard or retrieve the secret.

A developer with an already authorized private Production environment may run the existing reviewed check without changing stored environment settings:

```sh
MYARI_PRIVATE_PRODUCTION_PROBE=approved-connectivity-only \
MYARI_APPROVED_PROBE_COMMIT="$VERCEL_GIT_COMMIT_SHA" \
node scripts/assistant-production-connectivity-check.mjs
```

Return only the sanitized MYARI_PRODUCTION_CONNECTIVITY result. The script requires the correct Production project/commit/database, disabled Assistant/new billing gates, empty allowlists, and an actual bounded non-stored OpenAI response from the configured model. It does not write CRM records or enable subscriber access. Do not pull/copy write-only Production keys onto another machine. If an existing trusted execution context is unavailable, a separate owner-approved protected Production-context verification deployment is needed; none is authorized or performed here.

## Minimum future release and activation (not applied)

1. After hosted acceptance, private Production model authentication and Live identity verification pass, obtain explicit approval for the reviewed Assistant-only commit and resulting main build. Merging main can deploy automatically; never merge as an unapproved staging action.
2. Deploy reviewed code while Assistant stays disabled. No SQL. Record the immediately previous Production deployment and smoke-check the staged Production build before domain assignment where supported. Never promote a Preview build containing Development credentials.
3. Request separate owner-only activation approval. Enable ASSISTANT_V2_ENABLED=true and set ASSISTANT_V2_OWNER_IDS to only the verified Live owner ID. Preserve existing model, limits, billing, entitlements, pricing, plan and Concierge settings. Require the public-launch gate to remain false; no subscriber-wide entitlement rollout.
4. Keep ASSISTANT_APPROVED_SENDS_ENABLED=false, ASSISTANT_SEND_OWNER_IDS empty and ASSISTANT_SEND_RECIPIENTS empty. These are Assistant-specific gates: do not change ALLOW_LIVE_OUTBOUND or disable unrelated existing CRM messaging. Verify `/api/assistant/config` reports externalActionsEnabled=false for the Live owner even if global messaging is enabled.
5. Any current state inconsistent with these requirements is a blocker, not permission to silently change Production flags.

## Rollback

Confirmed current Production/domain target: `dpl_76kytVVE3awrJiufiaJeConjB7v5`, main `5ef2717`. Reconfirm immediately before any approved release; this is the present rollback baseline, not an instruction to roll back now.

After separately authorized activation, disable Assistant owner access or ASSISTANT_V2_ENABLED if a pilot regression occurs. Restore the recorded pre-release Production build if needed. Vercel rollback can stop automatic domain assignment; restore normal promotion only under the release approval. Preserve every CRM, conversation, proposal and audit record. Do not restore/drop database tables, rerun migrations, change billing or alter Concierge to roll back an Assistant UI release.

Decision: NO-GO for owner-only Production until all authenticated/private gates pass. Subscriber-wide rollout remains NO-GO. No Production release or activation approval is requested while those gates remain unresolved.
